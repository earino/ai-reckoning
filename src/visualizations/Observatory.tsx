import { useMemo, useState } from "react";
import type { DataBundle, ModelKey, Role, WindowKey } from "../data/types";
import { AI_ROLES, DECLINE, ROLE_COLOR, ROLE_LABEL, ROLE_SHORT } from "../data/roles";
import { num, pct, pValue } from "../data/format";
import Flat from "./Flat";
import type { FlatLine, FlatPoint } from "./Flat";

export const WINDOW_LABEL: Record<WindowKey, string> = { day: "20 Nov (one day)", week: "16–20 Nov (week)", peak: "6 Oct peak → 20 Nov" };
export const MODEL_LABEL: Record<ModelKey, string> = {
  raw: "Raw return", m1_market_adjusted: "Minus the S&P 500", m2_market_model: "Minus beta × S&P 500", m3_four_factor: "Minus four factors", m4_sector_adjusted: "Minus own sector ETF",
};
const MODEL_NOTE: Record<ModelKey, string> = {
  raw: "Observed share-price change. Nothing is removed. The dashed line is the pure prediction ‘beta × market return’; the red line is the best fit.",
  m1_market_adjusted: "Return minus the S&P 500 ETF return. This assumes every stock has a beta of 1, which is false for AI stocks (average beta near 2.7), so it overstates their ‘abnormal’ loss.",
  m2_market_model: "Return minus (alpha + beta × S&P 500). Alpha and beta come from the 250 trading days to 30 September. Whiskers are approximate 95% prediction ranges. This is the pre-specified main model.",
  m3_four_factor: "Return minus four factors built from ETFs (market, size, value, momentum). The momentum and growth ETFs are themselves heavy in AI stocks, so this model can absorb the thing we want to measure.",
  m4_sector_adjusted: "Return minus the company’s sector ETF. The technology ETF is dominated by a few AI giants, so this benchmark is also contaminated.",
};
type SortKey = "ticker" | "role" | "beta" | "raw" | "expected" | "abn" | "z";

export default function Observatory({ d, selectedId, onSelect, window: w, setWindow, model, setModel }: {
  d: DataBundle; selectedId: string | null; onSelect: (id: string | null) => void; window: WindowKey; setWindow: (w: WindowKey) => void; model: ModelKey; setModel: (m: ModelKey) => void;
}) {
  const [bench, setBench] = useState<"vs_SPY" | "vs_nonAI_controls">("vs_SPY");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "z", dir: 1 });
  const [roles, setRoles] = useState<Set<Role>>(new Set([...AI_ROLES, "control_tech", "control_other"]));
  const vd = d.n.vd[w];
  const rows = useMemo(() => d.events.filter((e) => e.history === "full" && e.beta != null).map((e) => {
    const c = d.byTicker.get(e.ticker)!; const s = e[w];
    return { e, c, raw: s.raw, expected: s.expected_m2, abn: s.m2_market_model, z: s.m2_market_model != null && s.m2_se ? s.m2_market_model / s.m2_se : null, val: s[model] };
  }), [d, w, model]);
  const yDom: [number, number] = model === "raw" || model === "m1_market_adjusted" || model === "m4_sector_adjusted"
    ? (w === "peak" ? [-0.85, 0.45] : w === "week" ? [-0.42, 0.16] : [-0.26, 0.08]) : (w === "peak" ? [-0.85, 0.75] : w === "week" ? [-0.3, 0.32] : [-0.16, 0.12]);
  const step = w === "peak" ? 0.2 : w === "week" ? 0.1 : 0.05;
  const yTicks: number[] = []; for (let t = Math.ceil(yDom[0] / step) * step; t <= yDom[1] + 1e-9; t += step) yTicks.push(Math.round(t * 100) / 100);
  const points: FlatPoint[] = rows.filter((r) => r.val != null).map((r) => {
    const se = model === "m2_market_model" ? r.e[w].m2_se : model === "m3_four_factor" ? r.e[w].m3_se : null;
    return { id: r.c.ticker, x: r.e.beta!, y: r.val!, r: 3 + 7 * Math.sqrt(Math.min(r.c.mcap_peak ?? 2e10, 5e12) / 5e12), role: r.c.role, label: r.c.ticker, dim: !roles.has(r.c.role),
      title: `${r.c.name} (${r.c.ticker}): beta ${num(r.e.beta)}, ${MODEL_LABEL[model].toLowerCase()} ${pct(r.val)}`,
      lo: se != null ? r.val! - 1.96 * se : undefined, hi: se != null ? r.val! + 1.96 * se : undefined };
  });
  const lines: FlatLine[] = model === "raw" ? [
    { x1: 0, y1: 0, x2: 5.4, y2: 5.4 * vd.market, color: "#ece7dc", dash: "6 4", label: "prediction: beta × market" },
    { x1: 0, y1: vd.intercept, x2: 5.4, y2: vd.intercept + 5.4 * vd.slope, color: DECLINE, width: 2, label: "fitted line" },
  ] : [];
  const outliers = [...rows].filter((r) => r.z != null).sort((a, b) => a.z! - b.z!);
  const labelIds = [...outliers.slice(0, 4), ...outliers.slice(-3)].map((r) => r.c.ticker).concat(["NVDA", "MSFT", "CRWV", "ORCL"]);
  const sorted = [...rows].sort((a, b) => {
    const k = sort.key; const va = k === "ticker" ? a.c.ticker : k === "role" ? a.c.role : k === "beta" ? a.e.beta : (a as any)[k]; const vb = k === "ticker" ? b.c.ticker : k === "role" ? b.c.role : k === "beta" ? b.e.beta : (b as any)[k];
    if (va == null) return 1; if (vb == null) return -1; return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
  });
  const th = (key: SortKey, label: string) => (
    <th scope="col" aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button onClick={() => setSort({ key, dir: sort.key === key ? (sort.dir === 1 ? -1 : 1) : 1 })}>{label}{sort.key === key ? (sort.dir === 1 ? " ▲" : " ▼") : ""}</button></th>
  );
  const rp = d.models.role_portfolios; const groupRoles: Role[] = [...AI_ROLES, "control_tech", "control_other"];
  const gx = (v: number) => 210 + ((v + 0.6) / 1.0) * 480;
  return (
    <div className="observatory">
      <div className="controls" role="group" aria-label="Event-study controls">
        <fieldset><legend>Time window</legend>{(Object.keys(WINDOW_LABEL) as WindowKey[]).map((k) => <button key={k} aria-pressed={w === k} onClick={() => setWindow(k)}>{WINDOW_LABEL[k]}</button>)}</fieldset>
        <fieldset><legend>Return measure (model)</legend>{(Object.keys(MODEL_LABEL) as ModelKey[]).map((k) => <button key={k} aria-pressed={model === k} onClick={() => setModel(k)}>{MODEL_LABEL[k]}</button>)}</fieldset>
        <fieldset><legend>Groups shown</legend>{groupRoles.map((r) => <button key={r} aria-pressed={roles.has(r)} onClick={() => { const s = new Set(roles); s.has(r) ? s.delete(r) : s.add(r); setRoles(s); }}><i className="sw" style={{ background: ROLE_COLOR[r] }} />{ROLE_SHORT[r]}</button>)}</fieldset>
      </div>
      <p className="method-note"><b>What this shows.</b> {MODEL_NOTE[model]} <span className="tag observed">Observed prices</span>{model !== "raw" && <span className="tag modeled">Model-adjusted</span>}</p>
      <Flat points={points} lines={lines} selectedId={selectedId} onSelect={onSelect} labels={labelIds} height={500}
        title={`Each company: beta before the selloff against ${MODEL_LABEL[model].toLowerCase()}, ${WINDOW_LABEL[w]}`}
        desc={`Scatterplot of ${points.length} companies. Horizontal axis: beta to the S&P 500 estimated on the 250 trading days to 30 September 2026. Vertical axis: ${MODEL_LABEL[model]}. In raw returns, beta alone explains ${(vd.beta_only_r2 * 100).toFixed(0)} percent of the differences between companies.`}
        x={{ label: "Beta to the S&P 500, estimated before the selloff (250 trading days to 30 Sep)", domain: [-0.6, 5.6], ticks: [0, 1, 2, 3, 4, 5], format: (v) => v.toFixed(0) }}
        y={{ label: MODEL_LABEL[model], domain: yDom, ticks: yTicks, format: (v) => pct(v, 0) }} />
      <p className="readout">In raw returns for this window, beta alone explains <b>{(vd.beta_only_r2 * 100).toFixed(0)}%</b> of the differences between the {vd.n} companies. Adding an “is it an AI company?” flag moves that to {(vd.beta_plus_ai_r2 * 100).toFixed(0)}%; adding the seven role groups, to {(vd.beta_plus_role_r2 * 100).toFixed(0)}%. Market return in the window: {pct(vd.market)}.</p>

      <h4>Group portfolios: how far each group landed from its own pre-crash pattern</h4>
      <div className="controls"><fieldset><legend>Benchmark</legend>
        <button aria-pressed={bench === "vs_SPY"} onClick={() => setBench("vs_SPY")}>S&P 500 (SPY)</button>
        <button aria-pressed={bench === "vs_nonAI_controls"} onClick={() => setBench("vs_nonAI_controls")}>Non-AI control portfolio</button></fieldset></div>
      <svg viewBox="0 0 720 300" className="flat groupchart" role="img" aria-label={`Cumulative abnormal return by group, ${WINDOW_LABEL[w]}, benchmark ${bench === "vs_SPY" ? "S&P 500" : "non-AI controls"}`}>
        {[-0.6, -0.4, -0.2, 0, 0.2, 0.4].map((t) => <g key={t}><line x1={gx(t)} x2={gx(t)} y1={10} y2={262} stroke={t === 0 ? "#8a8f98" : "#24272c"} /><text x={gx(t)} y={280} textAnchor="middle" className="tick">{pct(t, 0)}</text></g>)}
        {groupRoles.map((r, i) => {
          const v = rp[r]?.[w]?.[bench]; const y = 28 + i * 34;
          if (!v) return <g key={r}><text x={200} y={y + 4} textAnchor="end" className="tick">{ROLE_SHORT[r]}</text><text x={gx(0) + 8} y={y + 4} className="tick">this group is the benchmark</text></g>;
          const lo = Math.max(-0.6, v.ci95[0]), hi = Math.min(0.4, v.ci95[1]);
          return <g key={r}><text x={200} y={y + 4} textAnchor="end" className="tick">{ROLE_SHORT[r]} (n={v.n_long})</text>
            <line x1={gx(lo)} x2={gx(hi)} y1={y} y2={y} stroke={ROLE_COLOR[r]} strokeWidth={2} /><circle cx={gx(Math.max(-0.6, Math.min(0.4, v.car)))} cy={y} r={6} fill={ROLE_COLOR[r]} />
            <text x={gx(hi) + 8} y={y + 4} className="tick">{pct(v.car)} ({pValue(v.p_empirical)})</text></g>;
        })}
        <text x={450} y={296} textAnchor="middle" className="axis-title">Cumulative abnormal return of an equal-weight group portfolio, with 95% range</text>
      </svg>
      <p className="method-note">Each group is one equal-weight portfolio, so the shared shock inside a group is not counted many times. The p-value is the share of same-length periods in the estimation window with a move at least as large. Against the S&P 500 most groups look ordinary. Against a portfolio of non-AI companies they do not: the S&P 500 is itself largely an AI portfolio.</p>

      <h4>All {sorted.length} companies with full history</h4>
      <div className="table-wrap" tabIndex={0} role="region" aria-label="Sortable table of event-study results">
        <table className="data">
          <caption>Window: {WINDOW_LABEL[w]}. “Expected” and “difference” use the market model (beta × S&P 500). z = difference ÷ its standard error.</caption>
          <thead><tr>{th("ticker", "Company")}{th("role", "Group")}{th("beta", "Beta")}{th("raw", "Raw return")}{th("expected", "Expected")}{th("abn", "Difference")}{th("z", "z")}</tr></thead>
          <tbody>{sorted.map((r) => (
            <tr key={r.c.ticker} className={r.c.ticker === selectedId ? "sel" : ""}>
              <th scope="row"><button className="linklike" onClick={() => onSelect(r.c.ticker)}>{r.c.ticker}</button> <span className="nm">{r.c.name}</span></th>
              <td>{ROLE_SHORT[r.c.role]}</td><td>{num(r.e.beta)}</td><td>{pct(r.raw)}</td><td>{pct(r.expected)}</td><td>{pct(r.abn)}</td><td>{num(r.z, 1)}</td></tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
