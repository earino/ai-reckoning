"""Data and analysis tests. They run on the published artifacts; tests that need raw licensed data skip when it is absent."""
import json
from pathlib import Path
import numpy as np
import pytest
from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[2]
PUB, SCHEMAS, RAW = ROOT / "public" / "data", ROOT / "data" / "schemas", ROOT / "data" / "raw"
NAMES = ["companies", "prices", "financials", "relationships", "event-study", "models", "scenarios", "sources", "timeline", "story-numbers", "publication-metadata"]


def load(name):
    return json.loads((PUB / f"{name}.json").read_text())


def schema(name):
    return Draft202012Validator(json.loads((SCHEMAS / f"{name}.schema.json").read_text()))


@pytest.mark.parametrize("name", NAMES)
def test_envelope(name):
    doc = load(name)
    errs = list(schema("envelope").iter_errors(doc))
    assert not errs, errs[:3]
    assert doc["source_cutoff_date"] == "2026-11-20"


def test_companies_schema_and_identity():
    comps = load("companies")["data"]
    v = schema("company")
    for c in comps:
        assert not list(v.iter_errors(c)), c["ticker"]
    tickers = [c["ticker"] for c in comps]
    assert len(tickers) == len(set(tickers)), "duplicate tickers"
    ciks = [c["cik"] for c in comps if c["cik"]]
    assert len(ciks) == len(set(ciks)), "two tickers map to one issuer"
    assert 150 <= len(comps) <= 230
    for c in comps:  # limited-history names are never in models
        if c["tier"] == "limited_history":
            assert c["history"] == "limited"


def test_no_lookahead_in_financials():
    fins = load("financials")["data"]
    filed = [f["fin_filed"] for f in fins if f.get("fin_filed")]
    assert filed and max(filed) <= "2026-11-13"
    for f in fins:  # ratio states are explicit, never silent zeros
        if f["capex_to_revenue"] is None and f["status"] == "ok":
            assert f["capex_to_revenue_status"] in ("not_applicable_financial", "not_reported")
        if f["net_debt_to_ebitda"] is not None:
            assert f["ebitda"] > 0


def test_estimation_window_precedes_peak():
    es = load("event-study")
    assert es["estimation_window"][1] == "2026-09-30" < es["peak_date"] == "2026-10-06"
    assert es["windows"]["day"][:2] == ["2026-11-20", "2026-11-20"]
    assert es["windows"]["week"][0] == "2026-11-16" and es["windows"]["week"][2] == 5
    for k, v in es["factor_proxy_validation"]["corr"].items():
        assert v > 0.6, f"factor proxy {k} poorly correlated with Fama-French"


def test_index_moves_match_reported_closes():
    idx = load("story-numbers")["data"]["indices"]
    assert abs(idx["^GSPC"]["close_event"] - 6910.39) < 0.01 and abs(idx["^GSPC"]["day_pct"] + 3.70) < 0.01
    assert abs(idx["^IXIC"]["close_event"] - 22617.73) < 0.01 and abs(idx["^IXIC"]["day_pct"] + 5.28) < 0.01
    assert abs(idx["^GSPC"]["record_close"] - 7818.93) < 0.01


def _ols_r2(x, y):
    x, y = np.asarray(x, float), np.asarray(y, float)
    b = np.polyfit(x, y, 1)
    return 1 - ((y - np.polyval(b, x)) ** 2).sum() / ((y - y.mean()) ** 2).sum(), b[0]


@pytest.mark.parametrize("w", ["day", "week", "peak"])
def test_beta_r2_reproduces_from_published_rows(w):
    rows = [r for r in load("event-study")["data"] if r["history"] == "full" and r["beta"] is not None and r[w]["raw"] is not None]
    r2, slope = _ols_r2([r["beta"] for r in rows], [r[w]["raw"] for r in rows])
    n = load("story-numbers")["data"]["vd"][w]
    # the published model drops a few rows with missing size/momentum, so allow a small tolerance
    assert abs(r2 - n["beta_only_r2"]) < 0.02 and abs(slope - n["slope"]) < 0.004
    assert n["beta_only_r2"] > n["ai_flag_only_r2"]


def test_abnormal_return_identity():
    for r in load("event-study")["data"]:
        for w in ("day", "week", "peak"):
            s = r[w]
            if s["raw"] is not None and s["m1_market_adjusted"] is not None:
                assert abs(s["raw"] - s["market"] - s["m1_market_adjusted"]) < 2e-5
    # market-model CAR equals summed daily abnormal returns: for one day, raw - expected
    for r in load("event-study")["data"]:
        s = r["day"]
        if s["m2_market_model"] is not None:
            assert abs(s["raw"] - s["expected_m2"] - s["m2_market_model"]) < 2e-5


def test_market_value_sums_reproduce():
    comps = load("companies")["data"]
    ok = [c for c in comps if c["mcap_peak"] is not None and c["mcap_event"] is not None]
    ai = sum(c["mcap_event"] - c["mcap_peak"] for c in ok if c["tier"] != "control")
    ctrl = sum(c["mcap_event"] - c["mcap_peak"] for c in ok if c["tier"] == "control")
    mv = load("story-numbers")["data"]["mv"]
    assert abs(ai - mv["ai_peak"]) / abs(mv["ai_peak"]) < 1e-6 and abs(ctrl - mv["ctrl_peak"]) / abs(mv["ctrl_peak"]) < 1e-6
    assert mv["ai_day"] < 0 and abs(mv["ai_day"]) > 1e12  # "trillions were repriced" is supported


def test_edges_schema_sources_and_no_mixed_totals():
    rel = load("relationships")["data"]
    v = schema("edge")
    ids = {n["id"] for n in rel["nodes"]}
    for e in rel["edges"]:
        assert not list(v.iter_errors(e)), e["id"]
        assert e["source"] in ids and e["target"] in ids and e["source"] != e["target"]
        if e["comparable_amount"] is not None:
            assert e["amount_state"] in ("contract_total", "ceiling")
        if e["amount_state"] in ("stake_value_not_cash", "annual_run_rate", "undisclosed"):
            assert e["comparable_amount"] is None
    live = [e for e in rel["edges"] if not e["cancelled"]]
    tot = {}
    for e in live:
        if e["comparable_amount"]:
            tot.setdefault(e["status"], {}).setdefault(e["amount_state"], 0)
            tot[e["status"]][e["amount_state"]] += e["comparable_amount"]
    pub = rel["summary"]["amount_totals_by_status_usd"]
    for st, d in tot.items():
        for k, val in d.items():
            assert abs(val - pub[st][k]) < 1
    firm = sum(e["comparable_amount"] for e in live if e["comparable_amount"] and e["status"] in ("completed", "ongoing"))
    assert abs(firm - rel["summary"]["concentration"]["firm_commitment_total_usd"]) < 1
    hubs = sum(e["comparable_amount"] for e in live if e["comparable_amount"] and e["status"] in ("completed", "ongoing") and {"priv:openai", "ANT"} & {e["source"], e["target"]})
    assert abs(hubs / firm - rel["summary"]["concentration"]["share_touching_top2"]) < 1e-4


def test_layout_is_deterministic_and_layered():
    nodes = load("relationships")["data"]["nodes"]
    ys = {}
    for n in nodes:
        ys.setdefault(n["role"], set()).add(n["y"])
    assert all(len(v) == 1 for v in ys.values()), "one height per layer"


def test_planned_family_and_holm():
    fam = load("models")["data"]["planned_family"]
    raw, holm = fam["raw_p"], fam["holm_p"]
    assert set(raw) == {"H1_day", "H1_week", "H1_peak", "H2_week", "H3_week", "H4_week"}
    assert all(holm[k] >= raw[k] - 1e-12 for k in raw)
    order = sorted(raw, key=raw.get)
    assert abs(holm[order[0]] - min(1, 6 * raw[order[0]])) < 1e-4  # published values are rounded


def test_scenario_arithmetic_and_presets():
    sc = load("scenarios")["data"]
    assert set(sc["presets"]) == {"optimistic", "baseline", "downside"}
    for c in sc["companies"]:
        assert abs(c["model_developer_backlog"] - sum(e["amount"] for e in c["model_developer_backlog_edges"])) < 1
        assert set(c["vulnerability_flags"]) <= {"financing", "demand_concentration", "valuation"}


def test_sources_cover_every_edge_and_event():
    urls = {s["url"] for s in load("sources")["data"]}
    for e in load("relationships")["data"]["edges"]:
        assert e["source_url"] in urls
    for ev in load("timeline")["data"]:
        assert ev["sources"], ev["title"]
        assert ev["confidence"] in ("high", "medium", "low")


def test_ttm_identity_against_raw_sec_facts():
    path = RAW / "sec" / "facts" / "0001045810.json"
    if not path.exists():
        pytest.skip("raw SEC facts not present (re-run research/ingest/sec.py)")
    facts = json.loads(path.read_text())["facts"]["us-gaap"]["Revenues"]["units"]["USD"]
    rows = {(r["start"], r["end"]): r["val"] for r in facts if "start" in r and r["filed"] <= "2026-11-13"}
    fy = rows[("2025-01-27", "2026-01-25")]; ytd = rows[("2026-01-26", "2026-07-26")]; prior = rows[("2025-01-27", "2025-07-27")]
    nv = next(f for f in load("financials")["data"] if f["ticker"] == "NVDA")
    assert abs((fy + ytd - prior) - nv["revenue"]) < 1
