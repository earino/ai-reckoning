/**
 * Deterministic layouts. Every axis has a stated meaning (see AXES); nothing is force-directed.
 * Pure functions: unit-tested in tests/unit/layouts.test.ts.
 */
import type { Company, EventRow, Financial, GNode, ModelKey, Role, WindowKey } from "../data/types";

export type ViewKey = "field" | "repricing" | "layers" | "network" | "landscape" | "verdict";
export interface Entity {
  id: string; name: string; role: Role; inUniverse: boolean; company?: Company; node?: GNode; fin?: Financial; ev?: EventRow;
  series?: (number | null)[]; mcapPeak: number | null; degree: number; radius: number;
}
export interface LayoutOpts { dateIndex: number; window: WindowKey; model: ModelKey; absolute?: boolean }
export interface Placement { x: number; y: number; z: number; alpha: number; parked: boolean; value: number | null }

export const BAND_ROLES: Role[] = ["capital", "models_apps", "infrastructure", "compute", "energy", "control_tech", "control_other"];
export const LAYER_Y: Record<string, number> = { capital: 4.4, models_apps: 2.2, infrastructure: 0, compute: -2.2, energy: -4.4 };
export const BAND_SPACING = 3.3;
export const RETURN_SCALE = { repricing: 10, day: 30, week: 22, peak: 9 } as const; // world units per 100%
export const GOLDEN = 2.399963229728653;

export const AXES: Record<ViewKey, { x: string; y: string; z: string }> = {
  field: { x: "Economic role (seven groups)", y: "Flat: no measurement yet", z: "Rank by market value inside the group" },
  repricing: { x: "Economic role (seven groups)", y: "Percent change in share price since the 6 October record close", z: "Rank by market value inside the group" },
  layers: { x: "Spiral position: more documented counterparties nearer the centre", y: "Layer of the money chain: capital at the top, power at the bottom", z: "Spiral position" },
  network: { x: "Spiral position: more documented counterparties nearer the centre", y: "Layer of the money chain: capital at the top, power at the bottom", z: "Spiral position" },
  landscape: { x: "Capital spending divided by revenue (log scale)", y: "Share-price return in the selected window", z: "Free cash flow divided by revenue" },
  verdict: { x: "Beta to the S&P 500 before the selloff", y: "Share-price return in the selected window", z: "Not used (flat view)" },
};

export function bandX(role: Role): number {
  const i = BAND_ROLES.indexOf(role);
  return (i < 0 ? BAND_ROLES.length : i) * BAND_SPACING - ((BAND_ROLES.length - 1) * BAND_SPACING) / 2;
}
export function capexX(capexToRevenue: number): number {
  const c = Math.min(3, Math.max(0.003, capexToRevenue));
  return ((Math.log10(c) + 2.5229) / 3) * 13 - 6.5; // 0.3% -> -6.5, 300% -> +6.5
}
export function fcfZ(fcfMargin: number): number {
  return -Math.min(0.6, Math.max(-1.5, fcfMargin)) * 5; // positive cash flow is nearer the viewer's far side
}
export function betaX(beta: number): number {
  return Math.min(6, Math.max(-0.6, beta)) * 2.1 - 5;
}
export function radiusFor(mcap: number | null, inUniverse: boolean): number {
  if (!inUniverse) return 0.13;
  if (mcap == null) return 0.09;
  return 0.07 + 0.3 * Math.sqrt(Math.min(mcap, 6e12) / 6e12);
}
export function windowValue(ev: EventRow | undefined, w: WindowKey, m: ModelKey): number | null {
  if (!ev) return null;
  return ev[w][m] ?? null;
}

function rankWithin(entities: Entity[], key: (e: Entity) => number): Map<string, number> {
  const out = new Map<string, number>();
  const groups = new Map<string, Entity[]>();
  for (const e of entities) { const g = groups.get(e.role) ?? []; g.push(e); groups.set(e.role, g); }
  for (const g of groups.values()) {
    g.sort((a, b) => key(b) - key(a) || a.id.localeCompare(b.id));
    g.forEach((e, i) => out.set(e.id, i));
  }
  return out;
}

export function computeLayout(view: ViewKey, entities: Entity[], opts: LayoutOpts): Placement[] {
  const uni = entities.filter((e) => e.inUniverse);
  const mcRank = rankWithin(uni, (e) => e.mcapPeak ?? 0);
  const counts = new Map<string, number>();
  for (const e of uni) counts.set(e.role, (counts.get(e.role) ?? 0) + 1);
  const degRank = rankWithin(entities, (e) => e.degree * 1e15 + (e.mcapPeak ?? 0));
  const COLS = 4;
  let parkedI = 0;
  return entities.map((e): Placement => {
    const hidden: Placement = { x: 0, y: 0, z: 0, alpha: 0, parked: true, value: null };
    if (view === "field" || view === "repricing") {
      if (!e.inUniverse) return { ...hidden, x: bandX("other"), y: 0 };
      const k = mcRank.get(e.id) ?? 0; const rows = Math.ceil((counts.get(e.role) ?? 1) / COLS);
      const x = bandX(e.role) + ((k % COLS) - (COLS - 1) / 2) * 0.62;
      const z = (Math.floor(k / COLS) - (rows - 1) / 2) * 0.62;
      if (view === "field") return { x, y: 0, z, alpha: 0.85, parked: false, value: null };
      const v = e.series?.[opts.dateIndex] ?? null;
      if (v == null) return { x, y: 0, z, alpha: 0.12, parked: true, value: null };
      if (opts.absolute) {
        const usd = e.mcapPeak != null ? (e.mcapPeak * v) / 100 : null; // change in market value since the peak, USD
        if (usd == null) return { x, y: 0, z, alpha: 0.12, parked: true, value: null };
        return { x, y: (usd / 1e12) * 2.2, z, alpha: 1, parked: false, value: usd };
      }
      return { x, y: (v / 100) * RETURN_SCALE.repricing, z, alpha: 1, parked: false, value: v / 100 };
    }
    if (view === "layers" || view === "network") {
      const isCtrl = e.role === "control_tech" || e.role === "control_other";
      if (isCtrl) {
        const k = mcRank.get(e.id) ?? 0; const off = e.role === "control_tech" ? 0 : Math.PI;
        const ang = off + (k / 48) * Math.PI * 0.9 - 0.45 * Math.PI;
        return { x: Math.cos(ang) * 10.5, y: -6.6, z: Math.sin(ang) * 10.5, alpha: view === "layers" ? 0.3 : 0.06, parked: true, value: null };
      }
      if (!e.inUniverse && view === "layers") return { ...hidden, y: LAYER_Y[e.role] ?? 0 };
      const k = degRank.get(e.id) ?? 0;
      const rad = 0.78 * Math.sqrt(k + 0.4);
      const y = LAYER_Y[e.role] ?? 0;
      const alpha = view === "network" ? (e.degree > 0 ? 1 : 0.1) : 0.95;
      return { x: rad * Math.cos(k * GOLDEN), y, z: rad * Math.sin(k * GOLDEN), alpha, parked: view === "network" && e.degree === 0, value: e.degree };
    }
    const park = (): Placement => {
      const i = parkedI++;
      return { x: 9.2 + (i % 6) * 0.42, y: -7.2, z: -4 + Math.floor(i / 6) * 0.42, alpha: e.inUniverse ? 0.14 : 0, parked: true, value: null };
    };
    if (!e.inUniverse) return hidden;
    const ret = windowValue(e.ev, opts.window, opts.model);
    if (view === "landscape") {
      const c = e.fin?.capex_to_revenue, f = e.fin?.fcf_margin;
      if (c == null || f == null || ret == null || e.fin?.capex_to_revenue_status !== "ok") return park();
      return { x: capexX(c), y: ret * RETURN_SCALE[opts.window], z: fcfZ(f), alpha: 1, parked: false, value: ret };
    }
    // verdict
    const b = e.ev?.beta;
    if (b == null || ret == null) return park();
    return { x: betaX(b), y: ret * RETURN_SCALE[opts.window], z: 0, alpha: 1, parked: false, value: ret };
  });
}

export interface CameraPreset { position: [number, number, number]; target: [number, number, number] }
export const CAMERA: Record<string, CameraPreset> = {
  field: { position: [0, 17, 22], target: [0, -0.5, 0] },
  repricingWide: { position: [0, 3.5, 30], target: [0, -3.0, 0] },
  repricingChips: { position: [9, 2.5, 21], target: [1.5, -3.0, 0] },
  layers: { position: [17, 5, 18], target: [0, -0.6, 0] },
  network: { position: [11, 4.6, 15.5], target: [0, 0.2, 0] },
  networkTop: { position: [8, 6.2, 12.5], target: [0, 1.2, 0] },
  networkCredit: { position: [-12, 6.5, 10.5], target: [0, 2.2, 0] },
  landscape: { position: [13, 5.5, 18], target: [0, -2.2, 1] },
  landscapeFront: { position: [0, -1.2, 24], target: [0, -2.2, 0] },
  verdict: { position: [1.2, -2.6, 23], target: [1.2, -2.8, 0] },
};
