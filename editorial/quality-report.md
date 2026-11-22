# Quality report

Measured on 22 November 2026. Raw outputs are in `screenshots/` (`live-verification.json`, `performance.json`, `performance-gpu.json`, and 24 screenshots of the live site at desktop and mobile sizes).

## Tests

| Suite | Tool | Result |
|---|---|---|
| Data and analysis | pytest (`tests/research`) | 26 passed |
| Application logic | Vitest (`tests/unit`) | 13 passed |
| Browser end-to-end, desktop and mobile emulation | Playwright (`tests/e2e`) | 25 passed, 1 skipped (hardware-keyboard test on mobile) |
| Accessibility | axe-core in Playwright, WCAG 2.0/2.1/2.2 A and AA rules | 0 critical or serious violations on 6 page states, both sizes |
| Static analysis | TypeScript strict mode | 0 errors |
| Build checks | `scripts/check-data.mjs` | assets resolve, data headers complete, no local paths or credentials |
| Continuous integration | GitHub Actions | all of the above run before each deployment |
| Live site | `scripts/verify-live.mjs` | 23 of 23 checks passed |

The live checks cover: HTTP 200 and expected HTML; CSS and JavaScript paths; homepage; a chapter transition; an interactive selection with source links; the network scene; methodology and citation pages; a deep link; no horizontal scrolling; no console errors; no failed requests. Each ran at 1440×900 and with a Pixel 7 profile.

## Performance (live site)

| Measure | Desktop | Mobile profile (9 Mbit/s, 85 ms latency, 4× CPU slowdown) |
|---|---|---|
| First contentful paint | 0.4 s | 1.1 s |
| Largest contentful paint | 1.0 s | 1.5 s |
| Cumulative layout shift | 0.026 | 0.000 |
| Headline visible | 0.5 s | 0.8 s |
| Article text visible | 0.5 s | 1.7 s |
| 3D canvas present | 0.8 s | 1.7 s |
| Transfer size (content-length sum) | 638 KB | 638 KB |

LCP and CLS are inside the "good" Core Web Vitals thresholds (2.5 s, 0.1) in both profiles. Interaction-to-next-paint was not measured.

Frame rates:

| Scene | Real GPU (Apple M4 Max, Metal), desktop | Same, 4× CPU slowdown | Software rendering, no GPU |
|---|---|---|---|
| Repricing, idle | 50 fps | 58 fps | 17–24 fps |
| Transition to network | 52 fps | 54 fps | 12–17 fps |
| Network, settled | 60 fps | 60 fps | 11–14 fps |
| Transition to landscape | 59 fps | 60 fps | 13–20 fps |

## What these measurements do not show

- **No physical phone or mid-range laptop was tested.** The GPU figures come from a high-end laptop. The software-rendering figures are a floor for machines with no usable GPU; on those, the "2D view" button and the automatic non-WebGL fallback give the same content without 3D.
- Mobile results use device emulation, not a real device.
- Screen-reader behaviour was checked by automated rules and markup review, not with a human using a screen reader.

## Known non-critical exceptions

- The three.js bundle is 1.18 MB (323 KB compressed). It is preloaded but does not block the headline or text.
- Four cited article links were dead at publication (see Limitations).
- Contrast and target-size rules pass automated checks; some 3D axis labels are small on phones, where the 2D view is the recommended reading mode.
