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

## 2026-11-22 — Entry 2: Data decisions (made before results were inspected)

- **Market data source.** Stooq now requires a browser challenge; we did not work around it. Yahoo Finance's chart endpoint answered a plainly identified client. Its data are not redistributable, so raw prices stay out of the repository and only derived statistics are published.
- **SEC access.** `www.sec.gov` refused our generic client (HTTP 403). `data.sec.gov` (XBRL and submissions APIs) worked. Ticker-to-CIK mapping was rebuilt from the XBRL frames API and each match was verified against the SEC's ticker list for that CIK. An attempt to download a third-party mirror of the SEC ticker file was blocked by the tool's permission system and was not retried.
- **Consequence.** Full-text filings (for example Anthropic's S-1) could not be fetched. Relationship amounts from those filings come from news reports of them. This is flagged per edge and in Limitations.
- **Fama–French factors** end 2026-09-30. ETF proxies were used as planned. Correlations in the estimation window: market 0.99, size 0.80, value 0.71, momentum 0.82.
- **Peak date** read from index data as planned: S&P 500 record close 7,818.93 on 2026-10-06.
- **Dropped:** DigitalBridge and Electronic Arts had no price on the event date (delisted earlier in 2026).
- **Added as limited history** (per the plan): Anthropic (ANT), Cerebras (CBRS), SpaceX (SPCX), SK hynix ADR (SKHY). None is in any model.
- **Deviations from the plan.** (1) Profitability control: operating margin, with net margin where operating income is not reported. (2) Leverage control: net debt/assets plus a negative-EBITDA flag, because net debt/EBITDA is undefined for loss-making companies.

## 2026-11-22 — Entry 3: Results of the planned tests

| Test | Result | Raw p | Holm p |
|---|---|---|---|
| H1, day: primary AI minus controls, market model | CAR −0.9% | 0.63 | 1.00 |
| H1, week | CAR +6.4% | 0.16 | 0.49 |
| H1, peak | CAR −19.8% | 0.03 | 0.16 |
| H2, week: capex/revenue with controls | −0.6 pts per 100% of revenue (bootstrap 95%: −3.0 to +1.1) | 0.53 | 1.00 |
| H3, week: roles differ | F = 3.8, permutation | 0.007 | 0.04 |
| H4, week: log(1 + degree) | −1.8 pts per log unit | 0.03 | 0.16 |

**Interpretation changed.** The working headline ("who wins and loses") assumed AI-specific exposure would explain losses. The brief's first story-change condition applies: pre-event market beta alone explains 80% (day), 62% (week) and 75% (peak) of cross-company variation in raw returns, and an AI flag adds less than 2 points. H1 and H2 are not supported. The headline was changed to "The crash followed the beta, not the bill".

**Rejected hypothesis.** H2, the idea this project began with: that spending intensity predicts losses.

## 2026-11-22 — Entry 4: Exploratory work (after seeing results)

- **Benchmark contamination.** Seeing betas near 2.7 for chip and cloud stocks, we asked whether the S&P 500 is a fair ruler. Against an equal-weight portfolio of 46 non-technology controls, the primary AI portfolio's CAR is −10.6% (day), −23.8% (week) and −43.8% (peak), and SPY's own CAR is −3.6%, −8.2% and −15.0%. Published as exploratory, and it qualifies the headline finding.
- **Role portfolios from the peak.** Chips −22%, clouds −12%, power −6%, models and applications 0%, capital +12% against the market model. The chip portfolio's own empirical p-value is 0.05; the others are larger, except technology controls (+9.5%, p = 0.02).
- **Nvidia.** One-day abnormal return −7.2% (z = −3.8); peak-to-event −39.7% (z = −3.5), the most negative in the universe. Consistent with company-specific news (CEO resignation on 12 November; reported inquiries). The second story-change condition (a company-specific event) applies in part: it explains Nvidia, not the cross-section, which is unchanged when Nvidia is dropped.
- **H2 fragility.** Dropping the ten highest Cook's-distance companies gives a negative, significant capex slope (−1.8 pts, p = 0.001). Reported in the story as a caveat.
- **Graph concentration** and its sensitivity to source quality (51% to 76%).
- **Market-value sums** by role.

## 2026-11-22 — Entry 5: Errors found and corrected before publication

- Share-count extraction crashed on point-in-time (non-duration) facts; fixed by filtering to duration facts.
- Factor-validation correlation for the market factor returned NaN because of a missing first observation; fixed.
- Narrative sentences printed signed numbers after verbs ("fell −24%"); replaced with magnitudes.
- The first 3D label implementation threw a DOM error during scene changes; replaced with a projected HTML layer.
- Prologue step order was wrong in the first build; fixed.
