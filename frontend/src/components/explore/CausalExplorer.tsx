import { useEffect, useMemo, useRef, useState } from 'react';
import type { GraphEdge, GraphNode, RelType } from '../../domain/types';
import { Claim, useApp } from '../Claims';
import { ACCESS, COUNTRY } from '../../labels';
import { VERIF_KO, indexGraph, reliability, type ExploreState } from './state';

/**
 * ROOT CAUSE EXPLORER — 고른 노드를 가운데 두고 왼쪽에 원인(2단계까지), 오른쪽에 결과(2단계까지).
 * 노드를 누르면 그 노드로 이동(더 깊이), 선을 누르면 그 연결의 설명과 근거.
 * 정보 공개 순서: 핵심 요약 → 관계망 → 선택한 연결의 설명 → 근거 자료.
 */
const REL_ORDER: RelType[] = ['background', 'trigger', 'cause', 'influence', 'sequence', 'similar'];
const BW = 176, BH = 50, COL = 250;

interface Placed { n: GraphNode; x: number; y: number; level: number }

function layout(center: GraphNode, idx: ReturnType<typeof indexGraph>) {
  const placed: Record<string, Placed> = { [center.id]: { n: center, x: 0, y: 0, level: 0 } };
  const edges: GraphEdge[] = [];
  const relRank = (e: GraphEdge) => REL_ORDER.indexOf(e.rel);
  const side = (dir: -1 | 1) => {
    const l1 = (dir < 0 ? idx.inc[center.id] : idx.out[center.id]).slice().sort((a, b) => relRank(a) - relRank(b));
    const firsts: GraphNode[] = [];
    for (const e of l1) {
      const other = idx.byId[dir < 0 ? e.from : e.to];
      if (!other) continue;
      edges.push(e);
      if (!placed[other.id]) { placed[other.id] = { n: other, x: dir * COL, y: 0, level: dir }; firsts.push(other); }
    }
    firsts.forEach((n, i) => { placed[n.id].y = (i - (firsts.length - 1) / 2) * (BH + 18); });
    const seconds: { n: GraphNode; parent: GraphNode }[] = [];
    for (const f of firsts) {
      for (const e of (dir < 0 ? idx.inc[f.id] : idx.out[f.id])) {
        const other = idx.byId[dir < 0 ? e.from : e.to];
        if (!other) continue;
        edges.push(e);
        if (!placed[other.id]) { placed[other.id] = { n: other, x: dir * COL * 2, y: 0, level: dir * 2 }; seconds.push({ n: other, parent: f }); }
      }
    }
    seconds.forEach((s, i) => { placed[s.n.id].y = (i - (seconds.length - 1) / 2) * (BH + 12); });
  };
  side(-1); side(1);
  const strength = (e: GraphEdge) => ['cause', 'trigger', 'background', 'influence', 'similar', 'sequence'].indexOf(e.rel) + (e.verification === 'evidenced' ? 0 : 0.5);
  const best: Record<string, GraphEdge> = {};
  for (const e of edges) {
    const k = [e.from, e.to].sort().join('|');
    if (!best[k] || strength(e) < strength(best[k])) best[k] = e;
  }
  return { placed, edges: Object.values(best).filter((e) => placed[e.from] && placed[e.to]) };
}

function groupByOther(list: GraphEdge[], k: 'from' | 'to'): [string, GraphEdge[]][] {
  const g: Record<string, GraphEdge[]> = {};
  for (const e of list) (g[k === 'from' ? e.from : e.to] ??= []).push(e);
  const rank = (es: GraphEdge[]) => Math.min(...es.map((e) => REL_ORDER.indexOf(e.rel)));
  return Object.entries(g).sort((a, b) => rank(a[1]) - rank(b[1]));
}

function wrap(s: string, n = 13): string[] {
  const out: string[] = []; let cur = '';
  for (const w of s.split(/(\s+)/)) {
    if ((cur + w).length > n && cur) { out.push(cur.trim()); cur = w.trimStart(); } else cur += w;
    if (out.length === 2) break;
  }
  if (out.length < 2 && cur.trim()) out.push(cur.trim());
  if (out.length === 2 && s.length > out.join(' ').length + 1) out[1] = out[1].slice(0, n - 1) + '…';
  return out.map((l) => (l.length > n + 3 ? l.slice(0, n + 2) + '…' : l));
}

const isNarrow = () => typeof window !== 'undefined' && window.innerWidth < 760;

export function CausalExplorer({ st, onNode, onBack, onHome, onEdge, onCrumb }: {
  st: ExploreState; onNode: (id: string) => void; onBack: () => void; onHome: () => void;
  onEdge: (id?: string) => void; onCrumb: (i: number) => void;
}) {
  const { data, openDoc } = useApp();
  const idx = indexGraph(data);
  const n = idx.byId[st.n!];
  const { placed, edges } = useMemo(() => layout(n, idx), [n, idx]);
  const selEdge = st.e ? data.graph.edges.find((e) => e.id === st.e) : undefined;
  const [showAll, setShowAll] = useState(false);
  useEffect(() => setShowAll(false), [n.id]);

  // 이동·확대(PC: 끌기·휠, 모바일: 한 손가락 끌기·두 손가락 확대)
  const ys = Object.values(placed).map((p) => p.y);
  const fitH = Math.max(300, Math.max(...ys) - Math.min(...ys) + BH + 60);
  const initial = () => ({ x: -COL * 2 - BW / 2 - 20, y: -fitH / 2, k: isNarrow() ? 2.1 : 1 });
  const [view, setView] = useState(initial);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setView(initial()), [n.id, fitH]);
  const svg = useRef<SVGSVGElement>(null);
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);
  const VW = COL * 4 + BW + 40;
  const scale = () => (svg.current ? VW / view.k / svg.current.clientWidth : 1);
  const onDown = (ev: React.PointerEvent) => { ptrs.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY }); };
  const onMove = (ev: React.PointerEvent) => {
    const prev = ptrs.current.get(ev.pointerId); if (!prev) return;
    ptrs.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current) setView((v) => ({ ...v, k: Math.min(3, Math.max(0.4, v.k * d / pinch.current!)) }));
      pinch.current = d; return;
    }
    const s = scale();
    if (Math.abs(ev.clientX - prev.x) + Math.abs(ev.clientY - prev.y) > 0) {
      (svg.current as Element).setPointerCapture?.(ev.pointerId);
      setView((v) => ({ ...v, x: v.x - (ev.clientX - prev.x) * s, y: v.y - (ev.clientY - prev.y) * s }));
    }
  };
  const onUp = (ev: React.PointerEvent) => { ptrs.current.delete(ev.pointerId); pinch.current = null; };
  const zoom = (f: number) => setView((v) => ({ ...v, k: Math.min(3, Math.max(0.4, v.k * f)) }));
  useEffect(() => {
    const el = svg.current; if (!el) return;
    const w = (ev: WheelEvent) => { if (!ev.ctrlKey && !ev.metaKey) return; ev.preventDefault(); zoom(ev.deltaY < 0 ? 1.12 : 0.89); };
    el.addEventListener('wheel', w, { passive: false });
    return () => el.removeEventListener('wheel', w);
  }, []);
  const vb = `${view.x + (VW - VW / view.k) / 2} ${view.y + (fitH - fitH / view.k) / 2} ${VW / view.k} ${fitH / view.k}`;

  const causes = idx.inc[n.id], results = idx.out[n.id];
  const firstClaim = n.claimIds.map((id) => data.claims[id]).find(Boolean);
  const docs = [...new Set([...(n.docIds ?? []), ...Object.values(data.documents)
    .filter((d) => d.relatedEventIds.some((e) => n.eventIds.includes(e))).map((d) => d.id)])].map((id) => data.documents[id]).filter(Boolean);
  const pars = (data.patterns?.parallels ?? []).filter((p) => p.rows.some((r) => [...r.a.claimIds, ...r.b.claimIds].some((c) => n.claimIds.includes(c))));
  const chains = data.graph.chains.filter((c) => c.steps.some((s) => s.nodeId === n.id));
  const signals = chains.filter((c) => c.kind === 'signal');
  const cresp = chains.flatMap((c) => c.countryResponses ?? []);
  const rel = reliability(data, n);

  return (
    <section className="cx" aria-label="원인과 결과 탐색">
      <nav className="cx-nav">
        <button className="linkish" onClick={onHome}>← 전체 흐름</button>
        {st.p.length > 1 && <button className="linkish" onClick={onBack}>이전 단계</button>}
        <ol className="cx-crumbs" aria-label="탐색 경로">
          {st.p.map((id, i) => idx.byId[id] && (
            <li key={id + i} className={i === st.p.length - 1 ? 'on' : ''}>
              {i === st.p.length - 1 ? idx.byId[id].label : <button className="linkish" onClick={() => onCrumb(i)}>{idx.byId[id].label}</button>}
            </li>
          ))}
        </ol>
      </nav>

      {/* 1. 핵심 요약 */}
      <header className="cx-sum">
        <div className="eyebrow">{data.graph.nodeTypes[n.nodeType]} · {n.yearPrecision === 'era' ? `${data.eras.find((e) => e.id === n.eraId)?.label}(연도 불명확)` : n.year < 1960 ? `${n.year} (1960년 이전 배경)` : n.year}</div>
        <h2>{n.label}</h2>
        {firstClaim && <p className="cx-lead">{firstClaim.text}</p>}
        <p className="small muted">
          {n.countries.map((c) => COUNTRY[c] ?? c).join(' · ') || '국가 정보 없음'} · 원인 {causes.length} · 결과 {results.length} · 근거 {n.claimIds.length}개(교차검증 {Math.round(rel * 100)}%)
        </p>
      </header>

      {/* 2. 관계망 */}
      <div className="cx-net">
        <div className="cx-net-tools">
          <span className="small muted">← 원인 · 결과 → &nbsp;끌어서 이동, Ctrl+휠·두 손가락으로 확대</span>
          <span>
            <button onClick={() => zoom(1.2)} aria-label="확대">＋</button>
            <button onClick={() => zoom(1 / 1.2)} aria-label="축소">－</button>
            <button onClick={() => setView(initial())}>맞춤</button>
            <button onClick={() => setView({ ...initial(), k: 1 })}>전체</button>
          </span>
        </div>
        {causes.length + results.length === 0
          ? <p className="cx-empty">이 항목과 연결된 원인·결과 근거가 아직 없습니다. 근거 없이 선을 긋지 않습니다.</p>
          : (
            <svg ref={svg} viewBox={vb} className="cx-svg" style={{ height: isNarrow() ? 360 : Math.min(560, Math.max(280, fitH * 0.75)) }}
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={onUp}>
              <text x={-COL * 1.5} y={-fitH / 2 + 18} textAnchor="middle" className="cx-col-label">원인 쪽</text>
              <text x={COL * 1.5} y={-fitH / 2 + 18} textAnchor="middle" className="cx-col-label">결과 쪽</text>
              {edges.map((e) => {
                const a = placed[e.from], b = placed[e.to];
                const x1 = a.x + BW / 2, x2 = b.x - BW / 2;
                const d = x1 < x2 ? `M${x1},${a.y} C${x1 + 60},${a.y} ${x2 - 60},${b.y} ${x2},${b.y}` : `M${a.x},${a.y + BH / 2} Q${(a.x + b.x) / 2},${Math.max(a.y, b.y) + 80} ${b.x},${b.y + BH / 2}`;
                const on = selEdge?.id === e.id;
                return (
                  <g key={e.id} className={`cx-edge rel-${e.rel} v-${e.verification}${on ? ' on' : ''}`} onClick={(ev) => { ev.stopPropagation(); onEdge(on ? undefined : e.id); }}>
                    <path d={d} className="hit" /><path d={d} className="line" />
                    {(on || edges.length <= 6) && <text x={(x1 + x2) / 2} y={(a.y + b.y) / 2 - 6} textAnchor="middle" className="cx-edge-label">{data.graph.relTypes[e.rel]}</text>}
                    <title>{`${data.graph.relTypes[e.rel]} · ${VERIF_KO[e.verification]} — 눌러서 설명 보기`}</title>
                  </g>
                );
              })}
              {Object.values(placed).map(({ n: m, x, y, level }) => (
                <g key={m.id} transform={`translate(${x - BW / 2},${y - BH / 2})`} className={`cx-node type-${m.nodeType} lv${Math.abs(level)}${level === 0 ? ' center' : ''}${!m.countries.includes('KR') && m.countries.length ? ' foreign' : ''}`}
                  onClick={(ev) => { ev.stopPropagation(); if (level !== 0) onNode(m.id); }} role="button" tabIndex={level === 0 ? -1 : 0}
                  onKeyDown={(ev) => ev.key === 'Enter' && level !== 0 && onNode(m.id)} aria-label={`${m.label}로 이동`}>
                  <rect width={BW} height={BH} rx={8} />
                  <text x={8} y={13} className="cx-node-type">{data.graph.nodeTypes[m.nodeType]} · {m.yearPrecision === 'era' ? m.eraId : m.year}{!m.countries.includes('KR') && m.countries.length ? ` · ${m.countries.map((c) => COUNTRY[c] ?? c).join('·')}` : ''}</text>
                  {wrap(m.label).map((l, i) => <text key={i} x={8} y={29 + i * 14} className="cx-node-label">{l}</text>)}
                  {level !== 0 && (idx.inc[m.id].length + idx.out[m.id].length > 1) && <text x={BW - 8} y={13} textAnchor="end" className="cx-more">+{idx.inc[m.id].length + idx.out[m.id].length - 1}</text>}
                </g>
              ))}
            </svg>
          )}
        {/* 관계 목록(선택하기 쉬운 목록형 — 모바일·키보드용) */}
        <div className="cx-lists">
          {[['원인 쪽', causes, 'from'], ['결과 쪽', results, 'to']].map(([title, list, k]) => (
            <div key={title as string}>
              <h4>{title as string}</h4>
              {(list as GraphEdge[]).length ? <ul>{groupByOther(list as GraphEdge[], k as 'from' | 'to').map(([oid, es]) => {
                const o = idx.byId[oid];
                return (
                  <li key={oid}>
                    {es.map((e) => (
                      <button key={e.id} className={`cx-rel-btn${selEdge?.id === e.id ? ' on' : ''}`} onClick={() => onEdge(selEdge?.id === e.id ? undefined : e.id)}
                        aria-label={`${data.graph.relTypes[e.rel]} 연결 설명 보기`}>
                        <span className={`rel-tag rel-${e.rel}`}>{data.graph.relTypes[e.rel]}</span> <span className={`v-tag v-${e.verification}`}>{VERIF_KO[e.verification]}</span>
                      </button>
                    ))}
                    <button className="linkish" onClick={() => onNode(o.id)}>{o.label}</button>
                  </li>
                );
              })}</ul> : <p className="small muted">근거 있는 연결 없음</p>}
            </div>
          ))}
        </div>
      </div>

      {/* 3. 선택한 연결의 설명 */}
      {selEdge && (() => {
        const a = idx.byId[selEdge.from], b = idx.byId[selEdge.to];
        const ch = data.graph.chains.find((c) => c.id === selEdge.chainId);
        return (
          <section className="cx-edge-detail" aria-live="polite">
            <h3>{a.label} <span aria-hidden>→</span> {b.label}</h3>
            <p><span className={`rel-tag rel-${selEdge.rel}`}>{data.graph.relTypes[selEdge.rel]}</span> <span className={`v-tag v-${selEdge.verification}`}>{VERIF_KO[selEdge.verification]}</span>
              {selEdge.rel === 'sequence' && <span className="small muted"> — 앞뒤 순서만 정리한 것으로, 인과관계를 주장하지 않습니다.</span>}
              {selEdge.verification === 'hypothesis' && <span className="small muted"> — 아직 검증되지 않은 연결입니다.</span>}</p>
            {selEdge.note && <p className="small">작동 원리: {selEdge.note}</p>}
            {ch && <p className="small muted">출처 묶음: {ch.title}</p>}
            <div className="cx-claims">{selEdge.claimIds.map((id) => <p key={id} className="small"><Claim id={id} /></p>)}</div>
          </section>
        );
      })()}

      {/* 4. 근거 자료 */}
      <section className="cx-evidence">
        <h3>근거 자료</h3>
        <div className="cx-claims">
          {(showAll ? n.claimIds : n.claimIds.slice(0, 2)).map((id) => <p key={id} className="small"><Claim id={id} /></p>)}
          {n.claimIds.length > 2 && <button className="linkish small" onClick={() => setShowAll(!showAll)}>{showAll ? '접기' : `근거 문장 ${n.claimIds.length - 2}개 더 보기`}</button>}
        </div>
        {docs.length > 0 && <>
          <h4>당시 1차 사료</h4>
          <ul className="cx-docs">{docs.map((d) => (
            <li key={d.id}><button className="linkish" onClick={() => openDoc(d.id)}>{d.publication} · {d.publishedDate} — {d.title}</button>
              <span className="small muted"> [{ACCESS[d.verification.accessLevel].n}단계: {ACCESS[d.verification.accessLevel].label}]</span></li>
          ))}</ul>
        </>}
        {n.trend && <>
          <h4>유행의 시점</h4>
          <ul className="small">{n.trend.timeline.map((t, i) => <li key={i}>{COUNTRY[t.country as keyof typeof COUNTRY] ?? t.country}: {[t.emerged && `등장 ${t.emerged}`, t.popularized && `대중화 ${t.popularized}`, t.declined && `쇠퇴 ${t.declined}`].filter(Boolean).join(' · ')}</li>)}</ul>
          {n.trend.whyThen && <p className="small">왜 그때: {n.trend.whyThen}</p>}
        </>}
        {signals.map((s) => (
          <div key={s.id} className="cx-signal">
            <h4>흐름의 생애 — {s.title}</h4>
            <ol>{s.steps.map((x) => <li key={x.nodeId} className={x.nodeId === n.id ? 'on' : ''}><button className="linkish" onClick={() => x.nodeId !== n.id && onNode(x.nodeId)}>{x.stageLabel}: {idx.byId[x.nodeId]?.label}</button></li>)}</ol>
          </div>
        ))}
        {cresp.length > 0 && <>
          <h4>국가별 대응</h4>
          <ul className="small">{cresp.map((c, i) => <li key={i}><b>{COUNTRY[c.country]}</b> {c.situation}</li>)}</ul>
        </>}
        {pars.length > 0 && <>
          <h4>다른 시대와 비교</h4>
          <ul className="small">{pars.map((p) => <li key={p.id}><a href={`#pattern-${p.id}`}>{p.title}: {p.a.label} ↔ {p.b.label}</a></li>)}</ul>
        </>}
      </section>
    </section>
  );
}
