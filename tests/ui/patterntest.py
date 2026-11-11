import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import SEED, SHOTS, CHROME, shot, url  # noqa: E402
"""HISTORY FLOW 개편 + PATTERN DISCOVERY 화면 작동 검사.
사용: python3 patterntest.py <dist-single/index.html>"""
import sys, json
from playwright.sync_api import sync_playwright
src = sys.argv[1]; H = url(src)
seed = json.load(open(SEED))
P = seed["patterns"]; errs = []; fails = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
    pg = b.new_page(viewport={"width": 1280, "height": 900})
    pg.on("pageerror", lambda e: errs.append(str(e)))
    # 1) 시대마다 흐름 화면: 하이라이트 3칸, WHY FLOW, 비슷한 현상 칸
    for e in seed["eras"]:
        pg.goto(H + "#flow-" + e["id"]); pg.wait_for_timeout(250)
        cols = pg.locator(".era-hl .hl-col").count()
        on = pg.locator(".strip-era.on .strip-label").inner_text()
        pars = pg.locator(".similar-here .par-card").count()
        expect = sum(1 for x in P["parallels"] if e["id"] in (x["a"]["eraId"], x["b"]["eraId"]))
        ok = cols == 3 and on == e["label"] and pars == expect and pg.locator(".why-flow").count() == 1
        print(f"{e['label']}: 하이라이트 {cols}칸 · 비교카드 {pars}/{expect} · 동력 {pg.locator('.hl-col.driver li').count()} {'OK' if ok else 'FAIL'}")
        if not ok: fails.append(e["id"])
    # 2) 비교 카드 클릭 → 상세 → 근거 버튼 → 출처 창
    pg.goto(H + "#flow-1970s"); pg.wait_for_timeout(300)
    pg.locator(".similar-here .par-card").first.click(); pg.wait_for_timeout(300)
    det = pg.locator(".par-detail h1").inner_text()
    pg.locator(".par-table .ev-btn").first.click(); pg.wait_for_timeout(300)
    drawer = pg.locator(".drawer").count() > 0
    print("카드 → 상세:", det, "/ 근거 → 출처 창:", drawer)
    if not drawer: fails.append("drawer")
    # 3) 상세 3개: 행 수·기준 8개·점수 표시 규칙
    for x in P["parallels"]:
        pg.goto(H + "#pattern-" + x["id"]); pg.wait_for_timeout(250)
        rows = pg.locator(".par-table tbody tr").count(); crit = pg.locator(".crit-table tr").count()
        txt = pg.locator(".sim-box").inner_text()
        ok = rows == len(x["rows"]) and crit == 8 and (("점수를 내지 않습니다" in txt) == (x["similarity"]["score"] is None))
        print(f"{x['id']}: 행 {rows} · 기준 {crit} · 점수 {x['similarity']['score']} {'OK' if ok else 'FAIL'}")
        if not ok: fails.append(x["id"])
    # 4) 패턴 화면: 분야 결과·주기 카드·시차 표·신호
    pg.goto(H + "#patterns"); pg.wait_for_timeout(300)
    n_ph = pg.locator(".kind-col p b").count(); n_cy = pg.locator(".cycle-card").count()
    n_sig = pg.locator("#pat-signals .sig-track").count(); n_lag = pg.locator(".lag-table tbody tr").count()
    pg.locator(".acf-bar").nth(17).hover(); pg.wait_for_timeout(100)
    tip = pg.locator(".cycle-card").first.locator("figcaption").inner_text()
    ok = n_ph == len(P["phenomena"]) and n_cy == len(P["stats"]["countries"]) and n_sig == len(P["signals"]) and n_lag == 3 and "18년" in tip
    print(f"패턴 화면: 분야 {n_ph} · 주기 {n_cy} · 시차표 {n_lag} · 신호 {n_sig} · 막대 툴팁 '{tip[:20]}' {'OK' if ok else 'FAIL'}")
    if not ok: fails.append("patterns")
    # 5) 모바일
    m = b.new_page(viewport={"width": 390, "height": 844}); m.on("pageerror", lambda e: errs.append(str(e)))
    m.goto(H + "#flow-1990s"); m.wait_for_timeout(400)
    over = m.evaluate("document.documentElement.scrollWidth > window.innerWidth + 1")
    print("모바일 가로 넘침:", over); m.screenshot(path=shot("mob.png"))
    if over: fails.append("mobile")
    pg.goto(H + "#status"); pg.wait_for_timeout(200)
    print("빌드 지문:", pg.locator("footer .build-id").inner_text())
    b.close()
print("errors:", errs, "fails:", fails)
sys.exit(1 if errs or fails else 0)
