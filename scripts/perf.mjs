// Measure real loading and rendering numbers. Usage: node scripts/perf.mjs <url> [out.json]
import { chromium, devices } from "@playwright/test";
import fs from "node:fs";
const url = process.argv[2] ?? "http://localhost:4173/ai-reckoning/"; const out = process.argv[3] ?? "test-results/performance.json";
const gpu = process.env.PERF_GPU === "1"; // PERF_GPU=1 uses the machine's real GPU (new headless mode) instead of software GL
const args = gpu ? ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"];
const profiles = {
  desktop: { ctx: { viewport: { width: 1440, height: 900 } }, net: null, cpu: 1 },
  "mobile-4g-4xcpu": { ctx: { ...devices["Pixel 7"] }, net: { offline: false, downloadThroughput: (9e6 / 8), uploadThroughput: (2e6 / 8), latency: 85 }, cpu: 4 },
};
const results = {};
for (const [name, prof] of Object.entries(profiles)) {
  const browser = await chromium.launch({ args, ...(gpu ? { channel: "chromium", headless: true } : {}) }); const ctx = await browser.newContext(prof.ctx); const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  if (prof.net) await cdp.send("Network.emulateNetworkConditions", prof.net);
  if (prof.cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: prof.cpu });
  await page.addInitScript(() => {
    window.__m = { lcp: 0, cls: 0, longTasks: 0 };
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__m.cls += e.value; }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.longTasks += Math.max(0, e.duration - 50); }).observe({ type: "longtask", buffered: true });
  });
  let bytes = 0; page.on("response", async (r) => { try { bytes += Number(r.headers()["content-length"] ?? 0); } catch {} });
  const t0 = Date.now();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("h1"); const h1 = Date.now() - t0;
  await page.waitForSelector(".hero .dek"); const text = Date.now() - t0;
  await page.waitForSelector(".stage canvas", { timeout: 60000 }); const canvas = Date.now() - t0;
  await page.waitForLoadState("networkidle");
  const fcp = await page.evaluate(() => performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? null);
  const fps = async (label, act) => { await act(); return [label, await page.evaluate(() => new Promise((res) => { let n = 0, worst = 0, last = performance.now(); const t = last; const f = (now) => { n++; worst = Math.max(worst, now - last); last = now; if (now - t < 2500) requestAnimationFrame(f); else res({ fps: Math.round((n / (now - t)) * 1000), worstFrameMs: Math.round(worst) }); }; requestAnimationFrame(f); }))]; };
  const to = (id) => page.evaluate((sid) => { const el = [...document.querySelectorAll(`[data-step="${sid}"]`)].pop(); const r = el.getBoundingClientRect(); window.scrollTo(0, window.scrollY + r.top + 300 - innerHeight / 2); }, id);
  const frames = Object.fromEntries([await fps("idle_repricing", () => to("peak")), await fps("transition_to_network", () => to("network")), await fps("network_settled", async () => {}), await fps("transition_to_landscape", () => to("landscape"))]);
  const m = await page.evaluate(() => window.__m);
  results[name] = { url, time_to_headline_ms: h1, time_to_article_text_ms: text, time_to_3d_canvas_ms: canvas, fcp_ms: fcp && Math.round(fcp), lcp_ms: Math.round(m.lcp), cls: Number(m.cls.toFixed(4)),
    long_task_blocking_ms: Math.round(m.longTasks), transferred_kb_content_length: Math.round(bytes / 1024), frames, renderer: await page.evaluate(() => { const g = document.createElement("canvas").getContext("webgl2"); const e = g?.getExtension("WEBGL_debug_renderer_info"); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : "unknown"; }) };
  await browser.close();
}
fs.mkdirSync("test-results", { recursive: true }); fs.writeFileSync(out, JSON.stringify({ measured_utc: new Date().toISOString(), results }, null, 1));
console.log(JSON.stringify(results, null, 1));
