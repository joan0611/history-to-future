import { useEffect, useState } from 'react';
import type { CountryCode, Lane } from '../../domain/types';
import { useApp } from '../Claims';
import { HistoryMap } from './HistoryMap';
import { YearExplorer } from './YearExplorer';
import { CausalExplorer } from './CausalExplorer';
import { ALL_LANES, EXTRA_COUNTRIES, LANE_KO, MAX_YEAR, MIN_YEAR, exploreHash, indexGraph, type ExploreState } from './state';

/** 첫 화면: 대한민국 1960~현재 역사 흐름 지도 + 연도 탐색 + 원인·결과 탐색. 상태는 모두 주소에 저장. */
export function ExploreView({ st }: { st: ExploreState }) {
  const { data } = useApp();
  const idx = indexGraph(data);
  const narrow = useNarrow();
  const [ppy, setPpy] = useState(narrow ? 22 : 30);
  const go = (s: Partial<ExploreState>) => { location.hash = exploreHash({ ...st, ...s }); };
  const node = st.n && idx.byId[st.n] ? idx.byId[st.n] : undefined;

  const openFromMap = (id: string) => {
    const n = idx.byId[id];
    go({ n: id, p: [id], e: undefined, y: n.yearPrecision === 'year' && n.year >= MIN_YEAR ? n.year : st.y });
  };
  const deeper = (id: string) => go({ n: id, p: [...st.p.filter((x) => idx.byId[x]), id].slice(-12), e: undefined });
  const back = () => { const p = st.p.slice(0, -1); go({ p, n: p[p.length - 1], e: undefined }); };
  const home = () => go({ n: undefined, p: [], e: undefined });
  const toggleLane = (l: Lane) => {
    const f = st.f.includes(l) ? st.f.filter((x) => x !== l) : [...st.f, l];
    go({ f: f.length ? ALL_LANES.filter((x) => f.includes(x)) : ALL_LANES });
  };
  const toggleCountry = (c: CountryCode) => go({ c: st.c.includes(c) ? st.c.filter((x) => x !== c) : [...st.c, c] });

  // 선택 노드가 바뀌면 상세 영역으로(모바일에서 지도 아래로 이동)
  useEffect(() => {
    if (node && narrow) document.querySelector('.cx')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [node?.id, narrow]);

  return (
    <article className="explore">
      <header className="ex-head">
        <div>
          <div className="eyebrow">HISTORY FLOW · 대한민국 1960 → 현재</div>
          <h1>대한민국은 어떻게 여기까지 왔나</h1>
        </div>
        <div className="ex-year">
          <label htmlFor="ex-y" className="small muted">연도</label>
          <button onClick={() => go({ y: Math.max(MIN_YEAR, st.y - 1) })} aria-label="이전 해" disabled={st.y <= MIN_YEAR}>◀</button>
          <input id="ex-y" type="range" min={MIN_YEAR} max={MAX_YEAR} value={st.y} onChange={(e) => go({ y: Number(e.target.value), n: undefined, p: [], e: undefined })} />
          <output htmlFor="ex-y" className="ex-y-out">{st.y}</output>
          <button onClick={() => go({ y: Math.min(MAX_YEAR, st.y + 1) })} aria-label="다음 해" disabled={st.y >= MAX_YEAR}>▶</button>
        </div>
      </header>

      <div className="ex-filters">
        <div className="chips" role="group" aria-label="시대로 이동">
          {data.eras.map((e) => (
            <button key={e.id} className={`chip${st.y >= e.startYear && st.y <= (e.endYear ?? MAX_YEAR) ? ' on' : ''}`}
              onClick={() => go({ y: e.id === '1970s' ? 1973 : e.startYear, n: undefined, p: [], e: undefined })}>{e.label.replace('~현재', '')}</button>
          ))}
        </div>
        <div className="chips" role="group" aria-label="분야">
          {ALL_LANES.map((l) => (
            <button key={l} className={`chip lane-chip lane-${l}${st.f.includes(l) ? ' on' : ''}`} aria-pressed={st.f.includes(l)} onClick={() => toggleLane(l)}>{LANE_KO[l]}</button>
          ))}
        </div>
        <div className="chips" role="group" aria-label="함께 볼 나라">
          <span className="chip fixed on" title="한국은 항상 표시">한국</span>
          {EXTRA_COUNTRIES.map((c) => (
            <button key={c.code} className={`chip${st.c.includes(c.code) ? ' on' : ''}`} aria-pressed={st.c.includes(c.code)} onClick={() => toggleCountry(c.code)}>+ {c.label}</button>
          ))}
          <span className="ex-zoom">
            <button onClick={() => setPpy((p) => Math.max(14, p - 6))} aria-label="지도 축소">－</button>
            <button onClick={() => setPpy((p) => Math.min(80, p + 6))} aria-label="지도 확대">＋</button>
          </span>
        </div>
      </div>

      <NodeSearch onPick={openFromMap} />
      <HistoryMap st={st} ppy={ppy} onYear={(y) => go({ y, n: undefined, p: [], e: undefined })} onNode={openFromMap} />
      <p className="ex-legend small muted">
        점 크기 = 중요도 · 막대(위) = 그 해 자료 수(가로선 = 자료 없음) · 점선 테두리 = 연도 불명확 · ◆ = 유행·트렌드 · 다른 나라 항목은 위 버튼으로 추가하거나, 항목을 고르면 연결된 것만 펼쳐집니다.
      </p>

      {node
        ? <CausalExplorer st={st} onNode={deeper} onBack={back} onHome={home} onEdge={(e) => go({ e })}
            onCrumb={(i) => go({ n: st.p[i], p: st.p.slice(0, i + 1), e: undefined })} />
        : <YearExplorer st={st} onNode={openFromMap} onYear={(y) => go({ y })} />}
    </article>
  );
}

function useNarrow() {
  const [n, setN] = useState(() => window.innerWidth < 760);
  useEffect(() => {
    const h = () => setN(window.innerWidth < 760);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return n;
}

/** 이름으로 찾기 — 사건을 알고 있을 때 바로 이동(모르면 지도·연도에서 발견) */
function NodeSearch({ onPick }: { onPick: (id: string) => void }) {
  const { data } = useApp();
  const [q, setQ] = useState('');
  const hits = q.trim().length < 2 ? [] : data.graph.nodes
    .filter((n) => (n.label + ' ' + (n.aliases ?? []).join(' ')).toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => a.importance - b.importance || b.degree - a.degree).slice(0, 8);
  return (
    <div className="ex-search">
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="찾기: 석유파동, 유신, 포크, 외환위기…" aria-label="항목 찾기" />
      {hits.length > 0 && (
        <ul role="listbox">
          {hits.map((n) => (
            <li key={n.id}><button onClick={() => { setQ(''); onPick(n.id); }}>
              <span className="muted small">{n.yearPrecision === 'era' ? n.eraId : n.year}</span> {n.label} <span className="muted small">· {data.graph.nodeTypes[n.nodeType]}</span>
            </button></li>
          ))}
        </ul>
      )}
      {q.trim().length >= 2 && hits.length === 0 && <p className="small muted">찾는 항목이 없습니다.</p>}
    </div>
  );
}
