import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { BAND_ROLES, LAYER_Y, bandX, betaX, capexX, computeLayout, fcfZ, radiusFor } from "../../src/scenes/layouts";
import type { Entity } from "../../src/scenes/layouts";
import { guideSpec } from "../../src/scenes/guides";

const read = (n: string) => JSON.parse(readFileSync(`public/data/${n}.json`, "utf8")).data;
const companies = read("companies"), prices = read("prices"), fins = read("financials"), evs = read("event-study"), graph = read("relationships");
const nodeBy = new Map<string, any>(graph.nodes.map((n: any) => [n.id, n]));
const entities: Entity[] = companies.map((c: any) => ({ id: c.ticker, name: c.name, role: c.role, inUniverse: true, company: c, node: nodeBy.get(c.ticker),
  fin: fins.find((f: any) => f.ticker === c.ticker), ev: evs.find((e: any) => e.ticker === c.ticker), series: prices.series[c.ticker], mcapPeak: c.mcap_peak,
  degree: nodeBy.get(c.ticker)?.degree ?? 0, radius: radiusFor(c.mcap_peak, true) }));
for (const g of graph.nodes) if (!companies.some((c: any) => c.ticker === g.id)) entities.push({ id: g.id, name: g.name, role: g.role, inUniverse: false, node: g, mcapPeak: null, degree: g.degree, radius: radiusFor(null, false) });
const last = prices.dates.length - 1, peak = prices.dates.indexOf(prices.peak_date);
const opts = { dateIndex: last, window: "week" as const, model: "raw" as const };

describe("layouts", () => {
  it("is deterministic", () => {
    for (const v of ["field", "repricing", "layers", "network", "landscape", "verdict"] as const)
      expect(computeLayout(v, entities, opts)).toEqual(computeLayout(v, [...entities], opts));
  });
  it("repricing: height is the percent change since the peak and is zero at the peak", () => {
    const atPeak = computeLayout("repricing", entities, { ...opts, dateIndex: peak });
    const nv = entities.findIndex((e) => e.id === "NVDA");
    expect(atPeak[nv].y).toBe(0);
    const end = computeLayout("repricing", entities, opts);
    expect(end[nv].value).toBeCloseTo(prices.series.NVDA[last] / 100, 6);
    expect(end[nv].y).toBeCloseTo((prices.series.NVDA[last] / 100) * 10, 6);
    expect(end[nv].x).toBe(atPeak[nv].x); // columns never move: only the height changes
  });
  it("repricing dollars: value is market value change, not percent", () => {
    const abs = computeLayout("repricing", entities, { ...opts, absolute: true });
    const i = entities.findIndex((e) => e.id === "NVDA");
    expect(abs[i].value).toBeCloseTo((entities[i].mcapPeak! * prices.series.NVDA[last]) / 100, 0);
  });
  it("missing values are parked and dimmed, never plotted at zero", () => {
    const land = computeLayout("landscape", entities, opts);
    entities.forEach((e, i) => { if (e.inUniverse && e.fin?.capex_to_revenue == null) { expect(land[i].parked).toBe(true); expect(land[i].alpha).toBeLessThan(0.2); expect(land[i].value).toBeNull(); } });
    const verdict = computeLayout("verdict", entities, opts);
    const ant = entities.findIndex((e) => e.id === "ANT");
    expect(verdict[ant].parked).toBe(true); // limited history: no beta, so no position
  });
  it("layers: one height per role and unlisted entities appear only in the network", () => {
    const net = computeLayout("network", entities, opts), lay = computeLayout("layers", entities, opts);
    entities.forEach((e, i) => { if (e.role in LAYER_Y) expect(net[i].y).toBe(LAYER_Y[e.role]); if (!e.inUniverse) { expect(lay[i].alpha).toBe(0); expect(net[i].alpha).toBe(1); } });
  });
  it("verdict is flat and monotone in beta", () => {
    const v = computeLayout("verdict", entities, opts);
    expect(v.filter((p) => !p.parked).every((p) => p.z === 0)).toBe(true);
    expect(betaX(2)).toBeGreaterThan(betaX(1)); expect(capexX(1)).toBeGreaterThan(capexX(0.1)); expect(fcfZ(0.3)).toBeLessThan(fcfZ(-0.3));
  });
  it("role bands are evenly spaced and symmetric", () => {
    expect(bandX(BAND_ROLES[0])).toBeCloseTo(-bandX(BAND_ROLES[BAND_ROLES.length - 1]));
  });
  it("guides exist for every view and label the zero level", () => {
    for (const v of ["field", "repricing", "layers", "network", "landscape", "verdict"] as const) expect(guideSpec(v, opts, false, -0.08, { intercept: 0, slope: -0.05 }).ticks.length).toBeGreaterThan(3);
    expect(guideSpec("repricing", opts, false, null, null).ticks.some((t) => t.text.includes("6 Oct"))).toBe(true);
  });
});
