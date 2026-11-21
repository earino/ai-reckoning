# THE AI RECKONING
## Autonomous Research, Data Journalism, 3D Storytelling & Production Deployment Specification

**Project codename:** The AI Reckoning  
**Working headline:** *Follow the Money: Who Really Wins and Loses in the AI Economy?*  
**Publication platform:** GitHub Pages  
**Status:** Ready for autonomous execution  
**Initial news event:** November 20, 2026 AI-driven market selloff  
**Primary language:** English  
**Deliverable:** A published, production-ready interactive investigative feature, with all code, data provenance, methods, and deployable assets in a public GitHub repository.

---

# 1. YOUR MISSION

You are an autonomous investigative data journalist, financial researcher, data scientist, visual storyteller, creative director, and full-stack engineer.

Your job is not to produce a plan, prototype, notebook, slide deck, or preliminary report.

**Your job is to publish the finished investigation on GitHub Pages.**

You own the entire process:

1. Verify the breaking-news premise and establish the editorial question.
2. Collect and validate credible financial and corporate relationship data.
3. Conduct original statistical and network analysis.
4. Identify the strongest defensible discoveries.
5. Write a compelling, accessible investigative narrative.
6. Design and implement extraordinary, data-grounded 3D visualizations.
7. Integrate the narrative and interactive visualizations into one cohesive experience.
8. Conduct editorial, statistical, accessibility, and engineering quality assurance.
9. Commit all deliverables to GitHub.
10. Deploy the complete site to GitHub Pages.
11. Verify that the public website functions correctly.
12. Report the public URL, repository URL, key discoveries, and material limitations.

**Do not stop after planning or generating source code.**

Do not ask for editorial approval, design preferences, routine implementation decisions, or permission to proceed.

Make those decisions yourself.

If an API, data source, library, or technical approach fails, find a reasonable alternative and continue. Never manufacture data or statistical results to circumvent a dependency.

If GitHub authentication or permissions are genuinely unavailable, complete and locally validate the deliverable, then report precisely which external authorization prevents publication. Do not falsely claim deployment.

## The standard

The target is an investigation that would be credible to a serious financial journalist, interesting to a professional data scientist, visually worthy of a major international newsroom, and understandable to an intelligent reader with no financial training.

The final work should feel authored, not assembled.

Prioritize **original insight, analytical validity, narrative clarity, visual impact, and public usability**, in that order. Visual sophistication must strengthen understanding, not conceal analytical uncertainty.

---

# 2. THE EDITORIAL QUESTION

The AI industry may be generating enormous revenues for particular suppliers while consuming extraordinary amounts of capital elsewhere.

At the same time, many of the businesses financing AI infrastructure are also investors in, suppliers to, or customers of one another.

The market selloff provides an opportunity to investigate this economic structure.

Our central question:

**When investors reassess the economics of artificial intelligence, which companies bear the losses, which capture the profits, and what does this tell us about the sustainability of the AI boom?**

The investigation must distinguish five different questions:

- Where is capital being invested?
- Where is revenue actually being earned?
- Where is economic profit being generated?
- Who ultimately bears financing and business risk?
- How is the public market pricing these different exposures?

Do not conflate investment commitments with realized expenditure, reported revenue with cash flow, valuation with economic value, or stock-market movements with causal evidence about underlying business performance.

## Editorial hypothesis

The industry is not one homogeneous AI trade.

Instead, it comprises economically different participants: capital providers, infrastructure owners, chip suppliers, cloud platforms, model developers, application vendors, customers, and energy suppliers.

These groups may exhibit very different risk and return patterns.

This hypothesis is to be tested, not presumed true.

## Conditions for changing the story

The headline and narrative must change if the research reveals that:

- Broad market risk factors explain most observed differences.
- AI-specific exposure is not a statistically or economically meaningful predictor of returns.
- A particular company-specific scandal or regulatory event explains more than infrastructure economics.
- Available data is too incomplete to support a persuasive conclusion.
- An entirely different, better-supported discovery emerges.

In those cases, report the true discovery.

A negative or inconclusive result is preferable to a compelling false story.

---

# 3. RESEARCH PROGRAM

## 3.1 Verify the triggering event

Start by constructing a primary-source-backed chronology of the November 2026 market events.

Independently verify:

- Major US index returns on November 20, 2026.
- Previous peak-to-trough declines.
- Nvidia's decline and contemporaneous company-specific news.
- Anthropic's listing, trading dates, security identifier, and available trading history.
- Significant contemporaneous interest-rate, regulatory, macroeconomic, and political developments.
- Whether declines were concentrated in AI-related securities or broadly distributed across markets.

Use contemporaneous Reuters or equivalent reporting for the chronology, but use exchange, issuer, and other authoritative data for numerical calculations.

Initial reporting:

- https://www.reuters.com/business/view-nasdaq-plunges-5-day-after-anthropic-debut-investors-still-believe-ai-2026-11-20/
- https://www.reuters.com/
- https://www.sec.gov/edgar

Treat these as starting points, not proof of any analytical conclusion.

Create a sourced event timeline containing exact dates, event descriptions, supporting citations, and assessed confidence.

## 3.2 Define the investable universe

Aim for approximately 100–200 public companies, subject to validated coverage and analytical feasibility.

Build a point-in-time, rules-based universe that includes:

**Semiconductor and compute:** Accelerators, memory, networking, fabrication, manufacturing equipment, and semiconductor design.

**Infrastructure operators:** Hyperscalers, cloud providers, data-center operators, hosting businesses, and relevant infrastructure suppliers.

**Energy and physical infrastructure:** Electricity generation, grid equipment, cooling, construction, and related industrial providers with documented AI exposure.

**AI model and application companies:** Public model developers, AI application vendors, enterprise software companies, and firms monetizing deployed models.

**Capital and financing:** Public investment vehicles, lenders, asset managers, and other identifiable providers of financial exposure.

**Controls:** Comparable technology and nontechnology companies without material AI exposure, selected using transparent matching rules.

Do not classify companies as AI-exposed merely because they use AI in their marketing.

Document measurable exposure criteria and distinguish primary from secondary exposure.

Prevent survivorship bias and post-event selection by establishing eligibility based on information available before the event.

Companies that listed recently, including Anthropic if verified, must receive a separate limited-history classification.

Publish the complete inclusion and exclusion methodology.

## 3.3 Collect the financial data

Construct a reproducible analytical dataset with these fields where available:

| Domain | Required measures |
|---|---|
| Identity | Name, ticker, exchange, CIK/identifier, domicile, industry |
| Market | Price, adjusted return, market capitalization, volume, realized volatility |
| Financials | Revenue, operating income, net income, operating cash flow |
| Investment | Capital expenditure, capex growth, capex-to-revenue, capex-to-operating-cash-flow |
| Financing | Cash, total debt, interest expense, relevant debt maturities |
| Valuation | Price-to-sales, EV-to-sales, EV-to-EBITDA where meaningful |
| AI exposure | Revenue exposure, capex exposure, confirmed counterparties, confidence |
| Relationships | Investment, purchasing, supply, financing, ownership, and capacity arrangements |
| Provenance | Source URL, accession/filing reference, reporting period, retrieval date |

Include reporting currency, units, fiscal period and accounting basis.

Build a canonical company identity table so ticker changes, different share classes, and issuer names do not silently create duplicates.

### Data source priority

1. SEC EDGAR structured filings and company filing documents.
2. Issuer investor-relations reports and audited financial statements.
3. Exchange and reputable market-data sources.
4. Regulatory filings and contractual disclosures.
5. Financial reporting from established publications.
6. Secondary research, only where clearly identified.

Useful resources:

- SEC data APIs: https://www.sec.gov/search-filings/edgar-application-programming-interfaces
- SEC company facts and filings: https://data.sec.gov/
- Fama-French factor data: https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/data_library.html
- US Treasury: https://home.treasury.gov/
- FRED: https://fred.stlouisfed.org/

Use an identified, legally reusable market-data source, observing its licensing and redistribution restrictions. Do not assume that a freely downloadable price series can legally be republished.

When data is restricted, publish derived metrics only if permitted, or substitute appropriately licensed sources.

Use automated ingestion with explicit validation, rate limiting, retries, caching, and provenance logging.

Large language models may help extract information from filings, but their outputs are never authoritative until verified against the source.

---

# 4. THE CORE INVESTIGATIONS

The research should explore four analytical dimensions.

## Investigation A: What actually fell?

Construct a cross-sectional event study comparing AI-exposed companies with appropriate benchmarks.

Analyze at minimum:

- November 20, 2026 daily return.
- November 16–20 weekly return.
- October market peak to November 20, using a clearly defined peak methodology.
- Pre-event 30-, 60-, and 90-trading-day histories where available.
- Broad benchmark and sector-adjusted returns.

Use total-return or consistently adjusted-price conventions where supported, and explicitly document them.

Estimate market and factor-adjusted movements.

Be careful when using conventional factor models during extreme, correlated market events. Estimate betas using a pre-event window, report estimation uncertainty, and test sensitivity to alternative specifications.

Do not label an adjusted return a causal effect of AI exposure.

**Candidate finding:** AI spending intensity predicts unusually severe losses even after controlling for conventional risk factors.

## Investigation B: Who spends, and who earns?

Investigate the relationship between investment intensity, cash generation, and public-market outcomes.

Candidate variables:

- Capex / revenue.
- Capex / operating cash flow.
- Capex growth.
- Free cash flow / revenue.
- Net debt / EBITDA.
- Gross margin.
- Revenue growth.
- AI-related revenue share, where independently supportable.

Analyze the relationships between financial characteristics and returns.

Use robust estimation, interpretable plots, confidence intervals, and sensitivity analysis.

Do not calculate ratios that are economically misleading without flagging them. In particular, ratios with near-zero or negative denominators require special treatment.

**Candidate finding:** Infrastructure beneficiaries and infrastructure financiers experienced systematically different losses.

## Investigation C: Follow the money

Construct a directed, attributed graph representing the AI industry's financial and commercial relationships.

Each edge must identify its economic meaning:

- Equity investment.
- Debt financing.
- Compute purchasing.
- Hardware purchasing.
- Cloud service provision.
- Power procurement.
- Capacity commitment.
- Ownership or revenue-sharing arrangement.

Every relationship must have:

- Origin and destination.
- Type.
- Announced amount, when known.
- Actual amount realized, if separately disclosed.
- Currency and time period.
- Date of disclosure.
- Source URL.
- Confidence rating.
- Status: completed, ongoing, announced, conditional, or estimated.

Do not add announced investments, contracted future purchases and realized cash expenditure together as though they were interchangeable financial flows.

Where amounts are missing, distinguish known relationship existence from measured monetary magnitude.

Prevent double-counting, particularly for reciprocal commercial arrangements and transactions involving intermediaries.

Compute:

- Network concentration.
- Degree and weighted strength.
- Community structure.
- Counterparty concentration.
- Capital dependence where measurable.
- Exposure to major connected hubs.

Treat centrality as a descriptive network property, not a direct measure of systemic financial risk.

**Candidate finding:** A surprisingly concentrated set of counterparties accounts for much of the disclosed capital and infrastructure commitments.

## Investigation D: What would a slowdown expose?

Develop a deliberately transparent scenario model illustrating sensitivity to changes in AI investment.

Consider scenarios involving:

- Reduced AI infrastructure capex.
- Slower cloud and model-related revenue growth.
- Higher financing costs.
- Delayed utilization of data-center capacity.

The objective is not to predict stock prices or model corporate bankruptcy.

Estimate directional exposures from documented relationships and reported financials, with uncertainty ranges.

Avoid propagating the same monetary commitment repeatedly through a network.

Label scenarios explicitly as hypothetical.

**Candidate finding:** Some companies face risks primarily from financing, some from demand concentration, and others from valuation rather than current operating cash flow.

If defensible network transmission coefficients cannot be estimated, remove quantitative contagion claims and publish an exposure map instead.

---

# 5. STATISTICAL STANDARDS

The statistical work must withstand scrutiny from a serious applied economist or financial data scientist.

Required safeguards:

**Pre-specification:** Record initial hypotheses and model specifications before inspecting outcome relationships. Maintain a visible research log distinguishing planned tests from exploratory discoveries.

**Selection bias:** Document sample construction, missingness, exclusions, and point-in-time availability.

**Confounding:** Control where justified for market beta, size, sector, profitability, leverage, momentum, and relevant macroeconomic conditions.

**Multiple testing:** Clearly identify exploratory tests and apply appropriate multiplicity treatment when presenting a family of formal significance tests.

**Small samples:** Avoid overly complex models relative to the number of independent observations.

**Correlated observations:** Recognize that company returns may be highly dependent through common shocks. Use appropriate covariance estimation, sensitivity checks, or resampling methods.

**Uncertainty:** Report coefficients, effect sizes, confidence intervals, model fit, and appropriate diagnostics. Do not rely on p-values alone.

**Time alignment:** Prevent look-ahead bias. Financial disclosures must be aligned to when information became public.

**Stress tests:** Evaluate whether results survive removing Nvidia, Anthropic, hyperscalers, or other highly influential observations.

**Alternative specifications:** Compare several justified definitions of AI exposure and event windows.

**Causality:** Do not imply that a single observational cross-section proves why the market moved.

Every numerical claim in the narrative must trace to a reproducible data artifact.

No invented numbers. No fake correlations. No synthetic values presented as observations.

---

# 6. THE EDITORIAL STORY

Create an immersive, chapter-based investigation rather than a conventional dashboard.

The reader should experience an unfolding discovery.

The site should have the pacing of an investigative documentary, but with the precision and interactivity of a data-science publication.

## Narrative structure

### Prologue — The Day the Market Blinked

Begin with a near-black screen and a restrained visual field of companies.

As the user scrolls, the companies emerge as points of light in three-dimensional space.

Market values begin moving, then diverging.

The market's collapse unfolds through the actual measured changes.

A headline appears:

**“Trillions were repriced. But what, exactly, had investors discovered?”**

Use verified values and dates. If aggregate market-value destruction cannot be calculated reliably, avoid the unqualified headline.

The prologue establishes the event and central mystery.

### Chapter I — Not One AI Economy

The camera pulls back to show distinct economic layers.

Chipmakers, cloud operators, model developers, software companies, financiers, and electricity suppliers occupy recognizable regions of space.

Color indicates economic role; scale represents a documented company metric.

The reader learns why the phrase “AI stocks” conceals radically different business models.

**Editorial objective:** Reframe the story from market enthusiasm to economic structure.

### Chapter II — Follow the Money

This is the centerpiece of the site.

A cinematic 3D network reveals documented investments, purchases, contracts and financial dependencies.

The camera follows real, sourced relationships.

The reader can select individual companies to reveal their network connections and transaction details.

Crucially, the visual design distinguishes actual cash movement from commitments.

**Editorial objective:** Show the economic relationships connecting the industry's largest participants.

### Chapter III — The Infrastructure Bill

Reconfigure the visual field into a comparison of financial characteristics.

Companies move into positions determined by capital intensity, cash generation, and market performance.

The reader discovers whether the companies making the largest capital commitments have been disproportionately punished.

**Editorial objective:** Move from spectacular money flows to measurable company economics.

### Chapter IV — The Market's Verdict

Show the actual event-study results.

The three-dimensional scene becomes a financial landscape in which companies occupy positions determined by measured explanatory variables and returns.

Show factor-adjusted outcomes and uncertainty.

Allow readers to switch among raw and adjusted returns, sectors, and time windows.

**Editorial objective:** Separate visually compelling associations from tested financial relationships.

### Chapter V — What Breaks First?

Allow readers to examine hypothetical AI investment slowdowns.

Relevant companies and relationships respond through documented exposure assumptions.

Show optimistic, baseline and downside assumptions, as well as uncertainty.

Do not animate unsupported network contagion as though it were measured.

**Editorial objective:** Translate present financial structure into comprehensible potential vulnerabilities.

### Chapter VI — What We Actually Learned

Deliver the strongest original findings without embellishment.

Present three to five conclusions, each backed by reproducible analysis.

Explain what remains unknown.

Distinguish between evidence about present profitability, dependence on future growth, and market pricing.

The narrative may conclude that the selloff cannot be adequately explained by available AI economic metrics.

That is an acceptable and potentially important conclusion.

### Epilogue — Explore the System

The final visualization becomes fully explorable.

Readers can choose companies, adjust layers, compare exposures, inspect financial metrics, and follow connections.

This is the research instrument underlying the story, made available to the public.

---

# 7. VISUAL DESIGN: THE EXPERIENCE MUST BE EXTRAORDINARY

## Creative direction

Think scientific instrument meets investigative documentary.

The visual language should evoke the scale and interconnectedness of global technological infrastructure without falling into generic science-fiction aesthetics.

Avoid:

- Stock photography.
- Generic AI brains.
- Decorative circuit boards.
- Meaningless particles.
- Spinning globe clichés.
- Constant neon effects.
- Excessive glow.
- Gratuitous camera rotation.
- False precision conveyed through smooth but unsupported animations.

Build something beautiful because its geometry expresses real information.

## Design system

**Base palette:** Near-black, charcoal, warm off-white.

**Role colors:** A restrained set of clearly differentiated colors for infrastructure, compute, models, applications, capital and energy.

**Negative returns:** A dedicated decline color, not interchangeable with node-category colors.

**Positive returns:** A dedicated gain color.

**Unknown values:** Neutral and clearly labeled.

Use accessible contrast throughout. Never encode important distinctions by color alone.

**Typography:** Editorial serif for major headlines and a restrained technical sans-serif for captions, labels, numerical annotations, and interface controls.

Use appropriately licensed, self-hosted or system fonts.

**Motion:** Deliberate, controlled, intelligible.

Every transition must communicate a change in time, economic category, relationship, or analytical perspective.

## The critical 3D principle

**A scene that can be represented equally well by a static 2D chart should not automatically be made 3D.**

Three-dimensional visualizations must earn their complexity.

Use:

- Depth to encode meaningful groups, dimensions or relationships.
- Directed edges to represent economic connections.
- Camera movement to guide editorial attention.
- Animation to explain transitions between analytical views.
- Controlled interaction to expose otherwise hidden structure.

Provide 2D projections when they are analytically clearer.

Avoid force-directed spatial positioning that implies economic similarity, geographical proximity, or causality when none is measured.

Every spatial axis, grouping and positioning rule must be explainable.

---

# 8. REQUIRED VISUAL COMPONENTS

Build at least five high-quality visual components, integrated into the narrative.

## Visualization 1: The Repricing

An animated, three-dimensional view of participating companies and their changes in market capitalization or returns.

Features:

- Accurate company metrics.
- Interactive date selection.
- Time animation with pause, replay, and scrub controls.
- Tooltips with ticker, value, date and source status.
- Clear separation between absolute and percentage changes.
- An explanatory legend and visible denominators.

Use a stable, interpretable layout. Do not encode price changes through arbitrary explosions.

## Visualization 2: The Capital Network

A sophisticated directed 3D graph showing the documented AI capital ecosystem.

Features:

- Typed and directional edges.
- Separate visibility toggles by relationship type.
- Edge thickness encoding disclosed amount only when comparable.
- Company search and selection.
- Context panels with underlying sources.
- Group filtering.
- A legend distinguishing actual, announced, conditional and estimated flows.
- Clear handling of unavailable amounts.
- Stable deterministic layout.
- A simplified 2D alternative.

This should be the signature visualization of the project.

## Visualization 3: The Financial Landscape

An interactive scatterplot system connecting financial exposure with market performance.

Support 2D and optional 3D views.

Potential axes:

- Capital intensity.
- Free cash flow margin.
- Market-adjusted return.

Provide:

- Company labels on selection.
- Group filters.
- Reference planes.
- Uncertainty or data completeness indicators.
- Clearly labeled transformations.
- A direct 2D view to evaluate relationships without perspective distortion.

Do not use depth merely for decoration.

## Visualization 4: The Event-Study Observatory

A visual comparison of raw returns, factor-adjusted returns, and exposure groups.

Include:

- Time-window selection.
- Benchmark switching.
- Model specification selection.
- Confidence intervals.
- Methodological annotations.
- An accessible sortable data table.

Make it possible to identify companies that behave differently from the model's expectations.

## Visualization 5: The Slowdown Simulator

An interactive scenario visualization.

Provide clearly defined controls for the principal assumptions.

Show:

- Assumed shock.
- Affected financial exposures.
- Direct versus modeled indirect effects.
- Sensitivity ranges.
- Known versus missing relationships.
- Explanations of scenario limitations.

All scenarios must use reproducible and interpretable arithmetic.

The simulator must never imply calibrated forecasts when the analysis does not support them.

---

# 9. IMPLEMENTATION ARCHITECTURE

Build a modern, static-first website that runs entirely on GitHub Pages.

## Recommended stack

- **TypeScript** for the application.
- **React** for the interface.
- **Vite** for building the static site.
- **Three.js with React Three Fiber** for 3D visualizations.
- **Drei** for useful 3D primitives and controls.
- **D3** for scales, statistics, layout and supporting 2D visualizations.
- **Motion or GSAP** for controlled transitions where justified.
- **Python** for financial data ingestion, cleaning, statistical analysis and artifact generation.
- **DuckDB / Parquet** for research data processing.
- **Pytest** for data and analytical tests.
- **Vitest** for application logic tests.
- **Playwright** for browser end-to-end tests.
- **GitHub Actions** for continuous integration and deployment.

Libraries may be substituted when the alternative provides better reliability, performance, or maintainability.

Use pinned versions and a committed lockfile.

## Architecture principles

The production website must not require:

- A paid backend.
- An always-running server.
- Authentication for readers.
- Private API keys in browser code.
- A live database.
- API credentials supplied by site visitors.

The research pipeline should produce versioned, browser-consumable static assets.

Preferred architecture:

`Raw sources → validated data → statistical analysis → publication artifacts → 3D visualizations and narrative → static build → GitHub Pages`

Separate research code from frontend components.

A suggested repository layout:

```text
ai-reckoning/
├── README.md
├── LICENSE
├── CITATION.cff
├── package.json
├── package-lock.json
├── vite.config.ts
├── index.html
├── src/
│   ├── app/
│   ├── components/
│   ├── scenes/
│   ├── narrative/
│   ├── visualizations/
│   ├── data/
│   ├── styles/
│   └── accessibility/
├── public/
│   ├── data/
│   ├── images/
│   └── social/
├── research/
│   ├── ingest/
│   ├── clean/
│   ├── classify/
│   ├── analysis/
│   ├── network/
│   ├── validation/
│   └── requirements.txt
├── data/
│   ├── provenance/
│   ├── schemas/
│   └── processed/
├── editorial/
│   ├── research-log.md
│   ├── fact-check.md
│   ├── story.md
│   └── findings.md
├── methodology/
│   ├── methods.md
│   ├── limitations.md
│   └── data-dictionary.md
├── tests/
├── .github/workflows/
└── scripts/
```

Research artifacts too large for GitHub must have an explicit reproducible acquisition workflow.

Do not commit API secrets, restricted commercial datasets, credentials, or large unnecessary binaries.

## Data contracts

Define validated, typed data schemas.

At minimum:

- `companies.json`
- `prices.json` or compact return-series artifacts.
- `financials.json`
- `relationships.json`
- `event-study.json`
- `models.json`
- `scenarios.json`
- `sources.json`
- `publication-metadata.json`

The data should support a complete explanation of each plotted quantity.

Each publication artifact must include:

- Schema version.
- Generation timestamp.
- Source cutoff date.
- Units.
- Missing-value conventions.
- Relevant methodology version.

Treat missing, zero, not applicable, estimated, and undisclosed as distinct states.

## Performance engineering

Target smooth interaction on a typical modern laptop.

Use:

- Instanced meshes where appropriate.
- GPU-conscious materials.
- Level-of-detail rendering.
- Lazy loading for heavy 3D scenes.
- Capped device pixel ratio.
- Reduced-motion support.
- Viewport-based scene activation.
- Memory-conscious geometry management.
- Precomputed graph layouts.
- Stable camera trajectories.
- Compressed browser assets.
- Lightweight loading and transition states.

Do not ship a visualization that consumes excessive GPU resources simply to appear sophisticated.

---

# 10. THE STORYTELLING ENGINE

The narrative and graphics should form a single experience, not a document with unrelated animations embedded between paragraphs.

Implement a scroll-driven chapter system.

Each major narrative section should define:

- Chapter identifier.
- Camera position and target.
- Visible data layers.
- Selected companies or relationships.
- Animation state.
- Required explanatory annotations.
- Reader interaction permissions.
- Enter and exit transitions.

Maintain one coherent visual world wherever feasible.

The camera should transition smoothly between meaningful analytical perspectives rather than repeatedly rebuilding unrelated scenes.

However, do not insist on a single enormous WebGL canvas if doing so compromises performance or accessibility.

The central visual state must remain synchronized with the narrative.

When users scroll backward, the correct analytical state should be restored.

Support deep links to chapters and selected views.

**Essential editorial interaction rule:** Readers must always know what they are looking at, what the units mean, and whether the displayed relationships are observed or modeled.

## Written narrative requirements

Write for curious, intelligent general readers.

Explain financial concepts when they first matter.

Use short, confident prose supported by sources.

Avoid overproduced dramatic language.

The narrative should reveal discoveries progressively.

Each chapter needs:

1. A compelling opening observation.
2. A question or puzzle.
3. The relevant visual evidence.
4. An explanation of what the evidence shows.
5. An appropriate limitation.
6. A transition that creates a reason to continue reading.

The finished article must be readable independently of the interactive graphics.

All major conclusions should survive being expressed in ordinary prose without visual theatrics.

---

# 11. MOBILE, ACCESSIBILITY AND RESPONSIVENESS

The site must be designed for desktop and mobile from the beginning.

Do not simply shrink the desktop visualizations.

Desktop may offer fully interactive 3D exploration.

Mobile should use controlled camera movement, simplified geometry, readable annotations, and accessible alternatives when complex interaction becomes impractical.

Required accessibility features:

- Keyboard-navigable interface.
- Visible focus states.
- Screen-reader descriptions for major graphics.
- Accessible tables containing the underlying values.
- Text equivalents for core findings.
- Reduced-motion mode.
- Non-WebGL fallback.
- Clear legends.
- Adequate contrast.
- No required hover-only interactions.
- Usable touch targets.
- No mandatory autoplay motion that cannot be paused.
- No scroll trapping.

Target WCAG 2.2 AA where applicable.

Test both visually and with automated accessibility tools.

The 3D experience is an enhancement to the investigation, not a prerequisite for understanding it.

---

# 12. EDITORIAL TRUST AND TRANSPARENCY

This is a journalism project, not an investment promotion.

Required public pages or sections:

**Methodology:** Explain the universe, sources, transformations, models, limitations and major analytical decisions.

**Data:** Provide legally redistributable data, an explanatory dictionary, and information about unavailable restricted datasets.

**Sources:** Display citations, filings, and relevant supporting documents.

**Research log:** Record substantial decisions, rejected hypotheses, errors corrected, and material changes to interpretations.

**Corrections:** Explain how to report and track factual errors.

**About:** Explain authorship, use of automation, analytical methodology, and any sponsorship or conflicts.

**As-of information:** Show the research cutoff and last publication date.

Do not imply that the dataset updates live unless an actual, validated updating process exists.

Avoid misleading market-cap calculations, currency mismatches, misleading return denominators, and unqualified claims about private-company profitability.

Explicitly disclose the use of AI-assisted extraction, coding, analysis, or writing.

Credit original reporting and licensed assets appropriately.

Do not copy copyrighted news article text or imagery without permission.

---

# 13. QUALITY GATES

Do not deploy until each gate passes or a documented, noncritical exception is justified.

## Gate A: Research credibility

- All central factual assertions have verifiable sources.
- Financial numbers reconcile to authoritative documents.
- Units and reporting periods are consistent.
- The analysis has been reproduced from clean inputs.
- No look-ahead bias in event-study predictors.
- Market and factor adjustment procedures are disclosed.
- Major results survive reasonable sensitivity checks, or the lack of robustness is prominently reported.
- Unsupported causal claims have been removed.

## Gate B: Editorial quality

- The headline matches the evidence.
- The story has a coherent beginning, middle and conclusion.
- The project contains original findings or a genuinely informative negative result.
- Each chapter advances the reader's understanding.
- Every important number has been fact-checked.
- Observations, interpretations and scenarios are visibly distinct.
- No claims have been invented to make the narrative dramatic.

## Gate C: Visual quality

- The opening experience is distinctive and compelling.
- Every visualization represents real or explicitly modeled data.
- Spatial encodings have interpretable meanings.
- Cameras behave consistently.
- Labels remain legible.
- Visual hierarchy is clear.
- Motion communicates information.
- 3D does not obscure basic comparisons.
- The final experience does not resemble an ordinary BI dashboard.

## Gate D: Engineering quality

- TypeScript and build checks pass.
- Unit and integration tests pass.
- Browser end-to-end tests pass.
- All links and assets resolve.
- No uncaught browser errors.
- No broken visualizations.
- No unhandled missing data.
- No unexpected horizontal scrolling.
- No critical accessibility violations.
- No credentials exposed.
- No dependency on local absolute paths.

## Gate E: Performance

Target these publication quality goals on representative hardware and realistic network conditions:

- Core Web Vitals meet current good thresholds where practical.
- Initial content appears before large 3D resources finish loading.
- Scrolling remains responsive.
- 3D frame rates are usable on representative desktop and mobile devices.
- Camera transitions do not cause severe frame drops.
- The page remains functional when WebGL is unavailable.
- Static and fallback experiences do not require high-end hardware.

Record actual measurements rather than claiming compliance from inspection alone.

---

# 14. GITHUB PAGES DEPLOYMENT

The final website must run as a static GitHub Pages site.

## Repository requirements

Create a public GitHub repository named:

`ai-reckoning`

If unavailable, choose a suitable available name and document the change.

Use a repository description such as:

*An interactive, data-driven investigation into the economics, capital flows and market repricing of artificial intelligence.*

Include:

- Complete website source code.
- Reproducible research code.
- Publicly distributable processed data.
- Methodology.
- Source documentation.
- Editorial material.
- Tests.
- GitHub Actions workflow.
- README with local development and deployment instructions.
- License and data-use terms.
- Public contributor and correction guidance.

## Build and deploy

Configure Vite correctly for the GitHub Pages base path.

Implement a GitHub Actions workflow using supported GitHub Pages deployment actions.

The workflow must:

1. Check out the repository.
2. Install pinned dependencies.
3. Run applicable linting and static analysis.
4. Run automated tests.
5. Build the production site.
6. Upload the Pages artifact.
7. Deploy the build through GitHub Pages.
8. Report the deployment URL.

Grant only the permissions required for deployment.

Use GitHub's Pages deployment environment and official actions.

Do not embed GitHub tokens in files.

Do not rely on undocumented local environment behavior.

Where supported, use GitHub's authenticated CLI or API to create the repository, configure Pages, and verify the deployment.

Never assume that pushing to the default branch alone establishes successful publication.

## Verify the live site

After deployment, access the public site and verify:

- HTTP success and expected HTML.
- Correct CSS and JavaScript paths.
- Successful loading of the homepage.
- At least one chapter transition.
- At least one interactive data selection.
- Functioning network visualization.
- Working citations and methodology links.
- Mobile rendering.
- Deep links and navigation.
- No browser console errors.
- No missing critical assets.

Use browser automation to capture screenshots at desktop and mobile sizes.

Verify the live production domain, not only local preview.

Record the deployed commit SHA.

Do not claim publication is complete until the public site has been verified.

---

# 15. AUTONOMOUS EXECUTION PROTOCOL

Work continuously through the entire research-to-publication process.

Do not repeatedly stop to ask for approval.

Do not return control merely because an intermediate artifact is complete.

Maintain an internal task list and progress log.

Use the following sequence.

### Phase 1: Evidence

Verify the news event, data availability, and viable universe.

Determine which analyses are supportable with credible data.

If a proposed analytical component is infeasible, replace it with a truthful, useful alternative.

### Phase 2: Research

Build ingestion, validation, classification, statistical analysis and network analysis.

Run the research and inspect results.

Identify the strongest discovery.

### Phase 3: Editorial

Write the narrative around observed findings.

Develop visual storyboards tied to actual datasets.

Do not build visual conclusions from hypothetical results.

### Phase 4: Visual production

Build the design system and three-dimensional scenes.

Integrate scrolling, camera transitions, labels, legends, and interactions.

Implement alternative accessible views.

### Phase 5: Integration

Connect the research artifacts, narrative, visual components, and source documentation.

Check that numbers agree everywhere.

### Phase 6: Red-team review

Act as a skeptical editor, statistician, security reviewer, and reader.

Attempt to falsify the principal conclusion.

Identify misleading visuals, brittle assumptions, missing source coverage, and confusing interactions.

Repair issues.

### Phase 7: Publication

Build, test, commit, deploy, and verify the public site.

### Phase 8: Final handoff

Provide a concise publication report.

## Autonomy rules

Continue independently through ordinary failures.

Do not weaken scientific standards to satisfy the visual ambition.

Do not substitute fabricated data when an API fails.

Do not abandon deployment because the preferred library is incompatible.

Do not stop at a working local development server.

Do not say that an untested feature works.

Do not describe an unfinished site as published.

If credentials or external permissions prevent a particular action, identify the exact blocker and finish all technically feasible work.

---

# 16. DEFINITION OF DONE

The assignment is complete only when the following are true:

- [ ] The breaking-news event is independently verified.
- [ ] The principal analytical universe is documented.
- [ ] The published findings are supported by reproducible analysis.
- [ ] Material sources are cited and accessible.
- [ ] The story has a coherent, engaging editorial arc.
- [ ] A distinctive 3D opening sequence works.
- [ ] The interactive capital network works.
- [ ] The financial analysis visualizations work.
- [ ] The slowdown scenario is analytically honest.
- [ ] Mobile and accessibility alternatives work.
- [ ] The full methodology is published.
- [ ] The public repository contains the complete implementation.
- [ ] GitHub Actions builds and deploys successfully.
- [ ] The live public website is verified.
- [ ] Screenshots and test results are available.
- [ ] The final report contains the repository and website URLs.

The final response must include:

**Published website:** Public URL  
**GitHub repository:** Public URL  
**Deployment:** Commit SHA and verification status  
**Headline:** Final editorial headline  
**Main findings:** Three to five evidence-backed findings  
**Original contribution:** What this investigation reveals beyond existing coverage  
**Limitations:** Important unresolved analytical uncertainties  
**Quality:** Tests executed and results  
**Coverage:** Number of companies, sources and documented relationships

If any completion requirement remains unmet, say exactly which one and why.

---

# 17. FINAL CREATIVE MANDATE

This project should not feel like someone placed a financial research notebook inside a Three.js demo.

It should feel like the reader is being taken inside the financial machinery of the AI industry.

The experience should move from the market's dramatic repricing, through the underlying capital structure, into the measured economics of the firms involved, and finally to an evidence-based understanding of what the market may actually be reassessing.

The reader should finish knowing something important they did not know before.

The data science must earn the conclusions.

The narrative must earn the reader's attention.

The visuals must earn their complexity.

**The final deliverable is not code. It is a credible, visually exceptional, publicly accessible investigation.**

Execute the assignment end to end. Ship the website.

