import { useState } from 'react';
import type { Domain, Era } from '../domain/types';
import { Claim, useApp } from './Claims';

/** 마스터 프롬프트 §4: 분야를 따로 나열하지 않고, 같은 근거(Claim)를 분야 렌즈로 다시 본다 */
export const DOMAINS: { key: Domain; label: string; also?: Domain[] }[] = [
  { key: 'politics', label: '정치' },
  { key: 'economy', label: '경제' },
  { key: 'industry', label: '산업', also: ['energy'] },
  { key: 'technology', label: '기술' },
  { key: 'culture', label: '문화' },
  { key: 'consumption', label: '소비' },
  { key: 'labor', label: '직업' },
  { key: 'society', label: '사회' },
];

/** 시대 객체 안에서 참조하는 모든 Claim id (중복 제거, 등장 순서 유지) */
export function eraClaimIds(era: Era, allClaimIds: string[] = []): string[] {
  const ids = (JSON.stringify(era).match(/"c\d\d-[a-z0-9-]+"/g) ?? []).map((s) => s.slice(1, -1));
  // 시대 화면이 직접 참조하지 않아도, 이 시대 접두어(c60-, c70- …)로 작성된 근거는 모두 포함한다
  const prefix = `c${String(era.startYear).slice(2, 3)}0-`;
  return [...new Set([...ids, ...allClaimIds.filter((id) => id.startsWith(prefix))])];
}

export function DomainBoard({ era, compact = false }: { era: Era; compact?: boolean }) {
  const { data } = useApp();
  const ids = eraClaimIds(era, Object.keys(data.claims)).filter((id) => data.claims[id]);
  const groups = DOMAINS.map((d) => ({
    ...d,
    ids: ids.filter((id) => {
      const doms = data.claims[id].domains;
      return doms.includes(d.key) || (d.also ?? []).some((a) => doms.includes(a));
    }),
  }));
  const [sel, setSel] = useState<Domain>(groups.find((g) => g.ids.length)?.key ?? 'economy');
  const current = groups.find((g) => g.key === sel)!;

  if (compact) {
    const used = new Set<string>();
    const firstUnused = (xs: string[]) => { const id = xs.find((x) => !used.has(x)) ?? xs[0]; if (id) used.add(id); return id; };
    return (
      <div className="domain-grid">
        {groups.map((g) => (
          <div key={g.key} className={`domain-cell ${g.ids.length ? '' : 'empty'}`}>
            <div className="eyebrow">{g.label} · 근거 {g.ids.length}</div>
            {g.ids.length ? <p><Claim id={firstUnused(g.ids)} /></p> : <p className="muted">아직 근거 자료가 없습니다.</p>}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="domain-board">
      <div className="subtabs" role="tablist" aria-label="분야 선택">
        {groups.map((g) => (
          <button key={g.key} role="tab" aria-selected={sel === g.key} className={sel === g.key ? 'on' : ''}
            onClick={() => setSel(g.key)} disabled={!g.ids.length}>
            {g.label} ({g.ids.length})
          </button>
        ))}
      </div>
      {current.ids.length ? (
        <ul className="domain-list">{current.ids.map((id) => <li key={id}><Claim id={id} /></li>)}</ul>
      ) : <p className="muted">이 분야는 아직 근거 자료가 없습니다.</p>}
    </div>
  );
}
