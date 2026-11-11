"""역사 흐름 지도용 관계망 — 이미 있는 데이터만 엮는다(새 사실을 만들지 않음).

노드 = 사건(events) + 인과 사슬의 단계 + 시대 간 연결의 양 끝 + 신호 추적 단계 + 시대별 트렌드.
사슬(chains) = 순서가 있는 노드 목록. 사슬마다 각 노드의 '단계(stage)'가 있어,
화면은 선택한 노드 앞쪽 단계를 원인 쪽(이전 상황·근본 원인·촉발), 뒤쪽 단계를 결과 쪽(반응·산업·결과)으로 나눈다.

병합 규칙: 사슬 단계의 근거 문장에 어떤 사건의 대표 근거 문장(claimIds[0])이 들어 있고 같은 시대면 그 사건 노드를 재사용한다.
→ 서로 다른 데이터(사례·체인·시대 연결)가 같은 사건에서 만나 하나의 연결망이 된다.
"""
import re

ERA_START = {"1960s": 1960, "1970s": 1970, "1980s": 1980, "1990s": 1990, "2000s": 2000, "2010s": 2010, "2020s": 2020}
PREFIX_ERA = {f"c{str(y)[2]}0": e for e, y in ERA_START.items()}
LANES = ["politics", "economy", "society", "industry", "culture", "flow"]
LANE_OF = {"politics": "politics", "economy": "economy", "energy": "economy", "society": "society", "labor": "society",
           "consumption": "society", "industry": "industry", "technology": "industry", "culture": "culture"}
# 사슬 단계 → 역할. context=이전 상황, root=근본 원인, trigger=촉발, response=국민 반응·생활 변화, change=산업·문화 변화, result=이후 결과
ROLE = {
    "background": "context", "structural": "root", "interests": "root", "pressure": "root", "trigger": "trigger",
    "transmission": "response", "outcome": "result", "legacy": "result",
    "environment": "context", "need": "root", "trend": "response", "demand": "response",
    "business_tech": "change", "industry": "change", "jobs": "change",
    "from_causal": "root", "from": "context", "to": "result",
}
STAGE_KO = {
    "background": "배경", "structural": "구조적 원인", "interests": "이해관계", "pressure": "압력", "trigger": "촉발 사건",
    "transmission": "충격의 전달", "outcome": "결과", "legacy": "남긴 것",
    "environment": "당시 환경", "need": "사람들의 욕구", "trend": "유행·생활 변화", "demand": "수요", "business_tech": "기업·기술",
    "industry": "산업", "jobs": "직업", "from": "앞 시대", "from_causal": "앞 시대(원인)", "to": "다음 시대",
}
# 관계 유형 (방향: 원인 쪽 → 결과 쪽). '결과'는 반대 방향에서 본 이름이다.
REL_KO = {
    "cause": "직접적인 원인", "background": "구조적 배경", "trigger": "촉발 계기", "influence": "영향을 준 요인",
    "sequence": "시간적 선후(인과 아님)", "similar": "유사·비교",
}
# 검증 수준: 근거 있는 인과 / 해석 / 통계적 연관 / 가설
VERIF = {"causal_evidenced": "evidenced", "interpretation": "interpretation", "statistical": "statistical", "hypothesis": "hypothesis"}
NODE_TYPE = {"event": "event", "phenomenon": "phenomenon", "trend": "trend"}
NODE_TYPE_KO = {
    "event": "사건", "background": "구조적 배경", "goal": "목표·이해관계", "trigger": "촉발 계기", "mechanism": "작동 원리",
    "reaction": "국민·기업의 반응", "change": "산업·문화·생활 변화", "outcome": "장기적 결과", "trend": "유행·생활 트렌드",
    "phenomenon": "현상",
}
STAGE_TYPE = {"background": "background", "structural": "background", "interests": "goal", "pressure": "background",
              "trigger": "trigger", "transmission": "mechanism", "outcome": "outcome", "legacy": "outcome",
              "environment": "background", "need": "goal", "trend": "reaction", "demand": "reaction",
              "business_tech": "change", "industry": "change", "jobs": "change"}


def build_edges(chains):
    """사슬의 연속 두 단계를 관계로. 관계 유형은 근거의 성격에서만 정하고, 순서만 있으면 '시간적 선후'로 둔다."""
    out, seen = [], set()
    for ch in chains:
        st = ch["steps"]
        for a, b in zip(st, st[1:]):
            if a["nodeId"] == b["nodeId"]:
                continue
            if ch["kind"] == "signal":
                rel, ver = "sequence", "interpretation"
            elif ch["kind"] == "transition":
                lt = ch.get("linkType") or "interpretation"
                rel = "cause" if lt == "causal_evidenced" else "influence"
                ver = VERIF.get(lt, "interpretation")
            elif ch["kind"] == "trendChain":
                lt = b.get("linkType") or "interpretation"
                rel = "cause" if lt == "causal_evidenced" else "influence"
                ver = VERIF.get(lt, "interpretation")
            else:  # 심층 사례: 앞 단계의 성격으로
                rel = {"background": "background", "structural": "background", "interests": "background", "pressure": "background",
                       "trigger": "trigger"}.get(a["stage"], "influence")
                ver = "interpretation"
            key = (a["nodeId"], b["nodeId"], rel)
            if key in seen:
                continue
            seen.add(key)
            out.append({"id": f"e-{len(out)}", "from": a["nodeId"], "to": b["nodeId"], "rel": rel, "verification": ver,
                        "chainId": ch["id"], "note": ch.get("mechanism", ""), "claimIds": list(dict.fromkeys(a["claimIds"] + b["claimIds"]))})
    return out


YEAR_RE = re.compile(r"(19[4-9]\d|20[0-2]\d)(?!s|년대|\d)")


def era_of_claim(cid):
    return PREFIX_ERA.get(cid[:3])


def build(seed, signals, deep=None):
    claims = {c["id"]: c for c in seed["claims"]}
    nodes, chains = {}, []
    ev_by_claim = {}
    for e in seed["events"]:
        if e["claimIds"]:
            ev_by_claim.setdefault(e["claimIds"][0], []).append(e)

    def guess_year(label, cids, era):
        lo = ERA_START.get(era, 1960)
        hi = lo + 9 if era != "2020s" else 2026
        for src in [label] + [claims[c]["text"] for c in cids if c in claims and era_of_claim(c) == era]:
            ys = [int(y) for y in YEAR_RE.findall(src or "") if lo <= int(y) <= hi]
            if ys:
                return min(ys), "year"
        return lo, "era"  # 연도를 알 수 없음 → 시대 단위로만 표시(특정 연도에 넣지 않음)

    def meta_from_claims(cids):
        doms, cts = {}, set()
        for c in cids:
            if c in claims:
                for d in claims[c]["domains"]:
                    doms[d] = doms.get(d, 0) + 1
                cts.update(claims[c]["countries"])
        return doms, cts

    def lane_from(domains_count, fallback="society"):
        best = sorted(domains_count.items(), key=lambda kv: -kv[1])
        for d, _ in best:
            if d in LANE_OF:
                return LANE_OF[d]
        return fallback

    # 1) 사건 노드
    for e in seed["events"]:
        doms, cts = meta_from_claims(e["claimIds"])
        for d in e["domains"]:
            doms[d] = doms.get(d, 0) + 10  # 사건에 직접 붙은 분야를 우선
        nodes[e["id"]] = {
            "id": e["id"], "kind": "event", "label": e["title"], "year": int(e["date"][:4]), "yearPrecision": "year", "date": e["date"],
            "eraId": e["eraId"], "lane": lane_from(doms), "domains": e["domains"],
            "countries": sorted(set(e["countries"]) | cts), "importance": e["priority"],
            "claimIds": e["claimIds"], "eventIds": [e["id"]],
        }

    # 1-b) 심층 사례 노드 (사람이 연도·유형·국가를 정해 둔 것)
    def era_for_year(y):
        if y < 1960:
            return "1960s"
        return max((e for e, s0 in ERA_START.items() if s0 <= y), key=lambda e: ERA_START[e])
    if deep:
        for d in deep.NODES:
            nodes[d["id"]] = {**d, "kind": "event" if d["nodeType"] == "event" else ("trend" if d["nodeType"] == "trend" else "phenomenon"),
                              "eraId": era_for_year(d["year"]), "domains": sorted(meta_from_claims(d["claimIds"])[0]), "eventIds": [], "deep": True}

    def node_for(label, cids, era, lane_hint=None, kind="phenomenon", year=None):
        cids = [c for c in cids if c in claims]
        for c in cids:
            for e in ev_by_claim.get(c, []):
                if e["eraId"] == era:
                    n = nodes[e["id"]]
                    n.setdefault("aliases", [])
                    if label not in n["aliases"] and label != n["label"]:
                        n["aliases"].append(label)
                    n["claimIds"] = list(dict.fromkeys(n["claimIds"] + cids))
                    return e["id"]
        nid = "n-" + re.sub(r"[^0-9a-z가-힣]+", "-", f"{era}-{label}".lower())[:60].strip("-")
        if nid not in nodes:
            doms, cts = meta_from_claims(cids)
            nodes[nid] = {
                "id": nid, "kind": kind, "label": label, "eraId": era,
                **(dict(year=year, yearPrecision="year") if year else dict(zip(("year", "yearPrecision"), guess_year(label, cids, era)))),
                "lane": lane_hint or lane_from(doms), "domains": sorted(doms, key=lambda d: -doms[d]),
                "countries": sorted(cts), "importance": 3, "claimIds": cids, "eventIds": [],
            }
        else:
            nodes[nid]["claimIds"] = list(dict.fromkeys(nodes[nid]["claimIds"] + cids))
        return nid

    # 2) 심층 사례의 WHY 사슬 (단계 이름이 곧 역할)
    for cs in seed["caseStudies"]:
        steps = []
        for st in cs["whyChain"]:
            cids = st["claimIds"]
            if not cids:
                continue
            first = claims.get(cids[0])
            era = era_of_claim(cids[0]) or cs["eraId"]
            label = (first["text"][:38] + "…") if first and len(first["text"]) > 40 else (first["text"] if first else st["stage"])
            nid = node_for(label, cids, era)
            steps.append({"nodeId": nid, "stage": st["stage"], "role": ROLE[st["stage"]], "stageLabel": STAGE_KO[st["stage"]], "claimIds": cids})
        chains.append({"id": "ch-" + cs["id"], "kind": "case", "title": cs["title"], "ref": cs["id"], "eraId": cs["eraId"], "steps": steps,
                       "countryResponses": cs.get("countryResponses", [])})

    # 3) 욕구 → 트렌드 → 산업 → 직업 사슬
    for era in seed["eras"]:
        for i, tc in enumerate(era.get("trendChains", [])):
            steps = []
            for st in tc["steps"]:
                lane = "society" if st["stage"] in ("environment", "need", "trend", "demand") else "industry"
                if not st["claimIds"]:
                    continue  # 근거 없는 단계는 지도에 노드로 만들지 않음(사슬 화면에는 '근거 없음'으로 남아 있음)
                nid = node_for(st["text"], st["claimIds"], era["id"], lane_hint=lane)
                steps.append({"nodeId": nid, "stage": st["stage"], "role": ROLE[st["stage"]], "stageLabel": STAGE_KO[st["stage"]],
                              "linkType": st.get("linkType"), "claimIds": st["claimIds"]})
            chains.append({"id": f"ch-tc-{era['id']}-{i}", "kind": "trendChain", "title": tc["title"], "ref": era["id"], "eraId": era["id"], "steps": steps})

    # 4) 시대 간 연결 (앞 시대 → 다음 시대)
    for t in seed["transitions"]:
        for l in t["links"]:
            fc = [c for c in l["claimIds"] if era_of_claim(c) == t["fromEra"]] or l["claimIds"][:1]
            tcids = [c for c in l["claimIds"] if era_of_claim(c) == t["toEra"]] or l["claimIds"][-1:]
            a = node_for(l["fromLabel"], fc, t["fromEra"])
            b = node_for(l["toLabel"], tcids, t["toEra"])
            if a == b:
                continue
            fs = "from_causal" if l["linkType"] == "causal_evidenced" else "from"
            chains.append({"id": "ch-" + l["id"], "kind": "transition", "title": f"{l['fromLabel']} → {l['toLabel']}", "ref": t["fromEra"],
                           "eraId": t["fromEra"], "mechanism": l["mechanism"], "linkType": l["linkType"], "steps": [
                               {"nodeId": a, "stage": fs, "role": ROLE[fs], "stageLabel": STAGE_KO[fs], "claimIds": fc},
                               {"nodeId": b, "stage": "to", "role": "result", "stageLabel": STAGE_KO["to"], "claimIds": tcids}]})

    # 5) 신호·유행의 생애 (등장 → 확산 → … → 재등장)
    for s in signals:
        steps = []
        for st in s["steps"]:
            nid = st["nodeId"] if st.get("nodeId") in nodes else node_for(st["label"], st["claimIds"], st["eraId"])
            steps.append({"nodeId": nid, "stage": st.get("stage", ""), "role": "", "stageLabel": st.get("stage", ""), "claimIds": st["claimIds"]})
        chains.append({"id": "ch-" + s["id"], "kind": "signal", "title": s["title"], "ref": s["id"], "eraId": s["originEra"], "steps": steps})

    # 6) 시대별 트렌드(생활·소비) — 흐름 줄에 표시
    for era in seed["eras"]:
        for tr in era.get("trends", []):
            kr = next((t for t in tr.get("timeline", []) if t.get("country") == "KR"), None) or (tr.get("timeline") or [{}])[0]
            y = None
            for k in ("emerged", "popularized"):
                m = YEAR_RE.search(str(kr.get(k, "")))
                if m:
                    y = int(m.group(1)); break
            nid = "tr-" + tr["id"]
            doms, cts = meta_from_claims(tr["claimIds"])
            yy, prec = (y, "year") if y else guess_year(tr["title"], tr["claimIds"], era["id"])
            nodes[nid] = {"id": nid, "kind": "trend", "label": tr["title"], "year": yy, "yearPrecision": prec,
                          "eraId": era["id"], "lane": "flow", "domains": sorted(doms), "countries": sorted(cts | {t["country"] for t in tr.get("timeline", []) if t.get("country")}),
                          "importance": 3, "claimIds": tr["claimIds"], "eventIds": [], "trend": {
                              "need": tr.get("need"), "whyThen": tr.get("whyThen"), "timeline": tr.get("timeline", [])}}

    edges = build_edges(chains)
    if deep:  # 심층 사례의 관계는 관계 유형·검증 수준을 직접 지정
        def resolve(ref):
            if ref.startswith("claim:"):
                c = ref[6:]
                return next((n["id"] for n in nodes.values() if c in n["claimIds"]), None)
            return ref if ref in nodes else None
        for i, e in enumerate(deep.EDGES):
            a, b = resolve(e["from"]), resolve(e["to"])
            if not a or not b:
                raise SystemExit(f"deep_1973 관계의 노드를 찾을 수 없음: {e['from']} → {e['to']}")
            edges.append({"id": f"e-d73-{i}", "from": a, "to": b, "rel": e["rel"], "verification": e["verification"],
                          "chainId": "deep-1973", "note": e["note"], "claimIds": e["claimIds"]})
        chains.append({"id": "deep-1973", "kind": "case", "title": "1973년 대한민국 심층 사례 (석유파동·유신·중화학공업·청년문화)", "ref": "1970s",
                       "eraId": "1970s", "steps": []})

    # 중요도: 사슬 여러 개에 등장하는 노드는 한 단계 올린다(연결이 많을수록 흐름의 교차점)
    deg = {}
    for e in edges:
        deg[e["from"]] = deg.get(e["from"], 0) + 1
        deg[e["to"]] = deg.get(e["to"], 0) + 1
    for n in nodes.values():
        n["degree"] = deg.get(n["id"], 0)
        if n.get("deep"):
            continue  # 심층 사례는 지정한 중요도 유지
        if n["kind"] != "event" and n["degree"] >= 3:
            n["importance"] = 2
        if n["kind"] == "event" and n["degree"] >= 3 and n["importance"] > 1:
            n["importance"] -= 1
    # 사료(신문·광고·조사) 연결: 문서가 가리키는 사건
    for d in seed["documents"]:
        for eid in d.get("relatedEventIds", []):
            if eid in nodes:
                nodes[eid].setdefault("docIds", []).append(d["id"])
    for n in nodes.values():
        n.setdefault("nodeType", NODE_TYPE.get(n["kind"], "phenomenon"))
    for ch in chains:  # 사슬 단계의 성격을 노드 유형으로(사건·심층 노드는 유지)
        for st in ch["steps"]:
            n = nodes[st["nodeId"]]
            if n["kind"] != "event" and not n.get("deep") and st["stage"] in STAGE_TYPE:
                n["nodeType"] = STAGE_TYPE[st["stage"]]
    return {"nodes": sorted(nodes.values(), key=lambda n: (n["year"], n["id"])), "chains": chains, "edges": edges, "lanes": LANES,
            "relTypes": REL_KO, "nodeTypes": NODE_TYPE_KO}


def validate(graph, seed):
    errs = []
    ids = {n["id"] for n in graph["nodes"]}
    cids = {c["id"] for c in seed["claims"]}
    for ch in graph["chains"]:
        for st in ch["steps"]:
            if st["nodeId"] not in ids:
                errs.append(f"graph {ch['id']}: 없는 노드 {st['nodeId']}")
    for n in graph["nodes"]:
        if n["lane"] not in graph["lanes"]:
            errs.append(f"graph {n['id']}: 줄 오류 {n['lane']}")
        for c in n["claimIds"]:
            if c not in cids:
                errs.append(f"graph {n['id']}: 없는 claim {c}")
        if n["kind"] != "trend" and not n["claimIds"]:
            errs.append(f"graph {n['id']}: 근거 없는 노드")
    return errs
