/**
 * DataProvider — 화면은 이 인터페이스만 사용한다.
 * - LocalDataProvider: 동봉된 시드(data/seed.json). 지금 MVP가 쓰는 공급원.
 * - HttpDataProvider: FastAPI(/api/v1). VITE_API_BASE_URL 이 있으면 자동 전환.
 * 공급원을 바꿔도 컴포넌트 코드는 바뀌지 않는다.
 */
import type {
  Graph,
  Patterns,
  CaseStudy, Era, EraId, EraTransition, EvidenceSource, HistoricalClaim, HistoricalEvent,
  Indicator, NewspaperArchive, PrimaryDocument,
} from '../domain/types';
import seed from '../../../data/seed.json';

export interface Dataset {
  eras: Era[];
  claims: Record<string, HistoricalClaim>;
  sources: Record<string, EvidenceSource>;
  events: HistoricalEvent[];
  transitions: EraTransition[];
  caseStudies: CaseStudy[];
  documents: Record<string, PrimaryDocument>;
  archives: NewspaperArchive[];
  indicators: Indicator[];
  patterns: Patterns | null;
  graph: Graph;
}

export interface DataProvider {
  load(): Promise<Dataset>;
  readonly label: string;
}

const byId = <T extends { id: string }>(xs: T[]) => Object.fromEntries(xs.map((x) => [x.id, x])) as Record<string, T>;

type RawSeed = {
  eras: Era[]; claims: HistoricalClaim[]; sources: EvidenceSource[]; events: HistoricalEvent[];
  transitions: EraTransition[]; caseStudies: CaseStudy[]; documents: PrimaryDocument[]; archives: NewspaperArchive[];
  indicators?: Indicator[];
  patterns?: Patterns;
  graph?: Graph;
};

function toDataset(raw: RawSeed): Dataset {
  return {
    eras: raw.eras,
    claims: byId(raw.claims),
    sources: byId(raw.sources),
    events: raw.events,
    transitions: raw.transitions,
    caseStudies: raw.caseStudies,
    documents: byId(raw.documents),
    archives: raw.archives,
    indicators: raw.indicators ?? [],
    patterns: raw.patterns ?? null,
    graph: raw.graph ?? { nodes: [], chains: [], edges: [], lanes: [], relTypes: {} as Graph['relTypes'], nodeTypes: {} as Graph['nodeTypes'] },
  };
}

export class LocalDataProvider implements DataProvider {
  readonly label = '로컬 시드 데이터 (data/seed.json)';
  async load() {
    return toDataset(seed as unknown as RawSeed);
  }
}

export class HttpDataProvider implements DataProvider {
  constructor(private base: string) {}
  get label() {
    return `API ${this.base}`;
  }
  private async get<T>(path: string): Promise<T> {
    const r = await fetch(`${this.base}/api/v1${path}`);
    if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
    return r.json() as Promise<T>;
  }
  async load() {
    // 전체 덤프 엔드포인트 하나로 시작 — 데이터가 커지면 시대별 지연 로딩으로 바꾼다.
    return toDataset(await this.get<RawSeed>('/bundle'));
  }
}

export function createProvider(): DataProvider {
  const base = import.meta.env.VITE_API_BASE_URL as string | undefined;
  return base ? new HttpDataProvider(base) : new LocalDataProvider();
}

export const eraIndex = (d: Dataset, id: EraId) => d.eras.findIndex((e) => e.id === id);
