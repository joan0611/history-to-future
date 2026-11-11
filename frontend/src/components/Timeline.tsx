import type { Dataset } from '../data/provider';
import type { EraId } from '../domain/types';
import { ANALYSIS } from '../labels';

/** 1960년부터 현재까지 연속 시간축. 시대 사이의 화살표 = 시대 연결 */
export function Timeline({ data, current, onEra, onTransition }: {
  data: Dataset; current: string; onEra: (id: EraId) => void; onTransition: (from: EraId) => void;
}) {
  const now = new Date().getFullYear();
  const total = now + 1 - 1960;
  return (
    <nav className="timeline" aria-label="1960년부터 현재까지 시대 탐색">
      <div className="tl-track">
        {data.eras.map((e, i) => {
          const end = (e.endYear ?? now) + 1;
          const width = ((end - e.startYear) / total) * 100;
          const active = current === `era-${e.id}`;
          const tActive = current === `transition-${e.id}`;
          return (
            <div key={e.id} className="tl-seg" style={{ width: `${width}%` }}>
              <button className={`tl-era as-${e.analysisStatus} ${active ? 'active' : ''}`} onClick={() => onEra(e.id)}
                aria-current={active ? 'page' : undefined}>
                <span className="tl-year">{e.startYear}</span>
                <span className="tl-label">{e.label}</span>
                <span className="tl-status">{ANALYSIS[e.analysisStatus]}</span>
              </button>
              {i < data.eras.length - 1 && (
                <button className={`tl-link ${tActive ? 'active' : ''}`} onClick={() => onTransition(e.id)}
                  title={`${e.label} → ${data.eras[i + 1].label} 연결 보기`} aria-label={`${e.label}에서 ${data.eras[i + 1].label}로 이어진 변화`}>
                  →
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="tl-axis"><span>1960</span><span>{now}</span></div>
    </nav>
  );
}
