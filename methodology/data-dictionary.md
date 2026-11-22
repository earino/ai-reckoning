# Data

All published files are in `public/data/` in the repository and are served with the site. Each is a JSON document with the same header:

| Field | Meaning |
|---|---|
| `schema_version` | Version of the file layout |
| `generated_utc` | When the file was written |
| `source_cutoff_date` | Last market date in the data (2026-11-20) |
| `methodology_version` | Version of the methods |
| `units` | Units for each group of fields |
| `missing_value_convention` | How missing values are encoded |
| `data` | The content |

**Missing values.** `null` means not available. A sibling `*_status` or `*_state` field says why: `not_reported`, `not_applicable_financial`, `not_meaningful_negative_ebitda`, `not_meaningful_negative_ocf`, `undisclosed`, `estimated`. A zero is always a reported zero.

## Files

**companies.json** — one row per security: `ticker`, `name`, `role`, `subrole`, `tier` (primary, secondary, control, limited_history), `classification_basis`, `history`, `exchange`, `cik`, `sec_name`, `sic_description`, `mcap_peak`, `mcap_prev_week`, `mcap_prev_day`, `mcap_event` (USD, approximate), `graph_degree`. Header also lists securities dropped before analysis.

**prices.json** — `dates`; `series[ticker]` = percent change in adjusted close since 6 October 2026 (limited-history tickers: since first close); `vix`; `ten_year_yield`. Derived data only.

**financials.json** — trailing-twelve-month figures in reporting currency: `revenue`, `operating_income`, `net_income`, `operating_cash_flow`, `capex`, `interest_expense`, `cash`, `total_debt`, `net_debt`, `ebitda`; ratios `capex_to_revenue`, `capex_to_ocf`, `capex_growth`, `revenue_growth`, `fcf_margin`, `operating_margin`, `gross_margin`, `net_debt_to_ebitda`, `price_to_sales`, `ev_to_sales`, `ev_to_ebitda`; provenance `fin_period_end`, `fin_filed`, `fin_basis`, `fin_currency`, `fin_accession`, `filing_url`, `fin_stale`.

**event-study.json** — per company: `beta`, `beta_se`, `ai_loading`, `momentum_6m`, `vol_est`, and for each window (`day`, `week`, `peak`): `raw`, `market`, `sector`, `m1_market_adjusted`, `m2_market_model`, `m2_se`, `m3_four_factor`, `m3_se`, `m4_sector_adjusted`, `expected_m2`. Returns are fractions. Header: window dates, estimation window, index and sector moves, factor-proxy validation.

**models.json** — all test results: group means, H1–H4, alternative benchmarks, role and sub-role portfolios, variance decomposition, exposure definitions, outliers, market-value sums, raw and Holm-adjusted p-values.

**relationships.json** — `nodes` (id, name, kind, role, degree, disclosed flows by status class, top payer share, layout coordinates), `edges` (source, target, type, description, `announced_amount`, `realized_amount`, `amount_basis`, `amount_state`, `comparable_amount`, period, `disclosure_date`, `status`, `cancelled`, `source_url`, `source_type`, `confidence`, notes, `reciprocal_pair`) and `summary`.

**scenarios.json** — inputs per company, three assumption sets, the formulas, and rule-based vulnerability flags.

**sources.json** — every source with id, URL, publisher, kind and what it supports.

**timeline.json** — the sourced chronology with confidence and conflicts.

**story-numbers.json** — every number quoted in the narrative. The page text reads from this file.

**publication-metadata.json** — cutoff, publication date, coverage counts.

## What is not published

Raw daily prices and volumes (Yahoo Finance; not redistributable) and raw SEC API responses (public; re-download with the ingestion scripts). A retrieval log with URL, time and SHA-256 of each download is in `data/provenance/retrieval_log.jsonl`.

## Licence

Code: MIT. Text, derived data and graphics: CC BY 4.0. SEC data are public domain. Source articles remain the property of their publishers and are linked, not copied.
