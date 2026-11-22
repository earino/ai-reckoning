/** Transparent scenario arithmetic. The same formulas are published in scenarios.json and methodology. */
import type { ScenarioCompany, ScenarioParams } from "./types";

export interface ScenarioResult {
  ticker: string; fundingGapBefore: number | null; fundingGap: number | null; extraInterest: number | null; extraInterestRange: [number, number] | null;
  extraInterestToEbitda: number | null; backlogAtRisk: number; backlogAtRiskRange: [number, number]; backlogAtRiskToRevenue: number | null;
}
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function runScenario(c: ScenarioCompany, p: ScenarioParams): ScenarioResult {
  const hasCash = c.capex != null && c.operating_cash_flow != null;
  const fundingGapBefore = hasCash ? Math.max(0, c.capex! - c.operating_cash_flow!) : null;
  const fundingGap = hasCash ? Math.max(0, c.capex! * (1 - p.capex_cut) - c.operating_cash_flow!) : null;
  const rate = p.rate_rise_bp / 10000;
  const extraInterest = c.total_debt != null ? c.total_debt * p.refinance_share * rate : null;
  const extraInterestRange: [number, number] | null = c.total_debt != null ? [c.total_debt * 0.25 * rate, c.total_debt * 1.0 * rate] : null;
  const extraInterestToEbitda = extraInterest != null && c.ebitda != null && c.ebitda > 0 ? extraInterest / c.ebitda : null;
  const b = c.model_developer_backlog ?? 0;
  const backlogAtRisk = b * (1 - p.fulfilment);
  const backlogAtRiskRange: [number, number] = [b * (1 - clamp01(p.fulfilment + 0.15)), b * (1 - clamp01(p.fulfilment - 0.15))];
  return { ticker: c.ticker, fundingGapBefore, fundingGap, extraInterest, extraInterestRange, extraInterestToEbitda, backlogAtRisk, backlogAtRiskRange,
    backlogAtRiskToRevenue: c.revenue && c.revenue > 0 ? backlogAtRisk / c.revenue : null };
}
