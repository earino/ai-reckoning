"""Pre-specified tests (H1-H4), robustness, alternative benchmarks and variance decomposition.
Outputs data/processed/test_results.json. Planned vs exploratory is recorded on every result."""
from __future__ import annotations
import json
from pathlib import Path
import numpy as np, pandas as pd
import statsmodels.api as sm
import statsmodels.formula.api as smf

ROOT = Path(__file__).resolve().parents[2]
RAW, PROCESSED = ROOT / "data" / "raw", ROOT / "data" / "processed"
RNG = np.random.default_rng(20261120)
AI_ROLES = ["compute", "infrastructure", "energy", "models_apps", "capital"]


def holm(pvals: dict) -> dict:
    items = sorted(pvals.items(), key=lambda kv: kv[1]); m = len(items); out = {}; run = 0
    for i, (k, p) in enumerate(items):
        run = max(run, min(1.0, (m - i) * p)); out[k] = run
    return out


def portfolio_test(ret, tickers_long, tickers_short, est_idx, win_idx, bench):
    """Equal-weight long (minus short) portfolio; market model on est window; CAR on window;
    inference from the portfolio's own estimation-window abnormal returns (handles cross-correlation)."""
    r = ret[tickers_long].mean(axis=1)
    if tickers_short:
        r = r - ret[tickers_short].mean(axis=1)
    est = pd.concat([r.loc[est_idx].rename("y"), ret[bench].loc[est_idx].rename("m")], axis=1).dropna()
    fit = sm.OLS(est["y"], sm.add_constant(est["m"])).fit()
    ar_est = fit.resid
    L = len(win_idx)
    ar_win = r.loc[win_idx] - (fit.params["const"] + fit.params["m"] * ret[bench].loc[win_idx])
    car = float(ar_win.sum())
    raw = float((1 + r.loc[win_idx]).prod() - 1)
    roll = ar_est.rolling(L).sum().dropna()
    se = float(ar_est.std(ddof=2) * np.sqrt(L))
    p_emp = float((np.sum(np.abs(roll) >= abs(car)) + 1) / (len(roll) + 1))
    return {"n_long": len(tickers_long), "n_short": len(tickers_short or []), "benchmark": bench, "window_days": L,
            "raw_return_sum": raw, "beta": float(fit.params["m"]), "beta_se": float(fit.bse["m"]), "car": car, "se": se,
            "t": car / se, "ci95": [car - 1.96 * se, car + 1.96 * se], "p_empirical": p_emp,
            "note": "p_empirical = share of same-length CARs in the estimation window at least as extreme"}


def ols_summary(fit, names=None):
    ci = fit.conf_int()
    return {"n": int(fit.nobs), "r2": float(fit.rsquared), "adj_r2": float(fit.rsquared_adj),
            "coef": {k: {"b": float(fit.params[k]), "se": float(fit.bse[k]), "p": float(fit.pvalues[k]),
                         "ci95": [float(ci.loc[k, 0]), float(ci.loc[k, 1])]} for k in fit.params.index}}


def boot_ci(df, formula, term, n=2000):
    bs = []
    for _ in range(n):
        s = df.sample(len(df), replace=True, random_state=int(RNG.integers(1e9)))
        try:
            bs.append(smf.ols(formula, s).fit().params[term])
        except Exception:
            pass
    return [float(np.percentile(bs, 2.5)), float(np.percentile(bs, 97.5))]


def perm_p(df, col, group_col, a, b, n=10000):
    x = df[df[group_col].isin([a, b])]
    obs = x[x[group_col] == a][col].mean() - x[x[group_col] == b][col].mean()
    vals = x[col].values; na = int((x[group_col] == a).sum()); cnt = 0
    for _ in range(n):
        RNG.shuffle(vals)
        if abs(vals[:na].mean() - vals[na:].mean()) >= abs(obs): cnt += 1
    return float(obs), (cnt + 1) / (n + 1)


def main():
    df = pd.read_json(PROCESSED / "panel.json")
    meta = json.loads((PROCESSED / "panel_meta.json").read_text())
    deg_path = PROCESSED / "graph_node_metrics.json"
    if deg_path.exists():
        g = pd.DataFrame(json.loads(deg_path.read_text())["nodes"])
        g = g[g.ticker.notna()][["ticker", "degree"]]
        df = df.merge(g, on="ticker", how="left"); df["degree"] = df["degree"].fillna(0)
    p = pd.read_parquet(RAW / "prices_all.parquet")
    px = p.pivot(index="date", columns="ticker", values="adj_close").sort_index()
    ret = px.pct_change(fill_method=None)
    days = px.index
    est_idx = days[(days >= meta["estimation_window"][0]) & (days <= meta["estimation_window"][1])]
    wins = {k: days[(days >= v[0]) & (days <= v[1])] for k, v in meta["window_days"].items()}
    full = df[df.history == "full"].copy()
    full["ai"] = (full.tier != "control").astype(int)
    full["log_mcap"] = np.log(full["mcap_prev_week"])
    prim = full[full.tier == "primary"].ticker.tolist(); sec = full[full.tier == "secondary"].ticker.tolist()
    ctrl = full[full.tier == "control"].ticker.tolist()
    ctrl_other = full[full.role == "control_other"].ticker.tolist()
    ret["CTRL_EW"] = ret[ctrl].mean(axis=1); ret["CTRL_OTHER_EW"] = ret[ctrl_other].mean(axis=1)
    R = {"meta": meta, "n_full_history": int(len(full)), "counts": full.groupby(["role", "tier"]).size().reset_index(name="n").to_dict("records")}

    # ---------- descriptive group table ----------
    cols = ["raw_day", "raw_week", "raw_peak", "ar_m1_week", "ar_m2_day", "ar_m2_week", "ar_m2_peak", "ar_m3_week", "ar_m4_week", "beta"]
    grp = full.groupby("role")[cols].agg(["mean", "median"]).round(5)
    R["group_means"] = {r: {c: {"mean": float(grp.loc[r, (c, "mean")]), "median": float(grp.loc[r, (c, "median")])} for c in cols} | {"n": int((full.role == r).sum())}
                        for r in grp.index}
    tg = full.groupby("tier")[cols].agg(["mean", "median"])
    R["tier_means"] = {r: {c: {"mean": float(tg.loc[r, (c, "mean")]), "median": float(tg.loc[r, (c, "median")])} for c in cols} | {"n": int((full.tier == r).sum())}
                       for r in tg.index}

    # ---------- H1: primary AI vs controls (portfolio test) ----------
    H1 = {}
    for w, idx in wins.items():
        H1[w] = {"primary_minus_control_vs_SPY": portfolio_test(ret, prim, ctrl, est_idx, idx, "SPY"),
                 "primary_only_vs_SPY": portfolio_test(ret, prim, None, est_idx, idx, "SPY"),
                 "control_only_vs_SPY": portfolio_test(ret, ctrl, None, est_idx, idx, "SPY")}
    R["H1_planned"] = H1
    # exploratory: alternative benchmarks not dominated by AI names
    alt = {}
    for w, idx in wins.items():
        alt[w] = {"primary_vs_RSP_equal_weight": portfolio_test(ret, prim, None, est_idx, idx, "RSP"),
                  "primary_vs_nonAI_control_portfolio": portfolio_test(ret, prim, None, est_idx, idx, "CTRL_OTHER_EW"),
                  "secondary_vs_nonAI_control_portfolio": portfolio_test(ret, sec, None, est_idx, idx, "CTRL_OTHER_EW"),
                  "SPY_vs_nonAI_control_portfolio": portfolio_test(ret, ["SPY"], None, est_idx, idx, "CTRL_OTHER_EW")}
    R["H1_alt_benchmarks_exploratory"] = alt
    # role portfolios
    roles = {}
    for role in AI_ROLES + ["control_tech", "control_other"]:
        tk = full[full.role == role].ticker.tolist()
        roles[role] = {w: {"vs_SPY": portfolio_test(ret, tk, None, est_idx, idx, "SPY"),
                           "vs_nonAI_controls": portfolio_test(ret, tk, None, est_idx, idx, "CTRL_OTHER_EW") if role != "control_other" else None}
                       for w, idx in wins.items()}
    R["role_portfolios"] = roles
    sub = {}
    for srole, gdf in full[full.tier != "control"].groupby("subrole"):
        if len(gdf) >= 3:
            sub[srole] = {"n": int(len(gdf)), "role": gdf.role.iloc[0], **{c: float(gdf[c].mean()) for c in ["raw_day", "raw_week", "raw_peak", "ar_m2_week", "ar_m2_peak", "beta"]},
                          "week_vs_SPY": portfolio_test(ret, gdf.ticker.tolist(), None, est_idx, wins["week"], "SPY")}
    R["subrole_portfolios_exploratory"] = sub

    # ---------- H3: roles differ (cross-section, HC3) + permutation ----------
    ai = full[full.tier != "control"].copy()
    H3 = {}
    for w in wins:
        fit = smf.ols(f"ar_m2_{w} ~ C(role)", ai).fit(cov_type="HC3")
        fr = smf.ols(f"ar_m2_{w} ~ C(role)", ai).fit()
        f_obs = float(fr.fvalue); y = ai[f"ar_m2_{w}"].values.copy(); cnt = 0
        for _ in range(5000):
            RNG.shuffle(y); a2 = ai.assign(yy=y)
            if smf.ols("yy ~ C(role)", a2).fit().fvalue >= f_obs: cnt += 1
        H3[w] = {"f_stat": f_obs, "p_permutation": (cnt + 1) / 5001, "r2": float(fr.rsquared), "wald_p_hc3": float(fit.f_pvalue) if fit.f_pvalue is not None else None}
    R["H3_planned"] = H3

    # ---------- H2: capex intensity ----------
    h2 = ai.dropna(subset=["capex_to_revenue", "beta", "log_mcap", "momentum_6m"]).copy()
    lo, hi = h2.capex_to_revenue.quantile([0.01, 0.99]); h2["capex_w"] = h2.capex_to_revenue.clip(lo, hi)
    h2["log_capex"] = np.log1p(h2.capex_to_revenue.clip(lower=0)); h2["capex_rank"] = h2.capex_to_revenue.rank(pct=True)
    h2["profit"] = h2.operating_margin.fillna(h2.net_margin).clip(-2, 1)
    h2["lev"] = h2.net_debt_to_assets.fillna(0); h2["neg_ebitda"] = (h2.net_debt_to_ebitda_status == "not_meaningful_negative_ebitda").astype(int)
    H2 = {"n": int(len(h2)), "capex_to_revenue_quantiles": h2.capex_to_revenue.quantile([.1, .25, .5, .75, .9, .99]).round(4).to_dict()}
    ctrl_terms = "beta + log_mcap + momentum_6m + profit + lev + neg_ebitda"
    for dep in ["ar_m2_week", "ar_m3_week", "ar_m2_peak", "ar_m2_day", "raw_week", "raw_peak"]:
        for x in ["capex_w", "log_capex", "capex_rank"]:
            f1 = smf.ols(f"{dep} ~ {x}", h2).fit(cov_type="HC3")
            f2 = smf.ols(f"{dep} ~ {x} + {ctrl_terms}", h2).fit(cov_type="HC3")
            key = f"{dep}__{x}"
            H2[key] = {"bivariate": ols_summary(f1)["coef"][x] | {"r2": float(f1.rsquared)}, "with_controls": ols_summary(f2)}
            if dep in ("ar_m2_week", "ar_m2_peak") and x == "capex_w":
                H2[key]["bootstrap_ci95_with_controls"] = boot_ci(h2, f"{dep} ~ {x} + {ctrl_terms}", x)
                rl = smf.rlm(f"{dep} ~ {x} + {ctrl_terms}", h2, M=sm.robust.norms.HuberT()).fit()
                H2[key]["huber"] = {"b": float(rl.params[x]), "se": float(rl.bse[x])}
    # influence checks on the planned spec
    spec = f"ar_m2_week ~ capex_w + {ctrl_terms}"
    base = smf.ols(spec, h2).fit()
    infl = base.get_influence().cooks_distance[0]
    hypers = ["MSFT", "GOOGL", "AMZN", "META", "ORCL"]
    variants = {"drop_NVDA": h2[h2.ticker != "NVDA"], "drop_hyperscalers": h2[~h2.ticker.isin(hypers)],
                "drop_top10_cooks": h2.iloc[np.argsort(infl)[:-10]], "drop_neoclouds": h2[h2.subrole != "neocloud"],
                "primary_only": h2[h2.tier == "primary"]}
    H2["influence_ar_m2_week"] = {k: ols_summary(smf.ols(spec, v).fit(cov_type="HC3"))["coef"]["capex_w"] | {"n": int(len(v))} for k, v in variants.items()}
    spec_p = f"ar_m2_peak ~ capex_w + {ctrl_terms}"
    H2["influence_ar_m2_peak"] = {k: ols_summary(smf.ols(spec_p, v).fit(cov_type="HC3"))["coef"]["capex_w"] | {"n": int(len(v))} for k, v in variants.items()}
    R["H2_planned"] = H2

    # ---------- H4: graph degree ----------
    if "degree" in full:
        h4 = ai.merge(df[["ticker", "degree"]], on="ticker", how="left") if "degree" not in ai else ai
        h4 = h4.dropna(subset=["beta", "log_mcap"]).copy(); h4["log_degree"] = np.log1p(h4["degree"])
        R["H4_planned"] = {w: ols_summary(smf.ols(f"ar_m2_{w} ~ log_degree + beta + log_mcap", h4).fit(cov_type="HC3")) for w in wins}
        R["H4_planned"]["n_with_edges"] = int((h4.degree > 0).sum())

    # ---------- variance decomposition (the story-change test) ----------
    vd = {}
    for w in wins:
        d = full.dropna(subset=[f"raw_{w}", "beta", "log_mcap", "momentum_6m", "ai_loading"]).copy()
        mk = d[f"mkt_{w}"].iloc[0]
        steps = {"beta_only": f"raw_{w} ~ beta", "ai_flag_only": f"raw_{w} ~ ai", "role_only": f"raw_{w} ~ C(role)",
                 "beta_plus_ai_flag": f"raw_{w} ~ beta + ai", "beta_plus_role": f"raw_{w} ~ beta + C(role)",
                 "beta_size_momentum": f"raw_{w} ~ beta + log_mcap + momentum_6m",
                 "beta_size_momentum_role": f"raw_{w} ~ beta + log_mcap + momentum_6m + C(role)",
                 "beta_plus_ai_loading": f"raw_{w} ~ beta_m5 + ai_loading",
                 "beta_ai_loading_role": f"raw_{w} ~ beta_m5 + ai_loading + C(role)"}
        o = {"n": int(len(d)), "market_return": float(mk)}
        for k, fm in steps.items():
            ft = smf.ols(fm, d).fit(cov_type="HC3")
            o[k] = {"r2": float(ft.rsquared), "adj_r2": float(ft.rsquared_adj)}
            if k in ("beta_only", "beta_plus_ai_flag", "beta_plus_ai_loading"):
                o[k]["coef"] = ols_summary(ft)["coef"]
        # strict CAPM prediction with slope fixed at the market return (no fitting)
        pred = d["beta"] * mk
        o["capm_fixed_slope"] = {"r2_vs_mean": float(1 - ((d[f"raw_{w}"] - pred) ** 2).sum() / ((d[f"raw_{w}"] - d[f"raw_{w}"].mean()) ** 2).sum()),
                                 "mean_error": float((d[f"raw_{w}"] - pred).mean()), "corr": float(d[f"raw_{w}"].corr(pred))}
        # within AI names only
        a = d[d.ai == 1]
        o["within_ai"] = {"n": int(len(a)), "beta_only_r2": float(smf.ols(f"raw_{w} ~ beta", a).fit().rsquared),
                          "beta_plus_role_r2": float(smf.ols(f"raw_{w} ~ beta + C(role)", a).fit().rsquared),
                          "beta_plus_ai_loading_r2": float(smf.ols(f"raw_{w} ~ beta_m5 + ai_loading", a).fit().rsquared)}
        vd[w] = o
    R["variance_decomposition"] = vd

    # ---------- alternative exposure definitions (cross-section of abnormal returns) ----------
    ex = {}
    for w in wins:
        d = full.dropna(subset=[f"ar_m2_{w}", "ai_loading"]).copy()
        ex[w] = {"E1_tier": ols_summary(smf.ols(f"ar_m2_{w} ~ C(tier, Treatment('control'))", d).fit(cov_type="HC3")),
                 "E4_ai_loading": ols_summary(smf.ols(f"ar_m2_{w} ~ ai_loading", d).fit(cov_type="HC3")),
                 "E1_tier_m3": ols_summary(smf.ols(f"ar_m3_{w} ~ C(tier, Treatment('control'))", d).fit(cov_type="HC3")),
                 "E1_tier_m4_sector": ols_summary(smf.ols(f"ar_m4_{w} ~ C(tier, Treatment('control'))", d).fit(cov_type="HC3")),
                 "E1_tier_m1_mktadj": ols_summary(smf.ols(f"ar_m1_{w} ~ C(tier, Treatment('control'))", d).fit(cov_type="HC3"))}
        obs, pp = perm_p(d, f"ar_m2_{w}", "tier", "primary", "control")
        ex[w]["perm_primary_vs_control_ar_m2"] = {"diff": obs, "p": pp}
    R["exposure_definitions"] = ex

    # ---------- Nvidia and other outliers ----------
    full["z_week"] = full["ar_m2_week"] / full["ar_m2_week_se"]; full["z_day"] = full["ar_m2_day"] / full["ar_m2_day_se"]; full["z_peak"] = full["ar_m2_peak"] / full["ar_m2_peak_se"]
    oc = ["ticker", "name", "role", "raw_day", "ar_m2_day", "z_day", "raw_week", "ar_m2_week", "z_week", "raw_peak", "ar_m2_peak", "z_peak", "beta"]
    R["outliers"] = {"most_negative_week": full.nsmallest(12, "z_week")[oc].to_dict("records"), "most_positive_week": full.nlargest(12, "z_week")[oc].to_dict("records"),
                     "most_negative_peak": full.nsmallest(12, "z_peak")[oc].to_dict("records"), "most_positive_peak": full.nlargest(12, "z_peak")[oc].to_dict("records"),
                     "most_negative_day": full.nsmallest(12, "z_day")[oc].to_dict("records"),
                     "NVDA": full[full.ticker == "NVDA"][oc].to_dict("records")[0]}
    # ---------- aggregate market value ----------
    mv = df.dropna(subset=["mcap_peak", "mcap_event"]).copy()
    mv["ai"] = mv.tier != "control"
    agg = lambda x: {"n": int(len(x)), "peak": float(x.mcap_peak.sum()), "prev_week": float(x.mcap_prev_week.sum()), "prev_day": float(x.mcap_prev_day.sum()), "event": float(x.mcap_event.sum())}
    R["market_value"] = {"all": agg(mv), "ai": agg(mv[mv.ai]), "controls": agg(mv[~mv.ai]), "by_role": {r: agg(x) for r, x in mv.groupby("role")},
                         "top_losers_week_usd": mv.assign(loss=mv.mcap_event - mv.mcap_prev_week).nsmallest(10, "loss")[["ticker", "loss"]].to_dict("records"),
                         "top_losers_peak_usd": mv.assign(loss=mv.mcap_event - mv.mcap_peak).nsmallest(10, "loss")[["ticker", "loss"]].to_dict("records"),
                         "basis": "close x diluted weighted-average shares from the latest pre-event filing; approximate; excludes companies without SEC share data"}
    # ---------- multiplicity over the planned family ----------
    fam = {"H1_day": H1["day"]["primary_minus_control_vs_SPY"]["p_empirical"], "H1_week": H1["week"]["primary_minus_control_vs_SPY"]["p_empirical"],
           "H1_peak": H1["peak"]["primary_minus_control_vs_SPY"]["p_empirical"],
           "H2_week": H2["ar_m2_week__capex_w"]["with_controls"]["coef"]["capex_w"]["p"], "H3_week": H3["week"]["p_permutation"]}
    if "H4_planned" in R: fam["H4_week"] = R["H4_planned"]["week"]["coef"]["log_degree"]["p"]
    R["planned_family"] = {"raw_p": fam, "holm_p": holm(fam)}
    (PROCESSED / "test_results.json").write_text(json.dumps(R, indent=1, default=float))

    pr = lambda *a: print(*a)
    pr("FF proxy corr", meta["factor_proxy_validation"]["corr"])
    for w in wins:
        h = H1[w]["primary_minus_control_vs_SPY"]; pr(f"H1 {w}: L-S raw {h['raw_return_sum']:.3f} beta {h['beta']:.2f} CAR {h['car']:.3f} se {h['se']:.3f} p_emp {h['p_empirical']:.3f}")
        for k, v in alt[w].items(): pr(f"   alt {k}: raw {v['raw_return_sum']:.3f} beta {v['beta']:.2f} CAR {v['car']:.3f} se {v['se']:.3f} p {v['p_empirical']:.3f}")
    for r, v in roles.items():
        pr(r, {w: (round(v[w]['vs_SPY']['car'], 3), round(v[w]['vs_SPY']['p_empirical'], 3), round(v[w]['vs_nonAI_controls']['car'], 3) if v[w]['vs_nonAI_controls'] else None) for w in wins})
    pr("H3", H3)
    for k in ["ar_m2_week__capex_w", "ar_m2_peak__capex_w", "ar_m3_week__capex_w", "raw_week__capex_w", "ar_m2_week__capex_rank", "ar_m2_peak__capex_rank"]:
        c = H2[k]["with_controls"]["coef"][k.split("__")[1]]; pr("H2", k, "n", H2["n"], "biv", {a: round(b, 4) for a, b in H2[k]["bivariate"].items() if a in ("b", "p", "r2")}, "ctrl b %.4f se %.4f p %.3f" % (c["b"], c["se"], c["p"]), H2[k].get("bootstrap_ci95_with_controls"))
    pr("H2 influence wk", {k: (round(v["b"], 3), round(v["p"], 3)) for k, v in H2["influence_ar_m2_week"].items()})
    pr("H2 influence pk", {k: (round(v["b"], 3), round(v["p"], 3)) for k, v in H2["influence_ar_m2_peak"].items()})
    for w in wins:
        o = vd[w]; pr("VD", w, {k: round(v["r2"], 3) for k, v in o.items() if isinstance(v, dict) and "r2" in v}, "capm", {k: round(v, 3) for k, v in o["capm_fixed_slope"].items()}, "withinAI", o["within_ai"])
        pr("   beta_only coef", {k: round(v["b"], 4) for k, v in o["beta_only"]["coef"].items()}, "| +ai", {k: (round(v["b"], 4), round(v["p"], 3)) for k, v in o["beta_plus_ai_flag"]["coef"].items()}, "| ai_loading", {k: (round(v["b"], 4), round(v["p"], 3)) for k, v in o["beta_plus_ai_loading"]["coef"].items()})
        pr("   tiers ar_m2", {k: (round(v["b"], 4), round(v["p"], 3)) for k, v in ex[w]["E1_tier"]["coef"].items()}, "perm", ex[w]["perm_primary_vs_control_ar_m2"])
        pr("   tiers m3", {k: (round(v["b"], 4), round(v["p"], 3)) for k, v in ex[w]["E1_tier_m3"]["coef"].items()}, " m4", {k: (round(v["b"], 4), round(v["p"], 3)) for k, v in ex[w]["E1_tier_m4_sector"]["coef"].items()})
    pr("NVDA", {k: (round(v, 3) if isinstance(v, float) else v) for k, v in R["outliers"]["NVDA"].items()})
    pr("neg week", [(o["ticker"], round(o["ar_m2_week"], 3), round(o["z_week"], 1)) for o in R["outliers"]["most_negative_week"]])
    pr("pos week", [(o["ticker"], round(o["ar_m2_week"], 3), round(o["z_week"], 1)) for o in R["outliers"]["most_positive_week"]])
    pr("neg peak", [(o["ticker"], round(o["ar_m2_peak"], 3), round(o["z_peak"], 1)) for o in R["outliers"]["most_negative_peak"]])
    pr("pos peak", [(o["ticker"], round(o["ar_m2_peak"], 3), round(o["z_peak"], 1)) for o in R["outliers"]["most_positive_peak"]])
    pr("MV", {k: {a: round(b / 1e12, 2) for a, b in v.items() if a != "n"} for k, v in R["market_value"].items() if k in ("all", "ai", "controls")})
    pr("family", R["planned_family"])


if __name__ == "__main__":
    main()
