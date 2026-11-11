import { createContext, useContext } from 'react';
import type { Dataset } from '../data/provider';
import type { HistoricalClaim } from '../domain/types';
import { CLAIM_TYPE } from '../labels';

export interface Ctx {
  data: Dataset;
  openClaim: (id: string) => void;
  openDoc: (id: string) => void;
}
export const AppCtx = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(AppCtx);

/** 문장 하나 + 근거 표시 마커. 마커 색 = 주장 유형, 점선 = 출처 필요 */
export function Claim({ id, plain = false }: { id: string; plain?: boolean }) {
  const { data, openClaim } = useApp();
  const c: HistoricalClaim | undefined = data.claims[id];
  if (!c) return <span className="missing">[누락된 근거 {id}]</span>;
  return (
    <span className={`claim ct-${c.claimType} st-${c.status}`}>
      {c.text}
      {!plain && (
        <button
          className={`mark ct-${c.claimType} st-${c.status}`}
          onClick={() => openClaim(id)}
          title={`${CLAIM_TYPE[c.claimType].label} · 근거 보기`}
          aria-label={`${CLAIM_TYPE[c.claimType].label} 근거 보기`}
        >
          {CLAIM_TYPE[c.claimType].short}
          {c.status === 'needs_source' && ' ?'}
        </button>
      )}{' '}
    </span>
  );
}

/** 여러 Claim을 하나의 자연스러운 문단으로 */
export function Paragraph({ ids, heading }: { ids: string[]; heading?: string }) {
  return (
    <div className="para">
      {heading && <h4>{heading}</h4>}
      <p>
        {ids.map((id) => (
          <Claim key={id} id={id} />
        ))}
      </p>
    </div>
  );
}

export function Legend() {
  return (
    <div className="legend" aria-label="근거 표시 범례">
      {(['fact', 'statistical', 'interpretation', 'hypothesis'] as const).map((t) => (
        <span key={t} className={`mark static ct-${t}`}>{CLAIM_TYPE[t].short}</span>
      ))}
      <span className="legend-note">표시를 누르면 출처와 검증 상태가 열립니다 · <span className="mark static st-needs_source ct-hypothesis">?</span> 출처 필요</span>
    </div>
  );
}
