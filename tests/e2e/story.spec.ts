import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("response", (r) => { if (r.status() >= 400 && r.url().startsWith(new URL(page.url() || "http://x").origin)) errors.push(`HTTP ${r.status()} ${r.url()}`); });
  return errors;
}
async function open(page: Page, path = "") {
  await page.goto(path, { waitUntil: "networkidle" });
  await page.waitForSelector("h1");
}
async function toStep(page: Page, id: string) {
  await page.evaluate((sid) => {
    const els = [...document.querySelectorAll<HTMLElement>(`[data-step="${sid}"]`)]; const el = els[els.length - 1]; const r = el.getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + r.top + Math.min(r.height / 2, 400) - window.innerHeight / 2, behavior: "instant" });
  }, id);
  await page.waitForTimeout(700);
}
const noHScroll = (page: Page) => page.evaluate(() => document.scrollingElement!.scrollWidth <= window.innerWidth + 1);

test("home page loads with headline, data and a 3D canvas, without errors", async ({ page }) => {
  const errors = watchErrors(page);
  await open(page);
  await expect(page).toHaveTitle(/AI Reckoning/);
  await expect(page.locator("h1")).toContainText("The crash followed the beta");
  await expect(page.locator(".hero .dek")).toContainText("$2.4tn");
  await expect(page.locator(".stage canvas")).toBeVisible();
  expect(await noHScroll(page)).toBe(true);
  expect(errors).toEqual([]);
});

test("chapter transitions change the analytical state and scrolling back restores it", async ({ page, isMobile }) => {
  await open(page);
  if (isMobile) await page.getByRole("button", { name: /Key: what am I/ }).click();
  await toStep(page, "peak");
  await expect(page.locator(".hud-title")).toContainText("6 October 2026");
  await toStep(page, "network");
  await expect(page.locator(".hud-title")).toContainText("documented relationships");
  await expect(page.locator(".hud")).toContainText("Documented facts");
  expect(new URL(page.url()).hash).toBe("#chapter-2");
  await toStep(page, "landscape-adjusted");
  await expect(page.locator(".hud")).toContainText("Model-adjusted");
  await toStep(page, "peak");
  await expect(page.locator(".hud-title")).toContainText("6 October 2026");
  await expect(page.locator(".hud")).toContainText("Observed prices");
});

test("time controls: scrub the date, pause, and switch percent to dollars", async ({ page, isMobile }) => {
  await open(page);
  await toStep(page, "question");
  if (isMobile) { await page.getByRole("button", { name: /Key: what am I/ }).click(); await page.locator(".dock > summary").click(); }
  const slider = page.getByLabel("Select date");
  await slider.fill("10");
  await expect(page.locator(".dock")).toContainText(/Date: 14 Oct/);
  await page.getByRole("button", { name: "Dollar change" }).click();
  await expect(page.locator(".hud")).toContainText("in dollars");
  await page.getByRole("button", { name: /Play time animation/ }).click();
  await expect(page.getByRole("button", { name: /Pause time animation/ })).toBeVisible();
  await page.getByRole("button", { name: /Pause time animation/ }).click();
  await expect(page.getByRole("button", { name: /Play time animation/ })).toBeVisible();
});

test("network: select a company by search and read sourced relationships", async ({ page, isMobile }) => {
  const errors = watchErrors(page);
  await open(page);
  await toStep(page, "network");
  await page.waitForTimeout(1500);
  if (isMobile) await page.locator(".dock > summary").click();
  await page.getByLabel("Find a company").fill("ORCL — Oracle");
  const panel = page.locator(".company-panel");
  await expect(panel).toBeVisible();
  await expect(panel.locator("h3")).toContainText("Oracle");
  await expect(panel).toContainText("Documented relationships");
  await expect(panel.locator(".edge-item").first()).toBeVisible();
  const href = await panel.locator(".edge-src a").first().getAttribute("href");
  expect(href).toMatch(/^https?:\/\//);
  await expect(panel).toContainText("Capex ÷ revenue");
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  if (!isMobile) {
    await page.locator(".filters summary").click();
    await page.getByRole("button", { name: "Debt financing" }).click();
    await expect(page.getByRole("button", { name: "Debt financing" })).toHaveAttribute("aria-pressed", "false");
    await page.getByRole("button", { name: "2D view" }).click();
    await expect(page.locator(".flat-stage svg")).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("event-study observatory: windows, models and a sortable table", async ({ page }) => {
  await open(page, "#observatory");
  const obs = page.locator(".observatory");
  await obs.scrollIntoViewIfNeeded();
  await expect(obs.locator(".readout")).toContainText("80%");
  await obs.getByRole("button", { name: "6 Oct peak → 20 Nov" }).click();
  await expect(obs.locator(".readout")).toContainText("75%");
  await obs.getByRole("button", { name: "Minus beta × S&P 500" }).click();
  await expect(obs.locator(".method-note").first()).toContainText("pre-specified main model");
  await obs.getByRole("button", { name: "Non-AI control portfolio" }).click();
  await expect(obs.locator(".groupchart")).toContainText("this group is the benchmark");
  await obs.getByRole("button", { name: /^Beta/ }).click();
  const first = await obs.locator("table.data tbody tr").first().locator("td").nth(1).innerText();
  await obs.getByRole("button", { name: /^Beta/ }).click();
  const firstDesc = await obs.locator("table.data tbody tr").first().locator("td").nth(1).innerText();
  expect(Number(first.replace("−", "-"))).toBeLessThan(Number(firstDesc.replace("−", "-")));
  expect(await obs.locator("table.data tbody tr").count()).toBeGreaterThan(200);
});

test("slowdown simulator: assumptions change the arithmetic and stay labelled hypothetical", async ({ page }) => {
  await open(page, "#chapter-5");
  const sim = page.locator(".simulator");
  await sim.scrollIntoViewIfNeeded();
  await expect(sim.locator(".hypo-banner")).toContainText("Hypothetical");
  const tile = sim.locator(".tile b").nth(2);
  const base = await tile.innerText();
  await sim.getByRole("button", { name: "Downside" }).click();
  await expect(tile).not.toHaveText(base);
  await sim.getByRole("button", { name: "Optimistic" }).click();
  await expect(tile).toHaveText("$0");
  await sim.getByRole("button", { name: "Unpaid model-developer contracts" }).click();
  await sim.locator("summary").click();
  await expect(sim.locator(".formulas")).toContainText("unknown, not zero");
});

test("transparency pages, citations and data downloads resolve", async ({ page, request, baseURL }) => {
  const errors = watchErrors(page);
  for (const [route, text] of [["methodology", "Methodology"], ["limitations", "Limitations"], ["data", "Data"], ["research-log", "Research log"], ["corrections", "Corrections"], ["about", "About this investigation"], ["fact-check", "Fact-check record"]]) {
    await open(page, `#/${route}`);
    await expect(page.locator("main h1").first()).toContainText(text);
  }
  await open(page, "#/sources");
  expect(await page.locator("table.data tbody tr").count()).toBeGreaterThan(400);
  expect(await page.locator(".timeline li").count()).toBeGreaterThan(30);
  await open(page, "#/data");
  const links = await page.locator('main a[href$=".json"]').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href));
  expect(links.length).toBe(11);
  for (const l of links) expect((await request.get(l)).status(), l).toBe(200);
  expect((await request.get(new URL("data/companies.json", baseURL).href)).ok()).toBe(true);
  expect(errors).toEqual([]);
});

test("deep links restore a chapter and a selection", async ({ page, isMobile }) => {
  await open(page, "?select=NVDA#chapter-3");
  await expect(page.locator(".company-panel h3")).toContainText("Nvidia");
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(2000);
  await open(page, "?view=landscape");
  await page.waitForTimeout(1200);
  if (isMobile) await page.locator(".dock > summary").click();
  await expect(page.locator(".dock").getByRole("button", { name: "Financial landscape" })).toHaveAttribute("aria-pressed", "true");
});

test("works without WebGL: flat views replace the 3D scene", async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, "?nowebgl=1");
  await expect(page.locator(".stage canvas")).toHaveCount(0);
  await toStep(page, "fall");
  await expect(page.locator(".flat-stage svg")).toBeVisible();
  await expect(page.locator(".fallback-note")).toContainText("flat version");
  await toStep(page, "network");
  await expect.poll(() => page.locator(".flat-stage svg line").count(), { timeout: 8000 }).toBeGreaterThan(100);
  await toStep(page, "verdict");
  await expect(page.locator(".flat-stage svg")).toContainText("fitted line");
  expect(errors).toEqual([]);
});

test("reduced motion: no autoplay, content still reachable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  await toStep(page, "fall");
  await expect(page.locator('.dock button[aria-label="Play time animation"]')).toHaveCount(1); // present and not auto-playing
  await expect(page.locator('[data-step="fall"] .card')).toContainText("The columns did not fall together");
});

test("no horizontal scrolling and no scroll trap through the whole story", async ({ page }) => {
  await open(page);
  for (const id of ["fall", "network", "verdict", "observatory", "simulator", "findings", "explore"]) { await toStep(page, id); expect(await noHScroll(page), id).toBe(true); }
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.move(600, 400); await page.mouse.wheel(0, -1500);
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.scrollY)).toBeLessThan(before);
});

test("accessibility: no critical or serious axe violations", async ({ page }) => {
  await open(page);
  for (const id of ["question", "network", "observatory", "simulator", "findings"]) {
    await toStep(page, id);
    const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    const bad = res.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(bad.map((v) => `${v.id}: ${v.nodes.length} nodes e.g. ${v.nodes[0]?.html.slice(0, 140)}`), id).toEqual([]);
  }
  await open(page, "#/methodology");
  const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
  expect(res.violations.filter((v) => v.impact === "critical" || v.impact === "serious").map((v) => v.id)).toEqual([]);
});

test("keyboard: skip link and focusable controls", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "hardware keyboard test");
  await open(page);
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip")).toBeFocused();
  await toStep(page, "question");
  await page.getByRole("button", { name: "Dollar change" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Dollar change" })).toHaveAttribute("aria-pressed", "true");
});
