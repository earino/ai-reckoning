// Post-build checks: every asset referenced by dist/index.html exists, all data files are present and parse,
// no local absolute paths or secrets leaked into the build.
import fs from "node:fs";
import path from "node:path";

const dist = "dist"; let fail = 0;
const bad = (m) => { console.error("FAIL " + m); fail++; };
const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const base = "/ai-reckoning/";
for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const u = m[1]; if (u.startsWith("http") || u.startsWith("data:") || u.startsWith("#")) continue;
  if (!u.startsWith(process.env.VITE_BASE ?? base)) bad(`asset path does not use the Pages base path: ${u}`);
  const f = path.join(dist, u.replace(process.env.VITE_BASE ?? base, ""));
  if (!fs.existsSync(f)) bad(`missing asset ${u}`);
}
const names = ["companies", "prices", "financials", "relationships", "event-study", "models", "scenarios", "sources", "timeline", "story-numbers", "publication-metadata"];
for (const n of names) {
  const f = path.join(dist, "data", `${n}.json`);
  if (!fs.existsSync(f)) { bad(`missing data file ${n}.json`); continue; }
  const d = JSON.parse(fs.readFileSync(f, "utf8"));
  for (const k of ["schema_version", "generated_utc", "source_cutoff_date", "units", "missing_value_convention", "methodology_version", "data"]) if (!(k in d)) bad(`${n}.json lacks ${k}`);
}
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const secret = /(gh[pousr]_[A-Za-z0-9]{30,}|sk-[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY)/;
for (const f of walk(dist)) {
  const t = fs.readFileSync(f, "utf8");
  if (t.includes("/Users/") || t.includes("C:\\Users\\")) bad(`local absolute path in ${f}`);
  if (secret.test(t)) bad(`possible credential in ${f}`);
}
const total = walk(dist).reduce((a, f) => a + fs.statSync(f).size, 0);
console.log(`checked ${walk(dist).length} files, ${(total / 1e6).toFixed(2)} MB`);
if (fail) process.exit(1);
console.log("OK");
