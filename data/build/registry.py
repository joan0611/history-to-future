"""seed.json 에서 SOURCE_REGISTRY.md 를 자동 생성한다.
실행: python3 data/build/registry.py  (build_seed.py 실행 뒤)
손으로 고치지 말 것 — 데이터가 바뀌면 다시 생성한다."""
import json
import os
from collections import Counter, defaultdict

ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
seed = json.load(open(os.path.join(ROOT, "data", "seed.json"), encoding="utf-8"))

ACCESS = {"original": "1 원문 직접 확인", "archive_metadata": "2 아카이브 메타·일부 문장", "secondary": "3 2차 자료", "unverified": "4 미확인"}
STYPE = {"government": "정부·공공기록", "academic": "학술", "institution": "연구기관·국제기구", "company": "기업 발표",
         "news": "언론", "reference": "참고자료"}

claims = seed["claims"]
src_use = Counter(s for c in claims for s in c.get("sourceIds", []))
era_of_claim = {}
for e in seed["eras"]:
    blob = json.dumps(e, ensure_ascii=False)
    for c in claims:
        if f'"{c["id"]}"' in blob:
            era_of_claim.setdefault(c["id"], e["id"])

L = ["# SOURCE_REGISTRY — 출처·사료 검증 현황", "",
     "> 이 파일은 `data/build/registry.py`가 `data/seed.json`에서 자동 생성합니다. 직접 수정하지 마세요.", ""]

st = Counter(c["status"] for c in claims)
L += ["## 1. 전체 요약", "",
      f"- 문장(주장) {len(claims)}개: 확인됨(독립 출처 2개 이상) {st['verified']} · 출처 있음 {st['sourced']} · 출처 필요 {st['needs_source']}",
      f"- 출처 {len(seed['sources'])}개 · 1차 사료 묶음 {len(seed['documents'])}건 · 아카이브 {len(seed['archives'])}곳", ""]

L += ["## 2. 시대별 문장 검증 상태", "", "| 시대 | 분석 수준 | 문장 | 확인됨 | 출처 있음 | 출처 필요 |", "|---|---|---|---|---|---|"]
for e in seed["eras"]:
    cs = [c for c in claims if era_of_claim.get(c["id"]) == e["id"]]
    s = Counter(c["status"] for c in cs)
    L.append(f"| {e['label']} | {e['analysisStatus']} | {len(cs)} | {s['verified']} | {s['sourced']} | {s['needs_source']} |")
L.append("")

L += ["## 3. 1차 사료(신문·광고·정부기록) 열람 수준", "", "| ID | 자료 | 기간 | 열람 수준 | 실제로 본 것 |", "|---|---|---|---|---|"]
for d in seed["documents"]:
    v = d.get("verification", {})
    L.append(f"| {d['id']} | {d['publication']} — {d['title']} | {d.get('publishedDate','')} | {ACCESS.get(v.get('accessLevel'),'?')} | {v.get('whatWasViewed','')} |")
L.append("")

L += ["## 4. 아카이브 접근 상태", "", "| 아카이브 | 범위 | 개발 환경 접근 |", "|---|---|---|"]
for a in seed["archives"]:
    L.append(f"| {a['name']} | {a.get('coverage','')} | {'가능' if a.get('reachableFromDevEnv') else '불가 (사용자 측 수집 필요)'} |")
L.append("")

L += ["## 5. 출처 유형별 개수", ""]
for k, n in Counter(s["sourceType"] for s in seed["sources"]).most_common():
    L.append(f"- {STYPE.get(k, k)}: {n}")
L.append("")

L += ["## 6. 출처가 필요한 문장 (가설·미확인)", ""]
for c in claims:
    if c["status"] == "needs_source":
        L.append(f"- `{c['id']}` ({era_of_claim.get(c['id'],'-')}): {c['text']}")
L.append("")

L += ["## 7. 전체 출처 목록 (인용 횟수순)", "", "| ID | 제목 | 발행 | 유형 | 인용 |", "|---|---|---|---|---|"]
for s in sorted(seed["sources"], key=lambda s: -src_use[s["id"]]):
    title = s["title"].replace("|", "/")
    L.append(f"| {s['id']} | [{title}]({s['url']}) | {s['publisher']} | {STYPE.get(s['sourceType'], s['sourceType'])} | {src_use[s['id']]} |")
unused = [s["id"] for s in seed["sources"] if src_use[s["id"]] == 0]
L += ["", f"인용되지 않은 출처: {len(unused)}개" + (f" — {', '.join(unused)}" if unused else ""), ""]

open(os.path.join(ROOT, "SOURCE_REGISTRY.md"), "w", encoding="utf-8").write("\n".join(L))
print("SOURCE_REGISTRY.md 생성:", len(claims), "문장,", len(seed["sources"]), "출처")
