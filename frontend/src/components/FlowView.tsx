import { Fragment, useEffect, useRef, useState } from 'react';
import type { CountryCode, Era, EraId, HistoricalEvent } from '../domain/types';
import { Claim, useApp } from './Claims';
import { DOMAINS, eraClaimIds } from './DomainBoard';
import { COUNTRY, LINK } from '../labels';
import { IndicatorChart } from './IndicatorChart';
import { Evidence, ParallelCard, SignalTrackView } from './PatternView';

/**
 * 세계와 한국의 흐름 — 1960년부터 지금까지 한 화면에서.
 * 왼쪽: 세계(한국 외 국가), 오른쪽: 한국, 가운데: 세계와 한국을 함께 다룬 근거(연결 고리).
 * 새 데이터를 만들지 않고 기존 시대·국가 비교·사건·시대 연결 데이터를 그대로 사용한다.
 */
const year = (d: string) => d.slice(0, 4);
const isKR = (cs: CountryCode[]) => cs.includes('KR');
const onlyKR = (cs: CountryCode[]) => cs.length > 0 && cs.every((c) => c === 'KR');

function EventList({ events }: { events: HistoricalEvent[] }) {
  const { openClaim } = useApp();
  if (!events.length) return <p className="muted small">이 시대의 핵심 사건은 아직 정리하지 않았습니다.</p>;
  return (
    <ul className="flow-events">
      {events.map((e) => (
        <li key={e.id}>
          <span className="flow-year">{year(e.date)}</span>
          {e.claimIds[0]
            ? <button className="linkish" onClick={() => openClaim(e.claimIds[0])}>{e.title}</button>
            : <span>{e.title}</span>}
        </li>
      ))}
    </ul>
  );
}

function EraRow({ era, onEra }: { era: Era; onEra: (id: EraId) => void }) {
  const { data } = useApp();
  const evs = data.events.filter((e) => e.eraId === era.id && e.priority <= 2).sort((a, b) => a.date.localeCompare(b.date));
  const world = evs.filter((e) => !onlyKR(e.countries));
  const korea = evs.filter((e) => isKR(e.countries));
  const kr = era.countries.find((c) => c.country === 'KR');
  const others = era.countries.filter((c) => c.country !== 'KR');
  // 세계와 한국을 함께 다룬 근거 = 이 시대에 작성된 문장 중 국가 목록에 한국과 다른 나라가 같이 있는 것.
  // 해석(종합) 문장 → 확인됨 → 출처 있음 순으로 우선한다. 다른 시대 문장(배경으로 인용된 것)은 제외.
  const prefix = `c${String(era.startYear).slice(2, 3)}0-`;
  const rank = (id: string) => {
    const c = data.claims[id];
    return (c.claimType === 'interpretation' ? 0 : c.claimType === 'hypothesis' ? 3 : 1) + (c.status === 'verified' ? 0 : 0.5);
  };
  const bridges = eraClaimIds(era, Object.keys(data.claims))
    .filter((id) => id.startsWith(prefix) && data.claims[id])
    .filter((id) => { const cs = data.claims[id].countries; return isKR(cs) && cs.some((c) => c !== 'KR'); })
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, 3);
  const open = era.analysisStatus === 'planned';

  return (
    <section className="flow-row" aria-label={era.label}>
      <div className="flow-era">
        <button className="flow-era-btn" onClick={() => onEra(era.id)}>
          <span className="flow-era-label">{era.label}</span>
          <span className="flow-era-title">{era.title}</span>
        </button>
        {era.glance.keyCause && <p className="small">{era.glance.keyCause}</p>}
      </div>
      <div className="flow-cols">
        <div className="flow-col world">
          <div className="eyebrow">세계</div>
          {others.length ? others.map((c) => (
            <p key={c.country} className="small"><b>{COUNTRY[c.country]}</b> {c.situation}</p>
          )) : <p className="muted small">{open ? '분석 예정' : '국가별 비교 자료가 아직 없습니다.'}</p>}
          <EventList events={world} />
        </div>
        <div className="flow-col bridge">
          <div className="eyebrow">세계 → 한국</div>
          {bridges.length
            ? bridges.map((id) => <p key={id} className="small"><Claim id={id} /></p>)
            : <p className="muted small">세계와 한국을 함께 다룬 근거가 아직 없습니다. 근거 없이 연결하지 않습니다.</p>}
        </div>
        <div className="flow-col korea">
          <div className="eyebrow">한국</div>
          {kr ? <>
            <p className="small">{kr.situation}</p>
            {kr.lifestyle && <p className="small muted">생활: {kr.lifestyle}</p>}
            {kr.whyDifferent && <p className="small muted">왜 달랐나: {kr.whyDifferent}</p>}
          </> : <p className="muted small">{open ? '분석 예정' : '한국 비교 자료가 아직 없습니다.'}</p>}
          <EventList events={korea} />
        </div>
      </div>
    </section>
  );
}

const domainLabel = (e: HistoricalEvent) => DOMAINS.find((d) => e.domains.includes(d.key) || d.also?.some((a) => e.domains.includes(a)))?.label ?? '';

/**
 * ERA HIGHLIGHTS — 시대에서 가장 두드러진 변화를 3단계로 나눈다. 기준은 화면에 공개한다.
 * - 핵심 동력: 이 시대 사건의 근거 문장이 '다음 시대로의 연결'(WHY FLOW)에 쓰인 것 = 영향이 다음 시대로 이어졌다는 근거가 있음
 * - 주요 변화: 그 밖의 중요도 1·2 사건
 * - 새 신호: 이 시대에 시작해 다음 시대에 커진 흐름(신호 추적 데이터)
 */
function EraHighlights({ era }: { era: Era }) {
  const { data, openClaim } = useApp();
  const out = data.transitions.find((t) => t.fromEra === era.id);
  const linkOf = (e: HistoricalEvent) => out?.links.find((l) => l.claimIds.some((c) => e.claimIds.includes(c)));
  const evs = data.events.filter((e) => e.eraId === era.id && e.priority <= 2)
    .sort((a, b) => a.priority - b.priority || a.date.localeCompare(b.date));
  const drivers = evs.filter((e) => linkOf(e));
  // 사건과 직접 겹치지 않는 연결도 '다음 시대로 이어진 동력'이므로 연결 자체를 항목으로 보여준다
  const linkOnly = (out?.links ?? []).filter((l) => !drivers.some((e) => linkOf(e)?.id === l.id));
  const majors = evs.filter((e) => !linkOf(e)).slice(0, 6);
  const signals = (data.patterns?.signals ?? []).filter((s) => s.steps[0].eraId === era.id);
  const watch = (data.patterns?.parallels ?? []).filter((p) => p.b.eraId === era.id)
    .flatMap((p) => p.future.signals.map((s) => ({ s, p: p.id })));
  const Item = ({ e, extra }: { e: HistoricalEvent; extra?: string }) => (
    <li>
      <span className="hl-meta">{e.date.slice(0, 4)} · {domainLabel(e)}</span>
      <button className="linkish" onClick={() => e.claimIds[0] && openClaim(e.claimIds[0])}>{e.title}</button>
      {extra && <span className="small muted hl-extra">→ {extra}</span>}
    </li>
  );
  return (
    <section className="era-hl" aria-label="시대 하이라이트">
      <div className="hl-col driver">
        <h3>핵심 동력 <span className="muted small">{drivers.length + linkOnly.length}</span></h3>
        <p className="hl-rule">다음 시대로 이어졌다는 근거가 있는 변화</p>
        {drivers.length + linkOnly.length ? <ul>
          {drivers.map((e) => <Item key={e.id} e={e} extra={linkOf(e)!.toLabel} />)}
          {linkOnly.map((l) => (
            <li key={l.id}><span className="hl-meta">{LINK[l.linkType]}</span>{l.fromLabel} <Evidence ids={l.claimIds} />
              <span className="small muted hl-extra">→ {l.toLabel}</span></li>
          ))}
        </ul>
          : <p className="small muted">{out ? '다음 시대와 연결된 근거가 있는 사건이 아직 없습니다.' : '다음 시대가 아직 오지 않아 판단할 수 없습니다.'}</p>}
      </div>
      <div className="hl-col major">
        <h3>주요 변화 <span className="muted small">{majors.length}</span></h3>
        <p className="hl-rule">중요도 1·2로 분류한 그 밖의 사건</p>
        {majors.length ? <ul>{majors.map((e) => <Item key={e.id} e={e} />)}</ul> : <p className="small muted">없음</p>}
      </div>
      <div className="hl-col signal">
        <h3>새 신호 <span className="muted small">{signals.length}</span></h3>
        <p className="hl-rule">이 시대에 시작해 다음 시대에 커진 흐름</p>
        {signals.length ? <ul>{signals.map((s) => (
          <li key={s.id}><b>{s.title}</b> <span className="small muted">{s.steps.map((st) => st.label).join(' → ')}</span></li>
        ))}</ul> : !out && watch.length ? <>
          <p className="small">현재 시대라 다음 시대를 아직 알 수 없습니다. 비슷한 과거 상황에서 뽑은 <b>지켜볼 신호</b>(제작자 제안):</p>
          <ul>{watch.map((w) => <li key={w.s}>{w.s} <a className="small" href={`#pattern-${w.p}`}>왜?</a></li>)}</ul>
        </> : <p className="small muted">이 시대에서 시작한 것으로 추적한 신호는 아직 없습니다.</p>}
      </div>
    </section>
  );
}

/** WHY FLOW — 앞 시대에서 이어진 것 / 다음 시대로 이어진 것 */
function WhyFlow({ era, onTransition }: { era: Era; onTransition: (from: EraId) => void }) {
  const { data } = useApp();
  const inc = data.transitions.find((t) => t.toEra === era.id);
  const out = data.transitions.find((t) => t.fromEra === era.id);
  const Links = ({ t }: { t: NonNullable<typeof inc> }) => (
    <ul className="why-links">
      {t.links.map((l) => (
        <li key={l.id}>
          <span className="why-from">{l.fromLabel}</span><span aria-hidden className="why-arrow">→</span><span className="why-to">{l.toLabel}</span>
          <span className="small muted why-mech">{l.mechanism} · {LINK[l.linkType]}</span> <Evidence ids={l.claimIds} />
        </li>
      ))}
    </ul>
  );
  return (
    <section className="why-flow">
      <div>
        <h3>앞 시대에서 이어진 것</h3>
        {inc && inc.links.length ? <><Links t={inc} /><button className="linkish small" onClick={() => onTransition(inc.fromEra)}>연결 자세히</button></>
          : <p className="small muted">{era.id === '1960s' ? '1960년 이전은 다루지 않습니다.' : '연결 분석 예정'}</p>}
      </div>
      <div>
        <h3>다음 시대로 이어진 것</h3>
        {out && out.links.length ? <><Links t={out} /><button className="linkish small" onClick={() => onTransition(era.id)}>연결 자세히</button></>
          : <p className="small muted">{out ? '연결 분석 예정' : '현재 진행 중인 시대입니다. 아래 비슷한 과거 상황과 지켜볼 신호를 참고하세요.'}</p>}
      </div>
    </section>
  );
}

function SimilarHere({ era }: { era: Era }) {
  const { data } = useApp();
  const P = data.patterns;
  if (!P) return null;
  const pars = P.parallels.filter((p) => p.a.eraId === era.id || p.b.eraId === era.id);
  const sigs = P.signals.filter((s) => s.steps.some((st) => st.eraId === era.id));
  return (
    <section className="similar-here">
      <h3>비슷한 현상 찾기</h3>
      {pars.length
        ? <div className="par-list">{pars.map((p) => <ParallelCard key={p.id} p={p} compact />)}</div>
        : <p className="small muted">이 시대를 다른 시대와 비교한 사례는 아직 없습니다. 근거가 모이면 추가합니다.</p>}
      {sigs.length > 0 && <>
        <h4>이 시대를 지나간 흐름</h4>
        <div className="sig-list">{sigs.map((s) => <SignalTrackView key={s.id} s={s} focus={era.id} />)}</div>
      </>}
      <p className="small"><a href="#patterns">반복 주기 탐색과 전체 비교 보기 →</a></p>
    </section>
  );
}

export function FlowView({ focus, onEra, onTransition }: { focus?: EraId; onEra: (id: EraId) => void; onTransition: (from: EraId) => void }) {
  const { data } = useApp();
  const [all, setAll] = useState(false);
  const strip = useRef<HTMLElement>(null);
  // 좁은 화면에서 고른 시대가 띠 밖에 있으면 띠만 가로로 움직여 보이게 한다(페이지는 움직이지 않음)
  useEffect(() => {
    const el = strip.current?.querySelector<HTMLElement>('.strip-era.on');
    if (strip.current && el) strip.current.scrollLeft = el.offsetLeft - strip.current.offsetLeft - 16;
  }, [focus]);
  const idx = Math.max(0, data.eras.findIndex((e) => e.id === focus));
  const era = data.eras[idx];
  const prev = data.eras[idx - 1];
  const next = data.eras[idx + 1];
  return (
    <article className="flow-view">
      <div className="eyebrow">HISTORY FLOW · 1960 → 현재</div>
      <h1>세계와 한국의 흐름</h1>
      <p className="lede">시대를 고르면 그 시대에 가장 두드러진 변화, 앞뒤 시대와의 연결, 비슷한 과거·현재 상황이 함께 나옵니다.</p>
      {data.indicators.filter((i) => i.id === 'gdp-growth').map((i) => (
        <section key={i.id} className="flow-chart"><IndicatorChart ind={i} height={240} highlightEra={era.id} /></section>
      ))}
      <nav className="flow-strip" aria-label="시대 선택" ref={strip}>
        {data.eras.map((e, i) => (
          <Fragment key={e.id}>
            <a href={`#flow-${e.id}`} className={`strip-era${e.id === era.id ? ' on' : ''}`} aria-current={e.id === era.id ? 'true' : undefined}>
              <span className="strip-label">{e.label}</span>
              <span className="strip-title">{e.title}</span>
            </a>
            {i < data.eras.length - 1 && <span className="strip-arrow" aria-hidden>→</span>}
          </Fragment>
        ))}
      </nav>

      <section className="era-focus" aria-label={`${era.label} 흐름`}>
        <header className="focus-head">
          <div>
            <div className="eyebrow">{era.startYear}~{era.endYear ?? '현재'}</div>
            <h2>{era.label} — {era.title}</h2>
            {era.glance.keyCause && <p>{era.glance.keyCause}</p>}
          </div>
          <div className="focus-nav">
            {prev && <a href={`#flow-${prev.id}`}>← {prev.label}</a>}
            <button className="linkish" onClick={() => onEra(era.id)}>이 시대 자세히</button>
            {next && <a href={`#flow-${next.id}`}>{next.label} →</a>}
          </div>
        </header>
        <h3 className="sec-title">ERA HIGHLIGHTS — 무엇이 두각을 나타냈나</h3>
        <EraHighlights era={era} />
        <h3 className="sec-title">WHY FLOW — 어디서 와서 어디로 이어졌나</h3>
        <WhyFlow era={era} onTransition={onTransition} />
        <h3 className="sec-title">세계와 한국</h3>
        <div className="flow-head" aria-hidden><span>세계</span><span>세계 → 한국</span><span>한국</span></div>
        <EraRow era={era} onEra={onEra} />
        <SimilarHere era={era} />
      </section>

      <button className="linkish all-toggle" onClick={() => setAll(!all)} aria-expanded={all}>
        {all ? '모든 시대 접기' : '모든 시대를 한 번에 보기 (세계·한국 나란히)'}
      </button>
      {all && <div className="flow-all">
        <div className="flow-head" aria-hidden><span>세계</span><span>세계 → 한국</span><span>한국</span></div>
        {data.eras.map((e, i) => {
          const t = data.transitions.find((x) => x.fromEra === e.id);
          const nx = data.eras[i + 1];
          return (
            <Fragment key={e.id}>
              <EraRow era={e} onEra={onEra} />
              {nx && (
                <button className="flow-link" onClick={() => onTransition(e.id)}>
                  <span className="arrow" aria-hidden>↓</span>
                  <span><b>{e.label} → {nx.label}</b> {t && t.links.length ? t.summary : '연결 분석 예정'}</span>
                </button>
              )}
            </Fragment>
          );
        })}
      </div>}
    </article>
  );
}
