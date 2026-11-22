# The AI Reckoning

**The crash followed the beta, not the bill.** An interactive, data-driven investigation into the economics, capital flows and market repricing of artificial intelligence after the 20 November 2026 selloff.

- Live site: <https://earino.github.io/ai-reckoning/>
- Methods: [`methodology/methods.md`](methodology/methods.md) · Limitations: [`methodology/limitations.md`](methodology/limitations.md)
- Findings: [`editorial/findings.md`](editorial/findings.md) · Research log: [`editorial/research-log.md`](editorial/research-log.md)
- Tests, performance and live verification: [`editorial/quality-report.md`](editorial/quality-report.md) · Screenshots: [`screenshots/`](screenshots/)
- The article as plain text: [`editorial/story.md`](editorial/story.md)

This work was produced by an AI system (Claude) from a written brief ([`brief.md`](brief.md)). See [`editorial/about.md`](editorial/about.md) for authorship and a conflict-of-interest statement.

## What is here

```
research/      Python: ingestion, cleaning, network, analysis, publication artifacts
data/          provenance (sourced timeline and relationships), processed outputs
public/data/   versioned JSON artifacts consumed by the site
src/           TypeScript + React + three.js (react-three-fiber) site
methodology/   methods, limitations, data dictionary (rendered on the site)
editorial/     research log, findings, fact-check, about, story text
tests/         pytest (research), vitest (logic), Playwright (browser, accessibility)
```

Pipeline: raw sources → validated data → statistical analysis → publication artifacts → 3D visualisation and narrative → static build → GitHub Pages.

## Run the site locally

```
npm ci
npm run dev            # http://localhost:5173/ai-reckoning/
npm run build          # type-check and build to dist/
npm test               # unit tests
npx playwright install chromium && npm run e2e
```

Set `VITE_BASE=/` to serve from the root of a domain.

## Reproduce the research

Requires Python 3.12 and [uv](https://docs.astral.sh/uv/). Network access to `data.sec.gov` and Yahoo Finance.

```
uv venv --python 3.12 research/.venv
uv pip install --python research/.venv/bin/python -r research/requirements.txt
(cd research/ingest && ../.venv/bin/python prices.py && ../.venv/bin/python sec.py)
research/.venv/bin/python research/clean/fundamentals.py
research/.venv/bin/python research/network/build_graph.py
research/.venv/bin/python research/analysis/panel.py
research/.venv/bin/python research/analysis/tests.py
research/.venv/bin/python research/analysis/publish.py
research/.venv/bin/python -m pytest tests/research
```

Raw prices (Yahoo Finance) are not redistributable and are not in this repository; the scripts above download them to `data/raw/` (git-ignored). The published files contain derived statistics only.

## Deployment

`.github/workflows/deploy.yml` type-checks, tests, builds and deploys to GitHub Pages on every push to `main`, using the official Pages actions with minimal permissions.

## Licence and data terms

Code: MIT ([`LICENSE`](LICENSE)). Text, graphics and derived data: CC BY 4.0. SEC data are in the public domain. Linked articles belong to their publishers.

## Corrections and contributions

See [`CORRECTIONS.md`](CORRECTIONS.md) and [`CONTRIBUTING.md`](CONTRIBUTING.md). This is journalism, not investment advice.
