# Limitations

Read these before relying on any number in this investigation.

## About the event study

1. **One event, one cross-section.** We observe one selloff. We cannot show why prices moved. Federal Reserve tightening, the midterm election result, Nvidia's leadership crisis and reported inquiries, and Anthropic's listing all fell in the same weeks.
2. **Beta is not neutral.** Betas were estimated in a year when AI news moved the whole index. A high beta may be a measure of AI exposure. Our headline result (beta explains most of the cross-section) and the alternative reading (AI stocks fell far more than non-AI stocks) are both consistent with the data.
3. **The four-factor and sector models are contaminated** in the same way: momentum, growth and technology ETFs are heavy in AI stocks.
4. **Null results are bounded, not proven.** The capex result excludes large effects. It does not exclude small ones, and it changes sign and becomes significant if the ten most influential companies are removed.
5. **The peak window is long (33 trading days).** Its abnormal returns have wide error bands, and alpha estimated before the peak is extrapolated.
6. **Universe by judgement.** Classification was done by rule but by hand, by an AI system, before returns were seen. A different analyst would draw some lines differently.
7. **Contamination.** Three company returns were known from headlines before the plan was committed.
8. **H4 timing.** The relationship graph was built while return data were being processed. The two tasks were separate, but the degree variable was not frozen before returns existed.

## About the financial data

1. **XBRL extraction is automated.** Tags differ between companies. We checked aggregates and large companies; individual errors are possible. Each company links to the filing used.
2. **Capex excludes finance leases.** This understates investment at companies that lease equipment.
3. **Debt is approximate.** Debt tags are inconsistent across filers; the basis used is published per company.
4. **Market values are approximate** (price × diluted weighted-average shares). Share-class structures and ADR ratios are handled for the cases we know.
5. **Foreign filers** (for example TSMC, ASML) have older or annual-only data and are flagged.
6. **Point in time.** Only filings made by 13 November are used. Nvidia's 17 November results are therefore not in its financial data.
7. **No financial data** exist in the SEC API for Anthropic, Cerebras, SpaceX and SK hynix ADR, or for SoftBank.

## About the relationship graph

1. **Disclosed is not complete.** The graph contains what companies disclosed and what we found. Absence of an edge means "not documented by us".
2. **Many large amounts come from news reports of filings**, not from the filings, because the SEC's document archive could not be fetched by our tools. 104 of 196 edges rest on news reporting; 87 on filings or company releases. Confidence grades are published. Several edges rest on headlines or summaries of paywalled articles.
3. **Amounts are not comparable in time.** A contract total may run for five or fifteen years. We do not discount or annualise.
4. **Ceilings are not commitments.** "Up to" figures are kept apart from contract totals but both appear in the "firm" total when the deal is ongoing; the split is published.
5. **Double counting.** We do not net reciprocal deals or trace the same dollars through intermediaries. Totals describe gross disclosed commitments.
6. **Private companies.** We make no claim about the profitability of OpenAI, Anthropic or other private or newly listed developers. Figures for them come from secondary reads of filings.

## About the scenario tool

It is arithmetic, not a model of behaviour. It ignores hedges, fixed-rate debt schedules, contract termination terms, equity raising, and every second-round effect. Its ranges are assumptions, not confidence intervals.

## About the publication

Static. It does not update. Raw price data are not redistributed. The site was built and tested by an AI system; see the corrections page to report errors.
