"""반복 주기 탐색 — 성장률 시계열에 대한 계산 (빌드 때 실행, 결과를 seed.json에 저장).

원칙
- 주기를 미리 정하지 않는다. 시차 1~20년 전체를 같은 방식으로 검사한다.
- 여러 시차를 동시에 보면 우연히 기준선을 넘는 값이 생기므로, '가장 큰 값'에 대한 순열 검정으로 다시 확인한다.
- 추세(한국 성장률의 장기 하락)가 가짜 상관을 만들지 않도록 직선 추세를 뺀 값(잔차)으로 계산한다.
- 난수 시드를 고정해 같은 결과가 재현되게 한다.
"""
import numpy as np
import indicators as ind

N_PERM = 4000
MAX_LAG = 20


def _series():
    g = next(i for i in ind.INDICATORS if i["id"] == "gdp-growth")
    out = {}
    for s in g["series"]:
        t = np.array([int(x) for x, _ in s["points"]])
        y = np.array([float(v) for _, v in s["points"]])
        out[s["country"]] = (t, y, s["label"])
    return out


def _detrend(t, y):
    return y - np.polyval(np.polyfit(t, y, 1), t)


def _acf(r, k):
    return float(np.corrcoef(r[:-k], r[k:])[0, 1])


def _per(x):
    x = x - x.mean()
    p = np.abs(np.fft.rfft(x)) ** 2
    return p[1:]


def analyse():
    rng = np.random.default_rng(20261111)
    res = {"method": [], "countries": [], "crossLag": [], "params": {"permutations": N_PERM, "maxLag": MAX_LAG, "seed": 20261111}}
    S = _series()
    for c, (t, y, label) in S.items():
        n = len(y)
        r = _detrend(t, y)
        L = min(MAX_LAG, n // 2 - 1)
        ac = [_acf(r, k) for k in range(1, L + 1)]
        band = 1.96 / np.sqrt(n)
        over = [k for k, a in zip(range(1, L + 1), ac) if abs(a) > band]
        # 여러 시차 동시 검정: 섞은 자료에서 '가장 큰 |자기상관|'의 분포
        obs_max = max(abs(a) for a in ac)
        null_max = np.array([max(abs(_acf(p, k)) for k in range(1, L + 1)) for p in (rng.permutation(r) for _ in range(N_PERM))])
        p_acf = float((null_max >= obs_max).mean())
        # 주기도(스펙트럼) 최대 봉우리
        P = _per(r)
        f = np.fft.rfftfreq(n)[1:]
        k = int(P.argmax())
        share = float(P[k] / P.sum())
        null_sh = np.array([(lambda q: q.max() / q.sum())(_per(rng.permutation(r))) for _ in range(N_PERM)])
        p_spec = float((null_sh >= share).mean())
        # 평균 변화점 1개 (오차제곱합 최소)
        best = None
        for s in range(5, n - 5):
            sse = ((y[:s] - y[:s].mean()) ** 2).sum() + ((y[s:] - y[s:].mean()) ** 2).sum()
            if best is None or sse < best[0]:
                best = (sse, s)
        s = best[1]
        sse0 = ((y - y.mean()) ** 2).sum()
        neg = t[y < 0].tolist()
        # 민감도: 기준선을 넘은 시차가 마이너스 성장 해(위기) 몇 쌍 때문인지 — 그 해가 낀 쌍을 빼고 다시 계산
        sens = []
        for k in over:
            ta = t[:-k]
            m = ~np.isin(ta, t[y < 0]) & ~np.isin(ta + k, t[y < 0])
            sens.append({"lag": k, "r": round(ac[k - 1], 3), "rWithoutCrisisPairs": round(float(np.corrcoef(r[:-k][m], r[k:][m])[0, 1]), 3),
                         "pairsUsed": int(m.sum()), "crisisPairs": [[int(a), int(a + k)] for a in ta if a in t[y < 0] and a + k in t[y < 0]]})
        res["countries"].append({
            "sensitivity": sens,
            "country": c, "label": label, "from": int(t[0]), "to": int(t[-1]), "n": n,
            "acf": [round(a, 3) for a in ac], "band": round(float(band), 3), "lagsOverBand": over,
            "maxAbsAcf": round(obs_max, 3), "pMaxAcf": round(p_acf, 3),
            "spectralPeakYears": round(float(1 / f[k]), 1), "spectralShare": round(share, 3), "pSpectral": round(p_spec, 3),
            "changePoint": {"year": int(t[s]), "meanBefore": round(float(y[:s].mean()), 2), "meanAfter": round(float(y[s:].mean()), 2),
                            "varianceExplained": round(float(1 - best[0] / sse0), 3)},
            "negativeYears": neg, "negativeGaps": np.diff(neg).tolist(),
        })
    # 국가 간 시차 상관 (겹치는 기간, 각자 추세 제거)
    def lagcorr(a, b, lags=range(-3, 4)):
        (ta, ya, _), (tb, yb, _) = S[a], S[b]
        lo, hi = max(ta[0], tb[0]), min(ta[-1], tb[-1])
        ma, mb = (ta >= lo) & (ta <= hi), (tb >= lo) & (tb <= hi)
        ra, rb = _detrend(ta[ma], ya[ma]), _detrend(tb[mb], yb[mb])
        out = []
        for L in lags:  # L>0: b가 L년 뒤에 a를 따라감
            x, z = (ra[:-L], rb[L:]) if L > 0 else (ra[-L:], rb[:len(rb) + L]) if L < 0 else (ra, rb)
            out.append({"lag": L, "r": round(float(np.corrcoef(x, z)[0, 1]), 3), "n": int(len(x))})
        return {"a": a, "b": b, "from": int(lo), "to": int(hi), "values": out, "band": round(1.96 / np.sqrt(hi - lo + 1), 3)}
    res["crossLag"] = [lagcorr("US", "KR"), lagcorr("US", "JP"), lagcorr("JP", "KR")]
    res["method"] = [
        "자료: 흐름 화면의 GDP 성장률(FRED 표, 세계은행 원자료). 연간 값만 사용.",
        "추세 제거: 나라별로 직선 추세를 뺀 뒤 계산(장기 하락이 가짜 상관을 만들지 않게).",
        f"자기상관: 시차 1~{MAX_LAG}년. 기준선 ±1.96/√n은 시차 하나만 볼 때의 95% 범위.",
        f"여러 시차 동시 검정: 값을 무작위로 섞은 자료 {N_PERM}개에서 '가장 큰 |자기상관|'이 실제보다 크거나 같은 비율(p).",
        "주기도: 푸리에 변환의 가장 큰 봉우리가 전체 변동에서 차지하는 비율을 섞은 자료와 비교(p).",
        "변화점: 평균이 한 번 바뀐다고 가정하고 오차제곱합이 가장 작아지는 해. 원인을 말해 주지는 않는다.",
    ]
    return res


if __name__ == "__main__":
    import json
    print(json.dumps(analyse(), ensure_ascii=False, indent=1))
