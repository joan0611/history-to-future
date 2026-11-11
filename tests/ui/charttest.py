import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import SEED, SHOTS, CHROME, shot, url  # noqa: E402
"""지표 차트 작동 테스트: 흐름 화면 성장률 차트, 마우스 툴팁, 표 보기, 시대별 지표 개수"""
import sys, json
from playwright.sync_api import sync_playwright
src = sys.argv[1]
seed = json.load(open(SEED))
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
    errs = []
    pg = b.new_page(viewport={"width": 1280, "height": 900})
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
    pg.goto(url(src) + "#flow"); pg.wait_for_timeout(800)
    ch = pg.locator(".flow-chart .ind-chart").first
    print("흐름 화면 차트:", ch.count(), "/ 선:", ch.locator("path.line").count())
    box = ch.locator("svg").bounding_box()
    pg.mouse.move(box["x"] + box["width"] * 0.62, box["y"] + box["height"] * 0.5); pg.wait_for_timeout(200)
    print("툴팁:", ch.locator(".ind-tip").inner_text().replace("\n", " | ") if ch.locator(".ind-tip").count() else "없음")
    ch.scroll_into_view_if_needed(); pg.screenshot(path=shot("chart-flow.png"), clip={"x": 0, "y": box["y"] - 80, "width": 1280, "height": box["height"] + 170})
    ch.get_by_role("button", name="표로 보기").click(); pg.wait_for_timeout(150)
    print("표 행 수:", ch.locator(".ind-table tbody tr").count())
    for e in seed["eras"]:
        pg.goto(url(src) + "#era-" + e["id"]); pg.wait_for_timeout(250)
        want = sum(1 for i in seed["indicators"] if e["id"] in i["eraIds"])
        got = pg.locator(".era-indicators .ind-chart").count()
        if got != want: errs.append(f"{e['id']} 지표 차트 {got}/{want}")
        print(f"{e['label']}: 지표 차트 {got}/{want}", "" if got == want else "← 불일치")
    pg.goto(url(src) + "#era-1990s"); pg.wait_for_timeout(300)
    pg.locator(".era-indicators").scroll_into_view_if_needed(); pg.screenshot(path=shot("chart-90s.png"), full_page=False)
    m = b.new_page(viewport={"width": 390, "height": 844}); m.goto(url(src) + "#flow"); m.wait_for_timeout(600)
    m.locator(".flow-chart").scroll_into_view_if_needed(); m.screenshot(path=shot("chart-mobile.png"))
    print("errors:", errs); b.close()
sys.exit(1 if errs else 0)
