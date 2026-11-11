import { useState } from 'react';
import type { CountryCycleStats, EraId, Parallel, PhenomenonKind, SignalTrack, Verdict } from '../domain/types';
import { useApp } from './Claims';
import { COUNTRY } from '../labels';

/**
 * PATTERN DISCOVERY · SIMILAR ERA FINDER · 신호 추적.
 * 데이터는 data/build/patterns.py(판정)와 pattern_stats.py(계산)에서 온다. 화면은 계산하지 않고 보여주기만 한다.
 */

export const VERDICT: Record<Verdict, { label: string; cls: string }> = {
  same: { label: '같음', cls: 'v-same' },
  partial: { label: '부분적으로 같음', cls: 'v-partial' },
  different: { label: '다름', cls: 'v-diff' },
  unknown: { label: '자료 없음', cls: 'v-unknown' },
};

export const KIND: Record<PhenomenonKind, { label: string; order: number }> = {
  statistical: { label: '통계적으로 반복이 관찰됨', order: 0 },
  similar: { label: '비슷한 조건에서 다시 나타남', order: 1 },
  weak: { label: '반복처럼 보이지만 검증이 부족함', order: 2 },
  chance: { label: '우연히 비슷하게 보인 경우', order: 3 },
  none: { label: '반복 패턴이 발견되지 않음', order: 4 },
  insufficient: { label: '자료 부족 — 계산할 수 없음', order: 5 },
};

/** 근거 문장 버튼: 누르면 출처 창이 열린다. */
export function Evidence({ ids }: { ids: string[] }) {
  const { data, openClaim } = useApp();
  const ok = ids.filter((id) => data.claims[id]);
  if (!ok.length) return null;
  return (
    <span className="evidence">
      {ok.map((id, i) => (
        <button key={id} className="ev-btn" onClick={() => openClaim(id)} title={data.claims[id].text}>
          근거 {i + 1}
        </button>
      ))}
    </span>
  );
}

const eraLabel = (data: ReturnType<typeof useApp>['data'], id: EraId) => data.eras.find((e) => e.id === id)?.label ?? id;

// ---------------- 반복 주기 탐색 ----------------
function AcfBars({ c }: { c: CountryCycleStats }) {
  const W = 420, H = 170, l = 34, r = 6, t = 8, b = 20;
  const R = Math.max(0.5, Math.ceil(Math.max(c.band, ...c.acf.map(Math.abs)) * 10) / 10);
  const n = c.acf.length;
  const x = (i: number) => l + ((W - l - r) * (i + 0.5)) / n;
  const bw = Math.max(4, ((W - l - r) / n) * 0.6);
  const y = (v: number) => t + ((1 - v / R) / 2) * (H - t - b); // -R..R
  const [hover, setHover] = useState<number | null>(null);
  return (
    <figure className="acf">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${c.label} 자기상관 막대`} onMouseLeave={() => setHover(null)}>
        <line x1={l} x2={W - r} y1={y(0)} y2={y(0)} className="axis" />
        <line x1={l} x2={W - r} y1={y(c.band)} y2={y(c.band)} className="band" />
        <line x1={l} x2={W - r} y1={y(-c.band)} y2={y(-c.band)} className="band" />
        <text x={l - 4} y={y(c.band) + 3} className="tick" textAnchor="end">+{c.band.toFixed(2)}</text>
        <text x={l - 4} y={y(-c.band) + 3} className="tick" textAnchor="end">−{c.band.toFixed(2)}</text>
        <text x={l - 4} y={y(R) + 6} className="tick" textAnchor="end">+{R}</text>
        <text x={l - 4} y={y(-R)} className="tick" textAnchor="end">−{R}</text>
        {c.acf.map((v, i) => (
          <g key={i} onMouseEnter={() => setHover(i)}>
            <rect x={x(i) - (W - l - r) / n / 2} y={t} width={(W - l - r) / n} height={H - t - b} fill="transparent" />
            <rect x={x(i) - bw / 2} y={Math.min(y(v), y(0))} width={bw} height={Math.max(1, Math.abs(y(v) - y(0)))}
              rx={2} className={`acf-bar s-${c.country}${Math.abs(v) > c.band ? ' over' : ''}${hover === i ? ' hot' : ''}`} />
            {(i + 1) % 5 === 0 && <text x={x(i)} y={H - 6} className="tick" textAnchor="middle">{i + 1}년</text>}
          </g>
        ))}
      </svg>
      <figcaption className="small muted">
        {hover !== null
          ? <>시차 <b>{hover + 1}년</b>: 자기상관 {c.acf[hover].toFixed(2)} {Math.abs(c.acf[hover]) > c.band ? '(기준선 밖)' : '(기준선 안)'}</>
          : <>막대 = 시차별 자기상관(추세 제거 후). 점선 = 시차 하나만 볼 때의 95% 범위. 막대에 마우스를 올리면 값이 보입니다.</>}
      </figcaption>
    </figure>
  );
}

function verdictForCountry(c: CountryCycleStats): string {
  const parts: string[] = [];
  if (c.pMaxAcf >= 0.05 && c.pSpectral >= 0.05) parts.push(c.pMaxAcf < 0.1 ? '일정한 주기가 통계적으로 확인되지 않았습니다(경계 수준 — 자료가 더 필요)' : '일정한 주기가 통계적으로 확인되지 않았습니다');
  else parts.push('반복 가능성이 통계적으로 관찰됩니다(추가 검증 필요)');
  return parts.join(' ');
}

export function CycleSection() {
  const { data } = useApp();
  const st = data.patterns?.stats;
  if (!st) return null;
  return (
    <section className="pat-sec" id="pat-cycles">
      <h2>반복 주기 탐색 — 경제성장률</h2>
      <p className="small">10년 같은 주기를 미리 정하지 않고, 1~{st.params.maxLag}년의 모든 간격을 같은 방법으로 검사했습니다. 자료는 흐름 화면의 GDP 성장률입니다.</p>
      <div className="cycle-grid">
        {st.countries.map((c) => (
          <div key={c.country} className="cycle-card">
            <h3><span className={`dot s-${c.country}`} />{COUNTRY[c.country]} <span className="muted small">{c.from}~{c.to} · {c.n}년</span></h3>
            <p className="cycle-verdict">{verdictForCountry(c)}.</p>
            <AcfBars c={c} />
            <ul className="small cycle-facts">
              <li>기준선을 넘은 시차: {c.lagsOverBand.length ? c.lagsOverBand.map((k) => `${k}년`).join(', ') : '없음'}.
                {' '}{c.acf.length}개 시차를 한꺼번에 보면 이 정도 값은 무작위로 섞은 자료에서도 {Math.round(c.pMaxAcf * 100)}% 확률로 나옵니다(p={c.pMaxAcf}).</li>
              {c.sensitivity.map((s) => (
                <li key={s.lag}><b>{s.lag}년 시차 점검:</b> {s.crisisPairs.length
                  ? <>마이너스 성장 해 쌍 {s.crisisPairs.map(([a, b]) => `${a}·${b}`).join(', ')}을(를) 빼면 {s.r} → {s.rWithoutCrisisPairs}.
                    {Math.abs(s.rWithoutCrisisPairs) <= c.band
                      ? ' 기준선 안으로 들어옵니다. 반복이 아니라 몇 개의 해가 만든 값입니다.'
                      : ` 빼도 기준선 밖입니다. 다만 ${c.n}년 자료에서 ${s.pairsUsed}쌍으로 계산한 값이고 여러 시차를 함께 본 검정이 p=${c.pMaxAcf}라, 주기로 확정하지 않고 '검증 부족'으로 둡니다.`}</>
                  : <>위기 해를 빼도 {s.rWithoutCrisisPairs}.</>}</li>
              ))}
              <li>주기도 최대 봉우리: {c.spectralPeakYears >= c.n ? '관찰 기간 전체 길이(주기로 볼 수 없음)' : `약 ${c.spectralPeakYears}년`}, p={c.pSpectral}{c.pSpectral >= 0.05 ? ' — 우연 범위' : ''}.</li>
              <li>마이너스 성장 해: {c.negativeYears.join(', ') || '없음'}
                {c.negativeYears.length < 4 ? ` — ${c.negativeYears.length}번뿐이라 간격으로 주기를 계산할 수 없습니다.` : ` (간격 ${c.negativeGaps.join(', ')}년 — 일정하지 않음)`}</li>
              <li><b>변화점:</b> {c.changePoint.year}년부터 평균 {c.changePoint.meanBefore}% → {c.changePoint.meanAfter}%
                (전체 변동의 {Math.round(c.changePoint.varianceExplained * 100)}% 설명){c.changePoint.varianceExplained >= 0.3 ? '. 반복이 아니라 한 번의 구조 변화로 보입니다.' : '. 설명력이 작아 뚜렷한 변화점으로 보기 어렵습니다.'}</li>
            </ul>
          </div>
        ))}
      </div>
      <h3>나라 사이의 시차 — 한 나라의 변화가 몇 년 뒤 다른 나라에 나타났나?</h3>
      <table className="lag-table">
        <thead><tr><th>비교</th>{st.crossLag[0].values.map((v) => <th key={v.lag}>{v.lag === 0 ? '같은 해' : v.lag > 0 ? `${v.lag}년 뒤` : `${-v.lag}년 앞`}</th>)}<th>기준선</th></tr></thead>
        <tbody>
          {st.crossLag.map((x) => (
            <tr key={x.a + x.b}>
              <th>{COUNTRY[x.a]} → {COUNTRY[x.b]} <span className="muted small">{x.from}~{x.to}</span></th>
              {x.values.map((v) => <td key={v.lag} className={Math.abs(v.r) > x.band ? 'over' : ''}>{v.r.toFixed(2)}</td>)}
              <td className="muted">±{x.band.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="small">세 쌍 모두 <b>같은 해</b>에만 기준선을 넘었습니다. 한 나라가 앞서고 다른 나라가 몇 년 뒤 따라가는 시차는 성장률에서 보이지 않습니다. 같은 해에 함께 움직인 것도 공통 충격(석유파동, 2008년, 2020년) 때문일 수 있어 인과관계로 표시하지 않습니다.</p>
      <details className="method small"><summary>계산 방법과 한계</summary><ul>{st.method.map((m) => <li key={m}>{m}</li>)}</ul></details>
    </section>
  );
}

// ---------------- 비슷한 상황 비교 ----------------
export function ParallelCard({ p, compact = false }: { p: Parallel; compact?: boolean }) {
  const { data } = useApp();
  return (
    <a className={`par-card${compact ? ' compact' : ''}`} href={`#pattern-${p.id}`}>
      <span className="eyebrow">{p.theme}</span>
      <b>{p.title}</b>
      <span className="par-pair">{eraLabel(data, p.a.eraId)} {p.a.label} <span aria-hidden>↔</span> {eraLabel(data, p.b.eraId)} {p.b.label}</span>
      <span className="small muted">{p.similarity.score !== null ? `기준 일치도 ${p.similarity.score} (평가 ${p.similarity.assessed}/${p.similarity.total})` : `평가 가능한 기준 ${p.similarity.assessed}개 — 점수 내지 않음`}</span>
    </a>
  );
}

export function ParallelDetail({ p }: { p: Parallel }) {
  const { data } = useApp();
  const sim = p.similarity;
  return (
    <article className="par-detail" id={`pattern-${p.id}`}>
      <a className="small" href="#patterns">← 반복 패턴 탐색으로</a>
      <div className="eyebrow">비슷한 상황 비교 · {p.theme}</div>
      <h1>{p.title}</h1>
      <p className="lede">{p.question}</p>
      <div className="par-head">
        <a href={`#flow-${p.a.eraId}`} className="par-side">과거 · {p.a.years}<b>{p.a.label}</b></a>
        <span aria-hidden>↔</span>
        <a href={`#flow-${p.b.eraId}`} className="par-side">{p.b.eraId === '2020s' ? '최근' : '이후'} · {p.b.years}<b>{p.b.label}</b></a>
      </div>
      <table className="par-table">
        <thead><tr><th>비교 항목</th><th>{p.a.label}</th><th>판정</th><th>{p.b.label}</th></tr></thead>
        <tbody>
          {p.rows.map((r) => (
            <tr key={r.aspect}>
              <th>{r.aspect}</th>
              <td>{r.a.text} <Evidence ids={r.a.claimIds} /></td>
              <td><span className={`verdict ${VERDICT[r.verdict].cls}`}>{VERDICT[r.verdict].label}</span>{r.note && <p className="small muted">{r.note}</p>}</td>
              <td>{r.b.text} <Evidence ids={r.b.claimIds} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {p.figureSourceIds && <p className="small muted">성장률 수치는 흐름 화면의 GDP 성장률 지표(FRED 표, 세계은행 원자료)에서 자동으로 읽었습니다.</p>}

      <div className="par-two">
        <section><h2>반복된 것으로 볼 수 있는 근거</h2><ul>{p.repeated.map((x) => <li key={x}>{x}</li>)}</ul></section>
        <section><h2>반복으로 단정할 수 없는 이유</h2><ul>{p.notConclusive.map((x) => <li key={x}>{x}</li>)}</ul><Evidence ids={p.notConclusiveIds} /></section>
      </div>

      <section>
        <h2>시대 전체가 비슷했나 — 8개 기준</h2>
        <p className="small">같은 종류의 사건이 있었다고 비슷한 시대는 아닙니다. 시대 조건을 8개 기준으로 따로 봤습니다.</p>
        <table className="crit-table">
          <tbody>{p.criteria.map((c) => (
            <tr key={c.criterion}><th>{c.criterion}</th><td><span className={`verdict ${VERDICT[c.verdict].cls}`}>{VERDICT[c.verdict].label}</span></td><td>{c.note} <Evidence ids={c.claimIds} /></td></tr>
          ))}</tbody>
        </table>
        <div className="sim-box">
          {sim.score !== null
            ? <><b>기준 일치도 {sim.score}</b> = {sim.points}점 ÷ 평가한 기준 {sim.assessed}개 (8개 중 {sim.total - sim.assessed}개는 자료 없음)</>
            : <><b>점수를 내지 않습니다.</b> 평가할 수 있는 기준이 {sim.assessed}개뿐입니다.</>}
          <p className="small muted">계산식: {sim.formula} 판정은 제작자의 해석이며 통계적 유사도가 아닙니다. 자료가 쌓이면 판정과 점수가 바뀔 수 있습니다.</p>
        </div>
      </section>

      <section className="future-box">
        <h2>미래에 대해 — 예측이 아니라 조건</h2>
        <dl>
          <dt>과거와 현재의 공통 조건</dt><dd>{p.future.common}</dd>
          <dt>과거에는 어떤 결과가 있었나</dt><dd>{p.future.pastResult}</dd>
          <dt>지금 무엇이 다른가</dt><dd>{p.future.different}</dd>
          <dt>비슷한 결과가 나오려면</dt><dd>{p.future.conditions}</dd>
          <dt>지켜볼 초기 신호 <span className="muted small">(제작자 제안)</span></dt><dd>{p.future.signals.join(' · ')}</dd>
        </dl>
        <p className="small muted">과거에 비슷한 일이 있었다는 사실만으로 미래를 예측하지 않습니다.</p>
      </section>
      <p className="small"><a href={`#era-${p.a.eraId}`}>{eraLabel(data, p.a.eraId)} 자세히</a> · <a href={`#era-${p.b.eraId}`}>{eraLabel(data, p.b.eraId)} 자세히</a></p>
    </article>
  );
}

// ---------------- 신호 추적 ----------------
export function SignalTrackView({ s, focus }: { s: SignalTrack; focus?: EraId }) {
  const { data } = useApp();
  return (
    <div className="sig-track">
      <b>{s.title}</b>
      <ol>
        {s.steps.map((st) => (
          <li key={st.eraId} className={focus === st.eraId ? 'on' : ''}>
            <span className="sig-era">{eraLabel(data, st.eraId)}</span>
            <span>{st.label}</span> <Evidence ids={st.claimIds} />
          </li>
        ))}
      </ol>
      {s.gap && <p className="small muted">빈 곳: {s.gap}</p>}
    </div>
  );
}

export function PatternView() {
  const { data } = useApp();
  const P = data.patterns;
  if (!P) return <p>반복 패턴 데이터가 없습니다.</p>;
  const kinds = (Object.keys(KIND) as PhenomenonKind[]).sort((a, b) => KIND[a].order - KIND[b].order);
  return (
    <article className="pattern-view">
      <div className="eyebrow">PATTERN DISCOVERY</div>
      <h1>역사는 반복되는가 — 자료로 확인하기</h1>
      <p className="lede">반복을 증명하려는 화면이 아닙니다. 지금까지 모은 자료에서 <b>무엇이 반복되었고 무엇이 반복되지 않았는지</b>를 그대로 보여줍니다.</p>

      <section className="pat-sec">
        <h2>분야별 결과 (지금까지 자료 기준)</h2>
        <div className="kind-grid">
          {kinds.map((k) => {
            const items = P.phenomena.filter((x) => x.kind === k);
            return (
              <div key={k} className={`kind-col k-${k}`}>
                <h3>{KIND[k].label} <span className="muted">{items.length}</span></h3>
                {items.length ? items.map((x, i) => (
                  <p key={i} className="small"><b>{x.subject}</b> — {x.summary}
                    {x.link && <> <a href={x.link === 'stats' ? '#pat-cycles' : x.link === 'signals' ? '#pat-signals' : `#pattern-${x.link}`}>보기</a></>}</p>
                )) : <p className="small muted">아직 해당 사례가 없습니다.</p>}
              </div>
            );
          })}
        </div>
      </section>

      <CycleSection />

      <section className="pat-sec" id="pat-parallels">
        <h2>비슷한 상황 비교 · 유사 시대 찾기</h2>
        <p className="small">조건 → 촉발 사건 → 사회 반응 → 산업 변화 → 결과를 나란히 놓고, 같은 점과 <b>다른 점</b>을 함께 봅니다.</p>
        <div className="par-list">{P.parallels.map((p) => <ParallelCard key={p.id} p={p} />)}</div>
      </section>

      <section className="pat-sec" id="pat-signals">
        <h2>새 신호는 다음 시대에 어떻게 자랐나</h2>
        <p className="small">한 시대의 작은 변화가 다음 시대에 어떻게 커졌는지, 확인된 문장으로만 이었습니다. 이어지는 흐름은 제작자의 정리(해석)입니다.</p>
        <div className="sig-list">{P.signals.map((s) => <SignalTrackView key={s.id} s={s} />)}</div>
      </section>

      <section className="pat-sec">
        <h2>이 화면의 규칙</h2>
        <ul className="small">{P.rules.map((r) => <li key={r}>{r}</li>)}</ul>
      </section>
    </article>
  );
}
