import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import SEED, SHOTS, CHROME, shot, url  # noqa: E402
import sys
from playwright.sync_api import sync_playwright
src = sys.argv[1]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
    pg = b.new_page(viewport={"width": 1280, "height": 900})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
    pg.goto(url(src) + "#era-1960s"); pg.wait_for_timeout(800)
    pg.screenshot(path=shot("1-flow.png"), full_page=False)
    pg.get_by_role("tab", name="한눈에 보기").click(); pg.wait_for_timeout(300)
    pg.screenshot(path=shot("2-glance.png"), full_page=True)
    pg.get_by_role("tab", name="심층 분석").click(); pg.wait_for_timeout(300)
    pg.screenshot(path=shot("3-deep.png"), full_page=False)
    pg.get_by_role("tab", name="1차 사료 (7)").click(); pg.wait_for_timeout(200)
    pg.locator(".doc-table tbody tr").first.click(); pg.wait_for_timeout(300)
    pg.screenshot(path=shot("4-doc.png"))
    pg.keyboard.press("Escape")
    pg.goto(url(src) + "#transition-1960s"); pg.wait_for_timeout(500)
    pg.screenshot(path=shot("5-transition.png"), full_page=True)
    pg.goto(url(src) + "#era-1960s"); pg.wait_for_timeout(500)
    pg.get_by_role("tab", name="흐름 이해").click(); pg.wait_for_timeout(200); pg.locator("button.mark").first.click(); pg.wait_for_timeout(300)
    pg.screenshot(path=shot("6-claim.png"))
    pg.goto(url(src) + "#case-cs-oil-1973"); pg.wait_for_timeout(500)
    pg.screenshot(path=shot("7-case.png"), full_page=True)
    pg.goto(url(src) + "#case-cs-imf-1997"); pg.wait_for_timeout(500)
    pg.screenshot(path=shot("7-case-imf.png"), full_page=True)
    pg.goto(url(src) + "#era-2010s"); pg.wait_for_timeout(500)
    pg.screenshot(path=shot("10-glance.png"))
    pg.goto(url(src) + "#status"); pg.wait_for_timeout(500)
    pg.screenshot(path=shot("8-status.png"), full_page=True)
    m = b.new_page(viewport={"width": 390, "height": 844})
    m.goto(url(src) + "#era-1960s"); m.wait_for_timeout(600)
    m.screenshot(path=shot("9-mobile.png"))
    # 모든 시대 버튼과 세 모드가 실제로 작동하는지
    pg.goto(url(src) + "#era-1960s"); pg.wait_for_timeout(300)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
    seen=[]
    for lab in ["1960년대","1970년대","1980년대","1990년대","2000년대","2010년대","2020년대~현재"]:
        pg.locator(".tl-era", has_text=lab).click(); pg.wait_for_timeout(150)
        for t in ["한눈에 보기","흐름 이해","심층 분석"]:
            pg.get_by_role("tab", name=t).click(); pg.wait_for_timeout(80)
        seen.append(pg.locator("h1").first.inner_text().split("\n")[0])
    print("eras:", seen)
    pg.locator(".tl-era", has_text="1960년대").click(); pg.get_by_role("tab", name="한눈에 보기").click(); pg.wait_for_timeout(200)
    pg.screenshot(path=shot("10-glance-domains.png"), full_page=True)
    print("errors:", errs)
    b.close()
sys.exit(1 if errs else 0)
