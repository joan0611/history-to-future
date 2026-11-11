import { useState } from 'react';
import type { Era, EraId } from '../domain/types';
import { Claim, Paragraph, useApp } from './Claims';
import { DomainBoard } from './DomainBoard';
import { IndicatorChart } from './IndicatorChart';
import { ACCESS, ANALYSIS, ATMOS_Q, CHAIN_STAGE, COUNTRY, DIRECTION, LINK } from '../labels';

export type Depth = 'glance' | 'flow' | 'deep';

export function EraView({ era, next, depth, setDepth, onTransition, onCase }: {
  era: Era; next?: Era; depth: Depth; setDepth: (d: Depth) => void;
  onTransition: (from: EraId) => void; onCase: (id: string) => void;
}) {
  return (
    <article className="era">
      <header className="era-head">
        <div className="eyebrow">{era.startYear}–{era.endYear ?? '현재'} · <span className={`badge as-${era.analysisStatus}`}>{ANALYSIS[era.analysisStatus]}</span></div>
        <h1>{era.label}<span className="era-title">{era.title}</span></h1>
        <div className="depth" role="tablist" aria-label="설명 깊이">
          {([['glance', '한눈에 보기'], ['flow', '흐름 이해'], ['deep', '심층 분석']] as const).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={depth === k} className={depth === k ? 'on' : ''} onClick={() => setDepth(k)}>{l}</button>
          ))}
        </div>
      </header>

      {depth === 'glance' && <Glance era={era} />}
      {depth === 'flow' && <Flow era={era} />}
      {depth === 'deep' && <Deep era={era} onCase={onCase} />}

      <EraIndicators era={era} />

      {era.gaps.length > 0 && (
        <section className="gaps">
          <h3>아직 부족한 부분</h3>
          <ul>{era.gaps.map((g) => <li key={g}>{g}</li>)}</ul>
        </section>
      )}

      {next && (
        <button className="next-era" onClick={() => onTransition(era.id)}>
          <span className="eyebrow">다음 시대로 이어진 변화</span>
          <span>{era.label}이 {next.label}에 남긴 것 →</span>
        </button>
      )}
    </article>
  );
}

function Glance({ era }: { era: Era }) {
  const pick = era.atmosphere.filter((a) => ['mood', 'dreams', 'differences'].includes(a.question));
  return (
    <div className="glance">
      <p className="lede">{era.glance.keyCause}</p>
      {pick.length > 0 && (
        <div className="atmos-cards">
          {pick.map((a) => (
            <div key={a.question} className="atmos-card"><div className="eyebrow">{ATMOS_Q[a.question]}</div><p>{a.answer}</p></div>
          ))}
        </div>
      )}
      <h3>핵심 변화</h3>
      <ol className="kc-list">
        {era.keyChanges.slice(0, 5).map((k) => (
          <li key={k.id}><strong>{k.title}</strong><span>{k.why}</span></li>
        ))}
      </ol>
      <h3>분야별 변화 — 정치·경제·산업·기술·문화·소비·직업</h3>
      <DomainBoard era={era} compact />
      {era.trends.length > 0 && (
        <>
          <h3>대표 문화·생활 트렌드</h3>
          <div className="chips">{era.trends.slice(0, 4).map((t) => <span key={t.id} className="chip">{t.title}</span>)}</div>
        </>
      )}
      {(era.industries.length > 0 || era.jobs.length > 0) && (
        <div className="two-col">
          <div>
            <h3>산업</h3>
            <ul className="dir-list">{era.industries.map((x) => <li key={x.industry}><span className={`dir d-${x.direction}`}>{DIRECTION[x.direction]}</span>{x.industry}</li>)}</ul>
          </div>
          <div>
            <h3>직업</h3>
            <ul className="dir-list">{era.jobs.map((x) => <li key={x.occupation}><span className={`dir d-${x.change}`}>{DIRECTION[x.change]}</span>{x.occupation}</li>)}</ul>
          </div>
        </div>
      )}
      <div className="legacy"><div className="eyebrow">다음 시대에 남긴 것</div><p>{era.glance.legacy}</p></div>
    </div>
  );
}

function Flow({ era }: { era: Era }) {
  return (
    <div className="flow">
      {era.atmosphere.length > 0 && (
        <section className="atmos">
          <h2>이 시대 사람들이 살던 세계</h2>
          <dl className="atmos-grid">
            {era.atmosphere.map((a) => (
              <div key={a.question}><dt>{ATMOS_Q[a.question]}</dt><dd>{a.answer}</dd></div>
            ))}
          </dl>
        </section>
      )}
      {era.background.map((p, i) => <Paragraph key={`b${i}`} heading={p.heading} ids={p.claimIds} />)}
      {era.flow.map((p, i) => <Paragraph key={i} heading={p.heading} ids={p.claimIds} />)}
      {era.trends.length > 0 && (
        <section>
          <h2>문화·생활 트렌드 — 왜 그때였나</h2>
          <div className="trend-grid">
            {era.trends.map((t) => (
              <div key={t.id} className="trend">
                <div className="eyebrow">{t.kind === 'cultural_trend' ? '문화 트렌드' : '생활 변화'} · 욕구: {t.need}</div>
                <h4>{t.title}</h4>
                <p>{t.whyThen}</p>
                <ul className="tl-mini">{t.timeline.map((x) => (
                  <li key={x.country}><b>{COUNTRY[x.country]}</b> {[x.emerged && `등장 ${x.emerged}`, x.popularized && `대중화 ${x.popularized}`, x.declined && `약화 ${x.declined}`].filter(Boolean).join(' · ')}</li>
                ))}</ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Deep({ era, onCase }: { era: Era; onCase: (id: string) => void }) {
  const { data, openDoc } = useApp();
  const [tab, setTab] = useState<'domains' | 'docs' | 'ads' | 'chains' | 'countries' | 'events'>('domains');
  const docs = era.documentIds.map((d) => data.documents[d]);
  const events = data.events.filter((e) => era.eventIds.includes(e.id)).sort((a, b) => a.date.localeCompare(b.date));
  const cases = data.caseStudies.filter((c) => era.caseStudyIds.includes(c.id));
  return (
    <div className="deep">
      {cases.map((c) => (
        <button key={c.id} className="case-link" onClick={() => onCase(c.id)}>
          <span className="eyebrow">심층 사례 · {ANALYSIS[c.status]}</span><span>{c.title} →</span>
        </button>
      ))}
      <div className="subtabs" role="tablist">
        {([['domains', '분야별 근거'], ['docs', `1차 사료 (${docs.length})`], ['ads', `광고와 현실 (${era.advertisements.length})`], ['chains', `트렌드→산업→직업 (${era.trendChains.length})`],
          ['countries', `국가 비교 (${era.countries.length})`], ['events', `사건 (${events.length})`]] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'domains' && <DomainBoard era={era} />}

      {tab === 'docs' && (
        docs.length ? (
          <table className="doc-table">
            <thead><tr><th>열람</th><th>자료</th><th>날짜</th><th>국가</th></tr></thead>
            <tbody>{docs.map((d) => {
              const a = ACCESS[d.verification.accessLevel];
              return (
                <tr key={d.id} onClick={() => openDoc(d.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && openDoc(d.id)}>
                  <td><span className={`access access-${a.n}`} title={a.label}>{a.n}</span></td>
                  <td><b>{d.publication}</b><div className="muted">{d.title}</div></td>
                  <td>{d.publishedDate}</td><td>{COUNTRY[d.country]}</td>
                </tr>
              );
            })}</tbody>
          </table>
        ) : <p className="muted">이 시대의 1차 사료는 아직 연결되지 않았습니다.</p>
      )}

      {tab === 'ads' && (era.advertisements.length ? era.advertisements.map((ad) => (
        <div key={ad.id} className="ad-card">
          <div className="eyebrow">{COUNTRY[ad.country]} · {ad.year} · 자극한 가치: {ad.appealedValues.join(', ')}</div>
          <h4>{ad.product}</h4>
          <div className="ad-vs">
            <div><div className="eyebrow">광고가 약속한 생활</div><p>{ad.promisedLife}</p></div>
            <div><div className="eyebrow">실제 보급·가격·소득</div><p>{ad.realityCheck}</p></div>
          </div>
          <p className="small">{ad.realityClaimIds.map((c) => <Claim key={c} id={c} />)}</p>
        </div>
      )) : <p className="muted">광고 분석이 아직 없습니다.</p>)}

      {tab === 'chains' && (era.trendChains.length ? era.trendChains.map((ch) => (
        <div key={ch.title} className="chain">
          <h4>{ch.title}</h4>
          <ol>{ch.steps.map((s, i) => (
            <li key={i} className={`lt-${s.linkType}`}>
              <div className="eyebrow">{CHAIN_STAGE[s.stage]} {i > 0 && <span className={`lt-badge lt-${s.linkType}`}>{LINK[s.linkType]}</span>}</div>
              <div>{s.text}</div>
              {s.claimIds.length > 0 && <div className="small">{s.claimIds.map((c) => <Claim key={c} id={c} />)}</div>}
            </li>
          ))}</ol>
        </div>
      )) : <p className="muted">연결 분석이 아직 없습니다.</p>)}

      {tab === 'countries' && (era.countries.length ? (
        <div className="country-grid">{era.countries.map((c) => (
          <div key={c.country} className="country">
            <h4>{COUNTRY[c.country]}</h4>
            <p>{c.situation}</p>
            {c.lifestyle && <p><span className="eyebrow">생활</span> {c.lifestyle}</p>}
            {c.whyDifferent && <p><span className="eyebrow">왜 달랐나</span> {c.whyDifferent}</p>}
            <p className="small">{c.claimIds.map((x) => <Claim key={x} id={x} />)}</p>
          </div>
        ))}</div>
      ) : <p className="muted">국가 비교가 아직 없습니다.</p>)}

      {tab === 'events' && (
        <ol className="events">{events.map((e) => (
          <li key={e.id} className={`p${e.priority}`}><time>{e.date}</time><span>{e.title}</span><span className="muted">{e.countries.map((k) => COUNTRY[k]).join(', ')}</span></li>
        ))}</ol>
      )}
    </div>
  );
}

/** 이 시대와 연결된 지표 차트. 시대 구간을 강조한다. 지표가 없으면 그렇다고 표시한다. */
function EraIndicators({ era }: { era: Era }) {
  const { data } = useApp();
  const inds = data.indicators.filter((i) => i.eraIds.includes(era.id));
  return (
    <section className="era-indicators">
      <h2>숫자로 보는 {era.label}</h2>
      {inds.length
        ? inds.map((i) => <IndicatorChart key={i.id} ind={i} highlightEra={era.id} height={i.series.length > 1 ? 230 : 190} />)
        : <p className="muted">이 시대의 지표는 아직 연결하지 않았습니다.</p>}
    </section>
  );
}
