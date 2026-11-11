import { useEffect, useMemo, useRef, useState } from 'react';
import type { EraId, Indicator } from '../domain/types';
import { useApp } from './Claims';

/**
 * 지표 선 차트 (SVG, 외부 라이브러리 없음)
 * - 축 하나. 같은 단위의 계열만 한 차트에 그린다(이중 축 금지).
 * - 나라 색은 고정(한국=파랑, 미국=주황, 일본=청록) — 순위·필터와 무관하게 같은 나라는 같은 색.
 * - 계열이 2개 이상이면 범례 + 선 끝 직접 이름표, 1개면 범례 없음(제목이 이름).
 * - 시대 구간 배경 띠, 마우스 십자선 + 툴팁, 표 보기, 출처 표시.
 * - 확인한 점만 그린다. 비어 있는 연도는 보간하지 않으며, 점이 듬성하면 표시점을 찍는다.
 */
const tnum = (t: string) => (t.length === 7 ? Number(t.slice(0, 4)) + (Number(t.slice(5)) - 1) / 12 : Number(t));
const fmt = (v: number, unit: string) =>
  `${Math.abs(v) >= 1000 ? v.toLocaleString('ko-KR') : v.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}${unit === '%' ? '%' : ` ${unit}`}`;
const label = (t: string) => (t.length === 7 ? `${t.slice(0, 4)}.${t.slice(5)}` : `${t}년`);

const ERA_SPANS: { id: EraId; from: number; to: number; short: string }[] = [
  { id: '1960s', from: 1960, to: 1970, short: '60s' }, { id: '1970s', from: 1970, to: 1980, short: '70s' },
  { id: '1980s', from: 1980, to: 1990, short: '80s' }, { id: '1990s', from: 1990, to: 2000, short: '90s' },
  { id: '2000s', from: 2000, to: 2010, short: '00s' }, { id: '2010s', from: 2010, to: 2020, short: '10s' },
  { id: '2020s', from: 2020, to: 2030, short: '20s~' },
];

export function IndicatorChart({ ind, highlightEra, height = 220 }: { ind: Indicator; highlightEra?: EraId; height?: number }) {
  const { data } = useApp();
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(720);
  useEffect(() => {
    const el = wrapRef.current; if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(300, Math.round(e.contentRect.width))));
    ro.observe(el); return () => ro.disconnect();
  }, [table]);
  const narrow = W < 520;
  const H = narrow ? Math.round(height * 0.95) : height, m = { l: 14 + 7 * Math.max(...ind.series.flatMap((s) => s.points.map(([, v]) => Math.round(Math.abs(v)).toLocaleString('ko-KR').length + (v < 0 ? 1 : 0)))), r: narrow ? 46 : 58, t: 14, b: 26 };
  const g = useMemo(() => {
    const all = ind.series.flatMap((s) => s.points);
    const xs = all.map(([t]) => tnum(t));
    const vs = all.map(([, v]) => v);
    let x0 = Math.min(...xs), x1 = Math.max(...xs);
    if (ind.frequency === 'annual' && ind.eraIds.length >= 5) { x0 = Math.min(x0, 1960); x1 = Math.max(x1, 2026); }
    else if (ind.frequency === 'annual') { x0 -= 0.5; x1 += 0.5; }
    if (x1 === x0) x1 = x0 + 1;
    let y0 = Math.min(...vs, ind.zeroLine ? 0 : Infinity, ind.refLine?.value ?? Infinity);
    let y1 = Math.max(...vs, ind.refLine?.value ?? -Infinity);
    const pad = (y1 - y0) * 0.08 || 1; y0 -= pad; y1 += pad;
    // 개수·금액처럼 크기를 비교하는 지표는 축을 0에서 시작해 증가 폭을 과장하지 않는다
    if (Math.min(...vs) >= 0 && (y0 < 0 || ['개', '조 원'].includes(ind.unit))) y0 = 0;
    // 눈금: 1·2·5 단위로 4~6개
    const raw = (y1 - y0) / 5; const p = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 5, 10].map((k) => k * p).find((k) => k >= raw)!;
    const ticks: number[] = []; for (let v = Math.ceil(y0 / step) * step; v <= y1; v += step) ticks.push(+v.toFixed(6));
    const X = (x: number) => m.l + ((x - x0) / (x1 - x0)) * (W - m.l - m.r);
    const Y = (v: number) => m.t + (1 - (v - y0) / (y1 - y0)) * (H - m.t - m.b);
    const times = [...new Set(all.map(([t]) => t))].sort();
    return { x0, x1, X, Y, ticks, times };
  }, [ind, H, W]);

  const endY = useRef<Record<string, number>>({});
  const multi = ind.series.length > 1;
  const sparse = ind.series.every((s) => s.points.length < 16);
  const sources = [...new Set(ind.series.flatMap((s) => s.sourceIds))].map((id) => data.sources[id]).filter(Boolean);
  // 같은 발행처는 한 번만 이름을 쓰고, 계열별 링크는 번호로 단다
  const byPub: { pub: string; items: typeof sources }[] = [];
  sources.forEach((src) => { const g0 = byPub.find((b) => b.pub === src.publisher); if (g0) g0.items.push(src); else byPub.push({ pub: src.publisher, items: [src] }); });
  const hoverT = hover !== null ? g.times[hover] : null;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = svgRef.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    let best = 0, bd = Infinity;
    g.times.forEach((t, i) => { const d = Math.abs(g.X(tnum(t)) - x); if (d < bd) { bd = d; best = i; } });
    setHover(best);
  };

  return (
    <figure className="ind-chart" aria-label={ind.title}>
      <figcaption>
        <span className="ind-title">{ind.title}</span> <span className="muted small">({ind.unit})</span>
        {multi && (
          <span className="ind-legend">
            {ind.series.map((s) => <span key={s.country}><i className={`sw sw-${s.country}`} />{s.label}</span>)}
          </span>
        )}
        <button className="linkish small ind-toggle" onClick={() => setTable(!table)} aria-pressed={table}>{table ? '차트로 보기' : '표로 보기'}</button>
      </figcaption>
      <p className="small muted ind-desc">{ind.description}</p>

      {table ? (
        <div className="ind-table-wrap">
          <table className="ind-table">
            <thead><tr><th>시점</th>{ind.series.map((s) => <th key={s.country}>{s.label}</th>)}</tr></thead>
            <tbody>
              {g.times.map((t) => (
                <tr key={t}><td>{label(t)}</td>{ind.series.map((s) => {
                  const p = s.points.find(([pt]) => pt === t); return <td key={s.country}>{p ? fmt(p[1], ind.unit) : '—'}</td>;
                })}</tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="ind-plot" ref={wrapRef}>
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${ind.title} 추이`}
            onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
            {ind.frequency === 'annual' && ERA_SPANS.filter((e) => e.to > g.x0 && e.from < g.x1).map((e, i) => {
              const a = g.X(Math.max(e.from, g.x0)), b = g.X(Math.min(e.to, g.x1));
              return (
                <g key={e.id}>
                  <rect x={a} y={m.t} width={b - a} height={H - m.t - m.b}
                    className={`era-band ${i % 2 ? 'odd' : ''} ${highlightEra === e.id ? 'hl' : ''}`} />
                  {ind.eraIds.length >= 5 && <text x={(a + b) / 2} y={H - 8} className="era-band-label" textAnchor="middle">{e.short}</text>}
                </g>
              );
            })}
            {(ind.frequency === 'monthly' || ind.eraIds.length < 5) && g.times
              .filter((t, i) => ind.frequency === 'annual' || i === 0 || ['01', '07'].includes(t.slice(5)))
              .map((t) => (
                <text key={`x${t}`} x={g.X(tnum(t))} y={H - 8} className="tick" textAnchor="middle">
                  {t.length === 7 ? `${t.slice(2, 4)}.${t.slice(5)}` : t}
                </text>
              ))}
            {g.ticks.map((v) => (
              <g key={v}>
                <line x1={m.l} x2={W - m.r} y1={g.Y(v)} y2={g.Y(v)} className={v === 0 ? 'zero' : 'grid'} />
                <text x={m.l - 6} y={g.Y(v) + 4} className="tick" textAnchor="end">{v.toLocaleString('ko-KR')}</text>
              </g>
            ))}
            {ind.refLine && (
              <g>
                <line x1={m.l} x2={W - m.r} y1={g.Y(ind.refLine.value)} y2={g.Y(ind.refLine.value)} className="ref" />
                <text x={W - m.r} y={g.Y(ind.refLine.value) - 5} className="tick" textAnchor="end">{ind.refLine.label}</text>
              </g>
            )}
            {(() => {
              // 선 끝 이름표 겹침 방지: y 순으로 정렬해 최소 13px 간격으로 밀어낸다
              const ends = ind.series.map((s) => { const l = s.points[s.points.length - 1]; return { c: s.country, y: g.Y(l[1]) + 4 }; }).sort((a, b) => a.y - b.y);
              for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 13) ends[i].y = ends[i - 1].y + 13;
              endY.current = Object.fromEntries(ends.map((e) => [e.c, e.y]));
              return null;
            })()}
            {ind.series.map((s) => {
              // 연속 구간은 실선, 자료가 빠진 구간(다음 점까지 1기간 넘게 비는 곳)은 점선 — 없는 값을 있는 것처럼 보이지 않게
              const step = ind.frequency === 'monthly' ? 1 / 12 + 0.001 : 1.001;
              const P = (t: string, v: number) => `${g.X(tnum(t)).toFixed(1)},${g.Y(v).toFixed(1)}`;
              let solid = ''; let gaps = '';
              s.points.forEach(([t, v], i) => {
                if (!i) { solid += `M${P(t, v)}`; return; }
                const [pt, pv] = s.points[i - 1];
                if (tnum(t) - tnum(pt) > step) { gaps += `M${P(pt, pv)}L${P(t, v)}`; solid += `M${P(t, v)}`; }
                else solid += `L${P(t, v)}`;
              });
              const last = s.points[s.points.length - 1];
              return (
                <g key={s.country} className={`series s-${s.country}`}>
                  <path d={solid} className="line" />
                  {gaps && <path d={gaps} className="line gap" />}
                  {sparse && s.points.map(([t, v]) => <circle key={t} cx={g.X(tnum(t))} cy={g.Y(v)} r={4} className="dot" />)}
                  <text x={g.X(tnum(last[0])) + 6} y={endY.current[s.country] ?? g.Y(last[1]) + 4} className="end-label">{multi ? s.label : fmt(last[1], ind.unit)}</text>
                </g>
              );
            })}
            {hoverT && (
              <g className="hover">
                <line x1={g.X(tnum(hoverT))} x2={g.X(tnum(hoverT))} y1={m.t} y2={H - m.b} className="crosshair" />
                {ind.series.map((s) => {
                  const p = s.points.find(([t]) => t === hoverT);
                  return p ? <circle key={s.country} cx={g.X(tnum(p[0]))} cy={g.Y(p[1])} r={5} className={`hdot s-${s.country}`} /> : null;
                })}
              </g>
            )}
          </svg>
          {hoverT && (
            <div className="ind-tip" style={{ left: `${(g.X(tnum(hoverT)) / W) * 100}%` }} role="status">
              <b>{label(hoverT)}</b>
              {ind.series.map((s) => {
                const p = s.points.find(([t]) => t === hoverT);
                return <div key={s.country}><i className={`sw sw-${s.country}`} />{s.label} {p ? fmt(p[1], ind.unit) : '자료 없음'}</div>;
              })}
            </div>
          )}
        </div>
      )}
      <p className="small muted ind-src">
        출처: {byPub.map((b, i) => (
          <span key={b.pub}>{i ? ' · ' : ''}{b.items.length === 1
            ? <a href={b.items[0].url} target="_blank" rel="noreferrer" title={b.items[0].title}>{b.pub}</a>
            : <>{b.pub} {b.items.map((x, j) => <a key={x.id} href={x.url} target="_blank" rel="noreferrer" title={x.title}>[{j + 1}]</a>)}</>}
          </span>
        ))}
        {ind.note && <> — {ind.note}</>}
        {ind.series.some((se) => se.points.some(([t], i) => i > 0 && tnum(t) - tnum(se.points[i - 1][0]) > (ind.frequency === 'monthly' ? 1 / 12 + 0.001 : 1.001)))
          && <> · 점선 = 그 사이 자료 없음</>}
        {ind.series.some((se) => se.sourceIds.some((id) => id.startsWith('fred-')))
          && <span className="fred-note"> · FRED® 자료 이용(세인트루이스 연방준비은행이 보증·인증한 것은 아님)</span>}
      </p>
    </figure>
  );
}
