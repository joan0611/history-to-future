import type { CaseStudy, EraTransition } from '../domain/types';
import { Claim, Paragraph, useApp } from './Claims';
import { eraClaimIds } from './DomainBoard';
import { ACCESS, ANALYSIS, CHAIN_STAGE, COUNTRY, LINK } from '../labels';

export function TransitionView({ t, onEra }: { t: EraTransition; onEra: (id: EraTransition['fromEra']) => void }) {
  const { data } = useApp();
  const from = data.eras.find((e) => e.id === t.fromEra)!;
  const to = data.eras.find((e) => e.id === t.toEra)!;
  return (
    <article className="transition">
      <div className="eyebrow">시대 연결</div>
      <h1><button className="linkish" onClick={() => onEra(from.id)}>{from.label}</button> → <button className="linkish" onClick={() => onEra(to.id)}>{to.label}</button></h1>
      <p className="lede">{t.summary}</p>
      {t.links.length === 0 && <p className="muted">이 연결은 아직 분석하지 않았습니다. 근거 없이 연결선을 그리지 않습니다.</p>}
      <div className="links">
        {t.links.map((l) => (
          <div key={l.id} className={`link-card lt-${l.linkType}`}>
            <div className="link-row"><span className="from">{l.fromLabel}</span><span className={`arrow lt-${l.linkType}`} aria-hidden>⟶</span><span className="to">{l.toLabel}</span></div>
            <div className="eyebrow"><span className={`lt-badge lt-${l.linkType}`}>{LINK[l.linkType]}</span> 작동 방식: {l.mechanism}</div>
            <p className="small">{l.claimIds.map((c) => <Claim key={c} id={c} />)}</p>
          </div>
        ))}
      </div>
      <p className="muted small">선 모양: 실선 = 근거 있는 인과 · 이중선 = 통계적 상관 · 점선 = 해석 · 회색 점선 = 검증 전 가설</p>
    </article>
  );
}

export function CaseView({ cs, onEra }: { cs: CaseStudy; onEra: (id: CaseStudy['eraId']) => void }) {
  return (
    <article className="case">
      <div className="eyebrow">심층 사례 · <button className="linkish" onClick={() => onEra(cs.eraId)}>{cs.eraId}</button> · {ANALYSIS[cs.status]}</div>
      <h1>{cs.title}</h1>
      <p className="lede">{cs.summary}</p>
      <h2>WHY 체인</h2>
      <ol className="why-chain">
        {cs.whyChain.map((s) => (
          <li key={s.stage}><div className="eyebrow">{CHAIN_STAGE[s.stage]}</div><Paragraph ids={s.claimIds} /></li>
        ))}
      </ol>
      <h2>상반된 해석</h2>
      <div className="competing">
        {cs.competingExplanations.map((c) => (
          <div key={c.thesis} className="thesis">
            <h4>{c.thesis}</h4>
            <div className="muted">{c.proponents}</div>
            <p className="small">{c.supportClaimIds.map((x) => <Claim key={x} id={x} />)}</p>
            <p className="small"><b>한계</b> {c.limits}</p>
          </div>
        ))}
      </div>
      <h2>국가별 대응</h2>
      <div className="country-grid">
        {cs.countryResponses.map((c) => (
          <div key={c.country} className="country"><h4>{COUNTRY[c.country]}</h4><p>{c.situation}</p>
            <p className="small">{c.claimIds.map((x) => <Claim key={x} id={x} />)}</p></div>
        ))}
      </div>
    </article>
  );
}

export function StatusView({ providerLabel }: { providerLabel: string }) {
  const { data } = useApp();
  const claims = Object.values(data.claims);
  const count = (f: (c: (typeof claims)[0]) => boolean) => claims.filter(f).length;
  const docs = Object.values(data.documents);
  return (
    <article className="status">
      <h1>개발 현황과 데이터 신뢰도</h1>
      <p className="lede">이 화면은 실제로 확인한 범위와 확인하지 못한 범위를 숨기지 않기 위해 있습니다.</p>
      <div className="stat-row">
        <div><b>{claims.length}</b><span>문장(Claim)</span></div>
        <div><b>{count((c) => c.status === 'verified')}</b><span>독립 출처 2개+ 일치</span></div>
        <div><b>{count((c) => c.status === 'sourced')}</b><span>출처 1개</span></div>
        <div><b>{count((c) => c.status === 'needs_source')}</b><span>출처 필요</span></div>
        <div><b>{Object.keys(data.sources).length}</b><span>출처</span></div>
      </div>
      <h2>시대별 진행 상태</h2>
      <table className="doc-table">
        <thead><tr><th>시대</th><th>상태</th><th>문장</th><th>1차 사료</th><th>부족한 부분</th></tr></thead>
        <tbody>{data.eras.map((e) => {
          const ids = new Set(eraClaimIds(e));
          return (<tr key={e.id}><td>{e.label}</td><td><span className={`badge as-${e.analysisStatus}`}>{ANALYSIS[e.analysisStatus]}</span></td>
            <td>{ids.size}</td><td>{e.documentIds.length}</td><td className="small">{e.gaps.join(' · ')}</td></tr>);
        })}</tbody>
      </table>
      <h2>1차 사료 열람 수준</h2>
      <ul>{(['original', 'archive_metadata', 'secondary', 'unverified'] as const).map((k) => (
        <li key={k}><span className={`access access-${ACCESS[k].n}`}>{ACCESS[k].n}</span> {ACCESS[k].label}: {docs.filter((d) => d.verification.accessLevel === k).length}건</li>
      ))}</ul>
      <h2>신문 아카이브 접근성</h2>
      <table className="doc-table">
        <thead><tr><th>아카이브</th><th>기간</th><th>조건</th><th>개발환경 접근</th></tr></thead>
        <tbody>{data.archives.map((a) => (
          <tr key={a.id}><td><a href={a.url} target="_blank" rel="noreferrer">{a.name}</a></td><td>{a.coverage}</td><td className="small">{a.access} · {a.license}</td>
            <td>{a.reachableFromDevEnv ? '가능' : <span className="warn">차단 — 사용자 측 열람 필요</span>}</td></tr>
        ))}</tbody>
      </table>
      <h2>기능 구현 현황</h2>
      <table className="doc-table">
        <thead><tr><th>기능</th><th>상태</th></tr></thead>
        <tbody>{FEATURES.map(([f, st]) => (
          <tr key={f}><td>{f}</td><td>{st === 'done' ? <span className="ok">작동</span> : st === 'partial' ? <span className="partial">일부</span> : <span className="muted">미구현</span>}</td></tr>
        ))}</tbody>
      </table>
      <h2>기술 상태</h2>
      <ul>
        <li>데이터 공급원: {providerLabel}</li>
        <li>빌드 지문: <code>{__BUILD_ID__}</code> — 프로젝트 폴더에서 <code>npm run fingerprint</code> 결과와 같으면 이 화면은 현재 코드와 같습니다.</li>
        <li>프런트엔드: React 18 + TypeScript (Vite). API 계약은 FastAPI·PostgreSQL 스키마와 같은 구조.</li>
        <li>구현되지 않은 것: 자동 수집·업데이트, 검색·AI 질의응답, 세계지도, 지표 자동 수집, 유행 재등장 분석, 미래 전망 엔진, 투자 분석</li>
      </ul>
    </article>
  );
}

const FEATURES: [string, 'done' | 'partial' | 'todo'][] = [
  ['1960년~현재 시대 탐색 (시간축·시대 연결)', 'done'],
  ['한눈에 보기 / 흐름 이해 / 심층 분석', 'done'],
  ['분야별 변화 (정치·경제·산업·기술·문화·소비·직업)', 'done'],
  ['문장별 출처·검증 상태 확인', 'done'],
  ['1차 사료(신문·잡지·정부조사) 열람 수준 표시', 'done'],
  ['광고와 현실 비교 · 트렌드→산업→직업 체인', 'partial'],
  ['국가별 동시대 비교', 'partial'],
  ['심층 사례: 1973 석유파동 · 1997 외환위기 (상반된 해석 비교)', 'done'],
  ['1960년~현재 7개 시대 심층 분석', 'done'],
  ['HISTORY FLOW: 시대 띠 + 시대 집중 화면 (첫 화면)', 'done'],
  ['ERA HIGHLIGHTS: 핵심 동력 / 주요 변화 / 새 신호 (분류 기준 공개)', 'done'],
  ['WHY FLOW: 앞 시대에서 이어진 것 / 다음 시대로 이어진 것', 'done'],
  ['PATTERN DISCOVERY: 성장률 반복 주기·국가 간 시차 계산, 10개 분야 결과', 'partial'],
  ['SIMILAR ERA FINDER: 비슷한 상황 비교 3쌍 (8개 기준, 점수 계산식 공개)', 'partial'],
  ['새 신호 추적 (6개 흐름)', 'partial'],
  ['유행의 재등장 (복고·LP 등)', 'todo'],
  ['2008 금융위기 심층 사례', 'todo'],
  ['경제지표 차트 6종 (성장률·출산율·1인 가구·온라인쇼핑·물가·PC방)', 'done'],
  ['경제지표 자동 데이터 수집', 'todo'],
  ['AI 질의응답·검색', 'todo'],
  ['세계지도·WORLD HISTORY PLAYER', 'todo'],
  ['미래 산업·직업 전망, 투자 분석', 'todo'],
];
