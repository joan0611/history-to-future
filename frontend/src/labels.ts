import type { AccessLevel, AnalysisStatus, ClaimType, CountryCode, LinkType, VerificationStatus } from './domain/types';

export const CLAIM_TYPE: Record<ClaimType, { label: string; short: string }> = {
  fact: { label: '확인된 사실', short: '사실' },
  statistical: { label: '통계로 관찰된 관계', short: '통계' },
  interpretation: { label: '근거 있는 해석', short: '해석' },
  hypothesis: { label: '검증되지 않은 가설', short: '가설' },
};

export const STATUS: Record<VerificationStatus, string> = {
  verified: '독립 출처 2개 이상 일치',
  sourced: '출처 1개 연결 (교차 검증 전)',
  needs_source: '출처 확보 필요',
};

export const ACCESS: Record<AccessLevel, { n: number; label: string }> = {
  original: { n: 1, label: '원문 직접 확인' },
  archive_metadata: { n: 2, label: '아카이브 메타·초록·전사본 확인' },
  secondary: { n: 3, label: '2차 자료로 간접 확인' },
  unverified: { n: 4, label: '미확인' },
};

export const ANALYSIS: Record<AnalysisStatus, string> = {
  deep: '심층 분석',
  basic: '기본 해설',
  planned: '분석 예정',
};

export const LINK: Record<LinkType, string> = {
  causal_evidenced: '근거 있는 인과',
  statistical: '통계적 상관',
  interpretation: '역사적 해석',
  hypothesis: '검증 전 가설',
};

export const COUNTRY: Record<CountryCode, string> = {
  KR: '한국', US: '미국', JP: '일본', CN: '중국', GB: '영국', DE: '서독·유럽', FR: '프랑스', WORLD: '세계', MIDEAST: '중동 산유국',
};

export const ATMOS_Q: Record<string, string> = {
  mood: '사회 분위기',
  priorities: '가장 중요한 문제',
  dreams: '꿈꾼 생활',
  discomforts: '불편했던 것',
  tech_hopes: '기대한 기술·상품',
  anxieties: '불안과 저항',
  values: '퍼지던 문화·가치관',
  differences: '세대·계층·국가 차이',
};

export const CHAIN_STAGE: Record<string, string> = {
  environment: '시대 환경', need: '욕구', trend: '트렌드', demand: '수요', business_tech: '기업·기술',
  industry: '산업', jobs: '직업', legacy: '다음 시대',
  background: '장기 배경', structural: '구조적 원인', interests: '이해관계', pressure: '누적 압력',
  trigger: '촉발 사건', transmission: '전달 경로', outcome: '결과',
};

export const DIRECTION: Record<string, string> = {
  emerging: '등장', growing: '성장', mature: '성숙', declining: '쇠퇴', restructuring: '재편',
  new: '새 직무', transformed: '업무 변화',
};
