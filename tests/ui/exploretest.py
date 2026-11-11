"""v0.13 탐색 화면 — 지시서 11장의 10개 시나리오 + 주소 유지 + 모바일.
사용: python3 exploretest.py <dist-single/index.html 또는 배포 주소>"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import CHROME, shot, url  # noqa: E402
from playwright.sync_api import sync_playwright

src = sys.argv[1]; H = url(src)
res, errs = [], []
def check(name, ok, info=""):
    res.append((name, bool(ok))); print(("PASS " if ok else "FAIL ") + name + (f" — {info}" if info else ""))

def node_title(pg): return pg.locator(".cx-sum h2").inner_text()
def go_list(pg, side, text):
    """원인 쪽/결과 쪽 목록에서 이름에 text가 들어간 항목을 누른다(지도·관계망과 같은 데이터)."""
    col = pg.locator(".cx-lists > div").nth(0 if side == "원인" else 1)
    col.locator("button.linkish", has_text=text).first.click(); pg.wait_for_timeout(350)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
    pg = b.new_page(viewport={"width": 1366, "height": 900})
    pg.on("pageerror", lambda e: errs.append(str(e)))
    # 1. 대한민국 중심 흐름이 첫 화면
    pg.goto(H); pg.wait_for_timeout(1000)
    check("1 첫 화면 = 대한민국 역사 흐름 지도", "대한민국" in pg.locator(".explore h1").inner_text() and pg.locator(".hm-node").count() > 50,
          f"지도 노드 {pg.locator('.hm-node').count()}개")
    # 2. 1973년 선택 → 검증된 정보
    pg.locator("#ex-y").fill("1972"); pg.wait_for_timeout(200); pg.get_by_role("button", name="다음 해").first.click(); pg.wait_for_timeout(400)
    items = pg.locator(".yx-item").count()
    check("2 1973년 선택 → 그 해 항목", "1973년 대한민국" in pg.locator(".yx-head h2").inner_text() and items >= 5 and "y=1973" in pg.url, f"항목 {items}개")
    pg.screenshot(path=shot("ex-1973.png"))
    # 3. 석유파동 선택 → 원인·결과 관계망
    pg.locator(".ex-search input").fill("금수"); pg.wait_for_timeout(200)
    pg.locator(".ex-search li button").first.click(); pg.wait_for_timeout(600)
    ok3 = pg.locator(".cx-svg .cx-node").count() >= 5 and pg.locator(".cx-lists li").count() >= 4
    check("3 석유파동(금수) → 관계망", ok3, f"{node_title(pg)} · 관계망 노드 {pg.locator('.cx-svg .cx-node').count()}")
    pg.locator(".cx").scroll_into_view_if_needed(); pg.screenshot(path=shot("ex-embargo.png"))
    # 4. 중동전쟁 → 이전 배경으로(1967년까지)
    go_list(pg, "원인", "중동전쟁"); t1 = node_title(pg)
    go_list(pg, "원인", "목표"); go_list(pg, "원인", "협상 교착"); go_list(pg, "원인", "1967년 전쟁")
    check("4 중동전쟁 → 협상 교착 → 1967년 전쟁", "1967" in node_title(pg) and "1967" in pg.locator(".cx-sum .eyebrow").inner_text(), f"{t1} → … → {node_title(pg)}")
    crumbs = pg.locator(".cx-crumbs li").count()
    # 10a. 이전 단계로
    pg.get_by_role("button", name="이전 단계").click(); pg.wait_for_timeout(300)
    check("10a 이전 단계로 돌아가기", "협상 교착" in node_title(pg) and pg.locator(".cx-crumbs li").count() == crumbs - 1)
    # 5. 미국의 이스라엘 지원 → 목적과 국제적 배경
    pg.goto(H.split("#")[0] + "#explore?y=1973&n=d-airlift&p=d-airlift"); pg.wait_for_timeout(500)
    go_list(pg, "원인", "소련 견제")
    txt = pg.locator(".cx-sum").inner_text()
    check("5 미국의 이스라엘 지원 → 목적(냉전·소련 견제)", "소련" in txt and pg.locator(".cx-lists > div").nth(1).locator("li").count() >= 1, node_title(pg))
    # 선을 눌러 연결 설명
    pg.locator(".cx-rel-btn").first.click(); pg.wait_for_timeout(250)
    check("  연결 설명(관계 유형·검증 수준·근거)", pg.locator(".cx-edge-detail").count() == 1 and pg.locator(".cx-edge-detail .claim").count() >= 1)
    # 6. 한국 물가 → 석유값·생산비·운송비
    pg.goto(H.split("#")[0] + "#explore?y=1974&n=d-kr-cpi&p=d-kr-cpi"); pg.wait_for_timeout(500)
    go_list(pg, "원인", "생산비")
    t6 = pg.locator(".cx-sum").inner_text() + pg.locator(".cx-evidence").inner_text()
    check("6 한국 물가 → 유가·생산비·운송비 경로", all(k in t6 for k in ["석유류", "생산비", "운송비"]), node_title(pg))
    # 7. 결과를 따라가면 산업·에너지 정책 변화
    pg.goto(H.split("#")[0] + "#explore?y=1974&n=d-price-mech&p=d-price-mech"); pg.wait_for_timeout(500)
    res_txt = pg.locator(".cx-lists > div").nth(1).inner_text()
    go_list(pg, "결과", "동력자원부")
    check("7 결과 → 동력자원부·원전·IEA·중동 건설", all(k in res_txt for k in ["동력자원부", "고리", "IEA", "중동 건설"]) and "1978" in node_title(pg), node_title(pg))
    # 8. 문화: 이전 문화 → 1970년대 → 이후·재등장
    pg.goto(H.split("#")[0] + "#explore?y=1971&n=d-folk70&p=d-folk70"); pg.wait_for_timeout(500)
    cause_txt = pg.locator(".cx-lists > div").nth(0).inner_text(); result_txt = pg.locator(".cx-lists > div").nth(1).inner_text()
    life = pg.locator(".cx-signal").inner_text() if pg.locator(".cx-signal").count() else ""
    check("8 문화: 이전(트로트·미8군·세시봉) → 포크 → 이후(재등장)", "미8군" in cause_txt and "세시봉" in cause_txt and "재등장" in life and "세시봉 열풍" in result_txt)
    pg.locator(".cx").scroll_into_view_if_needed(); pg.screenshot(path=shot("ex-folk.png"))
    # 9. 다른 시대와 비교 → 근거와 차이
    pg.goto(H.split("#")[0] + "#explore?y=1973&n=d-embargo&p=d-embargo"); pg.wait_for_timeout(500)
    pg.locator(".cx-evidence a[href^='#pattern-']").first.click(); pg.wait_for_timeout(500)
    check("9 다른 시대 비교(근거·차이)", pg.locator(".par-table tbody tr").count() >= 5 and "다름" in pg.locator(".par-table").inner_text())
    # 10b. 전체 흐름으로
    pg.go_back(); pg.wait_for_timeout(500)
    pg.get_by_role("button", name="← 전체 흐름").click(); pg.wait_for_timeout(400)
    check("10b 전체 흐름으로 돌아가기", pg.locator(".yx").count() == 1 and pg.locator(".cx").count() == 0 and "n=" not in pg.url)
    # 주소 유지(새로고침)
    pg.goto(H.split("#")[0] + "#explore?y=1975&f=culture,flow&c=US&n=d-ban1975&p=d-folk70,d-ban1975"); pg.wait_for_timeout(400); pg.reload(); pg.wait_for_timeout(700)
    check("주소 유지(연도·분야·나라·노드·경로)", "대마초" in node_title(pg) and pg.locator(".cx-crumbs li").count() == 2 and pg.locator(".hmap-lane-label").count() >= 2
          and pg.get_by_role("button", name="+ 미국").get_attribute("aria-pressed") == "true")
    # 지도에서 노드 클릭 → 관계선
    pg.goto(H.split("#")[0] + "#explore?y=1973"); pg.wait_for_timeout(1500)  # 지도가 1973년으로 부드럽게 스크롤된 뒤
    pg.locator(".hm-node.imp-1[aria-label^='1973']").first.click(); pg.wait_for_timeout(500)
    check("지도 노드 클릭 → 탐색 열림", pg.locator(".cx").count() == 1)
    # 자료 없는 해
    pg.goto(H.split("#")[0] + "#explore?y=1961"); pg.wait_for_timeout(400)
    check("자료가 적은 해는 '자료 없음'을 드러냄", "자료 없음" in pg.locator(".yx-complete").inner_text() or "아직 없습니다" in pg.locator(".yx-complete").inner_text(),
          pg.locator(".yx-complete").inner_text()[:60])
    # 모바일: 가로 넘침 없음, 터치로 노드 선택
    m = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True).new_page()
    m.on("pageerror", lambda e: errs.append(str(e)))
    m.goto(H.split("#")[0] + "#explore?y=1973"); m.wait_for_timeout(900)
    over = m.evaluate("document.documentElement.scrollWidth > innerWidth + 1")
    m.locator(".yx-item").first.tap(); m.wait_for_timeout(700)
    check("모바일: 가로 넘침 없음 + 터치로 탐색", not over and m.locator(".cx").count() == 1)
    m.screenshot(path=shot("ex-mobile.png"), full_page=False)
    b.close()
print("errors:", errs)
fails = [n for n, ok in res if not ok]
print(f"{len(res) - len(fails)}/{len(res)} 통과")
sys.exit(1 if fails or errs else 0)
