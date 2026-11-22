# Fact-check record

Each central claim, where its number comes from, and how it was checked. "Artifact" is a file in `public/data/`.

| # | Claim | Artifact and field | Check | Status |
|---|---|---|---|---|
| 1 | Nasdaq Composite fell 5.28% on 20 Nov 2026 | story-numbers `indices.^IXIC.day_pct` | Price data (22,617.73) matches AP, CNN, UPI reports | Confirmed |
| 2 | S&P 500 fell 3.70%; 11.6% below the 6 Oct record close of 7,818.93 | `indices.^GSPC` | Price data matches reporting; one outlet gives 10.7% for the drawdown, which does not match the closes | Confirmed (conflict noted) |
| 3 | Nasdaq-100 was 19.8% below its record | `indices.^NDX.from_record_pct` | Matches reporting of a brief intraday bear market | Confirmed |
| 4 | Nvidia fell 14.0% to $125.53 | event-study `NVDA.day.raw` | Matches multiple reports | Confirmed |
| 5 | Nvidia's CEO resigned on 12 November; inquiries were reported | timeline | Company 8-K as reported by several outlets; SEC and California matters are *reports*, described as such | Confirmed as reported |
| 6 | Anthropic listed 19 Nov at $83, closed $97.17, then $88.91 | timeline; prices | Price data and reporting agree | Confirmed |
| 7 | AI-linked companies lost about $2.4tn on the day; controls about $25bn | `mv.ai_day`, `mv.ctrl_day` | Recomputed from close × shares; approximate by construction | Confirmed as approximate |
| 8 | AI group down about $10.7tn since the peak; controls up $0.7tn | `mv.ai_peak`, `mv.ctrl_peak` | As above | Confirmed as approximate |
| 9 | Hyperscaler capex $691bn TTM, 95% of operating cash flow | `fin.hyperscaler_capex`, `fin.hyperscaler_ocf` | Summed from five companies' XBRL facts; TTM identity tested | Confirmed (excludes finance leases) |
| 10 | Beta explains 80% / 62% / 75% of cross-company variation | `vd.*.beta_only_r2` | Regression rerun from clean inputs; test in `tests/research` | Confirmed |
| 11 | Capex intensity does not predict abnormal returns | `h2` | Three transforms, two models, bootstrap, influence checks | Confirmed, with fragility noted |
| 12 | Roles differ; chips fell 22% beyond beta from the peak | `h3`, `role_car` | Permutation test; portfolio test | Confirmed; chip portfolio alone p = 0.05 |
| 13 | 63% of $2.7tn firm disclosed commitments involve OpenAI or Anthropic | `graph.share_top2`, `graph_sensitivity` | Recomputed under three stricter source rules: 51%–76% | Confirmed as a range |
| 14 | $591bn disclosed as actually paid on 35 relationships | `graph.realized_total` | Sum of `realized_amount` | Confirmed for the dataset |
| 15 | Fed raised rates in September; Democrats won both chambers | timeline | Multiple outlets | Confirmed as reported |

## Things we could not verify

- The original Reuters and Wall Street Journal articles (paywalled or blocked); cited through other outlets.
- The full text of Anthropic's S-1 and 424B4. Its commitment and revenue figures in the graph come from news reads and carry medium confidence.
- Any claim about private companies' profitability. None is made.

## Automated checks

`tests/research` asserts, among other things: TTM arithmetic for a sample of companies; no financial fact filed after the cutoff; estimation window ends before the peak; published headline numbers equal recomputed values; no edge without a source URL; no totals mixing statuses.
