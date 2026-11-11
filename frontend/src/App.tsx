import { useEffect, useMemo, useState } from 'react';
import { createProvider, type Dataset } from './data/provider';
import type { EraId } from './domain/types';
import { AppCtx, Legend } from './components/Claims';
import { Drawer, type DrawerState } from './components/Drawer';
import { Timeline } from './components/Timeline';
import { EraView, type Depth } from './components/EraView';
import { CaseView, StatusView, TransitionView } from './components/Views';
import { FlowView } from './components/FlowView';
import { ParallelDetail, PatternView } from './components/PatternView';

/** 해시 라우팅: #flow / #flow-1990s(기본, 흐름+시대 하이라이트) · #patterns · #pattern-<id> · #era-1960s · #transition-1960s · #case-cs-oil-1973 · #status */
const DEFAULT = 'flow';
const readHash = () => (location.hash.replace('#', '') || DEFAULT);

export default function App() {
  const provider = useMemo(createProvider, []);
  const [data, setData] = useState<Dataset | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [route, setRoute] = useState(readHash());
  const [depth, setDepth] = useState<Depth>('flow'); // 기본값 = 흐름 이해
  const [drawer, setDrawer] = useState<DrawerState>(null);

  useEffect(() => { provider.load().then(setData).catch((e) => setErr(String(e))); }, [provider]);
  useEffect(() => {
    const h = () => { setRoute(readHash()); setDrawer(null); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);

  const go = (r: string) => { location.hash = r; };
  if (err) return <div className="fatal">데이터를 불러오지 못했습니다: {err}</div>;
  if (!data) return <div className="loading">1960년부터 불러오는 중…</div>;

  const ctx = { data, openClaim: (id: string) => setDrawer({ kind: 'claim', id }), openDoc: (id: string) => setDrawer({ kind: 'doc', id }) };
  const onEra = (id: EraId) => go(`era-${id}`);
  const onTransition = (from: EraId) => go(`transition-${from}`);

  let body: JSX.Element;
  if (route.startsWith('transition-')) {
    const t = data.transitions.find((x) => x.fromEra === route.slice(11));
    body = t ? <TransitionView t={t} onEra={onEra} /> : <p>연결 정보를 찾을 수 없습니다.</p>;
  } else if (route.startsWith('case-')) {
    const cs = data.caseStudies.find((x) => x.id === route.slice(5));
    body = cs ? <CaseView cs={cs} onEra={onEra} /> : <p>사례를 찾을 수 없습니다.</p>;
  } else if (route === 'flow' || route.startsWith('flow-')) {
    body = <FlowView focus={(route.slice(5) || undefined) as EraId | undefined} onEra={onEra} onTransition={onTransition} />;
  } else if (route === 'patterns' || route.startsWith('pat-')) {
    body = <PatternView />;
  } else if (route.startsWith('pattern-')) {
    const p = data.patterns?.parallels.find((x) => x.id === route.slice(8));
    body = p ? <ParallelDetail p={p} /> : <p>비교 사례를 찾을 수 없습니다.</p>;
  } else if (route === 'status') {
    body = <StatusView providerLabel={provider.label} />;
  } else {
    const id = route.startsWith('era-') ? route.slice(4) : '1960s';
    const i = Math.max(0, data.eras.findIndex((e) => e.id === id));
    body = <EraView era={data.eras[i]} next={data.eras[i + 1]} depth={depth} setDepth={setDepth}
      onTransition={onTransition} onCase={(c) => go(`case-${c}`)} />;
  }

  return (
    <AppCtx.Provider value={ctx}>
      <header className="top">
        <a className="brand" href="#flow">HISTORY <span>TO</span> FUTURE</a>
        <p className="tagline">1960년부터 지금까지, 세계는 왜 이렇게 변했는가</p>
        <nav className="top-nav"><a href="#flow" className={route.startsWith('flow') ? 'on' : ''}>흐름</a><a href="#patterns" className={route.startsWith('pat') ? 'on' : ''}>반복 패턴</a><a href="#era-1960s" className={route.startsWith('era-') ? 'on' : ''}>시대별 분석</a><a className="status-link" href="#status">개발 현황·신뢰도</a></nav>
      </header>
      {!(route.startsWith('flow') || route.startsWith('pat')) && <Timeline data={data} current={route} onEra={onEra} onTransition={onTransition} />}
      <main className={route.startsWith('flow') || route.startsWith('pat') ? 'wide' : ''}>{body}</main>
      <footer className="foot"><Legend /><span className="build-id small muted">빌드 {__BUILD_ID__}</span></footer>
      <Drawer state={drawer} onClose={() => setDrawer(null)} />
    </AppCtx.Provider>
  );
}
