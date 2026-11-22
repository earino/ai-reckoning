# Findings

Final headline: **The crash followed the beta, not the bill.**

1. **The losses followed a number that existed before the crash.** Beta to the S&P 500, estimated through 30 September 2026, explains 80% of cross-company variation in returns on 20 November, 62% for the week and 75% from the 6 October peak (207 companies). An AI flag adds under 2 points. (`models.json` → `variance_decomposition`.)
2. **The infrastructure bill is not visible in the selloff.** Capex/revenue does not predict abnormal returns: −0.6 points per 100% of revenue, 95% bootstrap interval −3.0 to +1.1, n = 120. Fragile to dropping influential companies. (`H2_planned`.)
3. **The profit-collecting layer bore the losses.** AI-linked companies lost about $10.7tn of market value from the peak; about $7.3tn of that came from chip and hardware makers, whose equal-weight portfolio fell 22% beyond its beta. Capital providers fell 12% less than their beta implied. Role differences are the only planned test to survive Holm correction (p = 0.04). (`role_portfolios`, `market_value`, `H3_planned`.)
4. **Obligations concentrate in two barely-listed companies.** OpenAI or Anthropic is a party to 63% of $2.7tn of firm disclosed commitments (51%–76% under stricter source rules). Only $591bn is disclosed as paid. Nine pairs have money flowing both ways. (`relationships.json` → `summary`.)
5. **The benchmark is contaminated.** Against non-AI companies, the primary AI portfolio fell 44% more than expected from the peak and the S&P 500 itself 15% more. "AI or the market?" cannot be separated with these data. (`H1_alt_benchmarks_exploratory`.)

Original contribution: a pre-registered test, on a documented universe, showing that the popular "capex reckoning" account does not describe which stocks fell; a quantified statement of how much of the "AI crash" is pre-existing market sensitivity; and a status-separated, sourced map of AI commitments that keeps cash, contracts and promises apart.
