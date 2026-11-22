"""Point-in-time trailing-twelve-month (TTM) fundamentals from SEC XBRL company facts.

Only facts FILED on or before CUTOFF are used, so every predictor was public before the event week.
Missing-value convention: null = not available / not reported; a separate *_status field says why.
"""
from __future__ import annotations
import json, sys
from datetime import date, timedelta
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
RAW, PROCESSED = ROOT / "data" / "raw", ROOT / "data" / "processed"
CUTOFF = "2026-11-13"
FORMS = {"10-K", "10-Q", "20-F", "40-F", "10-K/A", "10-Q/A", "20-F/A", "10-KT", "6-K", "S-1", "S-1/A", "424B4"}

FLOW_TAGS = {
    "revenue": ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues", "SalesRevenueNet",
                "RevenueFromContractWithCustomerIncludingAssessedTax", "RevenuesNetOfInterestExpense", "Revenue",
                "RevenueFromContractsWithCustomers"],
    "operating_income": ["OperatingIncomeLoss", "ProfitLossFromOperatingActivities"],
    "net_income": ["NetIncomeLoss", "ProfitLoss", "ProfitLossAttributableToOwnersOfParent"],
    "operating_cash_flow": ["NetCashProvidedByUsedInOperatingActivities", "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations",
                            "CashFlowsFromUsedInOperatingActivities"],
    "capex": ["PaymentsToAcquirePropertyPlantAndEquipment", "PaymentsToAcquireProductiveAssets",
              "PaymentsToAcquireOtherPropertyPlantAndEquipment", "PaymentsForCapitalImprovements",
              "PaymentsToAcquireRealEstate", "PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities",
              "PaymentsToAcquirePropertyPlantAndEquipmentAndIntangibleAssets"],
    "depreciation_amortization": ["DepreciationDepletionAndAmortization", "DepreciationAndAmortization",
                                  "DepreciationAmortizationAndAccretionNet", "Depreciation", "DepreciationAndAmortisationExpense",
                                  "DepreciationAmortizationAndOther"],
    "interest_expense": ["InterestExpense", "InterestExpenseNonoperating", "InterestExpenseDebt", "InterestPaidNet", "InterestExpenseOperating"],
    "gross_profit": ["GrossProfit"],
    "cost_of_revenue": ["CostOfRevenue", "CostOfGoodsAndServicesSold", "CostOfSales"],
    "finance_lease_principal": ["FinanceLeasePrincipalPayments", "RepaymentsOfLongTermCapitalLeaseObligations"],
}
STOCK_TAGS = {
    "cash": ["CashAndCashEquivalentsAtCarryingValue", "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents", "CashAndCashEquivalents"],
    "short_term_investments": ["ShortTermInvestments", "MarketableSecuritiesCurrent", "AvailableForSaleSecuritiesDebtSecuritiesCurrent"],
    "debt_lt_noncurrent": ["LongTermDebtNoncurrent", "LongTermDebtAndCapitalLeaseObligations", "LongTermNotesPayable", "SeniorNotes"],
    "debt_lt_current": ["LongTermDebtCurrent", "LongTermDebtAndCapitalLeaseObligationsCurrent"],
    "debt_lt_total": ["LongTermDebt", "DebtLongtermAndShorttermCombinedAmount", "DebtAndCapitalLeaseObligations", "Borrowings"],
    "debt_short": ["ShortTermBorrowings", "CommercialPaper", "DebtCurrent"],
    "total_assets": ["Assets"],
    "ppe_net": ["PropertyPlantAndEquipmentNet", "PropertyPlantAndEquipmentAndFinanceLeaseRightOfUseAssetAfterAccumulatedDepreciationAndAmortization"],
}
SHARE_TAGS = [("dei", "EntityCommonStockSharesOutstanding"), ("us-gaap", "WeightedAverageNumberOfDilutedSharesOutstanding"),
              ("us-gaap", "CommonStockSharesOutstanding"), ("ifrs-full", "NumberOfSharesOutstanding")]


def d(s):
    return date.fromisoformat(s)


def tag_facts(facts, tag):
    """All facts for a tag in any taxonomy/currency, filtered point-in-time. Returns (rows, unit)."""
    for tax in ("us-gaap", "ifrs-full", "dei"):
        node = facts.get("facts", {}).get(tax, {}).get(tag)
        if not node:
            continue
        units = node["units"]
        unit = "USD" if "USD" in units else next((u for u in units if "/" not in u), None)
        if unit is None:
            continue
        rows = [r for r in units[unit] if r.get("filed", "9") <= CUTOFF and r.get("form") in FORMS]
        if rows:
            return rows, unit
    return [], None


def ttm_at(rows, end_target: date, tol=12):
    """TTM flow ending near end_target. Returns (value, basis, end, accn, filed) or None."""
    dur = [r for r in rows if "start" in r and abs((d(r["end"]) - end_target).days) <= tol]
    if not dur:
        return None
    # dedupe by (start,end): keep the earliest filing (original, point-in-time)
    best = {}
    for r in sorted(dur, key=lambda r: r["filed"]):
        best.setdefault((r["start"], r["end"]), r)
    cands = sorted(best.values(), key=lambda r: (d(r["end"]) - d(r["start"])).days, reverse=True)
    top = cands[0]
    length = (d(top["end"]) - d(top["start"])).days
    if 350 <= length <= 380:
        return top["val"], "annual_period", top["end"], top["accn"], top["filed"]
    if length > 380:
        return None
    # YTD: need last full fiscal year (ending the day before YTD start) and the prior-year YTD
    s = d(top["start"])
    all_best = {}
    for r in sorted([r for r in rows if "start" in r], key=lambda r: r["filed"]):
        all_best.setdefault((r["start"], r["end"]), r)
    annual = [r for r in all_best.values() if abs((d(r["end"]) - (s - timedelta(days=1))).days) <= tol
              and 350 <= (d(r["end"]) - d(r["start"])).days <= 380]
    prior = [r for r in all_best.values() if abs((d(r["end"]) - (d(top["end"]) - timedelta(days=365))).days) <= tol
             and abs(((d(r["end"]) - d(r["start"])).days) - length) <= tol]
    if annual and prior:
        return annual[0]["val"] + top["val"] - prior[0]["val"], "fy_plus_ytd_minus_prior_ytd", top["end"], top["accn"], top["filed"]
    return None


def flow(facts, key):
    """Choose the tag with the most recent period end; compute TTM now and one year earlier."""
    best = None
    for tag in FLOW_TAGS[key]:
        rows, unit = tag_facts(facts, tag)
        rows = [r for r in rows if "start" in r]
        if not rows:
            continue
        latest_end = max(d(r["end"]) for r in rows)
        cur = ttm_at(rows, latest_end)
        if cur is None:
            # fall back to most recent annual period
            ann = [r for r in rows if 350 <= (d(r["end"]) - d(r["start"])).days <= 380]
            if not ann:
                continue
            a = max(ann, key=lambda r: (r["end"], r["filed"]))
            cur = (a["val"], "latest_fiscal_year_only", a["end"], a["accn"], a["filed"])
        prev = ttm_at(rows, d(cur[2]) - timedelta(days=365))
        cand = {"value": cur[0], "basis": cur[1], "period_end": cur[2], "accession": cur[3], "filed": cur[4], "tag": tag,
                "unit": unit, "prior_year_value": prev[0] if prev else None}
        if best is None or cand["period_end"] > best["period_end"]:
            best = cand
    return best


def stock(facts, key):
    best = None
    for tag in STOCK_TAGS[key]:
        rows, unit = tag_facts(facts, tag)
        rows = [r for r in rows if "start" not in r]
        if not rows:
            continue
        r = max(rows, key=lambda r: (r["end"], r["filed"]))
        cand = {"value": r["val"], "period_end": r["end"], "accession": r["accn"], "filed": r["filed"], "tag": tag, "unit": unit}
        if best is None or cand["period_end"] > best["period_end"]:
            best = cand
    return best


def shares(facts):
    for tax, tag in SHARE_TAGS:
        node = facts.get("facts", {}).get(tax, {}).get(tag)
        if not node or "shares" not in node["units"]:
            continue
        rows = [r for r in node["units"]["shares"] if r.get("filed", "9") <= CUTOFF]
        if not rows:
            continue
        r = max(rows, key=lambda r: (r["end"], r["filed"]))
        if r["end"] >= "2025-09-01":
            return {"value": r["val"], "period_end": r["end"], "tag": tag, "accession": r["accn"], "filed": r["filed"],
                    "basis": "cover_page_single_class" if tag.startswith("Entity") else "diluted_weighted_average" if "Weighted" in tag else "balance_sheet"}
    return None


def main():
    ident = json.loads((PROCESSED / "identity_sec.json").read_text())["resolved"]
    out = []
    for c in ident:
        facts = json.loads((RAW / "sec" / "facts" / f"{c['cik']}.json").read_text())
        rec = {"ticker": c["ticker"], "cik": c["cik"], "flows": {}, "stocks": {}}
        for k in FLOW_TAGS:
            rec["flows"][k] = flow(facts, k)
        for k in STOCK_TAGS:
            rec["stocks"][k] = stock(facts, k)
        # Both a weighted-average and a point-in-time count: keep all, analysis decides.
        rec["shares"] = shares(facts)
        w = facts.get("facts", {}).get("us-gaap", {}).get("WeightedAverageNumberOfDilutedSharesOutstanding")
        if w and "shares" in w["units"]:
            rows = [r for r in w["units"]["shares"] if r.get("filed", "9") <= CUTOFF and "start" in r]
            if rows:
                r = max(rows, key=lambda r: (r["end"], r["filed"], -((d(r["end"]) - d(r["start"])).days)))
                rec["shares_diluted_wa"] = {"value": r["val"], "period_end": r["end"], "accession": r["accn"], "filed": r["filed"]}
        out.append(rec)
    (PROCESSED / "fundamentals_raw.json").write_text(json.dumps({"cutoff_filed": CUTOFF, "records": out}, indent=1))
    df = pd.DataFrame([{"ticker": r["ticker"], **{k: (v or {}).get("value") for k, v in r["flows"].items()},
                        **{k: (v or {}).get("value") for k, v in r["stocks"].items()},
                        "rev_end": (r["flows"]["revenue"] or {}).get("period_end"), "rev_basis": (r["flows"]["revenue"] or {}).get("basis"),
                        "unit": (r["flows"]["revenue"] or {}).get("unit"),
                        "shares": (r.get("shares_diluted_wa") or r.get("shares") or {}).get("value")} for r in out])
    df.to_csv(PROCESSED / "fundamentals_wide.csv", index=False)
    print(df.isna().sum().to_string())
    pd.set_option("display.width", 250)
    print(df[df.ticker.isin(["NVDA", "MSFT", "ORCL", "CRWV", "META", "TSM", "JPM", "CEG", "OWL", "ASML", "ARM", "NBIS"])][
        ["ticker", "revenue", "operating_income", "operating_cash_flow", "capex", "rev_end", "rev_basis", "unit", "shares"]].to_string())


if __name__ == "__main__":
    main()
