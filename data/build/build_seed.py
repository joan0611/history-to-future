"""시드 데이터를 data/seed.json으로 만들고 참조 무결성을 검사한다.
실행: python3 data/build/build_seed.py
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from sources import SOURCES  # noqa: E402
import era_1960s as e60  # noqa: E402
import era_others as eo  # noqa: E402
import era_1970s as e70  # noqa: E402
import era_1980s as e80  # noqa: E402
import era_1990s as e90  # noqa: E402
import era_2000s as e00  # noqa: E402
import era_2010s as e10  # noqa: E402
import era_2020s as e20  # noqa: E402
import indicators as ind  # noqa: E402
import patterns as pat  # noqa: E402
import graph as gr  # noqa: E402
import deep_1973 as d73  # noqa: E402

ERA_ORDER = ["1960s", "1970s", "1980s", "1990s", "2000s", "2010s", "2020s"]


def main():
    claims = e60.CLAIMS + eo.CLAIMS + e70.CLAIMS + e80.CLAIMS + e90.CLAIMS + e00.CLAIMS + e10.CLAIMS + e20.CLAIMS + d73.CLAIMS
    eras = [e60.ERA, e70.ERA, e80.ERA, e90.ERA, e00.ERA, e10.ERA, e20.ERA] + [e for e in eo.ERAS if e["id"] not in ("1970s", "1980s", "1990s", "2000s", "2010s", "2020s")]
    events = e60.EVENTS + eo.EVENTS + e70.EVENTS + e80.EVENTS + e90.EVENTS + e00.EVENTS + e10.EVENTS + e20.EVENTS
    seed = {
        "version": "0.2.0",
        "generatedNote": "실제 출처 기반 시드. 모든 문장은 claims에 있으며 출처·검증 상태를 가진다.",
        "eras": sorted(eras, key=lambda e: ERA_ORDER.index(e["id"])),
        "claims": claims,
        "sources": SOURCES + e70.SOURCES + e80.SOURCES + e90.SOURCES + e00.SOURCES + e10.SOURCES + e20.SOURCES + ind.SOURCES + d73.SOURCES,
        "events": events,
        "transitions": eo.TRANSITIONS,
        "caseStudies": [e70.CASE, e90.CASE],
        "documents": e60.DOCUMENTS + e70.DOCUMENTS + e80.DOCUMENTS + e90.DOCUMENTS + e00.DOCUMENTS + e10.DOCUMENTS + e20.DOCUMENTS,
        "archives": eo.ARCHIVES + e00.ARCHIVES,
        "indicators": ind.INDICATORS,
        "patterns": pat.build(ind.INDICATORS),
    }
    seed["graph"] = gr.build(seed, pat.SIGNALS, d73)
    errors = validate(seed) + gr.validate(seed["graph"], seed)
    if errors:
        print("\n".join(errors))
        sys.exit(1)
    out = os.path.join(os.path.dirname(__file__), "..", "seed.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(seed, f, ensure_ascii=False, indent=1)
    s = stats(seed)
    print(json.dumps(s, ensure_ascii=False, indent=1))


def walk_claim_ids(obj):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in ("claimIds", "summaryClaimIds", "supportClaimIds", "realityClaimIds") and isinstance(v, list):
                yield from v
            else:
                yield from walk_claim_ids(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from walk_claim_ids(v)


def validate(seed):
    errs = []
    cids = [c["id"] for c in seed["claims"]]
    dup = {x for x in cids if cids.count(x) > 1}
    if dup:
        errs.append(f"중복 claim id: {dup}")
    cset, sset = set(cids), {s["id"] for s in seed["sources"]}
    for c in seed["claims"]:
        for s in c["sourceIds"]:
            if s not in sset:
                errs.append(f"{c['id']}: 없는 source {s}")
        if c["status"] != "needs_source" and not c["sourceIds"]:
            errs.append(f"{c['id']}: 출처 없는데 status={c['status']}")
        if c["status"] == "verified" and len(c["sourceIds"]) < 2:
            errs.append(f"{c['id']}: verified는 독립 출처 2개 이상 필요")
    for part in ("eras", "events", "transitions", "caseStudies", "patterns"):
        for cid in walk_claim_ids(seed[part]):
            if cid not in cset:
                errs.append(f"{part}: 없는 claim {cid}")
    eras_ = {e["id"] for e in seed["eras"]}
    for p in seed["patterns"]["parallels"]:
        for side in ("a", "b"):
            if p[side]["eraId"] not in eras_:
                errs.append(f"{p['id']}: 없는 시대 {p[side]['eraId']}")
        if {c["criterion"] for c in p["criteria"]} != set(seed["patterns"]["criteria"]):
            errs.append(f"{p['id']}: 비교 기준 8개가 모두 있어야 함")
        for r in p["rows"] + p["criteria"]:
            if r["verdict"] not in ("same", "partial", "different", "unknown"):
                errs.append(f"{p['id']}: 판정값 오류 {r['verdict']}")
    for sg in seed["patterns"]["signals"]:
        for st in sg["steps"]:
            if st["eraId"] not in eras_ or not st["claimIds"]:
                errs.append(f"{sg['id']}: 단계 근거 없음 {st['label']}")
    for ph in seed["patterns"]["phenomena"]:
        if ph["kind"] not in ("statistical", "weak", "similar", "chance", "none", "insufficient"):
            errs.append(f"현상 분류값 오류 {ph['kind']}")
    did = {d["id"] for d in seed["documents"]}
    aid = {a["id"] for a in seed["archives"]}
    for e in seed["eras"]:
        for d in e["documentIds"]:
            if d not in did:
                errs.append(f"{e['id']}: 없는 document {d}")
        for ad in e["advertisements"]:
            for d in ad["documentIds"]:
                if d not in did:
                    errs.append(f"{ad['id']}: 없는 document {d}")
    for d in seed["documents"]:
        if d.get("archiveId") and d["archiveId"] not in aid:
            errs.append(f"{d['id']}: 없는 archive {d['archiveId']}")
        for s in d["crossCheckSourceIds"]:
            if s not in sset:
                errs.append(f"{d['id']}: 없는 cross-check source {s}")
    eids = {e["id"] for e in seed["events"]}
    for e in seed["eras"]:
        for ev in e["eventIds"]:
            if ev not in eids:
                errs.append(f"{e['id']}: 없는 event {ev}")
    sid = {x["id"] for x in seed["sources"]}
    for ind_ in seed.get("indicators", []):
        for se in ind_["series"]:
            if not se["sourceIds"]:
                errs.append(f"지표 출처 없음: {ind_['id']}/{se['country']}")
            for x in se["sourceIds"]:
                if x not in sid:
                    errs.append(f"지표 출처 ID 없음: {ind_['id']} → {x}")
            ts = [pt[0] for pt in se["points"]]
            if ts != sorted(ts) or len(set(ts)) != len(ts):
                errs.append(f"지표 시점 순서·중복 오류: {ind_['id']}/{se['country']}")
    trend_cats = {"fashion", "music", "film", "media", "food", "housing", "mobility", "electronics", "shopping",
                  "advertising", "values", "lifestyle", "education", "family"}
    for e in seed["eras"]:
        for t in e.get("trends", []):
            if t["category"] not in trend_cats:
                errs.append(f"트렌드 분류 오류: {t['id']} → {t['category']} (types.ts와 불일치)")
        for j in e.get("jobs", []):
            if j["change"] not in {"new", "growing", "transformed", "declining"}:
                errs.append(f"직업 변화 값 오류: {j['occupation']}")
        for i in e.get("industries", []):
            if i["direction"] not in {"emerging", "growing", "mature", "declining", "restructuring"}:
                errs.append(f"산업 방향 값 오류: {i['industry']}")
    return errs


def stats(seed):
    from collections import Counter
    return {
        "eras": [(e["id"], e["analysisStatus"]) for e in seed["eras"]],
        "claims": len(seed["claims"]),
        "claimStatus": dict(Counter(c["status"] for c in seed["claims"])),
        "claimType": dict(Counter(c["claimType"] for c in seed["claims"])),
        "sources": len(seed["sources"]),
        "documents": {d["id"]: d["verification"]["accessLevel"] for d in seed["documents"]},
    }


if __name__ == "__main__":
    main()
