// Export the rendered article text (numbers filled in from data) to editorial/story.md, so the story is readable without graphics.
import { chromium } from "@playwright/test";
import fs from "node:fs";
const base = process.argv[2] ?? "http://localhost:5173/";
const b = await chromium.launch(); const p = await b.newPage();
await p.goto(base + "?nowebgl=1", { waitUntil: "networkidle" }); await p.waitForSelector("[data-step]");
const md = await p.evaluate(() => {
  const out = [];
  const walk = (el) => {
    for (const c of el.children) {
      if (c.matches(".observatory, .simulator, nav, .scroll-cue, svg, .controls, button")) { if (c.matches(".observatory")) out.push("*[Interactive event-study observatory: see the site.]*"); if (c.matches(".simulator")) out.push("*[Interactive slowdown simulator: see the site.]*"); continue; }
      const t = c.innerText?.trim().replace(/\s+/g, " ");
      if (c.matches("h1")) out.push(`# ${t}`); else if (c.matches("h2")) out.push(`## ${t}`); else if (c.matches("h3")) out.push(`### ${t}`);
      else if (c.matches("p.kicker")) out.push(`*${t}*`); else if (c.matches("p")) out.push(t);
      else if (c.matches("li") && !c.querySelector("h3, p")) out.push(`- ${t}`); else walk(c);
    }
  };
  walk(document.querySelector("main.scroll"));
  return out.filter(Boolean).join("\n\n");
});
fs.writeFileSync("editorial/story.md", `<!-- Generated from the rendered site by scripts/export-story.mjs. Do not edit by hand. -->\n\n${md}\n`);
console.log(md.length, "chars;", md.split("\n\n").length, "blocks");
await b.close();
