from fastapi.testclient import TestClient
from backend.app.main import app

c = TestClient(app)


def test_eras_start_1960():
    r = c.get("/api/v1/eras").json()
    assert r[0]["id"] == "1960s" and r[0]["startYear"] == 1960
    assert [e["id"] for e in r] == ["1960s", "1970s", "1980s", "1990s", "2000s", "2010s", "2020s"]


def test_era_and_documents():
    e = c.get("/api/v1/eras/1960s").json()
    assert e["analysisStatus"] == "deep" and len(e["atmosphere"]) == 8
    docs = c.get("/api/v1/documents", params={"era": "1960s"}).json()
    assert {d["verification"]["accessLevel"] for d in docs} <= {"original", "archive_metadata", "secondary", "unverified"}


def test_no_unsourced_verified_claims():
    for cl in c.get("/api/v1/claims").json():
        if cl["status"] != "needs_source":
            assert cl["sourceIds"], cl["id"]


def test_bundle_and_404():
    assert "claims" in c.get("/api/v1/bundle").json()
    assert c.get("/api/v1/eras/1950s").status_code == 404


def test_indicators_have_sources():
    src = {s["id"] for s in c.get("/api/v1/sources").json()}
    inds = c.get("/api/v1/indicators").json()
    assert any(i["id"] == "gdp-growth" for i in inds)
    for i in inds:
        for s in i["series"]:
            assert s["points"] and set(s["sourceIds"]) <= src, i["id"]
    assert all("2020s" in i["eraIds"] for i in c.get("/api/v1/indicators", params={"era": "2020s"}).json())


def test_explore_year_and_node():
    y = c.get("/api/v1/explore/year/1973").json()
    assert y["complete"] and all(n["year"] == 1973 for n in y["nodes"])
    empty = c.get("/api/v1/explore/year/1961").json()
    assert all(n["yearPrecision"] == "year" for n in empty["nodes"])
    n = c.get("/api/v1/explore/node/d-embargo", params={"depth": 2}).json()
    assert {e["from"] for e in n["causes"]} >= {"d-airlift", "d-war1973"}
    assert any(e["rel"] == "sequence" for e in c.get("/api/v1/explore/node/d-folk70").json()["results"])
    cids = {x["id"] for x in c.get("/api/v1/claims").json()}
    for e in n["edges"]:
        assert set(e["claimIds"]) <= cids and e["verification"] in ("evidenced", "interpretation", "statistical", "hypothesis")
    assert c.get("/api/v1/explore/node/없음").status_code == 404
