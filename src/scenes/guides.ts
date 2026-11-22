/** Reference lines and axis labels for each view. Pure data, so the 3D scene and tests share one definition. */
import type { Role } from "../data/types";
import { DECLINE, ROLE_COLOR, ROLE_LABEL } from "../data/roles";
import { pct } from "../data/format";
import { BAND_ROLES, BAND_SPACING, LAYER_Y, RETURN_SCALE, bandX, betaX, capexX, fcfZ } from "./layouts";
import type { LayoutOpts, ViewKey } from "./layouts";

type P3 = [number, number, number];
export interface GuideLine { points: P3[]; color: string; width?: number; dash?: [number, number]; opacity?: number }
export interface GuideTick { p: P3; text: string; cls?: string; swatch?: string; color?: string }
export interface GuideSpec { lines: GuideLine[]; ticks: GuideTick[]; plane?: { position: P3; size: [number, number] } }
const FAINT = "#3a3d44", MID = "#6b7079";

export function guideSpec(view: ViewKey, opts: LayoutOpts, mobile: boolean, marketReturn: number | null, fit: { intercept: number; slope: number } | null): GuideSpec {
  const lines: GuideLine[] = [], ticks: GuideTick[] = [];
  if (view === "field" || view === "repricing") {
    const half = (BAND_ROLES.length * BAND_SPACING) / 2 + 0.6, zb = -4.6;
    lines.push({ points: [[-half, 0, zb], [half, 0, zb], [half, 0, 4.6], [-half, 0, 4.6], [-half, 0, zb]], color: MID, opacity: 0.7 });
    if (view === "repricing") {
      const abs = !!opts.absolute;
      const ts = abs ? [-0.5, -1, -2, -3].map((t) => ({ y: t * 2.2, label: `−$${Math.abs(t)}tn` })) : [-0.2, -0.4, -0.6].map((t) => ({ y: t * RETURN_SCALE.repricing, label: pct(t, 0) }));
      for (const t of ts) { lines.push({ points: [[-half, t.y, zb], [half, t.y, zb]], color: FAINT, dash: [0.2, 0.2] }); ticks.push({ p: [mobile ? half - 1 : half + 0.9, t.y, zb], text: t.label }); }
      ticks.push({ p: [mobile ? half - 1.6 : half + 1.6, mobile ? 0.5 : 0.1, zb], text: mobile ? (abs ? "$0 (6 Oct)" : "0% (6 Oct)") : abs ? "$0 = 6 Oct value" : "0% = 6 Oct close", cls: "strong" });
    }
    for (const r of BAND_ROLES) if (!mobile || !r.startsWith("control")) ticks.push(mobile ? { p: [bandX(r), 0.25, 5.6], text: ROLE_LABEL[r].split(" ")[0], cls: "band", color: ROLE_COLOR[r] } : { p: [bandX(r), 0.25, 5.3], text: ROLE_LABEL[r].replace("Controls: ", "Control: "), cls: "band", swatch: ROLE_COLOR[r] });
    return { lines, ticks };
  }
  if (view === "layers" || view === "network") {
    const R = 7.2;
    for (const [role, y] of Object.entries(LAYER_Y)) {
      const pts: P3[] = []; for (let i = 0; i <= 64; i++) pts.push([Math.cos((i / 64) * Math.PI * 2) * R, y, Math.sin((i / 64) * Math.PI * 2) * R]);
      lines.push({ points: pts, color: FAINT, opacity: 0.8 });
      ticks.push({ p: mobile ? [0, y + 0.45, R] : [R * 0.72, y + 0.3, R * 0.72], text: mobile ? ROLE_LABEL[role as Role].split(" ")[0] : ROLE_LABEL[role as Role], cls: "band", swatch: ROLE_COLOR[role as Role] });
    }
    if (view === "layers" && !mobile) ticks.push({ p: [0, -7.3, 10.2], text: "Outer arc: control companies, outside the AI money chain" });
    return { lines, ticks };
  }
  const sc = RETURN_SCALE[opts.window];
  const yt = opts.window === "peak" ? [0.2, -0.2, -0.4, -0.6] : opts.window === "week" ? [0.1, -0.1, -0.2, -0.3] : [0.05, -0.05, -0.1, -0.15, -0.2];
  if (view === "landscape") {
    const x0 = -6.5, x1 = 6.5, z0 = fcfZ(0.6), z1 = fcfZ(-1.5);
    lines.push({ points: [[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1], [x0, 0, z0]], color: MID });
    lines.push({ points: [[x0, 0, fcfZ(0)], [x1, 0, fcfZ(0)]], color: "#8a8f98", dash: [0.2, 0.15] });
    ticks.push({ p: [x1 + 1.4, 0, fcfZ(0)], text: "free cash flow = 0" });
    for (const c of [0.01, 0.1, 1]) { lines.push({ points: [[capexX(c), 0, z0], [capexX(c), 0, z1]], color: FAINT }); ticks.push({ p: [capexX(c), -0.35, z1 + 0.6], text: `${c * 100}%` }); }
    ticks.push({ p: [0, -1.3, z1 + 1.2], text: mobile ? "Capex ÷ revenue (log) →" : "Capital spending ÷ revenue (log scale) →", cls: "strong" });
    for (const t of yt) { lines.push({ points: [[x0, t * sc, z0], [x0 + 0.3, t * sc, z0]], color: MID }); ticks.push({ p: [x0 - 0.8, t * sc, z0], text: pct(t, 0) }); }
    lines.push({ points: [[x0, yt[yt.length - 1] * sc, z0], [x0, yt[0] * sc, z0]], color: MID });
    ticks.push({ p: [x0 - 1.0, 0.05, z0], text: "0% return", cls: "strong" });
    if (!mobile) { ticks.push({ p: [x0 - 1.4, 0, z1 - 0.2], text: "burning cash" }); ticks.push({ p: [x1 + 1.4, 0, z0 + 0.2], text: "generating cash" }); ticks.push({ p: [10.2, -6.6, -2.5], text: "No ratio (financial firms, missing data)" }); }
    return { lines, ticks, plane: { position: [0, 0, (z0 + z1) / 2], size: [13, z1 - z0] } };
  }
  const xa = betaX(-0.5), xb = betaX(5.6), yb = yt[yt.length - 1] * sc;
  lines.push({ points: [[xa, 0, 0], [xb, 0, 0]], color: MID });
  for (const b of mobile ? [0, 2, 4] : [0, 1, 2, 3, 4, 5]) { lines.push({ points: [[betaX(b), yb, 0], [betaX(b), yt[0] * sc, 0]], color: FAINT, opacity: 0.6 }); ticks.push({ p: [betaX(b), yb - 0.5, 0], text: `β ${b}` }); }
  for (const t of yt) ticks.push({ p: [xa - 0.9, t * sc, 0], text: pct(t, 0) });
  ticks.push({ p: [betaX(2.5), yb - 1.25, 0], text: mobile ? "Beta before the selloff →" : "Beta to the S&P 500, measured before the selloff →", cls: "strong" });
  if (opts.model === "raw") {
    if (marketReturn != null) { lines.push({ points: [[betaX(0), 0, 0], [betaX(5.2), 5.2 * marketReturn * sc, 0]], color: "#ece7dc", width: 1.5, dash: [0.25, 0.15] }); ticks.push({ p: [betaX(5.2) - 0.6, 5.2 * marketReturn * sc - 0.5, 0], text: "prediction: beta × market" }); }
    if (fit) { lines.push({ points: [[betaX(0), fit.intercept * sc, 0], [betaX(5.2), (fit.intercept + 5.2 * fit.slope) * sc, 0]], color: DECLINE, width: 2 }); ticks.push({ p: [betaX(4.2), (fit.intercept + 4.2 * fit.slope) * sc + 0.6, 0], text: "fitted line", cls: "strong" }); }
  }
  return { lines, ticks };
}
