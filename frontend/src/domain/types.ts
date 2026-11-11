/**
 * HISTORY TO FUTURE — 공통 도메인 타입
 *
 * 이 파일은 프런트엔드·API·DB가 공유하는 계약(contract)이다.
 * backend/app/models.py (Pydantic) 와 backend/schema.sql 이 같은 구조를 따른다.
 * 필드를 바꿀 때는 세 곳을 함께 바꾼다.
 */

/** 시대 식별자: 1960년부터 현재까지 연속된 7개 시대 */
export type EraId = '1960s' | '1970s' | '1980s' | '1990s' | '2000s' | '2010s' | '2020s';

export const ERA_ORDER: EraId[] = ['1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s'];

export type CountryCode = 'KR' | 'US' | 'JP' | 'CN' | 'GB' | 'DE' | 'FR' | 'WORLD' | 'MIDEAST';

/** 마스터 프롬프트 §52 CLAIM CLASSIFICATION */
export type ClaimType =
  | 'fact' // 확인된 사실
  | 'statistical' // 통계적으로 관찰된 관계
  | 'interpretation' // 근거가 있는 역사적 해석
  | 'hypothesis'; // 검증되지 않은 가설

/** 출처 검증 상태 (§51) */
export type VerificationStatus =
  | 'verified' // 출처 확인 + 내용 대조 완료
  | 'sourced' // 출처 연결됨, 2차 대조 전
  | 'needs_source'; // 출처 확보 전 — 화면에 경고 표시

/** 시대별 분석 진행 상태 (§54 "자료가 부족하면 부족하다고 표시") */
export type AnalysisStatus = 'deep' | 'basic' | 'planned';

export type Domain =
  | 'politics'
  | 'economy'
  | 'industry'
  | 'technology'
  | 'culture'
  | 'consumption'
  | 'labor'
  | 'energy'
  | 'society';

export interface EvidenceSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  sourceType: 'government' | 'academic' | 'institution' | 'company' | 'news' | 'reference';
  /** 자료 발행일 (알 수 있을 때) */
  publishedDate?: string;
  /** 수집·확인일 */
  accessedDate: string;
  note?: string;
}

/**
 * SourceVerification — 자료를 '실제로 어디까지 열람했는가' (신문·광고 지시문 §2)
 * 원문을 읽지 않았으면 절대 'original' 로 표시하지 않는다.
 */
export type AccessLevel =
  | 'original' // 1. 원문(스캔·원문 PDF·원문 텍스트) 직접 확인
  | 'archive_metadata' // 2. 신뢰할 수 있는 아카이브의 메타데이터·초록·전사본 확인
  | 'secondary' // 3. 2차 자료를 통한 간접 확인
  | 'unverified'; // 4. 미확인

export interface SourceVerification {
  accessLevel: AccessLevel;
  /** 무엇을 열람했는지 구체적으로 (예: "아카이브 전사본 전문, 스캔 이미지는 미대조") */
  whatWasViewed: string;
  checkedOn: string;
  /** 접근 실패 사유 (예: "작업환경에서 접근 차단") */
  accessIssue?: string;
}

/** 신문 아카이브 (NewspaperArchive) — 신문사별 보유 기간·접근 조건 */
export interface NewspaperArchive {
  id: string;
  name: string;
  country: CountryCode;
  coverage: string; // 예: "1920~1999"
  access: string; // 예: "무료 웹 열람, 본문 OCR 텍스트"
  license: string;
  url: string;
  reachableFromDevEnv: boolean;
}

/** 시대의 1차 사료: 신문기사·잡지·정부 조사·광고 */
export interface PrimaryDocument {
  id: string;
  kind: 'newspaper_article' | 'magazine_article' | 'advertisement' | 'government_survey' | 'government_record' | 'speech';
  publication: string; // 신문사·잡지·기관
  title: string;
  publishedDate: string;
  country: CountryCode;
  section?: 'politics' | 'economy' | 'society' | 'culture' | 'lifestyle' | 'advertising' | 'editorial' | 'trade';
  archiveId?: string;
  url?: string;
  verification: SourceVerification;
  /** 열람 범위 안에서 확인한 핵심 내용 (원문 장문 인용 금지 — 요약) */
  findings: string[];
  relatedEventIds: string[];
  relatedTrendIds: string[];
  relatedIndustries: string[];
  crossCheckSourceIds: string[];
  copyright: string;
  /** 해석 시 고려할 편향 (독자층·검열·광고주 관점 등) */
  biasNotes?: string;
}

/** HistoricalAdvertisement — 광고가 약속한 생활 vs 실제 보급·가격·소득 */
export interface AdvertisementAnalysis {
  id: string;
  product: string;
  country: CountryCode;
  year: string;
  documentIds: string[];
  /** 광고가 자극한 가치: 편리·성공·부유·아름다움·가족·자유 등 */
  appealedValues: string[];
  promisedLife: string;
  /** 광고와 현실의 차이: 가격 대비 소득, 실제 보급률 */
  realityCheck: string;
  realityClaimIds: string[];
}

/** 하나의 검증 가능한 진술. 모든 해설 문단은 Claim으로 구성된다. */
export interface HistoricalClaim {
  id: string;
  text: string;
  claimType: ClaimType;
  status: VerificationStatus;
  sourceIds: string[];
  domains: Domain[];
  countries: CountryCode[];
  /** AI가 작성·종합한 해석인지 여부 (§51 AI 해석 여부) */
  aiSynthesized: boolean;
}

export interface HistoricalEvent {
  id: string;
  eraId: EraId;
  /** ISO 날짜 또는 'YYYY' / 'YYYY-MM' */
  date: string;
  title: string;
  countries: CountryCode[];
  domains: Domain[];
  claimIds: string[];
  /** SMART PRIORITY: 1(핵심)~3(참고) */
  priority: 1 | 2 | 3;
}

export interface KeyChange {
  id: string;
  title: string;
  /** 왜 일어났는가 — 한 문장 */
  why: string;
  claimIds: string[];
  /** 중요도 선정 근거 (§9: 선정 기준은 사용자가 확인할 수 있어야 한다) */
  priorityReason: string;
}

/** CulturalTrend + LifestyleChange 통합: kind로 구분 */
export interface Trend {
  id: string;
  title: string;
  kind: 'cultural_trend' | 'lifestyle_change';
  category: 'fashion' | 'music' | 'film' | 'media' | 'food' | 'housing' | 'mobility' | 'electronics' | 'shopping' | 'advertising' | 'values' | 'lifestyle' | 'education' | 'family';
  /** 왜 이 시대에 등장했고 어떤 욕구를 충족했는가 */
  whyThen: string;
  need: string;
  /** 국가별 등장·대중화·쇠퇴 시점 (모르면 비워 둔다) */
  timeline: { country: CountryCode; emerged?: string; popularized?: string; declined?: string }[];
  claimIds: string[];
}

/** ERA ATMOSPHERE — 사건보다 먼저 보여주는 '사람들이 살던 세계' */
export interface EraAtmosphere {
  question:
    | 'mood' // 사회 분위기
    | 'priorities' // 가장 중요하게 생각한 문제
    | 'dreams' // 꿈꾼 생활
    | 'discomforts' // 불편
    | 'tech_hopes' // 기대한 기술·상품
    | 'anxieties' // 불안·저항
    | 'values' // 확산된 문화·가치관
    | 'differences'; // 세대·계층·국가 차이
  answer: string;
  claimIds: string[];
}

/** TREND → INDUSTRY → JOBS 체인의 한 단계 */
export interface ChainStep {
  stage: 'environment' | 'need' | 'trend' | 'demand' | 'business_tech' | 'industry' | 'jobs' | 'legacy';
  text: string;
  linkType: LinkType; // 앞 단계와의 관계 성격
  claimIds: string[];
}

/** ConsumerNeed (기존 HumanNeed 통합) */
export interface HumanNeed {
  need: string;
  /** 욕구가 실제 상품·서비스 수요로 연결된 경로 */
  pathway: string;
  claimIds: string[];
}

export interface IndustryShift {
  industry: string;
  direction: 'emerging' | 'growing' | 'mature' | 'declining' | 'restructuring';
  claimIds: string[];
}

export interface JobShift {
  occupation: string;
  change: 'new' | 'growing' | 'transformed' | 'declining';
  claimIds: string[];
}

/** CountryEraComparison — 같은 시대, 다른 세계. 국가를 같은 발전 단계로 놓지 않는다. */
export interface CountrySnapshot {
  country: CountryCode;
  situation: string;
  /** 생활수준·소비 */
  lifestyle?: string;
  /** 차이가 생긴 이유: 소득·산업구조·정책·기술·제도·문화 */
  whyDifferent?: string;
  claimIds: string[];
}

export interface NarrativeParagraph {
  heading?: string;
  claimIds: string[];
}

/** SMART DEPTH: 세 모드는 같은 Claim 집합을 다른 밀도로 보여준다 (§8) */
export interface Era {
  id: EraId;
  label: string;
  startYear: number;
  endYear: number | null; // null = 현재 진행
  title: string;
  analysisStatus: AnalysisStatus;
  /** 한눈에 보기 */
  glance: {
    summaryClaimIds: string[];
    keyCause: string;
    legacy: string;
  };
  /** 흐름 이해 — 기본 */
  flow: NarrativeParagraph[];
  /** 이전 시대(1960년대는 1945~1959)가 남긴 조건 */
  background: NarrativeParagraph[];
  /** ERA ATMOSPHERE — 사건보다 먼저 */
  atmosphere: EraAtmosphere[];
  /** 신문·광고 등 1차 사료 */
  documentIds: string[];
  advertisements: AdvertisementAnalysis[];
  /** TREND → INDUSTRY → JOBS 체인 */
  trendChains: { title: string; steps: ChainStep[] }[];
  keyChanges: KeyChange[];
  needs: HumanNeed[];
  trends: Trend[];
  industries: IndustryShift[];
  jobs: JobShift[];
  countries: CountrySnapshot[];
  eventIds: string[];
  caseStudyIds: string[];
  /** 아직 분석되지 않았거나 자료가 부족한 부분 */
  gaps: string[];
}

/** 연결 유형 (§44 WHY CHAIN GRAPH) */
export type LinkType = 'causal_evidenced' | 'statistical' | 'interpretation' | 'hypothesis';

export interface CausalLink {
  id: string;
  fromLabel: string;
  toLabel: string;
  linkType: LinkType;
  mechanism: string;
  claimIds: string[];
}

/** 경제·사회 지표. 모든 계열은 출처를 가진다. 값은 출처에서 옮긴 그대로이며 보간하지 않는다. */
export interface IndicatorSeries {
  country: CountryCode;
  label: string;
  sourceIds: string[];
  /** [시점('YYYY' 또는 'YYYY-MM'), 값] */
  points: [string, number][];
}
export interface Indicator {
  id: string;
  title: string;
  unit: string;
  frequency: 'annual' | 'monthly';
  description: string;
  series: IndicatorSeries[];
  note?: string;
  zeroLine?: boolean;
  refLine?: { value: number; label: string };
  eraIds: EraId[];
}

/** 시대와 시대를 잇는 연결 — 프로그램의 중심 구조 */
export interface EraTransition {
  fromEra: EraId;
  toEra: EraId;
  summary: string;
  links: CausalLink[];
}

/** 심층 사례 (예: 1973 석유파동). 특정 시대 안에 속한다. */
export interface CaseStudy {
  id: string;
  eraId: EraId;
  title: string;
  status: AnalysisStatus;
  summary: string;
  whyChain: {
    stage: 'background' | 'structural' | 'interests' | 'pressure' | 'trigger' | 'transmission' | 'outcome' | 'legacy';
    claimIds: string[];
  }[];
  competingExplanations: {
    thesis: string;
    proponents: string;
    supportClaimIds: string[];
    limits: string;
  }[];
  countryResponses: CountrySnapshot[];
}

/* 지표 타입은 위의 Indicator / IndicatorSeries 하나로 통합했다 (DECISIONS D-13).
   DB 전환 시: Indicator → indicator 표, (계열 country × points) → observation 표 행. */

// ---- PATTERN DISCOVERY / SIMILAR ERA FINDER / 신호 추적 (data/build/patterns.py) ----
export type Verdict = 'same' | 'partial' | 'different' | 'unknown';
export type PhenomenonKind = 'statistical' | 'weak' | 'similar' | 'chance' | 'none' | 'insufficient';
export interface ParallelSide { text: string; claimIds: string[] }
export interface ParallelRow { aspect: string; a: ParallelSide; b: ParallelSide; verdict: Verdict; note: string }
export interface CriterionJudgement { criterion: string; verdict: Verdict; note: string; claimIds: string[] }
export interface Parallel {
  id: string; title: string; theme: string; question: string;
  a: { eraId: EraId; label: string; years: string };
  b: { eraId: EraId; label: string; years: string };
  rows: ParallelRow[]; criteria: CriterionJudgement[];
  repeated: string[]; notConclusive: string[]; notConclusiveIds: string[];
  future: { common: string; pastResult: string; different: string; conditions: string; signals: string[] };
  similarity: { assessed: number; total: number; points: number; score: number | null; formula: string };
  figureSourceIds?: string[];
}
export interface SignalTrack {
  id: string; title: string; originEra: EraId; domain: Domain; gap: string;
  steps: { eraId: EraId; label: string; claimIds: string[] }[];
}
export interface Phenomenon { subject: string; kind: PhenomenonKind; summary: string; link?: string }
export interface CountryCycleStats {
  country: CountryCode; label: string; from: number; to: number; n: number;
  acf: number[]; band: number; lagsOverBand: number[]; maxAbsAcf: number; pMaxAcf: number;
  spectralPeakYears: number; spectralShare: number; pSpectral: number;
  changePoint: { year: number; meanBefore: number; meanAfter: number; varianceExplained: number };
  negativeYears: number[]; negativeGaps: number[];
  sensitivity: { lag: number; r: number; rWithoutCrisisPairs: number; pairsUsed: number; crisisPairs: number[][] }[];
}
export interface CycleStats {
  method: string[]; params: { permutations: number; maxLag: number; seed: number };
  countries: CountryCycleStats[];
  crossLag: { a: CountryCode; b: CountryCode; from: number; to: number; band: number; values: { lag: number; r: number; n: number }[] }[];
}
export interface Patterns {
  stats: CycleStats; parallels: Parallel[]; signals: SignalTrack[]; phenomena: Phenomenon[]; criteria: string[]; rules: string[];
}

// ---- 역사 흐름 지도 관계망 (data/build/graph.py) ----
export type Lane = 'politics' | 'economy' | 'society' | 'industry' | 'culture' | 'flow';
export type Role = 'context' | 'root' | 'trigger' | 'response' | 'change' | 'result' | '';
export interface GraphNode {
  id: string; kind: 'event' | 'phenomenon' | 'trend'; nodeType: NodeType; label: string; year: number; yearPrecision: 'year' | 'era'; date?: string; eraId: EraId;
  lane: Lane; domains: string[]; countries: CountryCode[]; importance: 1 | 2 | 3; degree: number;
  claimIds: string[]; eventIds: string[]; aliases?: string[]; docIds?: string[];
  trend?: { need?: string; whyThen?: string; timeline: { country?: string; emerged?: string; popularized?: string; declined?: string }[] };
}
export interface GraphChainStep { nodeId: string; stage: string; role: Role; stageLabel: string; linkType?: LinkType | null; claimIds: string[] }
export interface GraphChain {
  id: string; kind: 'case' | 'trendChain' | 'transition' | 'signal'; title: string; ref: string; eraId: EraId;
  steps: GraphChainStep[]; mechanism?: string; linkType?: LinkType;
  countryResponses?: { country: CountryCode; situation: string; claimIds: string[] }[];
}
export type NodeType = 'event' | 'background' | 'goal' | 'trigger' | 'mechanism' | 'reaction' | 'change' | 'outcome' | 'trend' | 'phenomenon';
export type RelType = 'cause' | 'background' | 'trigger' | 'influence' | 'sequence' | 'similar';
export type EdgeVerification = 'evidenced' | 'interpretation' | 'statistical' | 'hypothesis';
export interface GraphEdge { id: string; from: string; to: string; rel: RelType; verification: EdgeVerification; chainId: string; note: string; claimIds: string[] }
export interface Graph {
  nodes: GraphNode[]; chains: GraphChain[]; edges: GraphEdge[]; lanes: Lane[];
  relTypes: Record<RelType, string>; nodeTypes: Record<NodeType, string>;
}
