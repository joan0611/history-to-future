import type { CountryCode, GraphEdge, GraphNode, Lane } from '../../domain/types';
import type { Dataset } from '../../data/provider';

/**
 * 탐색 상태는 모두 주소(#explore?...)에 둔다 → 새로고침·공유해도 같은 화면, 브라우저 뒤로 가기 = 이전 단계.
 *   y = 선택 연도, f = 보이는 분야(쉼표), c = 함께 볼 국가(쉼표, 한국은 항상), n = 선택한 노드, p = 탐색 경로(쉼표)
 */
export interface ExploreState { y: number; f: Lane[]; c: CountryCode[]; n?: string; p: string[]; e?: string }
export const ALL_LANES: Lane[] = ['politics', 'economy', 'society', 'industry', 'culture', 'flow'];
export const LANE_KO: Record<Lane, string> = {
  politics: '정치·외교', economy: '경제·에너지', society: '사회·생활·소비', industry: '산업·기술·직업', culture: '문화', flow: '유행·트렌드',
};
export const EXTRA_COUNTRIES: { code: CountryCode; label: string }[] = [
  { code: 'US', label: '미국' }, { code: 'JP', label: '일본' }, { code: 'CN', label: '중국' }, { code: 'MIDEAST', label: '중동' },
  { code: 'WORLD', label: '세계' }, { code: 'GB', label: '유럽' },
];
export const MIN_YEAR = 1960;
export const MAX_YEAR = 2026;

export function parseExplore(route: string): ExploreState {
  const q = new URLSearchParams(route.split('?')[1] ?? '');
  const y = Number(q.get('y'));
  const f = (q.get('f') ?? '').split(',').filter((x): x is Lane => (ALL_LANES as string[]).includes(x));
  return {
    y: y >= MIN_YEAR && y <= MAX_YEAR ? y : 1973,
    f: f.length ? f : ALL_LANES,
    c: (q.get('c') ?? '').split(',').filter(Boolean) as CountryCode[],
    n: q.get('n') || undefined,
    p: (q.get('p') ?? '').split(',').filter(Boolean),
    e: q.get('e') || undefined,
  };
}

export function exploreHash(s: Partial<ExploreState> & { y: number }): string {
  const q = new URLSearchParams();
  q.set('y', String(s.y));
  if (s.f && s.f.length && s.f.length < ALL_LANES.length) q.set('f', s.f.join(','));
  if (s.c && s.c.length) q.set('c', s.c.join(','));
  if (s.n) q.set('n', s.n);
  if (s.p && s.p.length) q.set('p', s.p.join(','));
  if (s.e) q.set('e', s.e);
  return `explore?${q.toString().replace(/%2C/g, ',')}`;
}

/** 한국 중심: 한국이 관련된 노드는 항상, 다른 나라 노드는 고른 나라일 때만 */
export function visibleByCountry(n: GraphNode, extra: CountryCode[]): boolean {
  if (n.countries.includes('KR') || n.countries.length === 0) return true;
  return n.countries.some((c) => extra.includes(c) || (c === 'DE' || c === 'FR') && extra.includes('GB'));
}

export interface GraphIndex {
  byId: Record<string, GraphNode>;
  out: Record<string, GraphEdge[]>;
  inc: Record<string, GraphEdge[]>;
}
const cache = new WeakMap<Dataset, GraphIndex>();
export function indexGraph(data: Dataset): GraphIndex {
  const hit = cache.get(data);
  if (hit) return hit;
  const byId: Record<string, GraphNode> = {};
  const out: Record<string, GraphEdge[]> = {};
  const inc: Record<string, GraphEdge[]> = {};
  for (const n of data.graph.nodes) { byId[n.id] = n; out[n.id] = []; inc[n.id] = []; }
  for (const e of data.graph.edges) { out[e.from]?.push(e); inc[e.to]?.push(e); }
  const idx = { byId, out, inc };
  cache.set(data, idx);
  return idx;
}

export const VERIF_KO: Record<string, string> = {
  evidenced: '근거 있는 인과', interpretation: '해석', statistical: '통계적 연관', hypothesis: '검증 전 가설',
};

/** 노드 신뢰도: 근거 문장 중 '독립 출처 2개 이상'의 비율 */
export function reliability(data: Dataset, n: GraphNode): number {
  const cs = n.claimIds.map((id) => data.claims[id]).filter(Boolean);
  if (!cs.length) return 0;
  return cs.reduce((a, c) => a + (c.status === 'verified' ? 1 : c.status === 'sourced' ? 0.6 : 0), 0) / cs.length;
}

export const short = (s: string, n = 18) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
