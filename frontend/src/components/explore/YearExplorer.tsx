import type { GraphEdge, GraphNode, Lane } from '../../domain/types';
import { useApp } from '../Claims';
import { ALL_LANES, LANE_KO, MAX_YEAR, MIN_YEAR, VERIF_KO, indexGraph, reliability, short, visibleByCountry, type ExploreState } from './state';

/**
 * YEAR EXPLORER — 고른 해의 대한민국.
 * 그 해로 날짜가 확인된 항목만 보여준다. 다른 해 내용을 끌어오지 않고, 비어 있는 분야는 '자료 없음'으로 드러낸다.
 * 순서 = 중요도(사건 우선순위·연결 수) → 근거 신뢰도(독립 출처 2개 이상 비율).
 */
export function YearExplorer({ st, onNode, onYear }: { st: ExploreState; onNode: (id: string) => void; onYear: (y: number) => void }) {
  const { data } = useApp();
  const idx = indexGraph(data);
  const Y = st.y;
  const era = data.eras.find((e) => Y >= e.startYear && Y <= (e.endYear ?? MAX_YEAR));
  const inYear = data.graph.nodes.filter((n) => n.yearPrecision === 'year' && n.year === Y);
  const kr = inYear.filter((n) => visibleByCountry(n, st.c));
  const score = (n: GraphNode) => n.importance * 10 - Math.min(n.degree, 5) - reliability(data, n) * 3;
  const byLane: Partial<Record<Lane, GraphNode[]>> = {};
  for (const n of kr.sort((a, b) => score(a) - score(b))) (byLane[n.lane] ??= []).push(n);
  const laneOrder = ALL_LANES.filter((l) => byLane[l]).sort((a, b) =>
    byLane[a]!.reduce((s, n) => s + (4 - n.importance), 0) > byLane[b]!.reduce((s, n) => s + (4 - n.importance), 0) ? -1 : 1);
  const empty = ALL_LANES.filter((l) => !byLane[l]);

  // 국제: 그 해의 한국 밖 사건 중 한국 쪽 노드와 연결된 것
  const intl = inYear.filter((n) => !n.countries.includes('KR') && n.countries.length > 0).map((n) => {
    const toKr = idx.out[n.id].map((e) => idx.byId[e.to]).filter((m) => m && m.countries.includes('KR'));
    return { n, toKr };
  }).sort((a, b) => b.toKr.length - a.toKr.length || a.n.importance - b.n.importance);

  const yearIds = new Set(inYear.map((n) => n.id));
  const from = data.graph.edges.filter((e) => yearIds.has(e.to) && idx.byId[e.from]?.year < Y && idx.byId[e.from]?.countries.includes('KR'));
  const to = data.graph.edges.filter((e) => yearIds.has(e.from) && idx.byId[e.to]?.year > Y);
  const eraWide = era ? data.graph.nodes.filter((n) => n.yearPrecision === 'era' && n.eraId === era.id && visibleByCountry(n, st.c)) : [];

  const Item = ({ n, extra }: { n: GraphNode; extra?: string }) => (
    <li>
      <button className={`yx-item imp-${n.importance}`} onClick={() => onNode(n.id)}>
        <span className={`yx-dot lane-${n.lane}`} aria-hidden />
        <span className="yx-label">{n.label}</span>
        {extra && <span className="yx-extra">{extra}</span>}
        <span className="yx-meta">{data.graph.nodeTypes[n.nodeType]}{n.degree ? ` · 연결 ${n.degree}` : ''}{reliability(data, n) >= 0.99 ? ' · 교차검증' : ''}</span>
      </button>
    </li>
  );
  const EdgeItem = ({ e, dir }: { e: GraphEdge; dir: 'from' | 'to' }) => {
    const other = idx.byId[dir === 'from' ? e.from : e.to];
    const here = idx.byId[dir === 'from' ? e.to : e.from];
    return (
      <li>
        <button className="yx-item" onClick={() => onNode(other.id)}>
          <span className="yx-year">{other.yearPrecision === 'era' ? other.eraId : other.year}</span>
          <span className="yx-label">{dir === 'from' ? `${short(other.label, 26)} → ${short(here.label, 20)}` : `${short(here.label, 20)} → ${short(other.label, 26)}`}</span>
          <span className={`yx-rel v-${e.verification}`}>{data.graph.relTypes[e.rel]} · {VERIF_KO[e.verification]}</span>
        </button>
      </li>
    );
  };

  return (
    <section className="yx" aria-label={`${Y}년 대한민국`}>
      <header className="yx-head">
        <button className="yx-step" onClick={() => onYear(Math.max(MIN_YEAR, Y - 1))} aria-label="이전 해" disabled={Y <= MIN_YEAR}>◀</button>
        <div>
          <h2>{Y}년 대한민국</h2>
          <p className="small muted">{era?.label} · {era?.title}</p>
        </div>
        <button className="yx-step" onClick={() => onYear(Math.min(MAX_YEAR, Y + 1))} aria-label="다음 해" disabled={Y >= MAX_YEAR}>▶</button>
      </header>
      <p className={`yx-complete ${kr.length ? '' : 'none'}`}>
        {kr.length
          ? <>이 해로 날짜가 확인된 항목 <b>{kr.length}</b>개{empty.length ? ` · 자료 없음: ${empty.map((l) => LANE_KO[l]).join(', ')}` : ''}</>
          : <>{Y}년으로 날짜가 확인된 자료가 아직 없습니다. 다른 해의 내용을 가져와 채우지 않습니다.</>}
      </p>
      {laneOrder.map((l) => (
        <div key={l} className="yx-group">
          <h3><span className={`yx-dot lane-${l}`} aria-hidden />{LANE_KO[l]}</h3>
          <ul>{byLane[l]!.map((n) => <Item key={n.id} n={n} />)}</ul>
        </div>
      ))}
      {intl.length > 0 && (
        <div className="yx-group intl">
          <h3>국제 정세 → 한국</h3>
          <ul>{intl.map(({ n, toKr }) => <Item key={n.id} n={n} extra={toKr.length ? `한국 쪽 연결: ${short(toKr[0].label, 18)}${toKr.length > 1 ? ` 외 ${toKr.length - 1}` : ''}` : '한국과 직접 연결된 근거는 아직 없음'} />)}</ul>
        </div>
      )}
      {from.length > 0 && <div className="yx-group"><h3>이전 해에서 이어진 변화</h3><ul>{from.map((e) => <EdgeItem key={e.id} e={e} dir="from" />)}</ul></div>}
      {to.length > 0 && <div className="yx-group"><h3>이후로 이어지는 변화</h3><ul>{to.map((e) => <EdgeItem key={e.id} e={e} dir="to" />)}</ul></div>}
      {eraWide.length > 0 && <div className="yx-group"><h3>{era?.label} 전반 <span className="muted small">(연도를 특정하지 못한 항목)</span></h3><ul>{eraWide.map((n) => <Item key={n.id} n={n} />)}</ul></div>}
    </section>
  );
}
