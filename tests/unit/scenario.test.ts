import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { runScenario } from "../../src/data/scenario";
import { mag, pct, pValue, usd, NA } from "../../src/data/format";

const sc = JSON.parse(readFileSync("public/data/scenarios.json", "utf8")).data;
const base = { ticker: "X", usd_reporter: true, revenue: 100, capex: 80, operating_cash_flow: 50, ebitda: 40, total_debt: 200, interest_expense: 10, ev_to_sales: 5, fcf_margin: -0.3,
  model_developer_backlog: 400, model_developer_backlog_edges: [], top_payer: null, top_payer_share: null, vulnerability_flags: [] };

describe("scenario arithmetic", () => {
  it("matches the published formulas", () => {
    const r = runScenario(base, { capex_cut: 0.25, rate_rise_bp: 200, fulfilment: 0.75, refinance_share: 0.5 });
    expect(r.fundingGapBefore).toBe(30); expect(r.fundingGap).toBe(10);
    expect(r.extraInterest).toBeCloseTo(2); expect(r.extraInterestRange).toEqual([1, 4]); expect(r.extraInterestToEbitda).toBeCloseTo(0.05);
    expect(r.backlogAtRisk).toBe(100); expect(r.backlogAtRiskRange[0]).toBeCloseTo(40); expect(r.backlogAtRiskRange[1]).toBeCloseTo(160); expect(r.backlogAtRiskToRevenue).toBe(1);
  });
  it("never invents values when inputs are missing", () => {
    const r = runScenario({ ...base, capex: null, total_debt: null, ebitda: -5 }, sc.presets.baseline);
    expect(r.fundingGap).toBeNull(); expect(r.extraInterest).toBeNull(); expect(r.extraInterestToEbitda).toBeNull();
  });
  it("no shock means no modeled loss; presets are ordered", () => {
    expect(runScenario(base, { capex_cut: 0, rate_rise_bp: 0, fulfilment: 1, refinance_share: 1 }).backlogAtRisk).toBe(0);
    const tot = (k: string) => sc.companies.reduce((a: number, c: any) => a + runScenario(c, sc.presets[k]).backlogAtRisk, 0);
    expect(tot("optimistic")).toBeLessThanOrEqual(tot("baseline")); expect(tot("baseline")).toBeLessThan(tot("downside"));
  });
});
describe("formatting", () => {
  it("renders null as n/a, never as zero", () => { expect(pct(null)).toBe(NA); expect(usd(undefined)).toBe(NA); expect(mag(null)).toBe(NA); });
  it("formats signs and magnitudes", () => { expect(pct(-0.0528, 2)).toBe("−5.28%"); expect(pct(0.07, 0)).toBe("+7%"); expect(mag(-0.4)).toBe("40%"); expect(usd(-2.4e12)).toBe("−$2.4tn"); expect(usd(691e9, 0)).toBe("$691bn"); expect(pValue(0.0004)).toBe("p < 0.001"); });
});
