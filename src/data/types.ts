export type Role = "compute" | "infrastructure" | "energy" | "models_apps" | "capital" | "control_tech" | "control_other" | "other";
export type WindowKey = "day" | "week" | "peak";
export type ModelKey = "raw" | "m1_market_adjusted" | "m2_market_model" | "m3_four_factor" | "m4_sector_adjusted";

export interface Envelope<T> {
  schema_version: string; artifact: string; generated_utc: string; source_cutoff_date: string;
  methodology_version: string; units: Record<string, string>; missing_value_convention: string; data: T;
  [k: string]: unknown;
}
export interface Company {
  ticker: string; name: string; role: Role; subrole: string; tier: "primary" | "secondary" | "control" | "limited_history";
  classification_basis: string; history: "full" | "limited"; first_trade_in_data: string; exchange: string | null; cik: string | null;
  sec_name: string | null; sic_description: string | null; sec_url: string | null; identity_status: string;
  mcap_peak: number | null; mcap_prev_week: number | null; mcap_prev_day: number | null; mcap_event: number | null; mcap_status: string; graph_degree: number;
}
export interface Prices { dates: string[]; peak_date: string; series: Record<string, (number | null)[]>; vix: number[]; ten_year_yield: number[] }
export interface Financial {
  ticker: string; status: string; revenue: number | null; operating_income: number | null; net_income: number | null; operating_cash_flow: number | null;
  capex: number | null; interest_expense: number | null; cash: number | null; total_debt: number | null; net_debt: number | null; ebitda: number | null;
  capex_to_revenue: number | null; capex_to_revenue_status: string | null; capex_to_ocf: number | null; capex_to_ocf_status: string | null;
  capex_growth: number | null; revenue_growth: number | null; fcf_margin: number | null; operating_margin: number | null; gross_margin: number | null;
  net_debt_to_ebitda: number | null; net_debt_to_ebitda_status: string | null; price_to_sales: number | null; ev_to_sales: number | null; ev_to_ebitda: number | null;
  fin_period_end: string | null; fin_filed: string | null; fin_basis: string | null; fin_currency: string | null; fin_stale: boolean | null; filing_url?: string;
}
export interface WindowStats {
  raw: number | null; market: number | null; sector: number | null; m1_market_adjusted: number | null; m2_market_model: number | null; m2_se: number | null;
  m3_four_factor: number | null; m3_se: number | null; m4_sector_adjusted: number | null; expected_m2: number | null;
}
export interface EventRow { ticker: string; history: string; beta: number | null; beta_se: number | null; ai_loading: number | null; momentum_6m: number | null;
  vol_est: number | null; day: WindowStats; week: WindowStats; peak: WindowStats }
export interface GNode {
  id: string; name: string; kind: string; role: Role; ticker: string | null; in_universe: boolean; degree: number; n_edges?: number;
  inflow_firm?: number; outflow_firm?: number; inflow_soft?: number; outflow_soft?: number; realized_in?: number; realized_out?: number;
  top_payer?: string | null; top_payer_share_of_firm_inflow?: number | null; community?: number; x: number; y: number; z: number;
}
export type EdgeStatus = "completed" | "ongoing" | "announced" | "conditional" | "estimated";
export interface GEdge {
  id: string; source: string; target: string; source_as_reported: string; target_as_reported: string; type: string; description: string;
  announced_amount: number | null; realized_amount: number | null; currency: string; amount_basis: string; amount_state: string; comparable_amount: number | null;
  period: string | null; capacity_gw: number | null; disclosure_date: string | null; status: EdgeStatus; cancelled: boolean; source_url: string;
  source_publisher: string | null; source_type: string | null; secondary_url: string | null; confidence: string; notes: string | null; reciprocal_pair: boolean;
}
export interface ScenarioCompany {
  ticker: string; usd_reporter: boolean; revenue: number | null; capex: number | null; operating_cash_flow: number | null; ebitda: number | null; total_debt: number | null;
  interest_expense: number | null; ev_to_sales: number | null; fcf_margin: number | null; model_developer_backlog: number;
  model_developer_backlog_edges: { edge: string; payer: string; amount: number }[]; top_payer: string | null; top_payer_share: number | null; vulnerability_flags: string[];
}
export interface ScenarioParams { capex_cut: number; rate_rise_bp: number; fulfilment: number; refinance_share: number }
export interface Scenarios { companies: ScenarioCompany[]; presets: Record<string, ScenarioParams>; formulas: Record<string, string>; disclaimer: string }
export interface Source { id: string; url: string; publisher: string | null; title: string | null; kind: string; used_for: string; accessed: string }
export interface TimelineEvent { date: string; title: string; description: string; category: string; entities: string[]; confidence: string; confidence_reason?: string;
  conflicts: string | null; sources: { url: string; publisher: string; title: string }[] }
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface DataBundle {
  companies: Company[]; prices: Prices; financials: Financial[]; events: EventRow[]; eventMeta: any; models: any;
  graph: { nodes: GNode[]; edges: GEdge[]; summary: any }; scenarios: Scenarios; sources: Source[]; timeline: TimelineEvent[]; n: any; meta: any;
  byTicker: Map<string, Company>; finBy: Map<string, Financial>; evBy: Map<string, EventRow>; nodeBy: Map<string, GNode>;
}
