# HISTORY TO FUTURE (v0.12)

1960년부터 지금까지 세계가 **왜** 그렇게 변했는지를 하나의 이야기로 설명하는 웹앱입니다.
첫 화면은 HISTORY FLOW입니다. 시대를 고르면 그 시대의 핵심 동력·주요 변화·새 신호, 앞뒤 시대와의 연결, 비슷한 과거·현재 상황이 함께 나옵니다. '반복 패턴' 화면에서는 무엇이 반복되고 무엇이 반복되지 않았는지 자료로 확인합니다.

## 0. 바로 써 보기
- 게시된 앱: https://claude.ai/artifact/PVKUyEQLMtqRU6rZN39FKf
- 주요 주소: `#flow`(흐름, 첫 화면) · `#flow-1990s`(시대 집중) · `#patterns`(반복 패턴) · `#pattern-pp-energy`(비슷한 상황 비교) · `#status`(개발 현황)
- 미리보기와 코드가 같은지: 앱 맨 아래 '빌드 xxxx' 값과 `cd frontend && npm run fingerprint` 결과를 비교합니다.
- 반복 패턴 데이터를 다시 계산하려면 `pip install numpy` 후 `python3 data/build/build_seed.py`.
- 화면 테스트: `python3 tests/ui/patterntest.py $(pwd)/frontend/dist-single/index.html` (flowtest·charttest·visible·shoot도 같은 방식)

## 1. 실행 방법 (코딩을 몰라도 됩니다)

### 가장 쉬운 방법 — 파일 하나 열기
`frontend/dist-single/index.html` 파일을 더블클릭하면 브라우저에서 바로 열립니다. 설치할 것은 없습니다.

### 개발 모드로 실행하기
1. [Node.js](https://nodejs.org) LTS 버전을 설치합니다.
2. 터미널(맥: 터미널, 윈도우: PowerShell)에서 다음을 차례로 입력합니다.
   ```bash
   cd history-to-future/frontend
   npm install
   npm run dev
   ```
3. 화면에 나온 주소(보통 http://localhost:5173)를 브라우저로 엽니다.

### API 서버와 함께 실행하기 (선택)
```bash
cd history-to-future
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --port 8000
# 새 터미널에서
cd frontend
VITE_API_BASE_URL=http://localhost:8000 npm run dev
```
화면은 같고, 데이터만 API에서 받아옵니다. 어떤 공급원을 쓰고 있는지는 앱의 "개발 현황·신뢰도" 화면에 표시됩니다.

### 접속 주소
- 이미 게시된 앱: Claude 대화에 첨부된 앱 카드(비공개 링크)를 엽니다. 공유하려면 앱 화면의 공유 버튼을 누릅니다.
- 내 컴퓨터에서 개발 모드로 실행할 때: http://localhost:5173
- API 서버: http://localhost:8000/api/v1/eras (FastAPI 문서: http://localhost:8000/docs)

### 인터넷에 배포하기 (무료)
이 앱은 서버 없이 동작하는 정적 웹앱이라 무료 호스팅에 바로 올릴 수 있습니다.
- **가장 쉬운 방법 (Netlify Drop)**: `npm run build`를 실행하면 `frontend/dist` 폴더가 생깁니다. https://app.netlify.com/drop 에 이 폴더를 끌어다 놓으면 주소가 바로 발급됩니다.
- **Vercel**: GitHub에 올린 뒤 Vercel에서 저장소를 가져옵니다. Root Directory는 `frontend`, Build Command는 `npm run build`, Output은 `dist`로 설정합니다.
- **GitHub Pages**: `frontend/dist-single/index.html` 파일 하나만 올려도 동작합니다.
- API까지 배포하려면 Render·Railway·Fly.io 같은 곳에 `backend`를 올립니다. 이 경우 지속적인 비용이 생길 수 있으니 진행 전에 확인합니다.

## 2. 폴더 구조
```
data/build/        시드 데이터 원본(파이썬). 출처·문장·시대·사료
data/seed.json     빌드 결과. 프런트엔드와 API가 함께 사용
frontend/          React 18 + TypeScript (Vite)
  src/domain/types.ts   공통 데이터 계약
  src/data/provider.ts  Local ↔ HTTP 공급원 전환
backend/           FastAPI + PostgreSQL 스키마(schema.sql) + 테스트
docs/              PHASE 0 데이터 검증, 구조·API 계약
```

## 3. 데이터 추가·수정 방법
1. `data/build/` 안의 파이썬 파일에 출처(`S(...)`)와 문장(`C(...)`)을 추가합니다.
2. `python3 data/build/build_seed.py`를 실행합니다. 이어서 `python3 data/build/registry.py`로 SOURCE_REGISTRY.md를 다시 만듭니다. 참조 무결성을 자동으로 검사하므로, 없는 출처를 가리키거나 출처 1개짜리 문장을 'verified'로 표시하면 빌드가 실패합니다.
3. `cd frontend && npm run build:single`로 단일 파일을 다시 만듭니다.

## 4. 테스트 결과 (2026-11-11)
- 시드 데이터 무결성 검사: 통과 (문장 224, 출처 253, 1차 사료 16, 아카이브 9)
- TypeScript 타입 검사: 오류 0
- API 테스트(pytest): 4/4 통과. 시대가 1960년부터 순서대로 오는지, 출처 없는 문장이 확인된 것으로 표시되지 않는지 등을 검사
- 화면 확인(Headless Chrome): 1960년대 세 모드, 1차 사료 표, 근거 패널, 시대 연결, 석유파동 사례, 현황 화면, 모바일 폭 — 콘솔 오류 0
- 프런트엔드가 API를 통해 데이터를 받아 동작하는 것 확인

## 5. 현재 구현된 기능
- 1960년부터 시작하는 연속 시간축과 시대 연결 화면
- SMART DEPTH 세 모드: 한눈에 보기 / 흐름 이해(기본) / 심층 분석
- ERA ATMOSPHERE: 사건보다 먼저 보여주는 8가지 시대 분위기 질문
- 모든 문장에 유형 표시(사실·통계·해석·가설)와 출처·검증 상태 패널
- 1차 사료 표와 열람 수준 4단계(원문 / 아카이브 메타·전사본 / 2차 자료 / 미확인)
- 광고가 약속한 생활과 실제 보급·가격 비교, 트렌드 → 산업 → 직업 체인, 국가 비교
- 1970년대 심층 분석: 당시 조선일보 지면 154건(1973.10~1974.2)으로 재구성한 시대 분위기, 새마을운동·청년문화·장발 단속·포니
- 1973년 석유파동 심층 사례: 8단계 WHY 체인(장기 배경→구조→이해관계→누적 압력→촉발→전달→결과→다음 시대), 상반된 해석 4개, 미·일·한 대응
- 1980년대 심층 분석: 조선일보 지면 148건, 5·18, 컬러TV·통금 해제, 3저 호황, 1987 민주화·노동자 대투쟁, 64K D램, 볼커 긴축, 일본 거품
- 1990년대 심층 분석: 조선일보 지면 약 130건(1994~1999), 금융실명제·OECD 가입, 성수대교·삼풍백화점, CDMA, PC방·스타크래프트, 금 모으기, 닷컴, 일본 장기침체, 남순강화
- 2000년대 심층 분석: 서울신문·경향신문 당시 기사 11건, 벤처 거품, 카드대란, 2002 월드컵, 주5일제·비정규직, 싸이월드, 한류, 중국 WTO, 리먼 사태, 아이폰 상륙
- 2010년대 심층 분석: 카카오톡, 배달앱·플랫폼 노동, 강남스타일·BTS, 저금리·가계부채, 합계출산율 0.98, 1인 가구 30%, 최저임금·주52시간, 세월호, 촛불, 미·중 무역전쟁
- 1997년 외환위기 심층 사례: 8단계 WHY 체인, 상반된 해석 3개(도덕적 해이 / 금융 패닉 / 자본 자유화), 국가별 대응
- 개발 현황·신뢰도 화면

## 6. 아직 구현하지 않은 기능
자동 수집·업데이트, 검색·AI 질의응답(GUIDED STORY 대화형), 세계지도·경제지표 차트, WORLD HISTORY PLAYER, DAILY CONTEXT, 미래 산업·직업 엔진, 투자 분석·백테스트, PostgreSQL 실제 연결(스키마만 있음)

## 7. 데이터 한계
- **한국 신문 원문 미열람**: 네이버 뉴스 라이브러리와 NYT 아카이브는 개발 환경에서 접근이 막혀 있습니다. 한국 1960년대 광고 해석은 '가설'로 표시되어 있습니다.
- 1차 사료 10건 중 원문을 직접 확인한 것은 1건(1966년 미국 가전 업계지)입니다. 조선일보 1973~74년 기사는 지면 목록(제목·면)만 확인했고 본문은 확인하지 못했습니다.
- 한국 국민계정은 1970년을 기준으로 시계열이 끊깁니다(구계열·현행 계열).
- 금성 VD-191 가격처럼 자료끼리 숫자가 다른 경우, 모든 값을 표시하고 원문 확인 대상으로 남겼습니다.
- 1960년~현재 7개 시대 모두 심층 분석입니다. 첫 화면은 '세계와 한국의 흐름'입니다. 2000년대 신문은 기사 일부 문장만 확인했습니다. 2010년대는 '분석 예정'입니다.

## 8. 운영 비용 예상
| 항목 | 현재 | 확장 시 |
|---|---|---|
| 호스팅 | 0원 (정적 파일) | 소형 서버 + PostgreSQL 월 2~5만 원 수준(클라우드 요금제에 따라 다름) |
| 통계 API (ECOS·FRED·World Bank) | 0원 | 무료 키 |
| 신문 아카이브 | 0원 (링크만) | 빅카인즈 API 협약, NYT TimesMachine 등은 별도 조건 |
| AI 분석 API | 0원 | 사용량 비례 — 도입 전에 승인 받기 |
유료 API, 외부 배포, 지속적으로 과금되는 작업은 진행하기 전에 승인을 받습니다.

## 9. 다음 단계
작업 순서와 진행 상황은 `TASK_QUEUE.md`, 현재 상태는 `PROJECT_STATE.md`, 출처 검증 현황은 `SOURCE_REGISTRY.md`(자동 생성), 기술 결정은 `DECISIONS.md`에 있습니다. 새 세션은 PROJECT_STATE.md부터 읽고 이어갑니다.

FRED 데이터를 쓰게 되면 다음 고지를 표시해야 합니다: "This product uses the FRED® API but is not endorsed or certified by the Federal Reserve Bank of St. Louis."
