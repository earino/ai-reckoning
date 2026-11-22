# Methodology

Methodology version 2026.11-a. Research cutoff: 20 November 2026. All code is in the public repository; every number in the story is read from a published data file at page load.

## 1. The question and what was decided in advance

The editorial question: when investors reassessed the economics of artificial intelligence, which companies bore the losses, which capture the profits, and what does this say about the sustainability of the boom?

Before any company return series was downloaded, we committed to git (commit `3406a1a`) a list of companies, four hypotheses, the event windows, the estimation window, the models, the tests, and the multiple-testing rule. That file is the first entry of the [research log](#/research-log). Three company returns (Nvidia, Micron, Anthropic) had been seen in headlines; this is disclosed there.

Planned hypotheses:

- **H1** Primary AI companies had lower abnormal returns than controls.
- **H2** Higher capital spending relative to revenue goes with lower abnormal returns.
- **H3** Abnormal returns differ across the five AI roles.
- **H4** Companies with more documented AI counterparties had lower abnormal returns.

Everything else is labelled exploratory wherever it appears.

## 2. Verifying the event

A researcher agent built a 47-entry chronology from contemporaneous reporting (AP, CNBC, CNN, UPI, Yahoo Finance and others), SEC filings and Federal Reserve statements. Each entry has sources and a confidence grade. Index levels in the chronology were then checked against our independent price data. They match: S&P 500 6,910.39 (−3.70%), Nasdaq Composite 22,617.73 (−5.28%), Nasdaq-100 −5.61%, Dow −1.93%, Nvidia $125.53 (−14.01%), Anthropic $88.91. Numbers used in calculations come from the price data and SEC filings, never from news text.

The Reuters article named in the project brief could not be fetched (HTTP 401). Its content is cited only through other outlets' reports.

## 3. The universe

215 listed securities, in `research/curated/universe.csv`.

**Rule.** A company enters an AI role if, before 16 November 2026, its own filings or releases identified AI infrastructure as a material driver of revenue, capital spending, or contracted business. *Primary* means AI is the majority of revenue or the stated principal growth driver, or the company is a named counterparty in a large AI contract. *Secondary* means documented but partial exposure. Marketing use of the word "AI" does not qualify. The one-line basis for each company is published in `companies.json`.

**Roles** (companies with full trading history). Chips and hardware (37), clouds and data centres (19), power and physical plant (37), models and applications (30), capital and financing (19).

**Controls.** 69 companies: 23 technology, media and telecom companies without material AI infrastructure exposure, and 46 large non-technology companies taken from health care, staples, discretionary, energy, financials, industrials, materials and real estate.

**Judgement.** The classification is hand-made by rule, not a mechanical screen. This is a limitation. It was fixed before returns were seen.

**Survivorship and timing.** Two listed names (DigitalBridge, Electronic Arts) had stopped trading before the event and were dropped; this is recorded in `companies.json`. Four 2026 listings (Anthropic, Cerebras, SpaceX, SK hynix ADR) are shown as *limited history* and are excluded from every model.

## 4. Data

| Data | Source | Notes |
|---|---|---|
| Identity (CIK, SIC, exchange) | SEC EDGAR submissions API | Each ticker–CIK match is verified against the SEC's own ticker list for that CIK |
| Financial statements | SEC EDGAR XBRL company-facts API | Only facts **filed on or before 13 November 2026** |
| Prices and volumes | Yahoo Finance chart endpoint | Split- and dividend-adjusted closes. Not redistributable; see below |
| Factor validation | Kenneth French data library | Daily factors end 30 September 2026 |
| Relationships | 196 edges from filings, company releases and reporting | Each edge has a source URL, status and confidence |

**Trailing twelve months (TTM).** For flow items we take the last full fiscal year, add the current year-to-date, and subtract the same year-to-date period one year earlier. If a company lacks the pieces, we use the last fiscal year and flag it. The filing accession number is published for every company.

**Capital spending** is cash paid for property and equipment. It excludes finance leases, which understates spending at some cloud companies.

**Market value** is the closing price times the diluted weighted-average share count in the latest pre-event filing. It is an approximation and is labelled so. Taiwan Semiconductor's ADR ratio (5 shares) and Berkshire Hathaway's share-class ratio (1,500) are applied.

**Ratios with bad denominators.** Capex/operating cash flow is "not meaningful" when cash flow is negative. Net debt/EBITDA is "not meaningful" when EBITDA is negative. Capex ratios are "not applicable" for financial firms. These states are published as separate status fields, never as zeros.

**Licensing.** Raw Yahoo prices are not committed or published. We publish derived statistics only: window returns, betas, and percent change since 6 October. `research/ingest/prices.py` re-acquires the raw data.

## 5. Event study

- **Windows.** One day (20 November); the week (close of 13 November to close of 20 November); peak to event (6 October, the S&P 500 record close, to 20 November).
- **Estimation window.** 250 trading days ending 30 September 2026, before the peak, so that the decline does not shape the betas. Minimum 120 observations.
- **Models.** Raw; market-adjusted (minus SPY); market model (alpha + beta × SPY); four-factor (market, size, value, momentum from ETF proxies); sector-adjusted (minus the SPDR sector ETF).
- **Factor proxies.** The French factors stop on 30 September, so we built proxies: SPY; IWM−SPY; IWD−IWF; MTUM−SPY. In the estimation window their daily correlations with the French factors are 0.99 (market), 0.80 (size), 0.71 (value) and 0.82 (momentum).
- **Uncertainty for a company.** The standard error of a cumulative abnormal return uses the residual variance times the window length, with corrections for estimation of the mean and of beta.

### Why the main test uses portfolios

On a crash day, company returns share one shock. Treating 200 companies as 200 independent observations overstates certainty. For H1 and for each role we therefore form one equal-weight portfolio, fit the market model to that portfolio in the estimation window, and compare its event-window abnormal return with the distribution of same-length abnormal returns of **that same portfolio** in the estimation window. The reported p-value is that empirical share. Cross-sectional regressions (HC3 errors, permutation tests) are reported as supporting evidence.

### Variance decomposition

To test the "story-change" condition, we regress raw window returns on pre-event beta alone, then add an AI flag, role dummies, size and momentum, and report R². We also report the fit of the pure prediction beta × market return with no fitted parameters.

### H2 specification

Abnormal return on capex/revenue (winsorised at 1% and 99%) with controls: beta, log market value, six-month momentum to 30 September, operating margin (net margin where operating income is not reported), net debt/assets, and a negative-EBITDA flag. HC3 errors, a 2,000-draw pairs bootstrap, a Huber robust fit, log and rank transforms, and influence checks (drop Nvidia; drop the hyperscalers; drop neoclouds; drop the ten highest Cook's-distance companies; primary tier only).

Two deviations from the plan: operating margin falls back to net margin where operating income is not reported, and leverage enters as net debt/assets because net debt/EBITDA is undefined for loss-making companies.

### Multiple testing

Holm correction over the six planned tests (H1 × three windows, H2, H3, H4, market model). Only H3 survives (adjusted p = 0.04).

### Alternative exposure definitions

Tier; role; capex intensity; graph degree; and a return-based loading on a leave-one-out basket of primary chip stocks, orthogonal to the market, estimated before the event.

### The benchmark problem (exploratory)

The S&P 500 is heavy in the companies under study. We therefore also benchmark against (a) the equal-weight S&P 500 ETF and (b) an equal-weight portfolio of the 46 non-technology controls. These comparisons were added after the first results and are labelled exploratory. They reverse the headline reading: against non-AI companies, AI stocks and the S&P 500 itself fell far more than expected. We publish both readings and state that the data cannot separate them.

## 6. The relationship graph

Two researcher agents collected relationships from filings, company releases and reporting. Each edge records: payer or capital provider, receiver, type, announced amount, realised amount if separately disclosed, basis (contract total, ceiling, annual, stake value, undisclosed), period, disclosure date, status, source URL, confidence and notes.

Rules:

- Edges point the way money flows.
- Amounts are **never summed across statuses**. "Firm" means completed or ongoing with a contract total or ceiling.
- Stake values and annual run-rates are excluded from all totals.
- Reciprocal pairs are flagged, not netted and not added together.
- Bond investors, bank syndicates, IPO investors and private-round investors are pooled nodes. Lead arrangers are not treated as risk holders.
- One relationship (a terminated merger) is kept and marked cancelled; it is excluded from metrics.

Metrics are descriptive: degree, disclosed in- and out-flows by status class, betweenness, greedy-modularity communities, payer and receiver shares, and top-payer share. Centrality is not a measure of systemic risk.

**Sensitivity of the headline share.** OpenAI or Anthropic is a party to 63% of the firm disclosed amount using all edges, 51% using only high-confidence edges, 76% using only filings and company releases, and 63% excluding equity.

**Layout.** Height is the layer of the money chain. Position within a layer is a golden-angle spiral ordered by number of counterparties. Nothing is force-directed, so distance between two marks has no meaning beyond layer and rank.

## 7. The scenario tool

Arithmetic only, on reported numbers and disclosed contracts:

- Funding gap = max(0, capex × (1 − cut) − operating cash flow). Direct.
- Added interest = total debt × share repricing × rate rise. Direct. A 25–100% repricing range is always shown.
- Contract value not paid = disclosed binding backlog owed by OpenAI, Anthropic or SpaceX/xAI × (1 − fulfilment). Modeled, one step, not propagated.

No transmission coefficients are estimated, because we cannot defend any. The tool is an exposure map, not a forecast.

## 8. Reproduction

```
uv venv --python 3.12 research/.venv && uv pip install --python research/.venv/bin/python -r research/requirements.txt
cd research/ingest && ../.venv/bin/python prices.py && ../.venv/bin/python sec.py && cd ../..
research/.venv/bin/python research/clean/fundamentals.py
research/.venv/bin/python research/network/build_graph.py
research/.venv/bin/python research/analysis/panel.py
research/.venv/bin/python research/analysis/tests.py
research/.venv/bin/python research/analysis/publish.py
research/.venv/bin/python -m pytest tests/research
```

Random seeds are fixed. Bootstrap and permutation results can differ in the third decimal place between library versions.

## 9. Use of AI

An AI system (Claude) did the source research, extraction, coding, statistics and writing. Outputs of language-model extraction were not treated as authoritative: prices and financial statements come from structured data, and relationship edges carry source links for readers to check. See [About](#/about) and [Limitations](#/limitations).
