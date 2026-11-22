// Verify the deployed site. Usage: node scripts/verify-live.mjs <url> <screenshotDir>
import { chromium, devices } from "@playwright/test";
import fs from "node:fs";
const url = process.argv[2]; const dir = process.argv[3] ?? "screenshots"; fs.mkdirSync(dir, { recursive: true });
const args = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"];
const report = { url, checked_utc: new Date().toISOString(), checks: {}, errors: [] };
const ok = (k, v, detail = "") => { report.checks[k] = { pass: !!v, detail: String(detail) }; };
const res = await fetch(url); const html = await res.text();
ok("http_200", res.status === 200, res.status); ok("expected_html", html.includes("The AI Reckoning") && html.includes('id="root"'));
const assets = [...html.matchAll(/(?:src|href)="(\/ai-reckoning\/[^"]+)"/g)].map((m) => new URL(m[1], url).href);
const st = await Promise.all(assets.map(async (a) => [a, (await fetch(a)).status]));
ok("css_js_paths", st.length >= 2 && st.every(([, s]) => s === 200), st.map(([a, s]) => `${s} ${a.split("/").pop()}`).join("; "));
for (const mode of ["desktop", "mobile"]) {
  const browser = await chromium.launch({ args });
  const ctx = await browser.newContext(mode === "mobile" ? devices["Pixel 7"] : { viewport: { width: 1440, height: 900 } }); const page = await ctx.newPage();
  const errs = []; page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); }); page.on("pageerror", (e) => errs.push("pageerror " + e.message));
  const failed = []; page.on("response", (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
  // narrow screens: a step becomes active when its card enters the text area below the scene band; the reader then reads it just below the band
  const to = async (id, wait = 2800) => { for (const f of mode === "mobile" ? [0.58, 0.5] : [null]) { await page.evaluate(([sid, f]) => { const el = [...document.querySelectorAll(`[data-step="${sid}"]`)].pop(); const r = el.getBoundingClientRect(); window.scrollTo({ top: f == null ? window.scrollY + r.top + Math.min(r.height / 2, 450) - innerHeight / 2 : window.scrollY + r.top - innerHeight * f, behavior: "instant" }); }, [id, f]); await page.waitForTimeout(300); } await page.waitForTimeout(wait); };
  const shot = (n) => page.screenshot({ path: `${dir}/live-${mode}-${n}.png` });
  await page.goto(url, { waitUntil: "networkidle" }); await page.waitForSelector(".stage canvas"); await page.waitForTimeout(2000);
  ok(`${mode}_homepage`, (await page.locator("h1").innerText()).includes("The crash followed the beta")); await shot("01-home");
  if (mode === "mobile") {
    const band = await page.locator(".stage").boundingBox(); const h1 = await page.locator(".hero h1").boundingBox();
    ok("mobile_split_layout", band.y + band.height < page.viewportSize().height * 0.5 && h1.y >= band.y + band.height && (await page.locator(".hud-body").count()) === 0, `band bottom ${Math.round(band.y + band.height)}, headline top ${Math.round(h1.y)}`);
  }
  await to("fall", 9500); await shot("02-repricing");
  await to("network", 3500); await shot("03-network");
  if (mode === "mobile") await page.getByRole("button", { name: /Key: what am I/ }).click();
  const t = await page.locator(".hud-title").innerText();
  if (mode === "mobile") await page.locator(".hud-toggle").click();
  ok(`${mode}_chapter_transition`, t.includes("documented relationships") && page.url().includes("#chapter-2"), t);
  ok(`${mode}_network_canvas`, await page.evaluate(() => { const c = document.querySelector(".stage canvas"); return !!c && c.width > 0 && document.querySelectorAll(".label-layer .mark-label").length >= 3; }));
  if (mode === "mobile") await page.locator(".dock > summary").click();
  await page.getByLabel("Find a company").fill("NVDA — Nvidia"); await page.waitForSelector(".company-panel");
  const links = await page.locator(".company-panel .edge-src a").evaluateAll((as) => as.map((a) => a.href));
  ok(`${mode}_interactive_selection`, (await page.locator(".company-panel h3").innerText()).includes("Nvidia") && links.length > 5, `${links.length} source links`); await shot("04-selection");
  await page.keyboard.press("Escape"); if (mode === "mobile") { await page.locator(".company-panel .close").click({ timeout: 1500 }).catch(() => {}); await page.locator(".dock[open] > summary").click({ timeout: 1500 }).catch(() => {}); }
  await page.locator(".viewbar .expand").click(); await page.waitForTimeout(2500);
  { const b = await page.locator(".stage").boundingBox(); const v = page.viewportSize(); const l0 = await page.evaluate(() => [...document.querySelectorAll(".label-layer .axis-label")].find((e) => e.style.visibility === "visible")?.style.transform);
    await page.getByRole("button", { name: "Zoom in" }).click(); await page.waitForTimeout(400);
    const l1 = await page.evaluate(() => [...document.querySelectorAll(".label-layer .axis-label")].find((e) => e.style.visibility === "visible")?.style.transform);
    ok(`${mode}_expanded_view_and_zoom`, b.width >= v.width - 1 && b.height >= v.height - 1 && l0 !== l1, `${Math.round(b.width)}x${Math.round(b.height)}`); await shot("13-expanded"); }
  await page.locator(".viewbar .expand").click(); await page.waitForTimeout(500);
  await to("hubs"); await shot("05-hubs"); await to("landscape-adjusted"); await shot("06-landscape"); await to("verdict"); await shot("07-verdict");
  await to("observatory", 1200); await shot("08-observatory"); await to("simulator", 1200); await shot("09-simulator"); await to("findings", 1200); await shot("10-findings"); await to("explore"); await shot("11-explore");
  ok(`${mode}_no_horizontal_scroll`, await page.evaluate(() => document.scrollingElement.scrollWidth <= innerWidth + 1));
  await page.goto(url + "#/methodology", { waitUntil: "networkidle" }); await page.waitForSelector("main.doc h1");
  ok(`${mode}_methodology_link`, (await page.locator("main.doc h1").first().innerText()).includes("Methodology")); await shot("12-methodology");
  await page.goto(url + "#/sources", { waitUntil: "networkidle" }); await page.waitForSelector("table.data");
  ok(`${mode}_citations`, (await page.locator("table.data tbody tr").count()) > 400, await page.locator("table.data tbody tr").count());
  await page.goto(url + "?select=ORCL#chapter-5", { waitUntil: "networkidle" }); await page.waitForSelector(".company-panel"); await page.waitForTimeout(1200);
  ok(`${mode}_deep_link`, (await page.locator(".company-panel h3").innerText()).includes("Oracle") && (await page.evaluate(() => scrollY)) > 3000);
  ok(`${mode}_no_console_errors`, errs.length === 0, errs.slice(0, 3).join(" | ")); ok(`${mode}_no_missing_assets`, failed.length === 0, failed.slice(0, 3).join(" | "));
  await browser.close();
}
report.all_pass = Object.values(report.checks).every((c) => c.pass);
fs.writeFileSync(`${dir}/live-verification.json`, JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
process.exit(report.all_pass ? 0 : 1);
