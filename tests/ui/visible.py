import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import SEED, SHOTS, CHROME, shot, url  # noqa: E402
import json,re,sys
from playwright.sync_api import sync_playwright
src=sys.argv[1]; d=json.load(open(SEED))
claims={c['id']:c['text'] for c in d['claims']}
pre={'1960s':'c60','1970s':'c70','1980s':'c80','1990s':'c90','2000s':'c00','2010s':'c10','2020s':'c20'}
bad=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=CHROME, args=['--no-sandbox']); pg=b.new_page(viewport={'width':1280,'height':900})
    for e in d['eras']:
        pg.goto(url(src)+'#era-'+e['id']); pg.wait_for_timeout(300)
        txt=''
        for depth in ['한눈에 보기','흐름 이해','심층 분석']:
            pg.get_by_role('tab',name=depth,exact=True).first.click(); pg.wait_for_timeout(150)
            txt+=pg.inner_text('main')
            if depth=='심층 분석':
                n=pg.locator('.domain-board .subtabs [role=tab]').count()
                for i in range(n):
                    t=pg.locator('.domain-board .subtabs [role=tab]').nth(i)
                    if t.is_enabled(): t.click(); pg.wait_for_timeout(100); txt+=pg.inner_text('main')
                m=pg.locator('main > * .subtabs').first.locator('[role=tab]').count()
                for i in range(m):
                    pg.locator('main > * .subtabs').first.locator('[role=tab]').nth(i).click(); pg.wait_for_timeout(120); txt+=pg.inner_text('main')
        mine=[k for k in claims if k.startswith(pre[e['id']]+'-')]
        vis=[k for k in mine if claims[k][:20] in txt]
        if len(vis)!=len(mine): bad.append(e['id'])
        print(f"{e['label']}: 화면 표시 {len(vis)}/{len(mine)}", '' if len(vis)==len(mine) else '안 보임: '+', '.join(sorted(set(mine)-set(vis))))
    b.close()
sys.exit(1 if bad else 0)
