-- HISTORY TO FUTURE — PostgreSQL schema (v0.1)
-- frontend/src/domain/types.ts 와 동일한 계약. 1960년~현재 연속 시대 구조가 중심.

CREATE TYPE era_id AS ENUM ('1960s','1970s','1980s','1990s','2000s','2010s','2020s');
CREATE TYPE claim_type AS ENUM ('fact','statistical','interpretation','hypothesis');
CREATE TYPE verification_status AS ENUM ('verified','sourced','needs_source');
CREATE TYPE analysis_status AS ENUM ('deep','basic','planned');
CREATE TYPE link_type AS ENUM ('causal_evidenced','statistical','interpretation','hypothesis');

CREATE TABLE country (
  code        TEXT PRIMARY KEY,           -- KR, US, JP, CN, GB, DE, FR, WORLD, MIDEAST
  name_ko     TEXT NOT NULL
);

CREATE TABLE era (
  id              era_id PRIMARY KEY,
  sort_order      SMALLINT NOT NULL UNIQUE,
  label           TEXT NOT NULL,
  start_year      SMALLINT NOT NULL,
  end_year        SMALLINT,                -- NULL = 진행 중
  title           TEXT NOT NULL,
  analysis_status analysis_status NOT NULL DEFAULT 'planned',
  key_cause       TEXT,
  legacy          TEXT,
  gaps            TEXT[] NOT NULL DEFAULT '{}',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE evidence_source (
  id             TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  publisher      TEXT NOT NULL,
  url            TEXT NOT NULL,
  source_type    TEXT NOT NULL,
  published_date TEXT,
  accessed_date  DATE NOT NULL,
  license_note   TEXT,
  note           TEXT
);

CREATE TABLE historical_claim (
  id             TEXT PRIMARY KEY,
  text           TEXT NOT NULL,
  claim_type     claim_type NOT NULL,
  status         verification_status NOT NULL,
  ai_synthesized BOOLEAN NOT NULL DEFAULT false,
  domains        TEXT[] NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE claim_source (
  claim_id  TEXT REFERENCES historical_claim(id) ON DELETE CASCADE,
  source_id TEXT REFERENCES evidence_source(id),
  PRIMARY KEY (claim_id, source_id)
);

CREATE TABLE claim_country (
  claim_id TEXT REFERENCES historical_claim(id) ON DELETE CASCADE,
  country  TEXT REFERENCES country(code),
  PRIMARY KEY (claim_id, country)
);

-- 시대 안의 구성 요소: 해설 문단, 핵심 변화, 욕구, 트렌드, 산업, 직업, 국가 상황을
-- 하나의 테이블로 두고 kind로 구분한다(화면 구조가 늘어나도 스키마 변경 최소화).
CREATE TABLE era_item (
  id          TEXT PRIMARY KEY,
  era         era_id NOT NULL REFERENCES era(id),
  kind        TEXT NOT NULL CHECK (kind IN
               ('background','flow','glance','key_change','need','trend','industry','job','country')),
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  title       TEXT,                       -- heading / 산업명 / 직업명 / 트렌드명
  body        TEXT,                       -- why / pathway / situation
  attrs       JSONB NOT NULL DEFAULT '{}' -- direction, change, category, country, priorityReason 등
);

CREATE TABLE era_item_claim (
  item_id    TEXT REFERENCES era_item(id) ON DELETE CASCADE,
  claim_id   TEXT REFERENCES historical_claim(id),
  sort_order SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id, claim_id)
);

CREATE TABLE historical_event (
  id        TEXT PRIMARY KEY,
  era       era_id NOT NULL REFERENCES era(id),
  date_text TEXT NOT NULL,                -- 'YYYY' | 'YYYY-MM' | 'YYYY-MM-DD'
  title     TEXT NOT NULL,
  priority  SMALLINT NOT NULL CHECK (priority BETWEEN 1 AND 3),
  domains   TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE event_claim (
  event_id TEXT REFERENCES historical_event(id) ON DELETE CASCADE,
  claim_id TEXT REFERENCES historical_claim(id),
  PRIMARY KEY (event_id, claim_id)
);

CREATE TABLE event_country (
  event_id TEXT REFERENCES historical_event(id) ON DELETE CASCADE,
  country  TEXT REFERENCES country(code),
  PRIMARY KEY (event_id, country)
);

-- 시대 간 연결: 프로그램의 중심 구조
CREATE TABLE era_transition (
  from_era era_id REFERENCES era(id),
  to_era   era_id REFERENCES era(id),
  summary  TEXT NOT NULL,
  PRIMARY KEY (from_era, to_era)
);

CREATE TABLE causal_link (
  id         TEXT PRIMARY KEY,
  from_era   era_id,
  to_era     era_id,
  case_study TEXT,                        -- 사례 내부 링크일 때
  from_label TEXT NOT NULL,
  to_label   TEXT NOT NULL,
  link_type  link_type NOT NULL,
  mechanism  TEXT NOT NULL,
  FOREIGN KEY (from_era, to_era) REFERENCES era_transition(from_era, to_era)
);

CREATE TABLE causal_link_claim (
  link_id  TEXT REFERENCES causal_link(id) ON DELETE CASCADE,
  claim_id TEXT REFERENCES historical_claim(id),
  PRIMARY KEY (link_id, claim_id)
);

CREATE TABLE case_study (
  id      TEXT PRIMARY KEY,
  era     era_id NOT NULL REFERENCES era(id),
  title   TEXT NOT NULL,
  status  analysis_status NOT NULL,
  summary TEXT NOT NULL,
  body    JSONB NOT NULL                  -- whyChain, competingExplanations, countryResponses
);

-- 시계열 (Phase 3에서 수집기가 채움). 발표 시점 관리(§53 POINT-IN-TIME)를 위해 vintage 보관.
CREATE TABLE indicator (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  unit      TEXT NOT NULL,
  country   TEXT REFERENCES country(code),
  source_id TEXT REFERENCES evidence_source(id),
  frequency TEXT NOT NULL CHECK (frequency IN ('D','W','M','Q','A')),
  note      TEXT
);

CREATE TABLE observation (
  indicator_id TEXT REFERENCES indicator(id) ON DELETE CASCADE,
  obs_date     DATE NOT NULL,
  value        NUMERIC,
  vintage_date DATE NOT NULL,              -- 이 값이 공개된 날짜
  PRIMARY KEY (indicator_id, obs_date, vintage_date)
);

-- 분석 수정 이력 (§39, §56 AnalysisRevision): 덮어쓰지 않고 쌓는다
CREATE TABLE analysis_revision (
  id          BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason      TEXT NOT NULL,
  before_json JSONB,
  after_json  JSONB
);

-- 수집 작업 로그 (§57)
CREATE TABLE ingestion_run (
  id          BIGSERIAL PRIMARY KEY,
  source      TEXT NOT NULL,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status      TEXT NOT NULL CHECK (status IN ('running','success','failed')),
  message     TEXT
);

-- ============================================================
-- v0.2 — 신문·광고·생활문화 1차 사료 (신문·광고 지시문 §2, §10)
-- ============================================================
CREATE TYPE access_level AS ENUM ('original','archive_metadata','secondary','unverified');

CREATE TABLE newspaper_archive (            -- NewspaperArchive
  id                    TEXT PRIMARY KEY,
  name                  TEXT NOT NULL,
  country               TEXT REFERENCES country(code),
  coverage              TEXT NOT NULL,
  access                TEXT NOT NULL,
  license               TEXT NOT NULL,
  url                   TEXT NOT NULL,
  reachable_from_devenv BOOLEAN NOT NULL
);

CREATE TABLE primary_document (             -- NewspaperArticle / 잡지 / 정부조사 / 광고 원본
  id             TEXT PRIMARY KEY,
  kind           TEXT NOT NULL CHECK (kind IN ('newspaper_article','magazine_article','advertisement',
                                               'government_survey','government_record','speech')),
  publication    TEXT NOT NULL,
  title          TEXT NOT NULL,
  published_date TEXT NOT NULL,
  country        TEXT REFERENCES country(code),
  era            era_id REFERENCES era(id),
  section        TEXT,
  archive_id     TEXT REFERENCES newspaper_archive(id),
  url            TEXT,
  findings       TEXT[] NOT NULL DEFAULT '{}',
  copyright      TEXT NOT NULL,
  bias_notes     TEXT
);

CREATE TABLE source_verification (          -- SourceVerification (이력 보존: 열람 수준이 올라가면 행 추가)
  id               BIGSERIAL PRIMARY KEY,
  document_id      TEXT REFERENCES primary_document(id) ON DELETE CASCADE,
  access_level     access_level NOT NULL,
  what_was_viewed  TEXT NOT NULL,
  access_issue     TEXT,
  checked_on       DATE NOT NULL
);

CREATE TABLE document_link (                -- 기사·광고 ↔ 사건·트렌드·산업·교차검증 출처
  document_id TEXT REFERENCES primary_document(id) ON DELETE CASCADE,
  link_kind   TEXT NOT NULL CHECK (link_kind IN ('event','trend','industry','cross_check_source','claim')),
  target_id   TEXT NOT NULL,
  PRIMARY KEY (document_id, link_kind, target_id)
);

-- CulturalTrend / LifestyleChange / ConsumerNeed / CountryEraComparison / ERA ATMOSPHERE 는
-- era_item(kind=...)로 통합한다. 아래 kind 를 추가한다.
ALTER TABLE era_item DROP CONSTRAINT IF EXISTS era_item_kind_check;
ALTER TABLE era_item ADD CONSTRAINT era_item_kind_check CHECK (kind IN
  ('background','flow','glance','key_change','need','trend','industry','job','country',
   'atmosphere','advertisement','trend_chain_step'));
-- attrs 예시
--  trend:        {"kind":"lifestyle_change","category":"electronics","timeline":[{"country":"JP","popularized":"1960s"}]}
--  atmosphere:   {"question":"dreams"}
--  advertisement:{"product":"흑백TV","appealedValues":["가족","현대성"],"documentIds":[...]}
--  country:      {"country":"KR","lifestyle":"...","whyDifferent":"..."}
