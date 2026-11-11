import { useEffect, useMemo, useRef } from 'react';
import type { GraphNode, Lane } from '../../domain/types';
import { useApp } from '../Claims';
import { LANE_KO, MAX_YEAR, MIN_YEAR, indexGraph, short, visibleByCountry, type ExploreState } from './state';

/**
 * 연속형 역사 흐름 지도: 가로 = 1960~현재(왼쪽 끝은 1960년 이전 배경), 세로 = 분야 줄.
 * 점 크기 = 중요도, 점선 테두리 = 연도를 특정할 수 없어 시대 단위로만 놓은 항목.
 * 노드를 고르면 그 노드와 연결된 관계선이 그려지고, 필터에 가려진 이웃(예: 다른 나라 사건)도 함께 펼쳐진다.
 */
const PRE = 64; // 1960년 이전 칸
const LANE_PAD = 14;
const ROW = 15;
const R = { 1: 8, 2: 6, 3: 4 } as const;

export function HistoryMap({ st, ppy, onYear, onNode }: {
  st: ExploreState; ppy: number; onYear: (y: number) => void; onNode: (id: string) => void;
}) {
  const { data } = useApp();
  const idx = indexGraph(data);
  const scroller = useRef<HTMLDivElement>(null);
  const X = (y: number) => (y < MIN_YEAR ? PRE / 2 : PRE + (y - MIN_YEAR + 0.5) * ppy);
  const W = PRE + (MAX_YEAR - MIN_YEAR + 1) * ppy + 20;

  const sel = st.n ? idx.byId[st.n] : undefined;
  const neighborIds = useMemo(() => {
    if (!sel) return new Set<string>();
    return new Set([...idx.out[sel.id].map((e) => e.to), ...idx.inc[sel.id].map((e) => e.from), sel.id]);
  }, [sel, idx]);

  // 보이는 노드: 분야 필터 + 한국 중심 국가 필터. 선택 노드의 이웃은 필터와 상관없이 펼친다.
  const visible = useMemo(() => data.graph.nodes.filter((n) =>
    neighborIds.has(n.id) || (st.f.includes(n.lane) && visibleByCountry(n, st.c))), [data, st.f, st.c, neighborIds]);

  // 같은 줄·같은 해 노드는 위아래로 쌓는다(중요한 것이 위)
  const { pos, laneTop, laneH, H } = useMemo(() => {
    const lanes = data.graph.lanes.filter((l) => st.f.includes(l) || visible.some((n) => n.lane === l));
    const stacks: Record<string, GraphNode[]> = {};
    for (const n of [...visible].sort((a, b) => a.importance - b.importance || b.degree - a.degree)) {
      const k = `${n.lane}|${n.yearPrecision === 'era' ? 'era' + n.eraId : n.year}`;
      (stacks[k] ??= []).push(n);
    }
    const depth: Record<Lane, number> = {} as Record<Lane, number>;
    for (const [k, arr] of Object.entries(stacks)) {
      const l = k.split('|')[0] as Lane;
      depth[l] = Math.max(depth[l] ?? 1, arr.length);
    }
    const laneTop: Record<string, number> = {}; const laneH: Record<string, number> = {};
    let y = 58;
    for (const l of lanes) { laneTop[l] = y; laneH[l] = LANE_PAD * 2 + Math.min(depth[l] ?? 1, 9) * ROW; y += laneH[l]; }
    const pos: Record<string, { x: number; y: number }> = {};
    for (const [k, arr] of Object.entries(stacks)) {
      const l = k.split('|')[0];
      arr.forEach((n, i) => {
        const x = n.yearPrecision === 'era' ? X(n.year) + ppy * 4.5 : X(n.year);
        pos[n.id] = { x: x + (i >= 9 ? (i - 8) * 5 : 0), y: laneTop[l] + LANE_PAD + 4 + Math.min(i, 8) * ROW };
      });
    }
    return { pos, laneTop, laneH, H: y + 10 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, ppy, st.f, data.graph.lanes]);

  // 연도별 자료 밀도(연도가 정확한 항목만) — 자료가 없는 해를 숨기지 않고 드러낸다
  const density = useMemo(() => {
    const d: Record<number, number> = {};
    for (const n of visible) if (n.yearPrecision === 'year' && n.year >= MIN_YEAR) d[n.year] = (d[n.year] ?? 0) + 1;
    return d;
  }, [visible]);
  const maxD = Math.max(1, ...Object.values(density));

  // 선택 연도(또는 선택 노드)가 보이도록 가로 스크롤
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const target = sel ? pos[sel.id]?.x ?? X(st.y) : X(st.y);
    el.scrollTo({ left: Math.max(0, target - el.clientWidth / 2), behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.y, st.n, ppy]);

  const edges = sel ? [...idx.out[sel.id], ...idx.inc[sel.id]] : [];

  // 이름표 겹침 방지: 선택·이웃 → 중요도 순으로 자리를 잡고, 같은 줄에서 겹치면 생략(마우스를 올리면 전체 이름)
  const labels = useMemo(() => {
    const want = (n: GraphNode) => n.id === sel?.id || neighborIds.has(n.id) || n.importance === 1 || (ppy >= 44 && n.importance === 2);
    const order = visible.filter(want).sort((a, b) =>
      Number(b.id === sel?.id) - Number(a.id === sel?.id) || Number(neighborIds.has(b.id)) - Number(neighborIds.has(a.id)) || a.importance - b.importance);
    const taken: Record<number, [number, number][]> = {};
    const out: Record<string, string> = {};
    for (const n of order) {
      const p = pos[n.id]; if (!p) continue;
      const max = n.id === sel?.id || neighborIds.has(n.id) ? 22 : 14;
      let text = short(n.label, max);
      const x0 = p.x + R[n.importance] + 3;
      const fits = (t: string) => !(taken[p.y] ?? []).some(([a, b]) => x0 < b && x0 + t.length * 10.5 > a);
      if (!fits(text)) { text = short(n.label, 7); if (!fits(text)) continue; }
      (taken[p.y] ??= []).push([p.x - R[n.importance] - 2, x0 + text.length * 10.5]);
      out[n.id] = text;
    }
    return out;
  }, [visible, pos, sel, neighborIds, ppy]);

  return (
    <div className="hmap">
      <div className="hmap-lanes" aria-hidden>
        <div style={{ height: 58 }} />
        {Object.keys(laneTop).map((l) => <div key={l} className={`hmap-lane-label lane-${l}`} style={{ height: laneH[l] }}>{LANE_KO[l as Lane]}</div>)}
      </div>
      <div className="hmap-scroll" ref={scroller}>
        <svg width={W} height={H} role="img" aria-label="대한민국 1960년~현재 역사 흐름 지도">
          {/* 시대 띠 */}
          {data.eras.map((e, i) => {
            const a = X(e.startYear) - ppy / 2; const b = X(Math.min(e.endYear ?? MAX_YEAR, MAX_YEAR)) + ppy / 2;
            return (
              <g key={e.id}>
                <rect x={a} y={0} width={b - a} height={H} className={`hm-era ${i % 2 ? 'odd' : ''}`} />
                <text x={a + 6} y={14} className="hm-era-label">{e.label}</text>
              </g>
            );
          })}
          <rect x={0} y={0} width={PRE} height={H} className="hm-pre" />
          <text x={PRE / 2} y={14} className="hm-era-label" textAnchor="middle">1960 이전</text>
          {/* 연도 눈금 + 밀도 막대 (누르면 그 해 선택) */}
          {Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i).map((y) => {
            const d = density[y] ?? 0;
            return (
              <g key={y} className={`hm-year${y === st.y ? ' on' : ''}`} onClick={() => onYear(y)}>
                <rect x={X(y) - ppy / 2} y={18} width={ppy} height={H - 18} className="hm-year-hit" />
                {y === st.y && <rect x={X(y) - ppy / 2} y={18} width={ppy} height={H - 18} className="hm-year-sel" />}
                {(y % 5 === 0 || y === st.y) && <text x={X(y)} y={30} textAnchor="middle" className="hm-tick">{y}</text>}
                {d > 0
                  ? <rect x={X(y) - ppy * 0.3} y={52 - (d / maxD) * 16} width={ppy * 0.6} height={(d / maxD) * 16} rx={1.5} className="hm-dens" />
                  : <line x1={X(y) - ppy * 0.3} x2={X(y) + ppy * 0.3} y1={51} y2={51} className="hm-dens-none" />}
              </g>
            );
          })}
          {/* 분야 줄 경계 */}
          {Object.keys(laneTop).map((l) => <line key={l} x1={0} x2={W} y1={laneTop[l]} y2={laneTop[l]} className="hm-lane-line" />)}
          {/* 선택 노드의 관계선 */}
          {edges.map((e) => {
            const a = pos[e.from], b = pos[e.to];
            if (!a || !b) return null;
            const mx = (a.x + b.x) / 2, my = Math.min(a.y, b.y) - 24 - Math.abs(a.x - b.x) * 0.08;
            return <path key={e.id} d={`M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`} className={`hm-edge rel-${e.rel} v-${e.verification}`} />;
          })}
          {/* 노드 */}
          {visible.map((n) => {
            const p = pos[n.id]; if (!p) return null;
            const r = R[n.importance];
            const isSel = sel?.id === n.id, isNb = neighborIds.has(n.id) && !isSel;
            const foreign = !n.countries.includes('KR') && n.countries.length > 0;
            return (
              <g key={n.id} className={`hm-node lane-${n.lane} imp-${n.importance}${isSel ? ' sel' : ''}${isNb ? ' nb' : ''}${sel && !isSel && !isNb ? ' dim' : ''}${foreign ? ' foreign' : ''}${n.yearPrecision === 'era' ? ' era-prec' : ''}`}
                transform={`translate(${p.x},${p.y})`} onClick={() => onNode(n.id)} role="button" tabIndex={0}
                onKeyDown={(ev) => (ev.key === 'Enter' || ev.key === ' ') && onNode(n.id)}
                aria-label={`${n.yearPrecision === 'era' ? n.eraId : n.year} ${n.label}`}>
                <circle r={Math.max(r + 6, 10)} className="hit" />
                {n.kind === 'trend' ? <rect x={-r} y={-r} width={r * 2} height={r * 2} transform="rotate(45)" className="dot" /> : <circle r={r} className="dot" />}
                {labels[n.id] && <text x={r + 4} y={4} className="hm-label">{labels[n.id]}</text>}
                <title>{`${n.yearPrecision === 'era' ? n.eraId + '(연도 불명확)' : n.year} · ${n.label}`}</title>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
