# 시대 구조·공통 스키마·API 계약 (v0.2)

## 중심 구조
1960년부터 현재까지 **7개 시대가 이어지는 하나의 이야기**입니다.

```
Era(1960s) ──EraTransition──▶ Era(1970s) ──▶ Era(1980s) ──▶ … ──▶ Era(2020s~)
   │                              │
   ├─ atmosphere (시대 분위기: 사건보다 먼저)
   ├─ flow / background (흐름 이해 해설, 전부 Claim으로 구성)
   ├─ keyChanges · needs · trends(CulturalTrend+LifestyleChange) · industries · jobs
   ├─ countries (CountryEraComparison)
   ├─ advertisements (광고가 약속한 생활 vs 실제 보급·가격)
   ├─ trendChains (환경→욕구→트렌드→수요→기업·기술→산업→직업→다음 시대)
   ├─ documentIds → PrimaryDocument(신문·잡지·정부조사·광고) + SourceVerification
   └─ caseStudyIds → CaseStudy (예: 1970s 안의 1973 석유파동)
```

모든 문장은 `HistoricalClaim`입니다. 각 Claim은 유형(사실·통계 관계·해석·가설), 검증 상태, 출처를 가집니다. 화면 세 모드(한눈에·흐름·심층)는 **같은 Claim 집합**을 서로 다른 밀도로 보여주므로 내용이 서로 어긋날 수 없습니다.

## 지시문 엔터티와의 대응
| 지시문 엔터티 | 구현 |
|---|---|
| NewspaperArticle | `PrimaryDocument(kind=newspaper_article / magazine_article)` |
| NewspaperArchive | `NewspaperArchive` |
| HistoricalAdvertisement | `PrimaryDocument(kind=advertisement)` + `AdvertisementAnalysis` |
| CulturalTrend · LifestyleChange | `Trend(kind=cultural_trend / lifestyle_change)` |
| ConsumerNeed | `HumanNeed` |
| HistoricalClaim · EvidenceSource | 같은 이름의 타입 |
| SourceVerification | `SourceVerification` (원문 / 아카이브 메타·전사본 / 2차 자료 / 미확인) |
| CountryEraComparison | `CountrySnapshot` (lifestyle, whyDifferent 포함) |

## API 계약 (FastAPI, `/api/v1`)
| 메서드·경로 | 응답 타입 |
|---|---|
| GET `/eras` | `Era[]` 요약(id, label, title, analysisStatus) |
| GET `/eras/{id}` | `Era` |
| GET `/transitions` | `EraTransition[]` |
| GET `/claims?ids=a,b` | `HistoricalClaim[]` |
| GET `/sources` | `EvidenceSource[]` |
| GET `/documents?era=1960s` | `PrimaryDocument[]` |
| GET `/archives` | `NewspaperArchive[]` |
| GET `/events?era=` | `HistoricalEvent[]` |
| GET `/case-studies/{id}` | `CaseStudy` |

프런트엔드는 `DataProvider` 인터페이스만 사용합니다. `VITE_API_BASE_URL`이 설정되면 `HttpDataProvider`가, 설정되지 않으면 `LocalDataProvider`(동봉된 시드 JSON)가 동작합니다. API를 붙이더라도 화면 코드는 바뀌지 않습니다.
