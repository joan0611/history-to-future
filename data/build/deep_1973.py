"""v0.13 첫 심층 사례 — 1973년 대한민국 (석유파동 + 유신·중화학공업 + 청년문화).

원칙
- 문장(claims)은 모두 출처와 연결. 출처 2개 이상이 같은 내용을 말할 때만 verified.
- 노드는 문장을 묶은 '탐색 단위', 관계(edges)는 근거가 말하는 것만큼만:
    cause(직접적인 원인) / background(구조적 배경) / trigger(촉발 계기) / influence(영향을 준 요인)
    sequence(시간적 선후 — 인과 주장 없음) / similar(유사·비교)
  verification: evidenced(출처가 인과를 직접 말함) / interpretation(여러 근거를 엮은 해석) / hypothesis
- 앞뒤 순서만 있는 것은 sequence로 두고 인과로 올리지 않는다.
- 복잡한 갈등을 하나의 종교·이념으로 설명하지 않는다(영토·안보·냉전·경제 이해관계를 따로 노드로 둔다).
"""
from era_1960s import C
from era_1980s import S

SOURCES = [
    S("us-hist-1973war", "The 1973 Arab-Israeli War (Milestones 1969–1976)", "미국 국무부 사료실(Office of the Historian)",
      "https://history.state.gov/milestones/1969-1976/arab-israeli-war-1973", "government"),
    S("us-hist-1973war-2012", "Arab-Israeli War 1973 (Milestones, 2012년 보존본)", "미국 국무부 사료실 — UNT 웹 아카이브",
      "https://webarchive.library.unt.edu/web/20121017043239/http://history.state.gov/milestones/1969-1976/ArabIsraeliWar73", "government",
      "같은 기관의 이전 판. 독립 출처로 세지 않음"),
    S("nsa-october-war", "The October War and U.S. Policy (briefing book)", "National Security Archive, George Washington University",
      "https://nsarchive.gwu.edu/node/2967", "academic"),
    S("afa-airlift", "The Yom Kippur Airlift (2016)", "Air & Space Forces Magazine",
      "https://www.airandspaceforces.com/article/the-yom-kippur-airlift/", "news"),
    S("us-hist-1967war", "The 1967 Arab-Israeli War (국무부 사료실 글 전재)", "Jewish Virtual Library (원문: 미국 국무부 사료실)",
      "https://www.jewishvirtuallibrary.org/the-1967-arab-israeli-war", "government", "국무부 사료실 글을 그대로 옮긴 페이지로 확인"),
    S("wana-1967", "Factsheet: 1967 Arab-Israeli War and Resolution 242", "WANA Institute",
      "https://wanainstitute.org/sites/default/files/fact_sheets/1967%20War.pdf", "institution"),
    S("israeled-242", "November 22, 1967 — Resolution 242", "Center for Israel Education",
      "https://israeled.org/resolution-242", "institution"),
    S("us-hist-embargo", "Oil Embargo, 1973–1974 (Milestones)", "미국 국무부 사료실(Office of the Historian)",
      "https://history.state.gov/milestones/1969-1976/oil-embargo", "government"),
    S("fed-oilshock", "Oil Shock of 1973–74", "Federal Reserve History (미국 연방준비제도)",
      "https://www.federalreservehistory.org/essays/oil-shock-of-1973-74", "institution"),
    S("ency-embargo", "Oil Embargo (1973–1974)", "Encyclopedia of the Modern Middle East and North Africa (encyclopedia.com)",
      "https://encyclopedia.com/humanities/encyclopedias-almanacs-transcripts-and-maps/oil-embargo-1973-1974", "reference"),
    S("kr-arch-yushin", "제7차 개헌(유신헌법) — 정책 해설", "국가기록원", "https://theme.archives.go.kr/next/govpo/detail.do?policySeq=102", "government"),
    S("kr-seoul-2010-yushin", "‘긴급조치위반’ 절반이 술자리·수업중 유신비판 (2010.12.16)", "서울신문",
      "https://m.seoul.co.kr/news/2010/12/16/20101216800072", "news"),
    S("kr-arch-hci-policy", "중화학공업 육성 — 정책 해설", "국가기록원", "https://theme.archives.go.kr/next/govpo/detail.do?policySeq=308", "government"),
    S("kr-snu-hci", "박정희의 중화학공업과 방위산업 정책: 구조-행위자 모델에서 본 제약된 선택", "서울대학교 국제문제연구소 『세계정치』 14",
      "https://s-space.snu.ac.kr/handle/10371/94918", "academic"),
    S("kr-arch-oil-theme", "기록으로 보는 대한민국: 석유", "국가기록원", "https://theme.archives.go.kr/next/koreaOfRecord/gasoline.do", "government"),
    S("kr-arch-chron-1974", "국가기록원 기록 연표 — 1974년 1월", "국가기록원",
      "https://theme.archives.go.kr/next/chronology/searchArchive.do?page=411", "government", "연표 항목: 1.18 석유류제품 기준가격 고시, 1.24 밀가루 최고판매가격 60% 인상 고시"),
    S("kr-pp21-2008", "참여사회 2008년 7월호 — 1970년대 석유파동 회고", "참여연대", "https://www.peoplepower21.org/Magazine/720276", "news"),
    S("kr-khan-2014-briquette", "1974년 연탄파동 (2014.01.17)", "경향신문", "https://www.khan.co.kr/article/201401172050015/amp", "news"),
    S("kr-arch-kori-photo", "원자력 발전 — 사진으로 보는 기록", "국가기록원", "https://theme.archives.go.kr/next/photo/nuclearEnergy02List.do", "government"),
    S("kr-arch-kori-policy", "원자력발전소 1호기 준공 — 정책 해설", "국가기록원", "https://theme.archives.go.kr/next/govpo/detail.do?policySeq=309", "government"),
    S("kr-kdi-energyplan-1996", "국가에너지기본계획(시안) 요약 (1996)", "KDI 경제정보센터", "https://eiec.kdi.re.kr/epic_txt/1996/D9611018.HWP", "government"),
    S("kr-kais-folk-2011", "1970년대 한국 포크음악 연구 (2011 추계 학술발표논문집)", "한국산학기술학회",
      "https://koreascience.kr/article/CFKO201130533388816.pdf", "academic"),
    S("kr-bravo-8army", "미8군 무대와 스탠더드 팝", "브라보 마이 라이프(이투데이)", "https://bravo.etoday.co.kr/view/atc_view/4447", "news"),
    S("kr-khan-2001-shin", "신중현과 ‘아름다운 강산’, 1975년 대마초 사건 (2001.12.30)", "경향신문",
      "https://www.khan.co.kr/article/200112301644461/amp", "news"),
    S("kr-pressian-70culture", "서중석의 현대사 이야기 — 1970년대 대중문화가 꽃핀 조건", "프레시안", "https://pressian.com/pages/articles/136421", "news"),
    S("kr-pressian-ban", "1975년 대마초 파동과 가요 정화 대책", "프레시안", "https://pressian.com/pages/articles/21857", "news"),
    S("kr-seoul-1998-shin", "신중현: 금지문화 금지인생 이제야 말한다 (1998.07.11)", "서울신문", "https://m.seoul.co.kr/news/1998/07/11/19980711011001", "news",
      "1975년 7~8월 금지곡 목록 포함"),
    S("kr-gq-2018-sanulim", "산울림 1집 그리고 몇 십 번의 여름 (2018)", "GQ Korea",
      "https://www.gqkorea.co.kr/2018/08/07/%EC%82%B0%EC%9A%B8%EB%A6%BC-1%EC%A7%91-%EA%B7%B8%EB%A6%AC%EA%B3%A0-%EB%AA%87-%EC%8B%AD-%EB%B2%88%EC%9D%98-%EC%97%AC%EB%A6%84", "news"),
    S("kr-encykorea-campus", "대학가요제", "한국민족문화대백과사전(한국학중앙연구원)", "https://encykorea.aks.ac.kr/Article/E0014887", "reference"),
    S("kr-khan-2012-campus", "대학가요제를 기억합니다 (2012.11.13)", "스포츠경향", "https://sports.khan.co.kr/article/201211131810253", "news"),
    S("kr-imbc-2011-sesibong", "[인터뷰] 윤형주·송창식·김세환 ‘세시봉 친구들’ (2011.02.16)", "iMBC 연예", "https://enews.imbc.com/News/RetrieveNewsInfo/35777", "news"),
    S("kr-jjan-2011-sesibong", "“40여년 우정 깃든 음악 새롭나봐요” (2011.02.16)", "전북일보(연합뉴스 인터뷰)", "https://www.jjan.kr/articleAmp/20110216386225", "news"),
    S("kr-osen-2011-analog", "LP 바늘 튀는 소리도 정겹다 (2011)", "OSEN", "https://www.osen.co.kr/article/G1105180250", "news"),
]

CLAIMS = [
    # ── 국제적 배경: 1967년 전쟁과 영토 문제 ──
    C("c60-me-1967", "1967년 6월 5~10일 전쟁에서 이스라엘은 이집트·요르단·시리아를 이기고 시나이반도·가자지구·요르단강 서안·동예루살렘·골란고원을 점령했다.",
      "fact", "verified", ["us-hist-1967war", "wana-1967"], ["politics"], ["MIDEAST"]),
    C("c60-me-242", "1967년 11월 22일 유엔 안보리 결의 242호는 점령지에서의 이스라엘군 철수와 '안전하고 인정된 경계 안에서의 평화'를 함께 요구했다. 철수 범위를 둘러싼 해석은 지금도 엇갈린다.",
      "fact", "verified", ["israeled-242", "wana-1967"], ["politics"], ["MIDEAST", "WORLD"]),
    C("c60-me-soviet", "미국 국무부 사료실은 1960년대 중반 소련이 이집트 등 아랍 국가에 무기를 팔아 이스라엘의 군사적 우위가 흔들리자, 미국이 이스라엘에 대한 무기 제한 정책을 바꾸었다고 정리한다.",
      "interpretation", "sourced", ["us-hist-1967war"], ["politics"], ["US", "MIDEAST"]),
    # ── 1973년 전쟁: 목표와 이해관계 ──
    C("c70-me-stalemate", "1971년 이후 사다트의 협상 제안은 진전되지 못했다. 미국은 1973년 10월 이스라엘 선거 뒤로 외교를 미루었고, 사다트는 미국을 움직이려면 군사적 선택이 필요하다고 판단했다.",
      "interpretation", "verified", ["us-hist-1973war", "nsa-october-war"], ["politics"], ["MIDEAST", "US"]),
    C("c70-me-goal", "이집트·시리아는 1967년에 잃은 영토를 되찾으려 1973년 10월 6일 시나이와 골란고원의 이스라엘군을 공격했다. 사다트는 수에즈 운하를 건너 좁은 지역을 차지하는 제한전으로 강대국이 이스라엘에 압력을 넣게 하려 했고, 골란 회복이 목표였던 시리아 아사드와는 목표가 달랐다.",
      "fact", "verified", ["us-hist-1973war-2012", "afa-airlift", "nsa-october-war"], ["politics"], ["MIDEAST"]),
    C("c70-me-saudi", "사우디아라비아 파이살 국왕은 사다트에게 미국을 상대로 '석유 무기'를 쓰겠다고 약속했다.",
      "fact", "sourced", ["nsa-october-war"], ["politics", "energy"], ["MIDEAST"]),
    C("c70-us-airlift", "미국은 이스라엘이 패하는 것을 원치 않아 10월 14일부터 무기 공수를 시작했다. 같은 시기 소련도 이집트·시리아에 무기를 공수하고 있었다. 미국의 공수 뒤 전세는 아랍 측에 불리해졌다.",
      "fact", "verified", ["us-hist-1973war", "afa-airlift"], ["politics"], ["US", "MIDEAST"]),
    C("c70-us-why", "미국 국무부 사료실은 석유 금수가 '아랍 세계에서 소련 영향력에 맞서기 위한 이스라엘 지원'을 미국의 경제·국내 정책과 조화시켜야 할 필요를 드러냈다고 정리한다. 미국의 이스라엘 지원이 냉전 전략과 묶여 있었다는 뜻이다.",
      "interpretation", "verified", ["us-hist-embargo", "us-hist-1967war"], ["politics"], ["US", "MIDEAST"]),
    C("c70-embargo-goal", "닉슨이 의회에 22억 달러의 이스라엘 긴급 지원을 요청한 직후, 아랍 산유국은 미국 등 이스라엘 지원국에 석유 수출을 끊고 생산을 줄였다. 이스라엘이 1949년 휴전선으로 물러날 때까지 감산한다는 조건이었다.",
      "fact", "verified", ["fed-oilshock", "ency-embargo"], ["energy", "politics"], ["MIDEAST", "US"]),
    C("c70-price-mech", "미국 석유업계가 증산으로 대응할 수 없는 상태였기 때문에 감산이 시작되자 가격이 오를 수밖에 없었다. 유가는 배럴당 약 2.90달러에서 1974년 1월 11.65달러로 거의 4배가 되었다.",
      "statistical", "verified", ["fed-oilshock", "kr-arch-oil-theme"], ["energy", "economy"], ["WORLD", "US"]),
    # ── 대한민국: 정치·산업 구조 ──
    C("c70-yushin", "1972년 10월 17일 박정희 대통령은 비상계엄을 선포하고 국회를 해산했다. 유신헌법은 11월 21일 국민투표(찬성 91.5%)를 거쳐 12월 27일 공포되었고, 대통령에게 국민의 자유와 권리를 잠정 정지할 수 있는 긴급조치권을 주었다.",
      "fact", "verified", ["kr-arch-yushin", "kr-seoul-2010-yushin"], ["politics"], ["KR"]),
    C("c70-hci-why", "국가기록원은 중화학공업화 선언의 배경으로 경공업 중심 수출 구조의 무역적자, 기계·부품의 일본 수입 의존, 데탕트에 따른 안보 위기(방위산업 필요)를 든다. 닉슨 독트린이 방위산업과 중화학공업 전환을 재촉했다는 연구도 있다.",
      "interpretation", "verified", ["kr-arch-hci-policy", "kr-snu-hci"], ["industry", "politics"], ["KR", "US"]),
    C("c70-hci-fund", "중화학공업 자금은 1973년 12월 국민투자기금법으로 마련했다. 1974~79년 1조 5,652억 원을 조성해 대출금의 61%를 중화학공업에 지원했다.",
      "statistical", "sourced", ["kr-arch-hci-policy"], ["industry", "economy"], ["KR"]),
    C("c70-kr-structure", "현대경제연구원은 1차 석유파동 때 한국 산업구조가 아직 미성숙해 성장률 둔화는 작았지만 물가상승률은 5.7%p 올랐다고 분석한다. 석유 의존도가 높은 중화학공업 중심으로 바뀐 뒤 맞은 2차 석유파동 때는 성장률까지 크게 떨어졌고, 국가기록원도 한국이 2차 파동 때 더 큰 피해를 입었다고 기록한다.",
      "interpretation", "verified", ["kr-hri-2004", "kr-arch-oil-theme"], ["economy", "energy", "industry"], ["KR"]),
    C("c70-price-transmit", "원유값 인상은 국내 석유류 가격 인상으로 이어졌다. 국세청은 1974년 1월 18일 석유류 제품 기준가격을 새로 고시했고, 이에 따라 생필품값이 올라 1973~1975년 3년 사이 도매물가가 약 100% 올랐다는 평가가 있다.",
      "interpretation", "sourced", ["kr-arch-chron-1974", "kr-pp21-2008"], ["economy", "energy"], ["KR"]),
    C("c70-mech-cost", "석유는 공장의 연료·원료, 버스·화물 운송, 난방에 함께 쓰여 유가 상승이 생산비와 운송비를 거쳐 여러 상품 가격으로 번진다. 1974년 1월 24일에는 밀가루 최고판매가격도 60% 인상 고시되었다.",
      "interpretation", "sourced", ["kr-arch-chron-1974", "kr-pp21-2008"], ["economy"], ["KR"], ai=True),
    C("c70-briquette", "기름값이 오르자 정부는 연탄 사용을 권했고, 1974년에는 실제 공급 부족으로 연탄파동이 일어났다. 10월에는 경기도 시흥 주부들이 대도시 위주의 연탄 공급에 항의했다.",
      "fact", "sourced", ["kr-khan-2014-briquette"], ["society", "energy"], ["KR"]),
    C("c70-ministry", "1970년대 두 차례 석유위기를 거치며 1978년 동력자원부가 발족해 에너지원 다원화와 에너지 이용 합리화 정책이 본격적으로 추진되었다.",
      "fact", "sourced", ["kr-kdi-energyplan-1996"], ["energy", "politics"], ["KR"]),
    C("c70-kori", "국가기록원은 한국이 1973년 석유파동을 겪으며 에너지원 다원화를 추구했고, 첫 원자력발전소 고리 1호기가 1978년 상업운전을 시작했다고 기록한다. 공사 자체는 석유파동 전인 1971년에 시작되었다.",
      "fact", "verified", ["kr-arch-kori-photo", "kr-arch-kori-policy"], ["energy", "industry"], ["KR"]),
    # ── 문화: 이전 → 1970년대 → 통제 → 이후 → 재등장 ──
    C("c60-pop-before", "포크가 퍼지기 전 한국 대중음악 시장은 트로트와 '스탠더드 팝'으로 나뉘어 있었고, 미8군 쇼 무대에서 훈련된 가수·그룹사운드·전문 작곡가가 음악을 만들었다.",
      "fact", "verified", ["kr-kais-folk-2011", "kr-bravo-8army"], ["culture"], ["KR", "US"]),
    C("c60-sesibong", "1960년대 서울 무교동 음악감상실 세시봉은 무대를 내줘 통기타로 팝송을 부를 수 있던 곳으로, 조영남·윤형주·송창식·김세환 등이 여기서 노래를 시작했다. 생맥주 문화와 함께 중심이 명동으로 옮겨가며 1969년 문을 닫았다.",
      "fact", "verified", ["kr-imbc-2011-sesibong", "kr-jjan-2011-sesibong"], ["culture"], ["KR"]),
    C("c70-us-folk", "한국 포크는 미국 팝송과 각국 민요·샹송을 우리말로 번안해 기타 하나로 부르며 시작했다. 미군 방송(AFKN)과 미8군 무대로 미국 음악을 먼저 접한 음악인들이 록과 포크를 들여왔다.",
      "fact", "verified", ["kr-kais-folk-2011", "kr-khan-2001-shin"], ["culture"], ["KR", "US"]),
    C("c70-folk", "1970년대 초 대학생 출신 포크 가수들이 그룹사운드가 차지하던 살롱 무대를 대신하며 포크 붐이 시작되었다. 초기 앨범은 번안곡이 대부분이었고(1968~71년 창작곡 비율 34~35%), 차츰 싱어송라이터의 창작곡이 늘었다.",
      "fact", "sourced", ["kr-kais-folk-2011"], ["culture"], ["KR"]),
    C("c70-culture-why", "1970년대 새 대중문화가 자란 조건으로 급속한 산업화, 이농과 도시 팽창, 베이비붐 세대의 성장, 매체 증가가 꼽힌다. 라디오는 1970년 401만 대에서 1975년 1,350만 대로, TV 가구 보급률은 1970년 6.3%에서 1979년 79%로 늘었다.",
      "interpretation", "sourced", ["kr-pressian-70culture"], ["culture", "society"], ["KR"]),
    C("c70-ban", "1975년 1월 대마초 사건과 6월 '공연활동 정화대책' 이후 많은 가요가 금지되었다. 50명이 넘는 가수·작곡가·연주자 등이 입건되었고, 신중현·김추자 등의 노래가 무더기로 금지곡이 되었다.",
      "fact", "verified", ["kr-pressian-ban", "kr-seoul-1998-shin", "kr-gq-2018-sanulim"], ["culture", "politics"], ["KR"]),
    C("c70-campus", "1977년 9월 3일 첫 MBC 대학가요제에서 서울대 그룹 샌드페블즈의 '나 어떡해'가 대상을 받았다. 이후 대학가요제는 30여 년간 신인 등용문이 되었다.",
      "fact", "verified", ["kr-encykorea-campus", "kr-khan-2012-campus"], ["culture"], ["KR"]),
    C("c10-sesibong", "2010년 추석과 2011년 설 MBC '놀러와'에 세시봉 출신 가수들이 나오자 반향이 신드롬 수준이었다. 통기타 판매와 음반 주문이 늘고 '세시봉' 간판을 단 라이브 클럽이 생겼다.",
      "fact", "verified", ["kr-imbc-2011-sesibong", "kr-jjan-2011-sesibong"], ["culture", "consumption"], ["KR"]),
    C("c10-analog", "2011년에는 스마트폰이 불티나게 팔리는 동시에 통기타·LP·음악카페 같은 아날로그 복고가 함께 유행했다는 보도가 있다.",
      "fact", "sourced", ["kr-osen-2011-analog"], ["culture", "consumption"], ["KR"]),
]

# 노드: (id, 이름, 연도, 연도정확도, 줄, 유형, 국가, 중요도, 근거)
def N(id, label, year, lane, ntype, countries, imp, claims, prec="year"):
    return {"id": id, "label": label, "year": year, "yearPrecision": prec, "lane": lane, "nodeType": ntype,
            "countries": countries, "importance": imp, "claimIds": claims}


NODES = [
    N("d-bw", "브레턴우즈 체제 (달러-금 고정)", 1944, "economy", "background", ["WORLD", "US"], 2, ["c60-bw-1", "c60-bw-2", "c60-bw-3"]),
    N("d-1967war", "1967년 전쟁과 점령지", 1967, "politics", "background", ["MIDEAST"], 2, ["c60-me-1967"]),
    N("d-res242", "유엔 결의 242호 (땅과 평화의 교환)", 1967, "politics", "background", ["MIDEAST", "WORLD"], 3, ["c60-me-242"]),
    N("d-us-coldwar", "미국: 소련 견제를 위한 이스라엘 지원", 1967, "politics", "goal", ["US", "MIDEAST"], 2, ["c60-me-soviet", "c70-us-why"]),
    N("d-stalemate", "협상 교착 (1971~73)", 1971, "politics", "background", ["MIDEAST", "US"], 3, ["c70-me-stalemate"]),
    N("d-goals", "이집트·시리아의 목표: 영토 회복, 협상 강제", 1973, "politics", "goal", ["MIDEAST"], 2, ["c70-me-goal"]),
    N("d-war1973", "제4차 중동전쟁 (10월 6일)", 1973, "politics", "event", ["MIDEAST"], 1, ["c70-me-goal"]),
    N("d-saudi", "사우디: '석유 무기' 약속", 1973, "politics", "goal", ["MIDEAST"], 3, ["c70-me-saudi"]),
    N("d-airlift", "미국의 이스라엘 무기 공수 (10월 14일~)", 1973, "politics", "trigger", ["US", "MIDEAST"], 2, ["c70-us-airlift"]),
    N("d-embargo", "아랍 산유국의 감산·금수", 1973, "economy", "trigger", ["MIDEAST", "US"], 1, ["c70-embargo-goal", "c70-oapec", "c70-ch-cut"]),
    N("d-price-mech", "공급 충격 → 유가 4배 (작동 원리)", 1974, "economy", "mechanism", ["WORLD"], 1, ["c70-price-mech", "c70-posted-2"]),
    N("d-yushin", "10월 유신 (1972.10.17)", 1972, "politics", "event", ["KR"], 1, ["c70-yushin"]),
    N("d-hci-why", "중화학공업화의 이유: 무역적자·일본 의존·안보", 1973, "industry", "background", ["KR", "US"], 2, ["c70-hci-why"]),
    N("d-hci-fund", "국민투자기금으로 중화학공업 집중 지원", 1973, "industry", "change", ["KR"], 3, ["c70-hci-fund"]),
    N("d-kr-structure", "한국의 석유 의존 산업구조 (1973)", 1973, "economy", "background", ["KR"], 2, ["c70-kr-structure", "c70-kr-consumption", "c60-syn-oil"]),
    N("d-transmit", "유가 → 석유류값 → 생산비·운송비 → 물가", 1974, "economy", "mechanism", ["KR"], 2, ["c70-price-transmit", "c70-mech-cost"]),
    N("d-kr-cpi", "한국 소비자물가 1974년 24%·1975년 25%", 1974, "economy", "outcome", ["KR"], 1, ["c70-kr-cpi", "c70-kr-growth"]),
    N("d-briquette", "연탄파동과 주부들의 항의 (1974)", 1974, "society", "reaction", ["KR"], 2, ["c70-briquette"]),
    N("d-kr-mideast", "중동 건설 진출 (오일머니)", 1975, "industry", "change", ["KR", "MIDEAST"], 2, ["c70-kr-mideast"], prec="era"),
    N("d-kr-2nd", "중화학 구조로 맞은 2차 석유파동: 더 큰 충격", 1980, "economy", "outcome", ["KR"], 2, ["c70-kr-structure"]),
    N("d-ministry", "동력자원부 발족 (1978)", 1978, "politics", "change", ["KR"], 2, ["c70-ministry"]),
    N("d-kori", "고리 1호기 상업운전 (1978)", 1978, "industry", "change", ["KR"], 2, ["c70-kori"]),
    N("d-pop60", "트로트·스탠더드 팝·미8군 무대", 1962, "culture", "background", ["KR", "US"], 2, ["c60-pop-before"], prec="era"),
    N("d-sesibong", "음악감상실 세시봉과 통기타", 1965, "culture", "background", ["KR"], 2, ["c60-sesibong"], prec="era"),
    N("d-us-folk", "미국 포크·팝의 번안 (AFKN·미8군 경로)", 1968, "culture", "background", ["KR", "US"], 3, ["c70-us-folk"], prec="era"),
    N("d-culture-cond", "청년문화의 조건: 도시화·베이비붐·라디오·TV", 1975, "society", "background", ["KR"], 2, ["c70-culture-why"], prec="era"),
    N("d-folk70", "포크 붐: 대학생 싱어송라이터", 1971, "culture", "trend", ["KR"], 1, ["c70-folk", "c70-youth"]),
    N("d-ban1975", "대마초 파동·가요 정화: 금지곡 사태 (1975)", 1975, "culture", "reaction", ["KR"], 1, ["c70-ban"]),
    N("d-campus1977", "첫 MBC 대학가요제 (1977)", 1977, "culture", "change", ["KR"], 2, ["c70-campus"]),
    N("d-sesibong-revival", "세시봉 열풍: 통기타의 재등장 (2010~11)", 2010, "culture", "trend", ["KR"], 2, ["c10-sesibong"]),
    N("d-analog2011", "스마트폰 시대의 아날로그 복고 (2011)", 2011, "flow", "trend", ["KR"], 3, ["c10-analog"]),
]

def E(a, b, rel, ver, claims, note=""):
    return {"from": a, "to": b, "rel": rel, "verification": ver, "claimIds": claims, "note": note}


EDGES = [
    # 1960년 이전 배경 → 1970년대
    E("d-bw", "e70-nixon", "background", "evidenced", ["c60-bw-3", "c70-nixon"], "달러 부채가 금 보유를 넘어서며 고정환율 약속을 지킬 수 없게 됨"),
    E("e70-nixon", "e70-oil", "influence", "interpretation", ["c70-dollar-opec"], "달러 가치 하락으로 같은 양을 팔아도 산유국의 실질 수입이 줄어 공시가격 조정 압력이 됨"),
    # 중동: 영토 → 교착 → 목표 → 전쟁
    E("d-1967war", "d-res242", "cause", "evidenced", ["c60-me-1967", "c60-me-242"], "점령 뒤 유엔이 철수와 평화를 함께 요구"),
    E("d-1967war", "d-stalemate", "background", "interpretation", ["c60-me-1967", "c70-me-stalemate"], "점령지 반환을 둘러싼 협상이 6년간 풀리지 않음"),
    E("d-res242", "d-stalemate", "background", "interpretation", ["c60-me-242", "c70-me-stalemate"], "철수 범위 해석이 엇갈림"),
    E("d-stalemate", "d-goals", "cause", "evidenced", ["c70-me-stalemate"], "외교가 막히자 사다트는 군사적 선택으로 미국을 움직이려 함"),
    E("d-goals", "d-war1973", "cause", "evidenced", ["c70-me-goal"], "잃은 영토 회복과 강대국 압력 유도"),
    E("d-us-coldwar", "d-airlift", "background", "interpretation", ["c60-me-soviet", "c70-us-why"], "소련이 아랍 측을 무장시키는 상황에서 이스라엘의 패배를 막으려 함"),
    E("d-war1973", "d-airlift", "trigger", "evidenced", ["c70-us-airlift"], "전쟁 초반 이스라엘이 밀리자 공수 결정"),
    E("d-saudi", "d-embargo", "influence", "interpretation", ["c70-me-saudi", "c70-embargo-goal"]),
    E("d-war1973", "d-embargo", "background", "evidenced", ["c70-oapec"], "전쟁 중 산유국이 석유를 외교 무기로 사용"),
    E("d-airlift", "d-embargo", "trigger", "evidenced", ["c70-embargo-goal", "c70-us-airlift"], "미국의 공수·지원 요청 직후 금수 선언(국무부 사료실: 공수가 금수를 불렀다)"),
    # 유가가 오르는 원리
    E("d-embargo", "d-price-mech", "cause", "evidenced", ["c70-price-mech"], "증산할 여력이 없는 시장에서 감산 → 가격 급등"),
    E("e70-oil", "d-price-mech", "influence", "evidenced", ["c70-posted-1", "c70-posted-2"], "공시가격 연속 인상"),
    E("claim:c70-tx-spare", "d-price-mech", "background", "evidenced", ["c70-tx-spare", "c70-price-mech"], "미국의 여유 생산능력이 사라져 충격을 흡수할 곳이 없었음"),
    E("d-price-mech", "e70-iea", "cause", "evidenced", ["c70-iea"], "석유 소비국의 공동 대응 기구"),
    # 한국으로 전달
    E("d-kr-structure", "d-transmit", "background", "interpretation", ["c70-kr-structure", "c60-syn-oil"], "석유 수입에 기대는 경제일수록 유가가 물가로 크게 번짐"),
    E("d-price-mech", "d-transmit", "cause", "evidenced", ["c70-price-transmit"], "원유 도입 가격 → 국내 석유류 기준가격"),
    E("d-embargo", "e70-kr-order", "cause", "evidenced", ["c70-ch-cut", "c70-ch-order"], "감산 소식 3주 뒤 정부의 유류절감 명령"),
    E("d-transmit", "d-kr-cpi", "cause", "evidenced", ["c70-kr-cpi", "c70-kr-structure"], "고유가의 직접적인 영향으로 물가상승률 상승"),
    E("d-transmit", "d-briquette", "influence", "interpretation", ["c70-briquette"], "기름값 부담 → 연탄 수요 쏠림 → 공급 부족"),
    E("d-transmit", "e70-emergency", "cause", "interpretation", ["c70-kr-emergency", "c70-ch-emergency"], "물가·생활 안정 대책을 긴급조치 형식으로 발표"),
    E("d-yushin", "e70-emergency", "background", "evidenced", ["c70-yushin", "c70-kr-emergency"], "유신헌법이 대통령에게 긴급조치권을 줌"),
    E("d-price-mech", "d-kr-mideast", "cause", "evidenced", ["c70-kr-mideast"], "오일머니를 얻은 산유국의 기반시설 발주"),
    # 산업구조의 선택과 후속 변화
    E("d-hci-why", "e70-hci", "cause", "evidenced", ["c70-hci-why", "c70-kr-hci"]),
    E("e70-hci", "d-hci-fund", "cause", "evidenced", ["c70-hci-fund"]),
    E("e70-hci", "d-kr-2nd", "background", "interpretation", ["c70-kr-structure"], "석유 의존도가 높은 산업구조로 바뀐 뒤 맞은 2차 충격"),
    E("d-kr-structure", "d-kr-2nd", "sequence", "interpretation", ["c70-kr-structure"], "1차 때는 성장 둔화가 작았다 → 2차 때는 컸다(같은 충격, 다른 구조)"),
    E("d-price-mech", "d-ministry", "influence", "evidenced", ["c70-ministry"], "두 차례 석유위기를 거치며 에너지 전담 부처 발족"),
    E("d-price-mech", "d-kori", "influence", "interpretation", ["c70-kori"], "석유파동이 원전의 출발 원인은 아님(1971년 착공). 에너지원 다원화 정책을 강화한 요인"),
    # 문화: 이전 → 등장 → 수용 조건 → 통제 → 이후 → 재등장
    E("d-pop60", "d-folk70", "background", "evidenced", ["c60-pop-before", "c70-folk"], "트로트·스탠더드 팝 양분 구도를 포크가 재편"),
    E("d-sesibong", "d-folk70", "cause", "evidenced", ["c60-sesibong"], "포크 1세대가 노래를 시작한 무대"),
    E("d-us-folk", "d-folk70", "influence", "evidenced", ["c70-us-folk"], "미국 포크·팝 번안에서 출발(국가 간 전파 경로)"),
    E("d-culture-cond", "d-folk70", "background", "interpretation", ["c70-culture-why"], "도시 청년·대학생 증가와 라디오·TV 보급"),
    E("d-folk70", "tr-t70-youth", "cause", "interpretation", ["c70-folk", "c70-youth"], "통기타·청바지·생맥주 청년문화"),
    E("tr-t70-youth", "e70-taboo", "influence", "interpretation", ["c70-taboo", "c70-longhair"], "정부의 거부 반응: 장발·복장 단속"),
    E("d-yushin", "e70-taboo", "sequence", "interpretation", ["c70-yushin", "c70-taboo"], "유신 선포 넉 달 뒤의 단속 강화. 직접 인과를 말하는 근거는 아직 없음"),
    E("tr-t70-youth", "d-ban1975", "influence", "interpretation", ["c70-ban"], "청년문화를 이끈 가수·노래가 금지 대상이 됨"),
    E("d-ban1975", "d-campus1977", "sequence", "interpretation", ["c70-ban", "c70-campus"], "기성 가수들이 묶인 뒤 대학생 창작곡 경연이 등장. 인과는 확인하지 않음"),
    E("d-folk70", "d-sesibong-revival", "sequence", "evidenced", ["c60-sesibong", "c10-sesibong"], "재등장: 40년 뒤 같은 가수·같은 노래가 다시 유행"),
    E("d-sesibong-revival", "d-analog2011", "similar", "interpretation", ["c10-sesibong", "c10-analog"], "스마트폰 시대의 아날로그 복고와 함께 나타남(재해석)"),
]

# 신호·유행의 생애로도 추적 (패턴 화면·탐색 화면 공통)
SIGNAL = {"id": "sg-folk", "title": "통기타·포크 — 등장·확산·억압·재등장", "originEra": "1960s", "domain": "culture", "steps": [
    {"eraId": "1960s", "label": "음악감상실 세시봉과 통기타", "stage": "등장", "claimIds": ["c60-sesibong"], "nodeId": "d-sesibong"},
    {"eraId": "1970s", "label": "포크 붐: 대학생 싱어송라이터", "stage": "대중화", "claimIds": ["c70-folk"], "nodeId": "d-folk70"},
    {"eraId": "1970s", "label": "대마초 파동·금지곡 사태", "stage": "억압·쇠퇴", "claimIds": ["c70-ban"], "nodeId": "d-ban1975"},
    {"eraId": "2010s", "label": "세시봉 열풍", "stage": "재등장", "claimIds": ["c10-sesibong"], "nodeId": "d-sesibong-revival"},
], "gap": "1980~2000년대 포크의 흐름(언더그라운드·발라드 등)은 아직 연결하지 않았다. 재등장은 확인되지만 일정한 주기는 아니다(사례 1개)."}
