"""HISTORY TO FUTURE API (FastAPI) — v0.2

현재는 data/seed.json을 읽어 프런트엔드와 같은 계약으로 제공한다.
PostgreSQL(backend/schema.sql)로 옮길 때는 load_seed()만 DB 조회로 바꾸면 된다.

실행:  pip install -r backend/requirements.txt
       uvicorn backend.app.main:app --reload --port 8000
프런트: VITE_API_BASE_URL=http://localhost:8000 npm run dev
"""
import json
from functools import lru_cache
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

SEED = Path(__file__).resolve().parents[2] / "data" / "seed.json"

app = FastAPI(title="HISTORY TO FUTURE API", version="0.2.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET"], allow_headers=["*"])


@lru_cache
def load_seed() -> dict:
    return json.loads(SEED.read_text(encoding="utf-8"))


@app.get("/api/v1/bundle")
def bundle():
    """프런트엔드 HttpDataProvider가 쓰는 전체 묶음 (MVP)."""
    return load_seed()


@app.get("/api/v1/eras")
def eras():
    return [{k: e[k] for k in ("id", "label", "startYear", "endYear", "title", "analysisStatus")} for e in load_seed()["eras"]]


@app.get("/api/v1/eras/{era_id}")
def era(era_id: str):
    for e in load_seed()["eras"]:
        if e["id"] == era_id:
            return e
    raise HTTPException(404, "era not found")


@app.get("/api/v1/transitions")
def transitions():
    return load_seed()["transitions"]


@app.get("/api/v1/claims")
def claims(ids: str = Query("", description="쉼표로 구분한 claim id")):
    want = set(filter(None, ids.split(",")))
    return [c for c in load_seed()["claims"] if not want or c["id"] in want]


@app.get("/api/v1/sources")
def sources():
    return load_seed()["sources"]


@app.get("/api/v1/documents")
def documents(era: str | None = None):
    seed = load_seed()
    if not era:
        return seed["documents"]
    ids = next((set(e["documentIds"]) for e in seed["eras"] if e["id"] == era), set())
    return [d for d in seed["documents"] if d["id"] in ids]


@app.get("/api/v1/archives")
def archives():
    return load_seed()["archives"]


@app.get("/api/v1/events")
def events(era: str | None = None):
    return [e for e in load_seed()["events"] if not era or e["eraId"] == era]


@app.get("/api/v1/case-studies/{case_id}")
def case_study(case_id: str):
    for c in load_seed()["caseStudies"]:
        if c["id"] == case_id:
            return c
    raise HTTPException(404, "case study not found")


@app.get("/api/v1/indicators")
def indicators(era: str | None = None):
    """연도·월별 지표. era를 주면 그 시대에 표시되는 지표만."""
    return [i for i in load_seed().get("indicators", []) if not era or era in i["eraIds"]]


# ---- v0.13 탐색 API: 프런트엔드 graph 데이터 계약과 같은 구조 ----
@app.get("/api/v1/explore/year/{year}")
def explore_year(year: int):
    """그 해로 날짜가 확인된 노드만(다른 해 내용을 끌어오지 않음), 그 해와 이어진 관계."""
    g = load_seed()["graph"]
    nodes = [n for n in g["nodes"] if n["yearPrecision"] == "year" and n["year"] == year]
    ids = {n["id"] for n in nodes}
    edges = [e for e in g["edges"] if e["from"] in ids or e["to"] in ids]
    return {"year": year, "nodes": nodes, "edges": edges, "complete": bool(nodes)}


@app.get("/api/v1/explore/node/{node_id}")
def explore_node(node_id: str, depth: int = Query(1, ge=1, le=3)):
    """노드와 원인(들어오는 관계)·결과(나가는 관계)를 depth 단계까지."""
    g = load_seed()["graph"]
    by = {n["id"]: n for n in g["nodes"]}
    if node_id not in by:
        raise HTTPException(404, "node not found")
    seen, frontier, edges = {node_id}, {node_id}, []
    for _ in range(depth):
        nxt = set()
        for e in g["edges"]:
            if e["from"] in frontier or e["to"] in frontier:
                if e not in edges:
                    edges.append(e)
                for x in (e["from"], e["to"]):
                    if x not in seen:
                        seen.add(x); nxt.add(x)
        frontier = nxt
    return {"node": by[node_id], "nodes": [by[i] for i in seen], "edges": edges,
            "causes": [e for e in edges if e["to"] == node_id], "results": [e for e in edges if e["from"] == node_id]}
