import { useEffect } from 'react';
import { useApp } from './Claims';
import { ACCESS, CLAIM_TYPE, COUNTRY, STATUS } from '../labels';

export type DrawerState = { kind: 'claim' | 'doc'; id: string } | null;

export function Drawer({ state, onClose }: { state: DrawerState; onClose: () => void }) {
  const { data, openDoc } = useApp();
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  if (!state) return null;
  return (
    <div className="drawer-wrap" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="근거">
        <button className="close" onClick={onClose} aria-label="닫기">×</button>
        {state.kind === 'claim' ? <ClaimDetail id={state.id} /> : <DocDetail id={state.id} />}
      </aside>
    </div>
  );

  function ClaimDetail({ id }: { id: string }) {
    const c = data.claims[id];
    const docs = Object.values(data.documents).filter((d) =>
      d.crossCheckSourceIds.some((s) => c.sourceIds.includes(s)) || d.url && c.sourceIds.some((s) => data.sources[s]?.url === d.url));
    return (
      <>
        <div className="eyebrow">근거 · {id}</div>
        <p className="drawer-claim">{c.text}</p>
        <dl className="kv">
          <dt>주장 유형</dt><dd><span className={`mark static ct-${c.claimType}`}>{CLAIM_TYPE[c.claimType].short}</span> {CLAIM_TYPE[c.claimType].label}</dd>
          <dt>검증 상태</dt><dd className={`st-text-${c.status}`}>{STATUS[c.status]}</dd>
          <dt>작성 방식</dt><dd>{c.aiSynthesized ? 'HISTORY TO FUTURE가 아래 자료를 종합해 작성한 해석' : '출처의 내용을 요약'}</dd>
          <dt>관련 국가</dt><dd>{c.countries.map((k) => COUNTRY[k]).join(', ')}</dd>
        </dl>
        <h4>출처</h4>
        {c.sourceIds.length === 0 && <p className="warn">아직 출처가 없습니다. 이 문장은 사실로 취급하지 마세요.</p>}
        <ol className="srcs">
          {c.sourceIds.map((s) => {
            const src = data.sources[s];
            return (
              <li key={s}>
                <a href={src.url} target="_blank" rel="noreferrer">{src.title}</a>
                <div className="muted">{src.publisher}{src.publishedDate ? ` · ${src.publishedDate}` : ''} · 확인 {src.accessedDate}</div>
                {src.note && <div className="note">{src.note}</div>}
              </li>
            );
          })}
        </ol>
        {docs.length > 0 && (
          <>
            <h4>관련 1차 사료</h4>
            <ul className="srcs">{docs.map((d) => <li key={d.id}><button className="linkish" onClick={() => openDoc(d.id)}>{d.publication} — {d.title}</button></li>)}</ul>
          </>
        )}
      </>
    );
  }

  function DocDetail({ id }: { id: string }) {
    const d = data.documents[id];
    const a = ACCESS[d.verification.accessLevel];
    return (
      <>
        <div className="eyebrow">1차 사료 · {d.publishedDate} · {COUNTRY[d.country]}</div>
        <h3>{d.title}</h3>
        <div className="muted">{d.publication}</div>
        <div className={`access access-${a.n}`}>열람 수준 {a.n} — {a.label}</div>
        <dl className="kv">
          <dt>무엇을 봤나</dt><dd>{d.verification.whatWasViewed}</dd>
          {d.verification.accessIssue && (<><dt>접근 문제</dt><dd className="warn">{d.verification.accessIssue}</dd></>)}
          <dt>확인일</dt><dd>{d.verification.checkedOn}</dd>
          <dt>저작권</dt><dd>{d.copyright}</dd>
          {d.biasNotes && (<><dt>해석 시 주의</dt><dd>{d.biasNotes}</dd></>)}
        </dl>
        <h4>확인한 내용 (요약)</h4>
        <ul>{d.findings.map((f) => <li key={f}>{f}</li>)}</ul>
        <h4>교차 검증 자료</h4>
        <ul className="srcs">{d.crossCheckSourceIds.map((s) => <li key={s}><a href={data.sources[s].url} target="_blank" rel="noreferrer">{data.sources[s].title}</a></li>)}</ul>
        {d.url && <p><a href={d.url} target="_blank" rel="noreferrer">원문·아카이브 열기 ↗</a></p>}
      </>
    );
  }
}
