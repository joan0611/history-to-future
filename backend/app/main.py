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
