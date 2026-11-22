# Quality report

Measured on 22 November 2026. Raw outputs are in `screenshots/` (`live-verification.json`, `performance.json`, `performance-gpu.json`, and 24 screenshots of the live site at desktop and mobile sizes).

## Tests

| Suite | Tool | Result |
|---|---|---|
| Data and analysis | pytest (`tests/research`) | 26 passed |
| Application logic | Vitest (`tests/unit`) | 13 passed |
| Browser end-to-end, desktop and mobile emulation | Playwright (`tests/e2e`) | 32 passed, 4 skipped (hardware-keyboard and mouse-drag tests on mobile; two narrow-layout tests on desktop) |
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

## Layout revision, 22 November 2026 (after first publication)

A reader review found two display defects. No data, analysis or text changed.

- **First screen, wide displays.** The 3D scene was drawn behind the introduction and made it hard to read. The scene now sits beside the text, the text has an opaque side, and the column labels are hidden until the first scroll step. A test checks that nothing is drawn behind the headline and introduction.
- **Narrow displays (820 px and less).** Text cards, the key and the controls were stacked on top of the scene. The scene now has a fixed band in the top 46% of the screen and the text scrolls below it on an opaque background. The key and the controls are closed at load and open as sheets over the text area. The camera uses a wider field of view and nearer positions for the near-square band. A menu gives all six site links. Tests check that the card text is not covered, that the buttons stay in the scene band, and that the column labels are inside the band.
- Checked in emulation at 360, 390, 412 and 430 px wide and at 1440 px. A physical phone was not tested.

### Second revision, same day: full-screen view and camera tools

- **Expanded view.** One button (or, on a phone, a tap on the scene) gives the scene the whole screen, in portrait or landscape. The key, the controls and company selection stay available. Escape or Close returns to the story.
- **Camera.** Drag rotates in every chapter (before, only in some). Zoom in, zoom out and reset buttons are on every 3D view. Pinch on a trackpad or Ctrl + wheel zooms; a plain wheel still scrolls the page. In the expanded view the wheel or a pinch zooms, and right-drag or two fingers pans.
- **Touch screens.** In the story, a drag scrolls the page, so the camera moves only in the expanded view. This is deliberate.
- Tests cover drag rotation, zoom, reset and the expanded view on both profiles. Touch gestures (pinch, two-finger pan) are provided by the three.js orbit controls and were not exercised by an automated test or on a physical phone.

### Third revision, same day: continuous text on narrow screens

- The empty space between text cards on narrow screens was removed. That space is useful on wide screens, where it shows the scene between cards; on a phone the scene is already fixed above the text. The text is now one continuous article, and the scene changes when a card reaches a line a short distance below the scene band.
- The explorer card stays below the band while the section before it scrolls off the scene.
