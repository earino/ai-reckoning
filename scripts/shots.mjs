// Walk the story and capture screenshots of each step. Usage: node scripts/shots.mjs <baseUrl> <outDir> [mobile]
import { chromium, devices } from "@playwright/test";
import fs from "node:fs";
const [base = "http://localhost:5173/", out = "screenshots", mode = "desktop"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext(mode === "mobile" ? { ...devices["iPhone 13"] } : { viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message));
await page.goto(base, { waitUntil: "networkidle" });
await page.waitForSelector("[data-step]");
await page.waitForTimeout(2500);
const ids = await page.$$eval("[data-step]", (els) => els.map((e) => e.dataset.step));
let i = 0;
for (const id of ids) {
  // narrow screens: a step is active when its card enters the text area below the scene band; then read it just below the band
  for (const f of mode === "mobile" ? [0.86, 0.5] : [null]) {
    await page.evaluate(([sid, frac]) => { const els = [...document.querySelectorAll(`[data-step="${sid}"]`)]; const el = els[els.length - 1]; const r = el.getBoundingClientRect();
      window.scrollTo({ top: frac == null ? window.scrollY + r.top + Math.min(r.height / 2, 500) - window.innerHeight / 2 : sid === "hero" ? 0 : window.scrollY + r.top - window.innerHeight * frac, behavior: "instant" }); }, [id, f]);
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(id === "fall" ? 11000 : 3200);
  await page.screenshot({ path: `${out}/${mode}-${String(i++).padStart(2, "0")}-${id}.png` });
}
console.log(JSON.stringify({ steps: ids, errors: [...new Set(errors)].slice(0, 12) }, null, 1));
await browser.close();
