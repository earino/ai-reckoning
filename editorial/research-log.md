# Research log — The AI Reckoning

Entries are in time order. "PLANNED" marks decisions made before outcome data were inspected. "EXPLORATORY" marks anything decided after.

## 2026-11-22 — Entry 1: Pre-specification (PLANNED)

Committed to git before any company return series was downloaded. The commit timestamp is the evidence.

### What the team already knew when this was written (disclosed contamination)

From headline searches used to confirm the event exists, we had seen: Nasdaq Composite about -5.3% and S&P 500 about -3.7% on 2026-11-20; Nvidia about -14%; Micron about -14%; Anthropic (ANT) about -9% on its second trading day. No other company returns had been seen. The universe below was written after seeing those three company numbers. All three companies would be in any reasonable AI universe.

### Universe

`research/curated/universe.csv` — 214 securities, hand-classified by rule (see methodology/methods.md): role (compute, infrastructure, energy, models_apps, capital, control_tech, control_other) and tier (primary, secondary, control, limited_history). Classification uses business facts that were public before 2026-11-16. Tickers that fail data validation are dropped and listed; none are added after returns are seen, except 2026 IPOs identified by the chronology research, which enter as `limited_history` and are excluded from all models.

### Hypotheses

- H1 (AI vs controls). Primary-tier AI companies had lower abnormal returns than controls on 2026-11-20 and over 2026-11-16..20.
- H2 (spending intensity). Among non-control companies, higher trailing-twelve-month capex/revenue (latest filing public before 2026-11-16) is associated with lower cumulative abnormal return.
- H3 (roles differ). Mean abnormal returns differ across the five AI roles (compute, infrastructure, energy, models_apps, capital).
- H4 (network position; planned as secondary). Companies with more documented AI counterparties (degree in the relationship graph) had lower abnormal returns.
- H0 to take seriously: pre-event market beta and standard factors explain the cross-section, and AI exposure adds nothing.

### Specifications fixed now

- Event windows: (W1) 2026-11-20 close-to-close; (W2) 2026-11-13 close to 2026-11-20 close; (W3) from the S&P 500 record closing high in Sep–Nov 2026 (date to be read from index data) to 2026-11-20.
- Prices: split- and dividend-adjusted closes. Returns are simple returns; models use log returns for multi-day sums where stated.
- Estimation window for betas: the 250 trading days ending 2026-09-30. It ends before the October peak so the drawdown does not contaminate the betas. Minimum 120 observations.
- Benchmarks: (M0) raw; (M1) market-adjusted (minus SPY); (M2) market model (alpha, beta vs SPY); (M3) four-factor model from ETF proxies — market SPY, size IWM−SPY, value IWD−IWF, momentum MTUM−SPY. Fama–French daily factors end 2026-09-30 so cannot cover the event; the ETF proxies will be validated against them in the overlap. (M4) sector-adjusted: minus the SPDR sector ETF matched by role.
- H1/H3 tests: (a) cross-sectional OLS of abnormal return on tier/role dummies, HC3 errors; (b) because one-day returns share a common shock, the primary inference is a portfolio test — equal-weight role portfolio abnormal return on the event window compared with the distribution of that portfolio's own abnormal returns in the estimation window (same window length), plus a permutation test on labels.
- H2 test: OLS and Huber robust regression of W2 abnormal return (M2 and M3) on capex/revenue (winsorised 1/99), with controls: pre-event beta, log market cap, 6-month momentum to 2026-09-30, operating margin, net debt/EBITDA flag. Bootstrap 95% CIs. Capex/revenue for financials is not meaningful and is set to not-applicable.
- Alternative AI-exposure definitions: (E1) tier; (E2) role; (E3) capex/revenue; (E4) pre-event return-based exposure — beta to an equal-weight primary-compute basket, orthogonal to SPY, estimated in the same pre-event window; (E5) graph degree.
- Multiplicity: Holm correction across the planned family {H1×W1,W2,W3; H2×W2; H3×W2; H4×W2} under the M2 model. Everything else is labelled exploratory.
- Influence checks: drop Nvidia; drop the five hyperscalers; drop the 10 highest-leverage observations; drop limited-history names (always excluded from models).
- Language rule: abnormal returns are descriptions relative to a model. None is called a causal effect of AI exposure.

### Story-change conditions (from the brief)

If beta alone explains most cross-sectional variation, or AI exposure has no meaningful incremental association, or a company-specific event (for example a regulatory probe at one issuer) explains more than infrastructure economics, the headline changes to say so.
