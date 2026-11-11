import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import SEED, SHOTS, CHROME, shot, url  # noqa: E402
import sys
from playwright.sync_api import sync_playwright
src=sys.argv[1]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=CHROME,args=["--no-sandbox"])
    errs=[]
    pg=b.new_page(viewport={"width":1280,"height":900})
    pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("console",lambda m:m.type=="error" and errs.append(m.text))
    pg.goto(url(src)+"#flow"); pg.wait_for_timeout(800)    # 기존 시대 흐름 화면(v0.13부터 첫 화면은 탐색 지도)
    print("기본 화면 집중 시대:", pg.locator(".strip-era.on .strip-label").inner_text(), "/ 하이라이트 칸:", pg.locator(".era-hl .hl-col").count())
    pg.locator(".all-toggle").click(); pg.wait_for_timeout(300)   # 기존 '모든 시대 한 번에 보기' 유지 확인
    rows=pg.locator(".flow-row").count(); links=pg.locator(".flow-link").count()
    world=pg.locator(".flow-col.world .flow-events li").count(); kr=pg.locator(".flow-col.korea .flow-events li").count()
    bridge=pg.locator(".flow-col.bridge .mark").count()
    print(f"시대 줄 {rows}, 시대 연결 {links}, 세계 사건 {world}, 한국 사건 {kr}, 연결 근거 {bridge}")
    pg.screenshot(path=shot("flow-top.png"))
    pg.locator(".flow-row").nth(3).scroll_into_view_if_needed(); pg.screenshot(path=shot("flow-90s.png"))
    pg.locator(".flow-all .flow-events button").first.click(); pg.wait_for_timeout(300)   # 사건 → 출처 창
    if pg.locator(".drawer").count()==0: errs.append("사건 클릭 → 출처 창 없음")
    print("사건 클릭 → 출처 창:", pg.locator(".drawer").count()>0); pg.keyboard.press("Escape")
    pg.locator(".flow-all .flow-era-btn").nth(2).click(); pg.wait_for_timeout(300); print("시대 버튼 → ", pg.url.split('#')[1])
    pg.goto(url(src)+"#flow"); pg.wait_for_timeout(300); pg.locator(".all-toggle").click(); pg.wait_for_timeout(200)
    pg.locator(".flow-link").first.click(); pg.wait_for_timeout(300); print("연결 화살표 → ", pg.url.split('#')[1])
    m=b.new_page(viewport={"width":390,"height":844}); m.goto(url(src)+"#flow"); m.wait_for_timeout(600); m.screenshot(path=shot("flow-mobile.png"))
    print("errors:",errs); b.close()
sys.exit(1 if errs else 0)
