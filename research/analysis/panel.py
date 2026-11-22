"""Build the analysis panel: returns, pre-event betas, abnormal returns per window and model, fundamentals ratios."""
from __future__ import annotations
import json
from pathlib import Path
import numpy as np, pandas as pd
import statsmodels.api as sm

ROOT = Path(__file__).resolve().parents[2]
RAW, PROCESSED = ROOT / "data" / "raw", ROOT / "data" / "processed"
EVENT = pd.Timestamp("2026-11-20")
WEEK_START_PREV_CLOSE = pd.Timestamp("2026-11-13")
EST_END = pd.Timestamp("2026-09-30")
EST_DAYS, MIN_OBS = 250, 120
ADR_SHARES_PER_UNIT = {"TSM": 5.0}          # one ADR = 5 ordinary shares
SHARE_MULT = {"BRK-B": 1500.0}              # XBRL share count is in Class A equivalents
SECTOR_ETF = {  # subrole -> SPDR sector ETF used for the sector-adjusted model (M4)
    "accelerators": "XLK", "memory": "XLK", "fabrication": "XLK", "equipment": "XLK", "design": "XLK", "networking": "XLK", "servers": "XLK",
    "hyperscaler": "XLK", "neocloud": "XLK", "datacenter_reit": "XLRE", "generation": "XLU", "nuclear_dev": "XLU", "utility": "XLU",
    "grid_equipment": "XLI", "cooling": "XLI", "construction": "XLI", "model_developer": "XLK", "ai_application": "XLK",
    "enterprise_software": "XLK", "consumer_platform": "XLK", "alt_manager": "XLF", "bdc": "XLF", "bank": "XLF", "investor": "XLF",
    "analog_semis": "XLK", "it_services": "XLK", "payments": "XLF", "internet": "XLK", "media": "XLC", "software": "XLK", "hardware": "XLK",
    "telecom": "XLC", "health": "XLV", "staples": "XLP", "discretionary": "XLY", "oil_gas": "XLE", "financials": "XLF",
    "industrials": "XLI", "materials": "XLB", "real_estate": "XLRE",
}
SECTOR_OVERRIDE = {"GOOGL": "XLC", "META": "XLC", "AMZN": "XLY", "TSLA": "XLY", "CCJ": "XLE", "LEU": "XLE", "NFLX": "XLC"}


def load_returns():
    p = pd.read_parquet(RAW / "prices_all.parquet")
    px = p.pivot(index="date", columns="ticker", values="adj_close").sort_index()
    close = p.pivot(index="date", columns="ticker", values="close").sort_index()
    vol = p.pivot(index="date", columns="ticker", values="volume").sort_index()
    return px, close, vol, px.pct_change(fill_method=None)


def factor_frame(ret):
    f = pd.DataFrame({"MKT": ret["SPY"], "SMB": ret["IWM"] - ret["SPY"], "HML": ret["IWD"] - ret["IWF"], "MOM": ret["MTUM"] - ret["SPY"]})
    return f


def validate_factor_proxies(f):
    """Correlate ETF proxies with Fama-French daily factors over the estimation window."""
    def read(name, cols):
        rows = []
        for line in open(RAW / "ff" / name):
            parts = [x.strip() for x in line.split(",")]
            if len(parts) == len(cols) + 1 and parts[0].isdigit() and len(parts[0]) == 8:
                rows.append([pd.Timestamp(parts[0])] + [float(x) / 100 for x in parts[1:]])
        return pd.DataFrame(rows, columns=["date"] + cols).set_index("date")
    ff = read("F-F_Research_Data_Factors_daily.csv", ["MktRF", "SMB", "HML", "RF"]).join(read("F-F_Momentum_Factor_daily.csv", ["MOM"]))
    win = f.loc[:EST_END].tail(EST_DAYS).join(ff, rsuffix="_ff", how="inner")
    out = {"n_days": int(len(win)), "window": [str(win.index[0].date()), str(win.index[-1].date())],
           "corr": {"MKT": float(win["MKT"].corr(win["MktRF"] + win["RF"])),
                    "SMB": float(win["SMB"].corr(win["SMB_ff"])), "HML": float(win["HML"].corr(win["HML_ff"])),
                    "MOM": float(win["MOM"].corr(win["MOM_ff"]))}}
    return out


def main():
    uni = pd.read_csv(ROOT / "research" / "curated" / "universe.csv")
    px, close, vol, ret = load_returns()
    days = px.index
    peak_date = px["^GSPC"].loc["2026-09-01":].idxmax()
    est_idx = days[days <= EST_END][-EST_DAYS:]
    f = factor_frame(ret)
    ffv = validate_factor_proxies(f)
    windows = {
        "day": days[days == EVENT],
        "week": days[(days > WEEK_START_PREV_CLOSE) & (days <= EVENT)],
        "peak": days[(days > peak_date) & (days <= EVENT)],
    }
    # leave-one-out AI basket (primary compute names with full history)
    basket_names = [t for t in uni[(uni.role == "compute") & (uni.tier == "primary")].ticker if ret[t].loc[est_idx].notna().sum() >= MIN_OBS]
    fund = {r["ticker"]: r for r in json.loads((PROCESSED / "fundamentals_raw.json").read_text())["records"]}
    rows, dropped = [], []
    for _, u in uni.iterrows():
        t = u.ticker
        r = ret[t] if t in ret else pd.Series(dtype=float)
        if t not in px or pd.isna(px[t].get(EVENT, np.nan)):
            dropped.append({"ticker": t, "name": u["name"], "reason": "no price on 2026-11-20 (delisted or acquired before the event)"})
            continue
        rec = {"ticker": t, "name": u["name"], "role": u.role, "subrole": u.subrole, "tier": u.tier, "basis": u.basis}
        est = pd.concat([r.loc[est_idx].rename("y"), f.loc[est_idx]], axis=1).dropna()
        full_hist = len(est) >= MIN_OBS and u.tier != "limited_history"
        rec["history"] = "full" if full_hist else "limited"
        rec["n_est"] = int(len(est))
        rec["first_trade_in_data"] = str(px[t].first_valid_index().date())
        sec = SECTOR_OVERRIDE.get(t, SECTOR_ETF[u.subrole]); rec["sector_etf"] = sec
        # raw window returns (close to close, adjusted)
        for w, idx in windows.items():
            start = days[days < idx[0]][-1]
            if pd.isna(px[t].get(start, np.nan)):
                rec[f"raw_{w}"] = None; continue
            rec[f"raw_{w}"] = float(px[t][idx[-1]] / px[t][start] - 1)
            rec[f"mkt_{w}"] = float(px["SPY"][idx[-1]] / px["SPY"][start] - 1)
            rec[f"sec_{w}"] = float(px[sec][idx[-1]] / px[sec][start] - 1)
            rec[f"ar_m1_{w}"] = rec[f"raw_{w}"] - rec[f"mkt_{w}"]
            rec[f"ar_m4_{w}"] = rec[f"raw_{w}"] - rec[f"sec_{w}"]
        if full_hist:
            m2 = sm.OLS(est["y"], sm.add_constant(est[["MKT"]])).fit()
            m3 = sm.OLS(est["y"], sm.add_constant(est[["MKT", "SMB", "HML", "MOM"]])).fit()
            rec.update(alpha_m2=float(m2.params["const"]), beta=float(m2.params["MKT"]), beta_se=float(m2.bse["MKT"]),
                       resid_sd_m2=float(np.sqrt(m2.scale)), r2_m2=float(m2.rsquared),
                       betas_m3={k: float(v) for k, v in m3.params.items()}, resid_sd_m3=float(np.sqrt(m3.scale)), r2_m3=float(m3.rsquared),
                       vol_est=float(est["y"].std() * np.sqrt(252)))
            # AI-basket loading, orthogonal to the market, leave-one-out
            others = [b for b in basket_names if b != t]
            bk = ret[others].loc[est.index].mean(axis=1)
            bk_orth = sm.OLS(bk, sm.add_constant(est["MKT"])).fit().resid
            m5 = sm.OLS(est["y"], sm.add_constant(pd.DataFrame({"MKT": est["MKT"], "AI": bk_orth}))).fit()
            rec.update(ai_loading=float(m5.params["AI"]), ai_loading_se=float(m5.bse["AI"]), beta_m5=float(m5.params["MKT"]))
            for w, idx in windows.items():
                if rec.get(f"raw_{w}") is None: continue
                L = len(idx); rr = r.loc[idx]; ff_ = f.loc[idx]
                # daily abnormal returns summed (CAR); the alpha is included
                ar2 = rr - (m2.params["const"] + m2.params["MKT"] * ff_["MKT"])
                ar3 = rr - (m3.params["const"] + (ff_[["MKT", "SMB", "HML", "MOM"]] * m3.params[["MKT", "SMB", "HML", "MOM"]]).sum(axis=1))
                # prediction-error variance: residual variance x L x (1 + L/T) plus beta-estimation term
                xm = ff_["MKT"].sum()
                se2 = np.sqrt(m2.scale * L * (1 + L / len(est)) + (m2.bse["MKT"] * xm) ** 2)
                rec[f"ar_m2_{w}"] = float(ar2.sum()); rec[f"ar_m2_{w}_se"] = float(se2)
                rec[f"ar_m3_{w}"] = float(ar3.sum()); rec[f"ar_m3_{w}_se"] = float(np.sqrt(m3.scale * L * (1 + L / len(est))))
                rec[f"expected_m2_{w}"] = float((m2.params["const"] + m2.params["MKT"] * ff_["MKT"]).sum())
            p6a, p6b = px[t].asof(pd.Timestamp("2026-03-31")), px[t].asof(EST_END)
            rec["momentum_6m"] = float(p6b / p6a - 1) if p6a and not pd.isna(p6a) else None
        # market value and fundamentals
        fr = fund.get(t)
        sh = None
        if fr:
            s = fr.get("shares_diluted_wa") or fr.get("shares")
            if s: sh = s["value"] / ADR_SHARES_PER_UNIT.get(t, 1.0) * SHARE_MULT.get(t, 1.0)
        for lab, dt in (("peak", peak_date), ("prev_week", WEEK_START_PREV_CLOSE), ("prev_day", days[days < EVENT][-1]), ("event", EVENT)):
            c = close[t].get(dt, np.nan)
            rec[f"mcap_{lab}"] = float(c * sh) if sh and not pd.isna(c) else None
        rec["mcap_basis"] = None if not sh else "close x diluted weighted-average shares from latest filing (approximation)"
        rec["close_event"] = float(close[t][EVENT])
        if fr:
            F = {k: (v or {}).get("value") for k, v in fr["flows"].items()}
            Fp = {k: (v or {}).get("prior_year_value") for k, v in fr["flows"].items()}
            S = {k: (v or {}).get("value") for k, v in fr["stocks"].items()}
            revm = fr["flows"]["revenue"] or {}
            rec.update(fin_period_end=revm.get("period_end"), fin_filed=revm.get("filed"), fin_basis=revm.get("basis"),
                       fin_currency=revm.get("unit"), fin_accession=revm.get("accession"), cik=fr["cik"])
            rev, capex, ocf, oi, ni = F["revenue"], F["capex"], F["operating_cash_flow"], F["operating_income"], F["net_income"]
            da = F["depreciation_amortization"]
            fin_role = u.role == "capital" or u.subrole in ("financials", "payments", "bank")
            rec.update(revenue=rev, capex=capex, operating_cash_flow=ocf, operating_income=oi, net_income=ni,
                       interest_expense=F["interest_expense"], cash=S["cash"], total_assets=S["total_assets"])
            ok = lambda x: x is not None and not pd.isna(x)
            pos = lambda x: ok(x) and x > 0
            rec["capex_to_revenue"] = capex / rev if ok(capex) and pos(rev) and not fin_role else None
            rec["capex_to_revenue_status"] = ("not_applicable_financial" if fin_role else "ok" if ok(capex) and pos(rev) else "not_reported")
            rec["capex_to_ocf"] = capex / ocf if ok(capex) and pos(ocf) and not fin_role else None
            rec["capex_to_ocf_status"] = ("not_applicable_financial" if fin_role else "not_reported" if not (ok(capex) and ok(ocf))
                                           else "ok" if ocf > 0 else "not_meaningful_negative_ocf")
            rec["capex_growth"] = capex / Fp["capex"] - 1 if ok(capex) and pos(Fp["capex"]) and not fin_role else None
            rec["revenue_growth"] = rev / Fp["revenue"] - 1 if pos(rev) and pos(Fp["revenue"]) else None
            rec["fcf_margin"] = (ocf - capex) / rev if ok(ocf) and ok(capex) and pos(rev) and not fin_role else None
            rec["operating_margin"] = oi / rev if ok(oi) and pos(rev) else None
            rec["net_margin"] = ni / rev if ok(ni) and pos(rev) else None
            gp = F["gross_profit"] if ok(F["gross_profit"]) else (rev - F["cost_of_revenue"] if ok(rev) and ok(F["cost_of_revenue"]) else None)
            rec["gross_margin"] = gp / rev if ok(gp) and pos(rev) and not fin_role else None
            if ok(S["debt_lt_total"]):
                debt, dbasis = S["debt_lt_total"] + (S["debt_short"] or 0), "long-term debt total tag + short-term borrowings"
            elif ok(S["debt_lt_noncurrent"]):
                debt, dbasis = S["debt_lt_noncurrent"] + (S["debt_lt_current"] or 0) + (S["debt_short"] or 0), "noncurrent + current long-term debt + short-term"
            else:
                debt, dbasis = None, None
            rec["total_debt"], rec["debt_basis"] = debt, dbasis
            ebitda = oi + da if ok(oi) and ok(da) else None
            rec["ebitda"] = ebitda
            nd = debt - (S["cash"] or 0) - (S["short_term_investments"] or 0) if ok(debt) else None
            rec["net_debt"] = nd
            rec["net_debt_to_ebitda"] = nd / ebitda if ok(nd) and pos(ebitda) and not fin_role else None
            rec["net_debt_to_ebitda_status"] = ("not_applicable_financial" if fin_role else "not_reported" if not (ok(nd) and ok(ebitda))
                                                 else "ok" if ebitda > 0 else "not_meaningful_negative_ebitda")
            rec["net_debt_to_assets"] = nd / S["total_assets"] if ok(nd) and pos(S["total_assets"]) and not fin_role else None
            usd = revm.get("unit") == "USD"
            mc = rec["mcap_prev_week"]
            rec["price_to_sales"] = mc / rev if mc and pos(rev) and usd else None
            rec["ev_to_sales"] = (mc + nd) / rev if mc and ok(nd) and pos(rev) and usd and not fin_role else None
            rec["ev_to_ebitda"] = (mc + nd) / ebitda if mc and ok(nd) and pos(ebitda) and usd and not fin_role else None
            rec["fin_stale"] = bool(revm.get("period_end", "0") < "2025-12-01")
        rows.append(rec)
    df = pd.DataFrame(rows)
    # volume and realised volatility
    for t in df.ticker:
        df.loc[df.ticker == t, "volume_event"] = vol[t].get(EVENT, np.nan)
        df.loc[df.ticker == t, "volume_ratio_event"] = vol[t].get(EVENT, np.nan) / vol[t].loc[est_idx].mean() if vol[t].loc[est_idx].mean() else np.nan
        df.loc[df.ticker == t, "realized_vol_30d_pre"] = ret[t].loc[:WEEK_START_PREV_CLOSE].tail(30).std() * np.sqrt(252)
    df.to_json(PROCESSED / "panel.json", orient="records", indent=1)
    meta = {"event_date": str(EVENT.date()), "peak_date": str(peak_date.date()), "estimation_window": [str(est_idx[0].date()), str(est_idx[-1].date())],
            "window_days": {k: [str(v[0].date()), str(v[-1].date()), len(v)] for k, v in windows.items()},
            "factor_proxy_validation": ffv, "ai_basket": basket_names, "dropped": dropped}
    (PROCESSED / "panel_meta.json").write_text(json.dumps(meta, indent=1))
    print(json.dumps(meta, indent=1)[:1500])
    print(df.groupby(["role", "tier"])[["raw_day", "raw_week", "raw_peak", "ar_m2_week", "beta"]].agg(["mean"]).round(3).to_string())
    print(df.history.value_counts().to_string())
    big = df.dropna(subset=["mcap_event"]).sort_values("mcap_event", ascending=False).head(12)
    print(big[["ticker", "mcap_event", "raw_week", "beta", "capex_to_revenue"]].round(3).to_string())
    tot = df[["mcap_peak", "mcap_prev_week", "mcap_event"]].dropna().sum()
    print("universe mcap sums (USD tn):", (tot / 1e12).round(2).to_dict())


if __name__ == "__main__":
    main()
