"""PATTERN DISCOVERY · SIMILAR ERA FINDER · 신호 추적 데이터.

원칙 (사용자 지시 2026-11-11)
- '역사는 반복된다'를 증명하지 않는다. 무엇이 반복되고 무엇이 반복되지 않는지 보여준다.
- 이미 출처를 확인한 문장(claimIds)만 근거로 쓴다. 새 사실을 여기서 만들지 않는다.
- 판정(same/partial/different/unknown)은 제작자의 해석이다. 화면에도 그렇게 표시한다.
- 유사도 점수는 계산식이 공개되고, 평가된 기준이 3개 이상일 때만 화면에 낸다.
- 성장률 수치(figures)는 빌드 때 gdp-growth 지표에서 직접 읽어 넣는다(손으로 옮겨 적지 않음).
- 신문 기사 빈도로 현상의 실제 빈도를 판단하지 않는다.
"""
import pattern_stats

V = {"same": 1.0, "partial": 0.5, "different": 0.0}
CRITERIA = ["경제 환경", "사회 분위기", "소비자 행동", "문화 트렌드", "기술 발전 단계", "산업 구조", "국제 정세", "인구·노동시장"]
MIN_ASSESSED = 3


def row(aspect, a, a_ids, b, b_ids, verdict, note=""):
    return {"aspect": aspect, "a": {"text": a, "claimIds": a_ids}, "b": {"text": b, "claimIds": b_ids}, "verdict": verdict, "note": note}


def crit(name, verdict, note, ids=()):
    assert name in CRITERIA
    return {"criterion": name, "verdict": verdict, "note": note, "claimIds": list(ids)}


PARALLELS = [
    {
        "id": "pp-energy",
        "title": "에너지 공급 충격과 물가 급등",
        "theme": "물가상승과 소비 변화",
        "a": {"eraId": "1970s", "label": "1차 석유파동", "years": "1973~1975"},
        "b": {"eraId": "2020s", "label": "전쟁과 에너지·물가 충격", "years": "2021~2023"},
        "question": "지정학적 사건이 에너지 값을 밀어 올리고, 에너지를 수입하는 나라의 물가가 뛰는 일이 다시 일어났는가?",
        "rows": [
            row("쌓여 있던 조건", "1960년대 자동차·석유화학으로 석유 의존이 커졌고, 미국은 증산 여력을 잃었으며 달러 가치가 떨어졌다.",
                ["c60-syn-oil", "c70-us-peak", "c70-syn-1"],
                "팬데믹 뒤 수요가 급반등했고, 대규모 재정 지원과 초저금리가 이어졌다.",
                ["c20-us-cpi", "c20-syn-inflation"], "partial",
                "둘 다 충격 전에 물가 압력이 쌓여 있었다. 하지만 쌓인 것의 내용(석유 의존 구조 vs 돈 풀기·수요 반등)은 다르다."),
            row("촉발 사건", "1973년 10월 중동 전쟁 중 산유국 감산·금수, 공시가격 70% 인상.",
                ["c70-oapec", "c70-posted-1"],
                "2022년 2월 러시아의 우크라이나 침공, 브렌트유 100달러 돌파·유럽 가스값 급등.",
                ["c20-war"], "same", "전쟁이 에너지 공급 충격으로 이어졌다는 구조는 같다."),
            row("물가", "한국 소비자물가 1974년 24%, 1975년 25%. 일본 1974년도 20.9%.",
                ["c70-kr-cpi", "c70-jp-cpi"],
                "한국 2022년 7월 6.3%(1998년 이후 최고), 미국 6월 9.1%(1981년 이후 최고).",
                ["c20-kr-cpi", "c20-us-cpi"], "partial", "방향은 같지만 크기는 3~4배 차이가 난다."),
            row("사회·정책 반응", "일본 생필품 사재기, 미국 주유 홀짝제, 한국 긴급조치 3호(사치성 소비 억제).",
                ["c70-jp-panic", "c70-us-lines", "c70-kr-emergency"],
                "한국은행이 사상 처음 일곱 차례 연속 금리 인상. 생활 속 반응을 다룬 2022년 신문 자료는 아직 모으지 않았다.",
                ["c20-kr-rate"], "unknown", "2022년 쪽 생활 반응 자료가 없어 비교하지 않는다."),
            row("산업 변화", "국제에너지기구(IEA) 설립, 미국 연비 기준 도입, 연비 좋은 일본 소형차가 미국 시장 잠식.",
                ["c70-iea", "c70-epca", "c70-auto"],
                "미국 반도체법 등 공급망 재편. 에너지 산업 자체의 변화 자료는 아직 모으지 않았다.",
                ["c20-chips"], "unknown", "같은 기준(에너지 산업)으로 맞춘 자료가 없다."),
            row("결과", "미국 1973년 11월~1975년 3월 경기침체. 한국 성장률 {KR1973} → {KR1974}.",
                ["c70-us-recession", "c70-kr-growth"],
                "한국 성장률 {KR2021} → {KR2022} → {KR2023}. 미국 연간 성장률 {US2022}(마이너스 아님).",
                [], "different", "1970년대처럼 뚜렷한 침체로 이어졌다는 근거는 연간 성장률에서 보이지 않는다. 1973~74년 한국 성장률은 자료마다 다르다(근거 문장의 현대경제연구원 집계 12.3%→7.4%, 위 수치는 OECD 계열). 어느 쪽이든 '하락 후 회복'이라는 판정은 같다."),
        ],
        "criteria": [
            crit("경제 환경", "partial", "물가 급등은 같지만, 1970년대는 고성장기 한국, 2020년대는 저성장기 한국.", ["c70-kr-growth", "c20-kr-cpi"]),
            crit("사회 분위기", "unknown", "2022년 생활 반응 자료 미수집."),
            crit("소비자 행동", "unknown", "1973년 사재기 기록은 있으나 2022년 비교 자료 없음.", ["c70-jp-panic"]),
            crit("문화 트렌드", "unknown", "비교 자료 없음."),
            crit("기술 발전 단계", "different", "마이크로프로세서 첫 상용화 시기 vs 생성형 AI 확산기.", ["c70-4004", "c20-gpt-100m"]),
            crit("산업 구조", "different", "한국은 1973년 중화학공업화를 막 선언한 단계, 2025년에는 반도체가 수출 1위.", ["c70-kr-hci", "c20-kr-chip"]),
            crit("국제 정세", "same", "두 번 모두 전쟁이 에너지 공급을 흔들었다.", ["c70-oapec", "c20-war"]),
            crit("인구·노동시장", "unknown", "비교 자료 없음."),
        ],
        "repeated": [
            "전쟁 → 에너지 값 급등 → 에너지 수입국 물가 급등 → 긴축·통제 정책이라는 연결은 두 번 모두 확인된다.",
        ],
        "notConclusive": [
            "사례가 두 건뿐이다. 두 번 일어난 일을 '주기'로 볼 수는 없다.",
            "1970년대 물가 급등의 주원인이 유가가 아니라 통화정책이었다는 반론이 있다(바스키·킬리언). 2022년에도 돈 풀기가 겹쳤으므로, 공통점은 '석유'가 아니라 '통화 완화 + 공급 충격'일 수 있다.",
            "2020년대의 결과는 아직 진행 중이다.",
        ],
        "notConclusiveIds": ["c70-barsky", "c70-hamilton"],
        "future": {
            "common": "에너지 수입 의존, 전쟁에 따른 공급 충격, 충격 전에 쌓인 물가 압력",
            "pastResult": "1970년대: 두 자릿수 물가와 미국 경기침체",
            "different": "2022년에는 중앙은행이 빠르게 연속 금리 인상, 물가 상승 폭이 훨씬 작았음",
            "conditions": "비슷한 결과가 나오려면: 에너지 공급 충격이 길게 이어지고, 동시에 통화 완화가 계속되어야 한다(두 사례에서 함께 나타난 조건).",
            "signals": ["국제 유가·가스 가격", "한국 석유류 물가", "기준금리 방향"],
        },
    },
    {
        "id": "pp-fx-crisis",
        "title": "외부 충격과 원화·주가 급락",
        "theme": "금융위기와 투자 행동",
        "a": {"eraId": "1990s", "label": "아시아 외환위기", "years": "1997~1998"},
        "b": {"eraId": "2000s", "label": "글로벌 금융위기", "years": "2008~2009"},
        "question": "밖에서 온 금융 충격이 한국에서 같은 방식으로 번졌는가? 결과는 왜 달랐는가?",
        "rows": [
            row("쌓여 있던 조건", "대외 부채 1,500억 달러 이상, 보유 외화 40억 달러 미만.", ["c90-kr-imf-why"],
                "미국에서 고위험 주택담보대출이 크게 늘었다. 한국 외환보유액은 약 2,000억 달러.", ["c00-subprime", "c00-kr-2008"],
                "different", "외환보유액이 약 50배 차이. 위기의 발원지도 아시아 vs 미국으로 다르다."),
            row("촉발 사건", "1997년 7월 태국 바트화 붕괴 → 11월 한국 IMF 지원 요청.", ["c90-baht", "c90-kr-imf"],
                "2008년 9월 리먼브러더스 파산.", ["c00-lehman"],
                "partial", "두 번 모두 밖에서 시작된 충격이 외국 자본 이탈로 번졌다. 시작한 곳의 성격은 다르다."),
            row("시장 반응", "국제 투자자의 공황과 자본 철수가 위기를 키웠다는 해석.", ["c90-why-panic"],
                "원·달러 환율 1,500원 돌파, 코스피 연초의 절반.", ["c00-kr-2008"],
                "same", "외국 자본이 빠지며 원화와 주가가 급락하는 모습은 같다."),
            row("사회 반응", "금 모으기에 약 351만 명 참여, 실업률 1998년 6.8%, 'IMF 국밥'·공무원 선호.", ["c90-gold", "c90-unemp", "c90-ch-imfdaily"],
                "2008~09년 생활 반응 자료는 아직 모으지 않았다.", [],
                "unknown", ""),
            row("결과", "한국 성장률 1998년 {KR1998}.", ["c90-growth98"],
                "한국 성장률 2009년 {KR2009}. 연준은 금리를 사실상 0%로 내리고 양적완화.", ["c00-lehman", "c10-fed-qe"],
                "different", "같은 모양의 충격이었지만 한국 경제가 받은 타격은 크게 달랐다."),
        ],
        "criteria": [
            crit("경제 환경", "partial", "두 번 모두 외부 충격과 자본 이탈. 외환보유액과 부채 구조는 크게 다르다.", ["c90-kr-imf-why", "c00-kr-2008"]),
            crit("사회 분위기", "unknown", "2008년 자료 미수집."),
            crit("소비자 행동", "unknown", "2008년 자료 미수집."),
            crit("문화 트렌드", "unknown", "비교 자료 없음."),
            crit("기술 발전 단계", "unknown", "비교 자료 없음."),
            crit("산업 구조", "unknown", "비교 자료 없음."),
            crit("국제 정세", "different", "아시아 지역 위기 vs 세계 동시 위기·세계 동시 금리 인하.", ["c90-baht", "c00-lehman"]),
            crit("인구·노동시장", "unknown", "1998년 실업 급등 기록은 있으나 2009년 비교 자료 미수집.", ["c90-unemp"]),
        ],
        "repeated": [
            "외부 충격 → 외국 자본 이탈 → 원화·주가 급락이라는 전달 경로는 두 번 모두 나타났다.",
        ],
        "notConclusive": [
            "'외환보유액이 결과를 갈랐다'는 설명은 그럴듯하지만, 두 사례만으로는 입증할 수 없다. 세계 동시 금리 인하처럼 다른 조건도 달랐다.",
            "평가할 수 있는 기준이 2개뿐이라 유사도 점수를 내지 않는다.",
        ],
        "notConclusiveIds": ["c10-fed-qe"],
        "future": {
            "common": "대외 개방도가 높은 경제, 밖에서 온 금융 충격",
            "pastResult": "1998년 마이너스 성장과 대량 실업, 2009년 플러스 성장 유지",
            "different": "외환보유액, 위기의 발원지, 세계 정책 공조",
            "conditions": "1997년 같은 결과가 나오려면: 외화 유동성이 부족한 상태에서 외부 충격이 와야 한다(1997년에만 있던 조건).",
            "signals": ["외환보유액", "원·달러 환율 급변", "외국인 자금 유출입"],
        },
    },
    {
        "id": "pp-tech-boom",
        "title": "새 범용 기술의 확산과 투자 붐",
        "theme": "기술혁신과 대중화",
        "a": {"eraId": "1990s", "label": "인터넷 확산과 벤처 붐", "years": "1995~2000"},
        "b": {"eraId": "2020s", "label": "생성형 AI 확산과 AI 투자", "years": "2022~현재"},
        "question": "새 기술이 퍼질 때 투자 열기와 그 뒤의 조정이 비슷하게 나타나는가?",
        "rows": [
            row("쌓여 있던 조건", "1993년 웹 기술 공개, 1996년 세계 첫 CDMA 상용화.", ["c90-www", "c90-cdma"],
                "스마트폰과 메신저·플랫폼이 이미 생활 기반이 되어 있었다.", ["c10-kakao", "c20-online"],
                "partial", "둘 다 앞 시대의 통신 기반 위에서 출발했다."),
            row("촉발 사건", "1995년 넷스케이프 상장(첫 인터넷 기업 상장).", ["c90-netscape"],
                "2022년 11월 ChatGPT 공개.", ["c20-chatgpt"], "partial", "주식시장 사건 vs 제품 공개. 계기의 성격이 다르다."),
            row("확산 속도", "PC방 1998년 초 100여 개 → 1999년 말 15,000개. 초고속 인터넷 가입자 1년 새 37만 → 400만.", ["c90-pcbang"],
                "공개 두 달 만에 월간 사용자 1억 명.", ["c20-gpt-100m"],
                "unknown", "측정 단위(점포 수·가입자 vs 앱 사용자)가 달라 속도를 직접 비교할 수 없다."),
            row("투자·시장 반응", "나스닥·코스닥 모두 2000년 3월 10일 정점, 코스닥 시가총액 1년 새 96조 → 29조 원. '묻지마 투자'.", ["c90-netscape", "c00-kosdaq", "c00-sd-venture"],
                "AI 서버 투자로 2025년 한국 반도체 수출 사상 최대. 동시에 '반도체 착시' 지적.", ["c20-kr-chip", "c20-chip-risk"],
                "partial", "투자 열기는 비슷하게 보이지만, 2020년대에 붕괴가 있었는지는 확인되지 않았다."),
            row("산업·직업 변화", "PC방·온라인게임 시장 폭발, 이후 싸이월드 같은 서비스로 이어짐.", ["c90-starcraft", "c00-cyworld"],
                "사무·창작 직무가 바뀔 것이라는 전망은 많지만 고용 통계와는 아직 연결하지 못했다.", ["c20-hyp-ai-jobs"],
                "unknown", ""),
            row("결과", "벤처 버블 붕괴. 그러나 기술은 남아 2000년대 서비스로 이어졌다.", ["c00-sd-venture", "c00-cyworld"],
                "진행 중 — 결과를 알 수 없다.", [], "unknown", "결과가 나오지 않은 쪽과는 결과를 비교하지 않는다."),
        ],
        "criteria": [
            crit("경제 환경", "partial", "새 기술에 대한 투자 열기. 1990년대 말은 외환위기 직후, 2020년대는 고금리 이후.", ["c00-venture-why", "c20-kr-rate"]),
            crit("사회 분위기", "unknown", "비교 자료 없음."),
            crit("소비자 행동", "unknown", "보급 지표 단위가 달라 비교 불가."),
            crit("문화 트렌드", "unknown", "비교 자료 없음."),
            crit("기술 발전 단계", "same", "둘 다 새 범용 기술이 대중에게 막 퍼지는 단계.", ["c90-pcbang", "c20-gpt-100m"]),
            crit("산업 구조", "different", "1990년대 한국은 IT 서비스 초기, 2025년 한국은 메모리 반도체가 수출의 중심.", ["c90-starcraft", "c20-kr-chip"]),
            crit("국제 정세", "different", "1990년대 세계화 확대 vs 2018년 이후 무역전쟁·공급망 재편.", ["c90-cn-1992", "c10-tradewar", "c20-chips"]),
            crit("인구·노동시장", "unknown", "비교 자료 없음."),
        ],
        "repeated": [
            "새 기술이 앞 시대의 통신 기반 위에서 빠르게 퍼지고, 관련 자산·산업으로 돈이 몰리는 모습은 두 번 모두 보인다.",
        ],
        "notConclusive": [
            "2020년대의 결과가 나오지 않았다. 2000년 같은 붕괴가 온다고 말할 근거는 없다.",
            "보급 속도를 같은 단위로 잴 자료가 없다.",
        ],
        "notConclusiveIds": ["c20-chip-risk"],
        "future": {
            "common": "새 범용 기술의 빠른 대중화, 관련 산업으로의 투자 집중",
            "pastResult": "2000년: 투자 붕괴, 하지만 기술 자체는 다음 시대 서비스로 이어짐",
            "different": "한국이 기술 사용국이 아니라 핵심 부품(메모리) 공급국이라는 점, 무역전쟁·공급망 재편",
            "conditions": "2000년과 비슷한 조정이 오려면: 투자가 실제 수익보다 앞서 나가다가 투자가 멈춰야 한다. 한국에서는 반도체 수출 집중이 충격을 키울 수 있다는 지적이 있다.",
            "signals": ["AI 데이터센터 투자 증감", "반도체 수출 비중과 나머지 주력 품목 수출", "AI 관련 직무의 고용 통계"],
        },
    },
]

# 새 신호 추적 — 한 시대의 작은 변화가 다음 시대에 어떻게 커졌는지. 각 단계는 확인된 문장만.
SIGNALS = [
    {"id": "sg-chip", "title": "반도체", "originEra": "1960s", "domain": "industry", "steps": [
        {"eraId": "1960s", "label": "군·우주 수요가 만든 IC 시장", "claimIds": ["c60-ic-2", "c60-syn-chip"]},
        {"eraId": "1970s", "label": "첫 상용 마이크로프로세서", "claimIds": ["c70-4004"]},
        {"eraId": "1980s", "label": "한국, 세계 세 번째 64K D램", "claimIds": ["c80-64k"]},
        {"eraId": "2020s", "label": "반도체 수출 사상 최대, 집중 위험 지적", "claimIds": ["c20-kr-chip", "c20-chip-risk"]},
    ], "gap": "1990~2010년대 한국 반도체 산업 자료는 아직 이 흐름에 연결하지 않았다."},
    {"id": "sg-connect", "title": "연결과 플랫폼", "originEra": "1990s", "domain": "technology", "steps": [
        {"eraId": "1990s", "label": "CDMA 상용화, PC방·초고속 인터넷", "claimIds": ["c90-cdma", "c90-pcbang"]},
        {"eraId": "2000s", "label": "싸이월드, 아이폰 국내 출시", "claimIds": ["c00-cyworld", "c00-kr-iphone"]},
        {"eraId": "2010s", "label": "카카오톡, 배달앱", "claimIds": ["c10-kakao", "c10-delivery"]},
        {"eraId": "2020s", "label": "온라인쇼핑 최대, 생성형 AI 1억 명", "claimIds": ["c20-online", "c20-gpt-100m"]},
    ], "gap": ""},
    {"id": "sg-china", "title": "중국의 부상", "originEra": "1980s", "domain": "politics", "steps": [
        {"eraId": "1980s", "label": "개혁·개방 시작", "claimIds": ["c80-cn-reform"]},
        {"eraId": "1990s", "label": "남순강화, 외국인 투자 급증", "claimIds": ["c90-cn-1992"]},
        {"eraId": "2000s", "label": "WTO 가입, 무역 연 26.7% 성장", "claimIds": ["c00-cn-wto", "c00-cn-trade"]},
        {"eraId": "2010s", "label": "미·중 무역전쟁", "claimIds": ["c10-tradewar"]},
        {"eraId": "2020s", "label": "미국 반도체법, 공급망 재편", "claimIds": ["c20-chips"]},
    ], "gap": ""},
    {"id": "sg-debt", "title": "가계 빚과 자산", "originEra": "2000s", "domain": "economy", "steps": [
        {"eraId": "2000s", "label": "카드 대출 급증과 신용불량", "claimIds": ["c00-card"]},
        {"eraId": "2010s", "label": "사상 최저 금리, 가계신용 급증", "claimIds": ["c10-rate", "c10-debt"]},
        {"eraId": "2020s", "label": "아파트값 급등 뒤 금리 인상기 하락", "claimIds": ["c20-house", "c20-kr-rate"]},
    ], "gap": ""},
    {"id": "sg-household", "title": "가족과 인구", "originEra": "2010s", "domain": "society", "steps": [
        {"eraId": "2010s", "label": "출산율 1명 아래, 1인 가구 30%", "claimIds": ["c10-tfr", "c10-1person"]},
        {"eraId": "2020s", "label": "인구 자연감소 시작", "claimIds": ["c20-pop"]},
    ], "gap": "1960~2000년대 출산율·가구 자료를 아직 연결하지 않아 시작점이 2010년대로 보인다."},
    {"id": "sg-kculture", "title": "한국 대중문화의 해외 진출", "originEra": "2000s", "domain": "culture", "steps": [
        {"eraId": "2000s", "label": "'겨울연가'와 일본 한류", "claimIds": ["c00-hallyu"]},
        {"eraId": "2010s", "label": "강남스타일, BTS 빌보드 1위", "claimIds": ["c10-psy", "c10-bts"]},
    ], "gap": "2020년대 근거는 아직 모으지 않았다."},
]

# 10개 분야별 반복 탐색 결과. kind:
#   statistical(통계적으로 반복 관찰) / weak(반복처럼 보이지만 검증 부족) / similar(비슷한 조건에서 다시 나타남)
#   chance(우연히 비슷하게 보인 경우) / none(반복 패턴 발견 안 됨) / insufficient(자료 부족 — 계산 불가)
PHENOMENA = [
    {"subject": "경제성장과 경기침체", "kind": "none", "summary": "한·미·일 성장률에서 일정한 주기는 통계적으로 확인되지 않았다. 대신 한국은 1997년 전후로 평균 성장률이 한 단계 낮아졌다(변화점).", "link": "stats"},
    {"subject": "경제성장과 경기침체", "kind": "chance", "summary": "한국 성장률은 18년 시차에서만 기준선을 넘었다. 하지만 이는 1980년과 1998년, 마이너스 성장 두 해가 우연히 18년 떨어져 있어서 생긴 값이다. 두 해를 빼면 사라진다.", "link": "stats"},
    {"subject": "경제성장과 경기침체", "kind": "weak", "summary": "일본 성장률은 11년 시차에서 위기 해를 빼도 기준선 밖에 남는다. 하지만 1995년부터 30년 자료뿐이고 여러 시차를 함께 본 검정에서 경계 수준이라 주기로 확정하지 않는다.", "link": "stats"},
    {"subject": "물가상승과 소비 변화", "kind": "similar", "summary": "전쟁 → 에너지 값 급등 → 물가 급등이 1973~75년과 2021~23년에 다시 나타났다. 크기와 결과는 달랐다.", "link": "pp-energy"},
    {"subject": "금융위기와 투자 행동", "kind": "similar", "summary": "외부 충격 → 자본 이탈 → 원화·주가 급락이 1997년과 2008년에 다시 나타났다. 한국 경제가 받은 타격은 크게 달랐다.", "link": "pp-fx-crisis"},
    {"subject": "기술혁신과 대중화", "kind": "weak", "summary": "새 기술 확산과 투자 열기는 1990년대 말과 2020년대에 비슷해 보이지만, 같은 단위의 보급 자료가 없고 2020년대 결과가 나오지 않았다.", "link": "pp-tech-boom"},
    {"subject": "산업의 성장과 쇠퇴", "kind": "weak", "summary": "반도체·플랫폼처럼 앞 시대의 작은 신호가 다음 시대 주력이 된 흐름은 보이지만, 산업별 생산·고용 시계열로는 아직 확인하지 않았다.", "link": "signals"},
    {"subject": "정치·국제정세 변화", "kind": "insufficient", "summary": "사건은 정리했지만 반복 여부를 잴 수 있게 구조화하지 않았다."},
    {"subject": "사회적 가치관과 세대문화", "kind": "insufficient", "summary": "시대별 분위기 문항은 있지만 같은 질문으로 반복 측정한 자료가 없다."},
    {"subject": "패션과 대중문화", "kind": "insufficient", "summary": "유행의 재등장(복고·LP 등)은 출처 조사 전이다."},
    {"subject": "소비 트렌드", "kind": "insufficient", "summary": "온라인쇼핑 등 2010년 이후 자료만 있어 반복을 볼 수 없다."},
    {"subject": "직업과 노동시장 변화", "kind": "insufficient", "summary": "직업별 고용 시계열을 아직 연결하지 않았다."},
]


def _fill(text, g):
    import re
    def rep(m):
        c, y = m.group(1), m.group(2)
        v = g.get((c, y))
        assert v is not None, f"성장률 없음 {c}{y}"
        return f"{v:+.1f}%"
    return re.sub(r"\{(KR|US|JP)(\d{4})\}", rep, text)


def build(indicators):
    g = {}
    gd = next(i for i in indicators if i["id"] == "gdp-growth")
    for s in gd["series"]:
        for t, v in s["points"]:
            g[(s["country"], t)] = v
    pars = []
    for p in PARALLELS:
        p = {**p, "rows": [dict(r, a=dict(r["a"], text=_fill(r["a"]["text"], g)), b=dict(r["b"], text=_fill(r["b"]["text"], g))) for r in p["rows"]]}
        assessed = [c for c in p["criteria"] if c["verdict"] in V]
        score = sum(V[c["verdict"]] for c in assessed)
        p["similarity"] = {
            "assessed": len(assessed), "total": len(CRITERIA), "points": score,
            "score": round(score / len(assessed), 2) if len(assessed) >= MIN_ASSESSED else None,
            "formula": f"(같음 1점 + 부분 0.5점 + 다름 0점) ÷ 평가한 기준 수. '자료 없음'은 빼고 계산, 평가 기준이 {MIN_ASSESSED}개 미만이면 점수를 내지 않음.",
        }
        if any(r["aspect"] == "결과" for r in p["rows"]):
            p["figureSourceIds"] = gd["series"][0]["sourceIds"]
        pars.append(p)
    return {
        "stats": pattern_stats.analyse(),
        "parallels": pars,
        "signals": SIGNALS,
        "phenomena": PHENOMENA,
        "criteria": CRITERIA,
        "rules": [
            "주기를 미리 정하지 않고 시차 1~20년을 모두 같은 방식으로 검사했다.",
            "신문 기사 수로 현상이 실제로 얼마나 자주 일어났는지 판단하지 않는다.",
            "1960년부터 약 65년 자료로는 20년보다 긴 주기를 확정할 수 없다.",
            "같은 종류의 사건이 있었다는 것만으로 비슷한 시대라고 하지 않는다. 조건·반응·산업 변화·결과를 함께 비교한다.",
            "같음·부분·다름 판정은 제작자의 해석이며, 근거 문장을 눌러 직접 확인할 수 있다.",
            "미래는 예측하지 않는다. 비슷한 결과가 나오려면 어떤 조건이 필요한지와 지켜볼 신호만 적는다.",
        ],
    }
