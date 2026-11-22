"""Write versioned, browser-consumable publication artifacts to public/data.
Every file carries the same metadata envelope. Raw licensed prices are NOT published; only derived statistics."""
from __future__ import annotations
import json, math
from datetime import datetime, timezone
from pathlib import Path
import numpy as np, pandas as pd

ROOT = Path(__file__).resolve().parents[2]
RAW, PROCESSED, PROV, OUT = ROOT / "data" / "raw", ROOT / "data" / "processed", ROOT / "data" / "provenance", ROOT / "public" / "data"
SCHEMA_VERSION, METHOD_VERSION, CUTOFF = "1.0.0", "2026.11-a", "2026-11-20"
MODEL_DEVS = {"priv:openai", "ANT", "SPCX"}


def clean(o, nd=5):
    if isinstance(o, dict): return {k: clean(v, nd) for k, v in o.items()}
    if isinstance(o, (list, tuple)): return [clean(v, nd) for v in o]
    if isinstance(o, (float, np.floating)):
        if math.isnan(o) or math.isinf(o): return None
        return round(float(o), nd) if abs(o) < 1e6 else float(round(o))
    if isinstance(o, (np.integer,)): return int(o)
    if o is pd.NaT: return None
    return o


def envelope(name, units, data, extra=None):
    doc = {"schema_version": SCHEMA_VERSION, "artifact": name, "generated_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
           "source_cutoff_date": CUTOFF, "methodology_version": METHOD_VERSION, "units": units,
           "missing_value_convention": "null = value not available. A sibling *_status or *_state field distinguishes not_reported, not_applicable, not_meaningful, undisclosed and estimated. Zero is always a reported zero.",
           **(extra or {}), "data": clean(data)}
    (OUT / f"{name}.json").write_text(json.dumps(doc, separators=(",", ":")))
    return doc


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    panel = pd.read_json(PROCESSED / "panel.json")
    meta = json.loads((PROCESSED / "panel_meta.json").read_text())
    T = json.loads((PROCESSED / "test_results.json").read_text())
    gs = json.loads((PROCESSED / "graph_summary.json").read_text())
    gnodes = json.loads((PROCESSED / "graph_node_metrics.json").read_text())["nodes"]
    gedges = json.loads((PROCESSED / "graph_edges.json").read_text())
    ident = {r["ticker"]: r for r in json.loads((PROCESSED / "identity_sec.json").read_text())["resolved"]}
    pmeta = pd.read_csv(RAW / "price_meta.csv").set_index("ticker")
    timeline = json.loads((PROV / "event_timeline.json").read_text())
    gdeg = {n["id"]: n for n in gnodes}
    N = lambda v: None if v is None or (isinstance(v, float) and math.isnan(v)) else v

    # ---------- companies ----------
    comps = []
    for _, r in panel.iterrows():
        i = ident.get(r.ticker, {})
        comps.append({"ticker": r.ticker, "name": r["name"], "role": r.role, "subrole": r.subrole, "tier": r.tier, "classification_basis": r.basis,
                      "history": r.history, "first_trade_in_data": r.first_trade_in_data,
                      "exchange": pmeta.loc[r.ticker, "exchange"] if r.ticker in pmeta.index else None,
                      "cik": i.get("cik"), "sec_name": i.get("sec_name"), "sic": i.get("sic"), "sic_description": i.get("sic_description"),
                      "domicile_state_or_country": i.get("state_of_incorporation"), "sector_etf": r.sector_etf,
                      "sec_url": f"https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK={i['cik']}" if i.get("cik") else None,
                      "identity_status": "sec_verified" if i.get("cik") else "no_sec_xbrl_identity",
                      "mcap_peak": N(r.mcap_peak), "mcap_prev_week": N(r.mcap_prev_week), "mcap_prev_day": N(r.mcap_prev_day), "mcap_event": N(r.mcap_event),
                      "mcap_status": "approximate" if N(r.mcap_event) else "not_available",
                      "graph_degree": gdeg.get(r.ticker, {}).get("degree", 0)})
    envelope("companies", {"mcap_*": "USD, approximate: close x diluted weighted-average shares from the latest pre-event filing"}, comps,
             {"dropped_before_analysis": meta["dropped"], "counts": {"total": len(comps), "full_history": int((panel.history == "full").sum()), "limited_history": int((panel.history == "limited").sum())}})

    # ---------- return series (derived, rebased) ----------
    p = pd.read_parquet(RAW / "prices_all.parquet")
    px = p.pivot(index="date", columns="ticker", values="adj_close").sort_index()
    win = px.loc["2026-09-30":CUTOFF]
    peak = pd.Timestamp(meta["peak_date"])
    series = {}
    for t in list(panel.ticker) + ["SPY", "QQQ", "RSP", "SMH", "IGV", "XLU", "XLP", "^GSPC", "^IXIC", "^NDX", "^DJI", "^RUT"]:
        s = win[t]
        base = s.get(peak)
        if base is None or pd.isna(base):
            base = s.dropna().iloc[0]  # limited history: rebased to first available close
        series[t] = [None if pd.isna(v) else round(float(v / base - 1) * 100, 2) for v in s]
    vix = p[p.ticker == "^VIX"].set_index("date").close.loc["2026-09-30":CUTOFF]
    tnx = p[p.ticker == "^TNX"].set_index("date").close.loc["2026-09-30":CUTOFF]
    envelope("prices", {"series": "percent change in adjusted close since the S&P 500 record close (peak_date); limited-history tickers are rebased to their first close in the window",
                         "vix": "index level", "ten_year_yield": "percent"},
             {"dates": [str(d.date()) for d in win.index], "peak_date": meta["peak_date"], "series": series,
              "vix": [round(float(v), 2) for v in vix], "ten_year_yield": [round(float(v), 3) for v in tnx]},
             {"license_note": "Derived from Yahoo Finance daily adjusted closes, which are not redistributable. Only rebased percent changes are published. Run research/ingest/prices.py to re-acquire the raw data."})
    idx = {}
    cl = p.pivot(index="date", columns="ticker", values="close").sort_index()
    for t, nm in {"^GSPC": "S&P 500", "^IXIC": "Nasdaq Composite", "^NDX": "Nasdaq-100", "^DJI": "Dow Jones Industrial Average", "^RUT": "Russell 2000"}.items():
        s = cl[t].dropna(); pk = s.loc["2026-08-01":].idxmax()
        idx[t] = {"name": nm, "close_event": float(s.iloc[-1]), "day_pct": float((s.iloc[-1] / s.iloc[-2] - 1) * 100), "week_pct": float((s.iloc[-1] / s.loc["2026-11-13"] - 1) * 100),
                  "record_close": float(s.loc[pk]), "record_date": str(pk.date()), "from_record_pct": float((s.iloc[-1] / s.loc[pk] - 1) * 100),
                  "ytd_pct": float((s.iloc[-1] / s.loc[:"2025-12-31"].iloc[-1] - 1) * 100)}
    sectors = {t: {"day_pct": float((px[t].iloc[-1] / px[t].iloc[-2] - 1) * 100), "week_pct": float((px[t].iloc[-1] / px[t].loc["2026-11-13"] - 1) * 100),
                   "from_peak_pct": float((px[t].iloc[-1] / px[t].loc[peak] - 1) * 100)}
               for t in ["SPY", "RSP", "QQQ", "IWM", "XLK", "XLC", "XLY", "XLP", "XLE", "XLF", "XLV", "XLI", "XLB", "XLRE", "XLU", "SMH", "IGV"]}

    # ---------- financials ----------
    fcols = ["revenue", "operating_income", "net_income", "operating_cash_flow", "capex", "interest_expense", "cash", "total_debt", "net_debt", "ebitda", "total_assets",
             "capex_to_revenue", "capex_to_revenue_status", "capex_to_ocf", "capex_to_ocf_status", "capex_growth", "revenue_growth", "fcf_margin", "operating_margin",
             "net_margin", "gross_margin", "net_debt_to_ebitda", "net_debt_to_ebitda_status", "net_debt_to_assets", "price_to_sales", "ev_to_sales", "ev_to_ebitda",
             "debt_basis", "fin_period_end", "fin_filed", "fin_basis", "fin_currency", "fin_accession", "fin_stale"]
    fins = []
    for _, r in panel.iterrows():
        d = {"ticker": r.ticker, **{c: N(r.get(c)) for c in fcols}}
        d["status"] = "ok" if N(r.get("revenue")) is not None else "no_xbrl_financials"
        if d["fin_accession"] and N(r.get("cik")):
            acc = d["fin_accession"]; cik = str(int(r.cik))
            d["filing_url"] = f"https://www.sec.gov/Archives/edgar/data/{cik}/{acc.replace('-', '')}/{acc}-index.htm"
        fins.append(d)
    envelope("financials", {"flows": "trailing twelve months in reporting currency (fin_currency), from SEC XBRL facts filed on or before 2026-11-13",
                            "ratios": "unitless; valuation ratios only for USD reporters", "capex": "cash purchases of property and equipment; excludes finance leases"}, fins)

    # ---------- event study ----------
    ecols = ["beta", "beta_se", "r2_m2", "vol_est", "ai_loading", "ai_loading_se", "momentum_6m", "n_est", "volume_ratio_event", "realized_vol_30d_pre"]
    es = []
    for _, r in panel.iterrows():
        d = {"ticker": r.ticker, "history": r.history, **{c: N(r.get(c)) for c in ecols}}
        for w in ("day", "week", "peak"):
            d[w] = {"raw": N(r.get(f"raw_{w}")), "market": N(r.get(f"mkt_{w}")), "sector": N(r.get(f"sec_{w}")),
                    "m1_market_adjusted": N(r.get(f"ar_m1_{w}")), "m2_market_model": N(r.get(f"ar_m2_{w}")), "m2_se": N(r.get(f"ar_m2_{w}_se")),
                    "m3_four_factor": N(r.get(f"ar_m3_{w}")), "m3_se": N(r.get(f"ar_m3_{w}_se")), "m4_sector_adjusted": N(r.get(f"ar_m4_{w}")),
                    "expected_m2": N(r.get(f"expected_m2_{w}"))}
        es.append(d)
    envelope("event-study", {"returns": "fractions (0.05 = 5%); abnormal returns are observed minus model-expected, not causal effects",
                             "beta": "slope on SPY daily returns in the estimation window"}, es,
             {"windows": meta["window_days"], "estimation_window": meta["estimation_window"], "peak_date": meta["peak_date"], "ai_basket": meta["ai_basket"],
              "factor_proxy_validation": meta["factor_proxy_validation"], "indices": clean(idx), "sector_etfs": clean(sectors)})

    # ---------- models ----------
    envelope("models", {"car": "cumulative abnormal return, fraction", "p_empirical": "share of same-length windows in the estimation period at least as extreme"},
             {k: T[k] for k in ["n_full_history", "counts", "group_means", "tier_means", "H1_planned", "H1_alt_benchmarks_exploratory", "role_portfolios",
                                "subrole_portfolios_exploratory", "H3_planned", "H2_planned", "H4_planned", "variance_decomposition", "exposure_definitions",
                                "outliers", "market_value", "planned_family"]})

    # ---------- relationships ----------
    envelope("relationships", {"amounts": "USD; announced_amount as disclosed; comparable_amount only for contract totals and ceilings; never summed across status classes",
                               "layout": "y = layer of the money chain (capital 4, models 3, infrastructure 2, compute 1, energy 0, x2.2); x,z = golden-angle spiral, more counterparties nearer the axis"},
             {"nodes": gnodes, "edges": gedges, "summary": gs})

    # ---------- scenarios ----------
    inflow_md = {}
    for e in gedges:
        if e["cancelled"] or not e["comparable_amount"] or e["status"] not in ("completed", "ongoing"): continue
        if e["source"] in MODEL_DEVS and e["type"] != "equity_investment":
            inflow_md.setdefault(e["target"], []).append({"edge": e["id"], "payer": e["source"], "amount": e["comparable_amount"], "amount_state": e["amount_state"]})
    sc = []
    for _, r in panel.iterrows():
        if r.tier == "control": continue
        g = gdeg.get(r.ticker, {})
        md = inflow_md.get(r.ticker, [])
        usd = r.get("fin_currency") == "USD"
        row = {"ticker": r.ticker, "usd_reporter": bool(usd), "revenue": N(r.get("revenue")), "capex": N(r.get("capex")), "operating_cash_flow": N(r.get("operating_cash_flow")),
               "ebitda": N(r.get("ebitda")), "total_debt": N(r.get("total_debt")), "interest_expense": N(r.get("interest_expense")),
               "ev_to_sales": N(r.get("ev_to_sales")), "price_to_sales": N(r.get("price_to_sales")), "fcf_margin": N(r.get("fcf_margin")),
               "net_debt_to_ebitda": N(r.get("net_debt_to_ebitda")), "net_debt_to_ebitda_status": N(r.get("net_debt_to_ebitda_status")),
               "model_developer_backlog": sum(m["amount"] for m in md), "model_developer_backlog_edges": md,
               "top_payer": g.get("top_payer"), "top_payer_share": g.get("top_payer_share_of_firm_inflow"), "firm_inflow_disclosed": g.get("inflow_firm", 0)}
        # dominant documented vulnerability (rule-based, descriptive)
        rev, capex, ocf = row["revenue"], row["capex"], row["operating_cash_flow"]
        flags = []
        if capex is not None and ocf is not None and r.get("capex_to_revenue_status") == "ok" and capex > max(ocf, 0) and capex / max(rev or 1, 1) > 0.10:
            flags.append("financing")
        elif row["net_debt_to_ebitda"] is not None and row["net_debt_to_ebitda"] > 4: flags.append("financing")
        if rev and row["model_developer_backlog"] > rev: flags.append("demand_concentration")
        if row["ev_to_sales"] is not None and row["ev_to_sales"] > 10 and (row["fcf_margin"] or 0) > 0: flags.append("valuation")
        row["vulnerability_flags"] = flags
        sc.append(row)
    presets = {"optimistic": {"capex_cut": 0.0, "rate_rise_bp": 50, "fulfilment": 1.0, "refinance_share": 0.25},
               "baseline": {"capex_cut": 0.15, "rate_rise_bp": 150, "fulfilment": 0.75, "refinance_share": 0.5},
               "downside": {"capex_cut": 0.40, "rate_rise_bp": 300, "fulfilment": 0.5, "refinance_share": 1.0}}
    formulas = {
        "funding_gap": "max(0, capex x (1 - capex_cut) - operating_cash_flow). Direct. Cash the company must raise outside its operations to keep spending at the assumed level.",
        "extra_interest": "total_debt x refinance_share x rate_rise_bp / 10000. Direct. Added yearly interest if that share of debt reprices; shown against EBITDA when EBITDA is positive.",
        "backlog_at_risk": "model_developer_backlog x (1 - fulfilment). Modeled, one step only: the disclosed contract value owed by OpenAI, Anthropic or SpaceX/xAI that would not be paid. Not propagated further.",
        "range": "Low/high bounds use refinance_share 0.25..1.0 and fulfilment +/- 0.15 around the chosen value.",
        "flags": "financing: capex above operating cash flow with capex/revenue > 10%, or net debt/EBITDA > 4. demand_concentration: disclosed model-developer backlog above one year of revenue. valuation: EV/sales > 10 with positive free cash flow."}
    envelope("scenarios", {"amounts": "USD (reporting currency for non-USD reporters, flagged usd_reporter=false)", "rates": "basis points"},
             {"companies": sc, "presets": presets, "formulas": formulas,
              "disclaimer": "Hypothetical arithmetic on reported financials and disclosed contracts. Not a forecast of prices, defaults or contagion."})

    # ---------- sources ----------
    srcs, seen = [], set()
    def add(url, publisher, title, kind, used_for):
        if not url or url in seen: return
        seen.add(url); srcs.append({"id": f"s{len(srcs) + 1:04d}", "url": url, "publisher": publisher, "title": title, "kind": kind, "used_for": used_for, "accessed": "2026-11-22"})
    add("https://data.sec.gov/api/xbrl/companyfacts/", "US Securities and Exchange Commission", "EDGAR XBRL company facts API", "primary_data", "financials, identity")
    add("https://data.sec.gov/submissions/", "US Securities and Exchange Commission", "EDGAR submissions API", "primary_data", "identity (CIK, SIC, exchange)")
    add("https://query1.finance.yahoo.com/v8/finance/chart/", "Yahoo Finance", "Daily chart endpoint (adjusted closes, volumes)", "market_data_restricted", "returns; raw data not redistributed")
    add("https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/data_library.html", "Kenneth R. French Data Library", "Fama/French daily factors and momentum factor", "primary_data", "validation of ETF factor proxies")
    for ev in timeline:
        for s in ev["sources"]: add(s.get("url"), s.get("publisher"), s.get("title"), "chronology", f"timeline {ev['date']}")
    for e in gedges:
        add(e["source_url"], e.get("source_publisher"), e["description"][:110], "relationship_" + (e.get("source_type") or "news"), f"edge {e['id']}")
        add(e.get("secondary_url"), None, "Secondary source for edge " + e["id"], "relationship_secondary", f"edge {e['id']}")
    for f in fins:
        if f.get("filing_url"): add(f["filing_url"], "US Securities and Exchange Commission", f"{f['ticker']} filing {f['fin_accession']} (period ending {f['fin_period_end']})", "sec_filing", f"financials {f['ticker']}")
    envelope("sources", {}, srcs, {"counts": pd.Series([s["kind"] for s in srcs]).value_counts().to_dict()})
    envelope("timeline", {}, timeline)

    # ---------- story numbers: every number quoted in the narrative ----------
    full = panel[panel.history == "full"]
    usd = panel[(panel.fin_currency == "USD")]
    byrole = {}
    for role, g in usd.groupby("role"):
        g2 = g[g.capex_to_revenue_status == "ok"]
        byrole[role] = {"n": int(len(g)), "revenue": float(g.revenue.sum()), "operating_income": float(g.operating_income.sum()), "operating_cash_flow": float(g.operating_cash_flow.sum()),
                        "capex": float(g2.capex.sum()), "n_capex": int(len(g2)), "median_capex_to_revenue": float(g2.capex_to_revenue.median()) if len(g2) else None,
                        "median_fcf_margin": float(g2.fcf_margin.median()) if len(g2) else None, "n_capex_above_ocf": int((g2.capex > g2.operating_cash_flow).sum())}
    hyp = usd[usd.subrole == "hyperscaler"]; neo = usd[usd.subrole == "neocloud"]
    def one(t, c): return N(panel.loc[panel.ticker == t, c].iloc[0])
    mvr = T["market_value"]
    S = {
        "indices": idx, "sectors": sectors, "peak_date": meta["peak_date"], "n_companies": len(comps), "n_full": int(len(full)), "n_ai": int((full.tier != "control").sum()),
        "n_controls": int((full.tier == "control").sum()), "n_limited": int((panel.history == "limited").sum()),
        "mv": {"ai_day": mvr["ai"]["event"] - mvr["ai"]["prev_day"], "ctrl_day": mvr["controls"]["event"] - mvr["controls"]["prev_day"],
               "ai_week": mvr["ai"]["event"] - mvr["ai"]["prev_week"], "ctrl_week": mvr["controls"]["event"] - mvr["controls"]["prev_week"],
               "ai_peak": mvr["ai"]["event"] - mvr["ai"]["peak"], "ctrl_peak": mvr["controls"]["event"] - mvr["controls"]["peak"],
               "all_peak": mvr["all"]["event"] - mvr["all"]["peak"], "all_day": mvr["all"]["event"] - mvr["all"]["prev_day"], "all_week": mvr["all"]["event"] - mvr["all"]["prev_week"],
               "ai_at_peak": mvr["ai"]["peak"], "n_ai": mvr["ai"]["n"], "n_ctrl": mvr["controls"]["n"],
               "compute_peak": mvr["by_role"]["compute"]["event"] - mvr["by_role"]["compute"]["peak"],
               "infrastructure_peak": mvr["by_role"]["infrastructure"]["event"] - mvr["by_role"]["infrastructure"]["peak"],
               "by_role_peak": {r: v["event"] - v["peak"] for r, v in mvr["by_role"].items()},
               "nvda_peak": mvr["top_losers_peak_usd"][0]["loss"], "nvda_week": mvr["top_losers_week_usd"][0]["loss"]},
        "group_means": T["group_means"], "tier_means": T["tier_means"],
        "vd": {w: {"beta_only_r2": T["variance_decomposition"][w]["beta_only"]["r2"], "role_only_r2": T["variance_decomposition"][w]["role_only"]["r2"],
                   "ai_flag_only_r2": T["variance_decomposition"][w]["ai_flag_only"]["r2"], "beta_plus_role_r2": T["variance_decomposition"][w]["beta_plus_role"]["r2"],
                   "beta_plus_ai_r2": T["variance_decomposition"][w]["beta_plus_ai_flag"]["r2"],
                   "slope": T["variance_decomposition"][w]["beta_only"]["coef"]["beta"]["b"], "intercept": T["variance_decomposition"][w]["beta_only"]["coef"]["Intercept"]["b"],
                   "market": T["variance_decomposition"][w]["market_return"], "ai_coef": T["variance_decomposition"][w]["beta_plus_ai_flag"]["coef"]["ai"],
                   "within_ai_beta_r2": T["variance_decomposition"][w]["within_ai"]["beta_only_r2"], "n": T["variance_decomposition"][w]["n"]} for w in ("day", "week", "peak")},
        "h1": {w: T["H1_planned"][w]["primary_minus_control_vs_SPY"] for w in ("day", "week", "peak")},
        "h1_alt": {w: {"primary_vs_nonai": T["H1_alt_benchmarks_exploratory"][w]["primary_vs_nonAI_control_portfolio"], "spy_vs_nonai": T["H1_alt_benchmarks_exploratory"][w]["SPY_vs_nonAI_control_portfolio"],
                       "primary_vs_rsp": T["H1_alt_benchmarks_exploratory"][w]["primary_vs_RSP_equal_weight"]} for w in ("day", "week", "peak")},
        "h2": {"n": T["H2_planned"]["n"], "week": T["H2_planned"]["ar_m2_week__capex_w"]["with_controls"]["coef"]["capex_w"], "week_boot": T["H2_planned"]["ar_m2_week__capex_w"]["bootstrap_ci95_with_controls"],
               "peak": T["H2_planned"]["ar_m2_peak__capex_w"]["with_controls"]["coef"]["capex_w"], "raw_week_bivariate": T["H2_planned"]["raw_week__capex_w"]["bivariate"],
               "raw_week_with_controls": T["H2_planned"]["raw_week__capex_w"]["with_controls"]["coef"]["capex_w"], "influence_week": T["H2_planned"]["influence_ar_m2_week"]},
        "h3": T["H3_planned"], "h4": {w: T["H4_planned"][w]["coef"]["log_degree"] for w in ("day", "week", "peak")}, "family": T["planned_family"],
        "role_car": {r: {w: {"car": v[w]["vs_SPY"]["car"], "ci95": v[w]["vs_SPY"]["ci95"], "p": v[w]["vs_SPY"]["p_empirical"], "beta": v[w]["vs_SPY"]["beta"], "raw": v[w]["vs_SPY"]["raw_return_sum"]}
                         for w in ("day", "week", "peak")} for r, v in T["role_portfolios"].items()},
        "nvda": T["outliers"]["NVDA"], "ant": {"close_d1": 97.17, "close_event": one("ANT", "close_event"), "raw_day": one("ANT", "raw_day")},
        "fin": {"by_role": byrole, "hyperscaler_capex": float(hyp.capex.sum()), "hyperscaler_ocf": float(hyp.operating_cash_flow.sum()), "hyperscaler_revenue": float(hyp.revenue.sum()),
                "neocloud_capex": float(neo.capex.sum()), "neocloud_ocf": float(neo.operating_cash_flow.sum()), "neocloud_revenue": float(neo.revenue.sum()),
                "nvda_revenue": one("NVDA", "revenue"), "nvda_operating_income": one("NVDA", "operating_income"), "nvda_capex_to_revenue": one("NVDA", "capex_to_revenue"),
                "orcl_capex": one("ORCL", "capex"), "orcl_revenue": one("ORCL", "revenue"), "orcl_ocf": one("ORCL", "operating_cash_flow"), "orcl_capex_to_revenue": one("ORCL", "capex_to_revenue"),
                "crwv_capex": one("CRWV", "capex"), "crwv_revenue": one("CRWV", "revenue"), "crwv_capex_to_revenue": one("CRWV", "capex_to_revenue"),
                "msft_capex": one("MSFT", "capex"), "meta_capex": one("META", "capex"), "googl_capex": one("GOOGL", "capex"), "amzn_capex": one("AMZN", "capex")},
        "graph": {"n_edges": gs["n_live_edges"], "n_nodes": gs["n_nodes"], "n_universe_nodes": gs["n_universe_nodes"], "edges_by_status": gs["edges_by_status"],
                  "edges_with_amount": gs["edges_with_amount"], "edges_with_realized": gs["edges_with_realized_amount"], "realized_total": gs["realized_total_usd"],
                  "totals": gs["amount_totals_by_status_usd"], "firm_total": gs["concentration"]["firm_commitment_total_usd"], "share_top1": gs["concentration"]["share_touching_top1"],
                  "share_top2": gs["concentration"]["share_touching_top2"], "share_top5": gs["concentration"]["share_touching_top5"], "payer_shares": gs["concentration"]["payer_shares"],
                  "recipient_shares": gs["concentration"]["recipient_shares"], "touch": gs["concentration"]["top_nodes_by_firm_amount_touched"],
                  "n_reciprocal_pairs": len(gs["reciprocal_pairs"]), "degree_top": gs["degree_top"], "by_confidence": gs["edges_by_confidence"], "by_source_type": gs["edges_by_source_type"]},
        "graph_sensitivity": (lambda E: {k: {"total": sum(x["comparable_amount"] for x in v), "n": len(v),
                                      "share_top2": sum(x["comparable_amount"] for x in v if {"priv:openai", "ANT"} & {x["source"], x["target"]}) / sum(x["comparable_amount"] for x in v)}
                                  for k, v in {"all": E, "high_confidence_only": [x for x in E if x["confidence"] == "high"],
                                               "primary_sources_only": [x for x in E if x["source_type"] in ("sec_filing", "issuer_release")],
                                               "excluding_equity": [x for x in E if x["type"] != "equity_investment"]}.items()})(
            [x for x in gedges if not x["cancelled"] and x["comparable_amount"] and x["status"] in ("completed", "ongoing")]),
        "scenario_flags": pd.Series([f for r in sc for f in r["vulnerability_flags"]]).value_counts().to_dict(),
        "n_sources": len(srcs), "n_timeline": len(timeline), "ff": meta["factor_proxy_validation"],
    }
    envelope("story-numbers", {"mv": "USD", "returns": "fractions unless suffixed _pct"}, S)
    envelope("publication-metadata", {}, {"title": "The AI Reckoning", "research_cutoff": CUTOFF, "published": "2026-11-22", "last_updated": "2026-11-22",
             "updates": "static; this dataset does not update automatically", "artifacts": ["companies", "prices", "financials", "relationships", "event-study", "models", "scenarios", "sources", "timeline", "story-numbers"],
             "coverage": {"companies": len(comps), "sources": len(srcs), "relationships": gs["n_live_edges"], "timeline_events": len(timeline)},
             "ai_assistance": "Research, extraction, code, analysis and prose were produced by an AI system (Claude) and checked by automated tests. See About."})
    import os
    print({f: os.path.getsize(OUT / f) // 1024 for f in sorted(os.listdir(OUT))}, "sources", len(srcs))
    print(json.dumps(clean({k: S[k] for k in ["mv", "scenario_flags"]}), indent=0)[:1400])
    print(json.dumps(clean(S["fin"]), indent=0)[:2600])


if __name__ == "__main__":
    main()
