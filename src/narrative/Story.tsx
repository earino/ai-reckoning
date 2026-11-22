import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import type { DataBundle, ModelKey, Role, WindowKey } from "../data/types";
import { AI_ROLES, DECLINE, EDGE_FAMILY, EDGE_TYPE_LABEL, FAMILY_COLOR, FAMILY_LABEL, GAIN, ROLE_COLOR, ROLE_LABEL, ROLE_SHORT, STATUS_LABEL } from "../data/roles";
import { dateLong, dateShort, pct, usd } from "../data/format";
import { AXES, BAND_ROLES, cameraFor, computeLayout, radiusFor, windowValue } from "../scenes/layouts";
import type { Entity, LayoutOpts, ViewKey } from "../scenes/layouts";
import { hasWebGL, useCoarsePointer, useIsMobile, useReducedMotion } from "../accessibility/env";
import { Findings, SlowdownProse, VerdictProse, chapters } from "./steps";
import type { Step } from "./steps";
import CompanyPanel from "../components/CompanyPanel";
import Flat, { Shape } from "../visualizations/Flat";
import type { FlatLine, FlatPoint } from "../visualizations/Flat";
import Observatory, { MODEL_LABEL, WINDOW_LABEL } from "../visualizations/Observatory";
import Simulator from "../visualizations/Simulator";

const World = lazy(() => import("../scenes/World"));
type RigApi = import("../scenes/World").RigApi;
const ALL_TYPES = Object.keys(EDGE_TYPE_LABEL); const ALL_STATUS = Object.keys(STATUS_LABEL);
const VIEW_LABEL: Record<ViewKey, string> = { field: "Field", repricing: "The repricing", layers: "Layers", network: "Capital network", landscape: "Financial landscape", verdict: "Beta verdict" };

function buildEntities(d: DataBundle): Entity[] {
  const out: Entity[] = d.companies.map((c) => ({ id: c.ticker, name: c.name, role: c.role, inUniverse: true, company: c, node: d.nodeBy.get(c.ticker), fin: d.finBy.get(c.ticker), ev: d.evBy.get(c.ticker),
    series: d.prices.series[c.ticker], mcapPeak: c.mcap_peak ?? c.mcap_event, degree: d.nodeBy.get(c.ticker)?.degree ?? 0, radius: radiusFor(c.mcap_peak ?? c.mcap_event, true) }));
  for (const g of d.graph.nodes) if (!d.byTicker.has(g.id)) out.push({ id: g.id, name: g.name, role: g.role, inUniverse: false, node: g, mcapPeak: null, degree: g.degree, radius: radiusFor(null, false) });
  return out;
}

/** Perspective-free 2D version of any view. Also the fallback when WebGL is not available. */
function FlatStage({ d, entities, view, opts, selectedId, onSelect, labels, focus, edgeFilter, roleFilter }: {
  d: DataBundle; entities: Entity[]; view: ViewKey; opts: LayoutOpts; selectedId: string | null; onSelect: (id: string | null) => void; labels: string[]; focus: string[] | null;
  edgeFilter: { types: Set<string>; statuses: Set<string> }; roleFilter: Set<Role>;
}) {
  const pl = useMemo(() => computeLayout(view, entities, opts), [view, entities, opts]);
  const fs = focus ? new Set(focus) : null;
  const pts: FlatPoint[] = []; const lines: FlatLine[] = [];
  const idx = new Map(entities.map((e, i) => [e.id, i]));
  const rr = (e: Entity) => 3 + e.radius * 22;
  const dim = (e: Entity) => (fs ? !fs.has(e.id) : false) || (e.inUniverse && !roleFilter.has(e.role));
  if (view === "field" || view === "repricing") {
    entities.forEach((e, i) => { const p = pl[i]; if (!e.inUniverse || (view === "repricing" && p.parked)) return;
      pts.push({ id: e.id, x: p.x, y: view === "field" ? 0 : (p.value ?? 0), r: rr(e), role: e.role, label: e.company!.ticker, dim: dim(e), title: `${e.name}: ${view === "field" ? "" : opts.absolute ? usd(p.value) : pct(p.value)}` }); });
    const abs = !!opts.absolute;
    return <Flat points={pts} selectedId={selectedId} onSelect={onSelect} labels={labels} title={`Change since 6 October by company, grouped by role, on ${d.prices.dates[opts.dateIndex]}`}
      desc="Strip plot. Each column is an economic role. Vertical position is the change in share price, or market value, since the 6 October record close."
      x={{ label: "", domain: [-12.5, 12.5], ticks: [], format: () => "" }} hideXAxis
      bands={BAND_ROLES.map((r) => ({ y: abs ? 0.6e12 : 0.5, label: "", color: ROLE_COLOR[r] }))}
      y={abs ? { label: "Change in market value since 6 Oct (approx.)", domain: [-3e12, 0.6e12], ticks: [-3e12, -2e12, -1e12, 0], format: (v) => usd(v, 0) }
        : { label: "Share price change since 6 Oct", domain: [-0.85, 0.5], ticks: [-0.8, -0.6, -0.4, -0.2, 0, 0.2, 0.4], format: (v) => pct(v, 0) }} />;
  }
  if (view === "layers" || view === "network") {
    const X = (i: number) => pl[i].x + pl[i].z * 0.45, Y = (i: number) => pl[i].y + pl[i].z * 0.12;
    if (view === "network") for (const e of d.graph.edges) {
      if (e.cancelled || !edgeFilter.types.has(e.type) || !edgeFilter.statuses.has(e.status)) continue;
      const a = idx.get(e.source), b = idx.get(e.target); if (a == null || b == null) continue;
      const em = selectedId ? e.source === selectedId || e.target === selectedId : fs ? fs.has(e.source) && fs.has(e.target) : true;
      lines.push({ x1: X(a), y1: Y(a), x2: X(b), y2: Y(b), color: FAMILY_COLOR[EDGE_FAMILY[e.type]], width: e.comparable_amount ? Math.min(5, 0.8 + 4 * Math.sqrt(e.comparable_amount / 3e11)) : 0.6,
        dash: e.status === "completed" || e.status === "ongoing" ? undefined : e.status === "announced" ? "8 4" : e.status === "conditional" ? "4 4" : "1 4", opacity: em ? 0.6 : 0.05, arrow: em });
    }
    entities.forEach((e, i) => { const p = pl[i]; if (p.alpha < 0.05 || e.role.startsWith("control")) return;
      pts.push({ id: e.id, x: X(i), y: Y(i), r: rr(e), role: e.role, label: e.company?.ticker ?? e.name.split(" (")[0], dim: dim(e) || (view === "network" && e.degree === 0), hollow: !e.inUniverse, title: `${e.name}: ${e.degree} documented counterparties` }); });
    return <Flat points={pts} lines={lines} selectedId={selectedId} onSelect={onSelect} labels={labels} height={620} title="Capital network, flat projection: layers of the money chain from capital (top) to power (bottom)"
      desc={`Directed graph of ${d.n.graph.n_edges} documented relationships. Rows are layers of the money chain. Solid lines are completed or binding; dashed lines are announced, conditional or estimated. Hollow marks are entities not in the listed universe.`}
      x={{ label: "", domain: [-11, 11], ticks: [], format: () => "" }} hideXAxis
      y={{ label: "Layer of the money chain", domain: [-6, 6], ticks: [4.4, 2.2, 0, -2.2, -4.4], format: (v) => ROLE_SHORT[(Object.entries({ capital: 4.4, models_apps: 2.2, infrastructure: 0, compute: -2.2, energy: -4.4 }).find(([, y]) => y === v)?.[0] ?? "other") as Role] }} />;
  }
  const yDom: [number, number] = opts.window === "peak" ? [-0.85, 0.7] : opts.window === "week" ? [-0.42, 0.3] : [-0.26, 0.12];
  const st = opts.window === "peak" ? 0.2 : 0.1; const yt: number[] = []; for (let t = Math.ceil(yDom[0] / st) * st; t <= yDom[1]; t += st) yt.push(Math.round(t * 100) / 100);
  const yAxis = { label: `${MODEL_LABEL[opts.model]}, ${WINDOW_LABEL[opts.window]}`, domain: yDom, ticks: yt, format: (v: number) => pct(v, 0) };
  if (view === "landscape") {
    entities.forEach((e) => { const c = e.fin?.capex_to_revenue; const v = windowValue(e.ev, opts.window, opts.model); if (!e.inUniverse || c == null || v == null || e.fin?.capex_to_revenue_status !== "ok") return;
      pts.push({ id: e.id, x: Math.max(0.003, c), y: v, r: rr(e), role: e.role, label: e.id, dim: dim(e), hollow: (e.fin?.fcf_margin ?? 0) < 0, title: `${e.name}: capex ${pct(c, 1, false)} of revenue, FCF margin ${pct(e.fin?.fcf_margin)}, return ${pct(v)}` }); });
    return <Flat points={pts} selectedId={selectedId} onSelect={onSelect} labels={labels} title="Capital intensity against return" desc="Scatterplot. Horizontal: capital spending divided by revenue, log scale. Vertical: return in the selected window. Hollow marks have negative free cash flow."
      x={{ label: "Capital spending ÷ revenue, trailing twelve months (log scale). Hollow = negative free cash flow", domain: [0.003, 3], ticks: [0.01, 0.03, 0.1, 0.3, 1, 3], format: (v) => `${v * 100}%`, log: true }} y={yAxis} />;
  }
  entities.forEach((e) => { const b = e.ev?.beta; const v = windowValue(e.ev, opts.window, opts.model); if (!e.inUniverse || b == null || v == null) return;
    pts.push({ id: e.id, x: b, y: v, r: rr(e), role: e.role, label: e.id, dim: dim(e), title: `${e.name}: beta ${b.toFixed(2)}, ${pct(v)}` }); });
  const vd = d.n.vd[opts.window];
  if (opts.model === "raw") lines.push({ x1: 0, y1: 0, x2: 5.4, y2: 5.4 * vd.market, color: "#ece7dc", dash: "6 4", label: "prediction: beta × market" }, { x1: 0, y1: vd.intercept, x2: 5.4, y2: vd.intercept + 5.4 * vd.slope, color: DECLINE, width: 2, label: "fitted line" });
  return <Flat points={pts} lines={lines} selectedId={selectedId} onSelect={onSelect} labels={labels} title="Beta before the selloff against return" desc="Scatterplot of beta against return."
    x={{ label: "Beta to the S&P 500, estimated before the selloff", domain: [-0.6, 5.6], ticks: [0, 1, 2, 3, 4, 5], format: (v) => v.toFixed(0) }} y={yAxis} />;
}

interface Override { dateIndex?: number; absolute?: boolean; view?: ViewKey; window?: WindowKey; model?: ModelKey; colorMode?: "role" | "return"; flat?: boolean }

export default function Story({ d }: { d: DataBundle }) {
  const reducedMotion = useReducedMotion(); const mobile = useIsMobile(); const coarse = useCoarsePointer();
  const webgl = useMemo(() => hasWebGL(), []);
  const entities = useMemo(() => buildEntities(d), [d]);
  const chs = useMemo(() => chapters(d), [d]);
  const steps = useMemo(() => chs.flatMap((c) => c.steps), [chs]);
  const explorer: Step = useMemo(() => ({ id: "explore", chapter: "epilogue", view: "network", camera: "network", controls: "explorer", interactive: true, labels: ["priv:openai", "ANT", "NVDA"],
    hud: { title: "Explorer", kind: "documented", size: "Mark size: market value on 6 October" }, body: () => null }), []);
  // the first screen: the same field of companies, drawn clear of the headline and without column labels
  const hero: Step = useMemo(() => ({ ...steps[0], id: "hero", camera: mobile ? "field" : "hero", labels: [], body: () => null }), [steps, mobile]);
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const [activeId, setActiveId] = useState<string>("hero");
  const [solid, setSolid] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(() => { const s = params.get("select"); return s && (d.byTicker.has(s) || d.nodeBy.has(s)) ? s : null; });
  const [ov, setOv] = useState<Override>(() => (params.get("view") && params.get("view")! in VIEW_LABEL ? { view: params.get("view") as ViewKey } : {}));
  const [playing, setPlaying] = useState(false);
  const [types, setTypes] = useState<Set<string>>(new Set(ALL_TYPES)); const [statuses, setStatuses] = useState<Set<string>>(new Set(ALL_STATUS));
  const [roleFilter, setRoleFilter] = useState<Set<Role>>(new Set<Role>([...AI_ROLES, "control_tech", "control_other", "other"]));
  const [hudOpen, setHudOpen] = useState(!mobile);
  const [dockOpen, setDockOpen] = useState(!mobile);
  const [expanded, setExpanded] = useState(false); // the scene alone, on the whole screen, with rotate, zoom and pan
  const rig = useRef<RigApi | null>(null);
  useEffect(() => { document.documentElement.style.overflow = expanded ? "hidden" : ""; if (!expanded && mobile) { setHudOpen(false); setDockOpen(false); } return () => { document.documentElement.style.overflow = ""; }; }, [expanded, mobile]);
  const step = activeId === "explore" ? explorer : activeId === "hero" ? hero : steps.find((s) => s.id === activeId) ?? steps[0];
  const dates = d.prices.dates; const peakIdx = dates.indexOf(d.prices.peak_date); const lastIdx = dates.length - 1;

  // scroll engine: the step nearest the middle of the viewport is active; scrolling back restores its state
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>("[data-step]")];
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) {
        const el = en.target as HTMLElement; setActiveId(el.dataset.step!); setSolid(el.dataset.solid === "1");
        const ch = el.closest("section[id]")?.id; if (ch && !window.location.hash.startsWith("#/")) history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${ch}`);
      }
      // wide screens: the step at the middle of the screen is active. Narrow screens: the scene has the top band,
      // so a step becomes active when its card comes into the text area below the band.
    }, { rootMargin: mobile ? "-84% 0px -11% 0px" : "-45% 0px -45% 0px", threshold: 0 });
    els.forEach((e) => io.observe(e)); return () => io.disconnect();
  }, [chs, mobile]);
  // deep links: #chapter-id, ?select=TICKER, ?view=network (opens the explorer)
  useEffect(() => {
    const target = params.get("view") ? "epilogue" : window.location.hash.replace("#", "");
    if (target && !target.startsWith("/")) requestAnimationFrame(() => document.getElementById(target)?.scrollIntoView());
  }, [params]);
  // step change: reset reader overrides (except in the explorer) and run the time animation once
  const prev = useRef(activeId); const deepApplied = useRef(false);
  useEffect(() => {
    if (prev.current === activeId) return; prev.current = activeId;
    if (activeId !== "explore") setOv((o) => (o.flat ? { flat: true } : {}));
    else if (params.get("view") && params.get("view")! in VIEW_LABEL && !deepApplied.current) { deepApplied.current = true; setOv((o) => ({ ...o, view: params.get("view") as ViewKey })); }
    if (step.play && !reducedMotion) { setOv((o) => ({ ...o, dateIndex: peakIdx })); setPlaying(true); } else setPlaying(false);
  }, [activeId, step.play, reducedMotion, peakIdx, params]);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setOv((o) => { const i = (o.dateIndex ?? peakIdx) + 1; if (i >= lastIdx) { setPlaying(false); return { ...o, dateIndex: lastIdx }; } return { ...o, dateIndex: i }; }), 260);
    return () => clearInterval(t);
  }, [playing, lastIdx, peakIdx]);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === "Escape") { setSelectedId((s) => { if (s == null) setExpanded(false); return null; }); } }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, []);

  const view = ov.view ?? step.view;
  const opts: LayoutOpts = useMemo(() => ({ dateIndex: ov.dateIndex ?? (step.date === "peak" ? peakIdx : lastIdx), window: ov.window ?? step.window ?? "week", model: ov.model ?? step.model ?? "raw", absolute: ov.absolute ?? false }),
    [ov.dateIndex, ov.window, ov.model, ov.absolute, step, peakIdx, lastIdx]);
  const colorMode = ov.colorMode ?? step.colorMode ?? "role";
  const focus = useMemo(() => {
    if (ov.view && ov.view !== step.view) return null;
    const E = d.graph.edges.filter((e) => !e.cancelled);
    if (step.focus === "hubs") { const s = new Set(["priv:openai", "ANT"]); E.forEach((e) => { if (e.source === "priv:openai" || e.source === "ANT" || e.target === "priv:openai" || e.target === "ANT") { s.add(e.source); s.add(e.target); } }); return [...s]; }
    if (step.focus === "reciprocal") { const s = new Set<string>(); E.forEach((e) => { if (e.reciprocal_pair) { s.add(e.source); s.add(e.target); } }); return [...s]; }
    if (step.focus === "credit") { const s = new Set<string>(); E.forEach((e) => { if (e.type === "debt_financing") { s.add(e.source); s.add(e.target); } }); return [...s]; }
    return null;
  }, [step, ov.view, d]);
  const edgeFilter = useMemo(() => {
    if (step.focus === "credit" && !ov.view) return { types: new Set(["debt_financing"]), statuses };
    if (step.focus === "reciprocal" && !ov.view) return { types, statuses };
    return { types, statuses };
  }, [types, statuses, step.focus, ov.view]);
  const cameraKey = ov.view && ov.view !== step.view ? ({ field: "field", repricing: "repricingWide", layers: "layers", network: "network", landscape: "landscape", verdict: "verdict" } as const)[ov.view] : step.camera;
  const camera = useMemo(() => cameraFor(cameraKey, mobile), [cameraKey, mobile]);
  const labels = ov.view && ov.view !== step.view ? [] : step.labels ?? [];
  const interactive = expanded || !coarse; // touch screens: a drag scrolls the page, so the camera moves only in the expanded view
  const vd = d.n.vd[opts.window];
  const useFlat = !webgl || !!ov.flat;
  const toggle = (set: Set<string>, k: string, f: (s: Set<string>) => void) => { const s = new Set(set); s.has(k) ? s.delete(k) : s.add(k); f(s); };
  const controls = step.controls;
  const showRepricing = controls === "repricing" || (controls === "explorer" && view === "repricing");
  const showNetwork = controls === "network" || (controls === "explorer" && view === "network");
  const showWindow = controls === "landscape" || controls === "verdict" || (controls === "explorer" && (view === "landscape" || view === "verdict"));
  const searchList = useMemo(() => entities.map((e) => ({ id: e.id, label: e.company ? `${e.company.ticker} — ${e.name}` : e.name })), [entities]);

  const stageProps = { d, entities, view, opts, selectedId, onSelect: setSelectedId, labels, focus, edgeFilter, roleFilter };
  return (
    <div className={`story ${solid ? "is-solid" : ""} ${expanded ? "is-expanded" : ""}`}>
      <div className="stage" aria-hidden={solid}>
        {useFlat ? <div className="flat-stage"><FlatStage {...stageProps} />{!webgl && <p className="fallback-note">Your browser is not showing 3D graphics, so this is the flat version of each view. Nothing is missing: the same data, axes and selections are available.</p>}</div>
          : <Suspense fallback={<div className="stage-loading">Loading the 3D scene…</div>}>
              <World entities={entities} edges={d.graph.edges} view={view} opts={opts} camera={camera} interactive={interactive} expanded={expanded} rig={rig} selectedId={selectedId} onSelect={(id) => { if (id == null && mobile && !expanded && !selectedId) setExpanded(true); else setSelectedId(id); }} labels={labels} focus={focus}
                colorMode={colorMode} edgeFilter={edgeFilter} roleFilter={roleFilter} reducedMotion={reducedMotion} mobile={mobile} paused={solid} quiet={activeId === "hero" && !mobile}
                dateLabel={dateLong(dates[opts.dateIndex])} marketReturn={vd?.market ?? null} fit={vd ? { intercept: vd.intercept, slope: vd.slope } : null} />
            </Suspense>}
      </div>

      {!solid && (
        <div className="viewbar" role="group" aria-label="3D view">
          {!useFlat && (expanded || !coarse) && <>
            <button aria-label="Zoom in" title="Zoom in" onClick={() => rig.current?.zoom(0.8)}>+</button>
            <button aria-label="Zoom out" title="Zoom out" onClick={() => rig.current?.zoom(1.25)}>−</button>
            <button aria-label="Reset the view" title="Reset the view" onClick={() => rig.current?.reset()}>↺</button>
          </>}
          <button className="expand" aria-label={expanded ? "Close the full-screen view" : "Expand the 3D view to the full screen"} onClick={() => setExpanded(!expanded)}>{expanded ? "✕ Close" : mobile ? "⤢ Expand" : "⤢ Full screen"}</button>
        </div>
      )}
      {expanded && !useFlat && <p className="gesture-hint" aria-hidden="true">{coarse ? "Drag to rotate · pinch to zoom · two fingers to move" : "Drag to rotate · wheel to zoom · right-drag to move"}<span className="turn"> · turn the phone sideways for a wider view</span></p>}

      {!solid && (
        <aside className={`hud ${hudOpen ? "open" : ""}`} aria-label="What you are looking at">
          <button className="hud-toggle" aria-expanded={hudOpen} aria-label={hudOpen ? "Hide key" : "Key: what am I looking at?"} onClick={() => { setHudOpen(!hudOpen); if (mobile && !hudOpen) setDockOpen(false); }}>{hudOpen ? (mobile ? "Close key" : "Hide key") : mobile ? "Key" : "Key: what am I looking at?"}</button>
          {hudOpen && <div className="hud-body">
            <p className="hud-title">{controls === "explorer" ? VIEW_LABEL[view] : step.hud.title}{view === "repricing" && <> — <b>{dateLong(dates[opts.dateIndex])}</b></>}</p>
            <p><span className={`tag ${view === "landscape" || view === "verdict" ? (opts.model === "raw" ? "observed" : "modeled") : view === "network" || view === "layers" || view === "field" ? "documented" : "observed"}`}>
              {view === "network" || view === "layers" || view === "field" ? "Documented facts" : opts.model === "raw" || view === "repricing" ? "Observed prices" : "Model-adjusted"}</span></p>
            <dl className="axes"><div><dt>Across</dt><dd>{AXES[view].x}</dd></div><div><dt>Up</dt><dd>{view === "repricing" && opts.absolute ? "Change in market value since 6 October, in dollars (approximate)" : AXES[view].y}{(view === "landscape" || view === "verdict") && `: ${MODEL_LABEL[opts.model].toLowerCase()}, ${WINDOW_LABEL[opts.window]}`}</dd></div>
              {!useFlat && <div><dt>Depth</dt><dd>{AXES[view].z}</dd></div>}</dl>
            <p className="small">{step.hud.size}</p>
            <ul className="legend">{(view === "network" || view === "layers" ? AI_ROLES : BAND_ROLES).map((r) => <li key={r}><svg width="16" height="16" viewBox="-8 -8 16 16" aria-hidden="true"><Shape role={r} r={5} fill={ROLE_COLOR[r]} /></svg>{ROLE_LABEL[r]}</li>)}</ul>
            {colorMode === "return" && <p className="small"><i className="sw" style={{ background: DECLINE }} /> decline <i className="sw" style={{ background: GAIN }} /> gain <i className="sw" style={{ background: "#8a8f98" }} /> near zero or no value</p>}
            {view === "network" && <ul className="legend lines">
              <li><svg width="34" height="8"><line x1="0" y1="4" x2="34" y2="4" stroke="#ece7dc" strokeWidth="2" /><circle cx="17" cy="4" r="3" fill="#fff6dc" /></svg>money has moved (dot)</li>
              <li><svg width="34" height="8"><line x1="0" y1="4" x2="34" y2="4" stroke="#ece7dc" strokeWidth="2" /></svg>binding contract in progress</li>
              <li><svg width="34" height="8"><line x1="0" y1="4" x2="34" y2="4" stroke="#ece7dc" strokeWidth="2" strokeDasharray="8 4" /></svg>announced</li>
              <li><svg width="34" height="8"><line x1="0" y1="4" x2="34" y2="4" stroke="#ece7dc" strokeWidth="2" strokeDasharray="4 4" /></svg>conditional / “up to”</li>
              <li><svg width="34" height="8"><line x1="0" y1="4" x2="34" y2="4" stroke="#ece7dc" strokeWidth="2" strokeDasharray="1 4" /></svg>press estimate</li>
              <li><svg width="34" height="8"><line x1="0" y1="4" x2="34" y2="4" stroke="#ece7dc" strokeWidth="0.8" /></svg>thin = amount undisclosed; thicker = larger disclosed amount</li>
              {(Object.keys(FAMILY_LABEL) as (keyof typeof FAMILY_LABEL)[]).map((f) => <li key={f}><i className="sw" style={{ background: FAMILY_COLOR[f] }} />{FAMILY_LABEL[f]}</li>)}
              <li>Arrow points to the receiver of the money. Pale marks are unlisted entities.</li>
            </ul>}
          </div>}
        </aside>
      )}

      {!solid && controls !== "none" && (
        <details className="dock" open={dockOpen} onToggle={(e) => { const o = (e.target as HTMLDetailsElement).open; setDockOpen(o); if (o && mobile) setHudOpen(false); }} aria-label="Graphic controls">
          <summary>{dockOpen && mobile ? "Close controls" : "Controls"}</summary>
          <div className="dock-body">
          {controls === "explorer" && <fieldset><legend>View</legend>{(["repricing", "layers", "network", "landscape", "verdict"] as ViewKey[]).map((v) => <button key={v} aria-pressed={view === v} onClick={() => setOv({ ...ov, view: v })}>{VIEW_LABEL[v]}</button>)}</fieldset>}
          {showRepricing && <>
            <fieldset><legend>Date: {dateShort(dates[opts.dateIndex])}</legend>
              <button onClick={() => { if (playing) setPlaying(false); else { if (opts.dateIndex >= lastIdx) setOv({ ...ov, dateIndex: peakIdx }); setPlaying(true); } }} aria-label={playing ? "Pause time animation" : "Play time animation"}>{playing ? "❚❚ Pause" : "▶ Play"}</button>
              <button onClick={() => { setOv({ ...ov, dateIndex: peakIdx }); setPlaying(!reducedMotion); }}>↺ Replay</button>
              <input type="range" min={0} max={lastIdx} value={opts.dateIndex} aria-label="Select date" aria-valuetext={dateLong(dates[opts.dateIndex])} onChange={(e) => { setPlaying(false); setOv({ ...ov, dateIndex: Number(e.target.value) }); }} /></fieldset>
            <fieldset><legend>Height shows</legend><button aria-pressed={!opts.absolute} onClick={() => setOv({ ...ov, absolute: false })}>Percent change</button><button aria-pressed={!!opts.absolute} onClick={() => setOv({ ...ov, absolute: true })}>Dollar change</button></fieldset>
          </>}
          {showWindow && <>
            <fieldset><legend>Window</legend>{(Object.keys(WINDOW_LABEL) as WindowKey[]).map((k) => <button key={k} aria-pressed={opts.window === k} onClick={() => setOv({ ...ov, window: k })}>{WINDOW_LABEL[k]}</button>)}</fieldset>
            <fieldset><legend>Return</legend>{(["raw", "m2_market_model", "m4_sector_adjusted"] as ModelKey[]).map((k) => <button key={k} aria-pressed={opts.model === k} onClick={() => setOv({ ...ov, model: k })}>{MODEL_LABEL[k]}</button>)}</fieldset>
          </>}
          {showNetwork && <details className="filters"><summary>Filter relationships</summary>
            <fieldset><legend>Relationship type</legend>{ALL_TYPES.map((t) => <button key={t} aria-pressed={edgeFilter.types.has(t)} onClick={() => toggle(types, t, setTypes)}><i className="sw" style={{ background: FAMILY_COLOR[EDGE_FAMILY[t]] }} />{EDGE_TYPE_LABEL[t]}</button>)}</fieldset>
            <fieldset><legend>Status</legend>{ALL_STATUS.map((t) => <button key={t} aria-pressed={statuses.has(t)} onClick={() => toggle(statuses, t, setStatuses)}>{t}</button>)}</fieldset>
            <fieldset><legend>Groups</legend>{AI_ROLES.map((r) => <button key={r} aria-pressed={roleFilter.has(r)} onClick={() => { const s = new Set(roleFilter); s.has(r) ? s.delete(r) : s.add(r); setRoleFilter(s); }}><i className="sw" style={{ background: ROLE_COLOR[r] }} />{ROLE_SHORT[r]}</button>)}</fieldset>
          </details>}
          {false && <fieldset><legend>Groups</legend>{AI_ROLES.map((r) => <button key={r} aria-pressed={roleFilter.has(r)} onClick={() => { const s = new Set(roleFilter); s.has(r) ? s.delete(r) : s.add(r); setRoleFilter(s); }}><i className="sw" style={{ background: ROLE_COLOR[r] }} />{ROLE_SHORT[r]}</button>)}</fieldset>}
          <fieldset><legend>Find</legend>
            <input type="search" list="entity-list" placeholder="Company or ticker" aria-label="Find a company" onChange={(e) => { const m = searchList.find((s) => s.label === e.target.value || s.id.toLowerCase() === e.target.value.toLowerCase()); if (m) setSelectedId(m.id); }} />
            <datalist id="entity-list">{searchList.map((s) => <option key={s.id} value={s.label} />)}</datalist>
            {webgl && <button aria-pressed={!!ov.flat} onClick={() => setOv({ ...ov, flat: !ov.flat })}>{ov.flat ? "3D view" : "2D view"}</button>}
          </fieldset>
          </div>
        </details>
      )}

      {selectedId && <CompanyPanel id={selectedId} d={d} onClose={() => setSelectedId(null)} />}

      <main className="scroll" id="main">
        <header className="hero" data-step="hero">
          <p className="kicker">The AI Reckoning · an investigation in data</p>
          <h1>The crash followed the beta, not the bill</h1>
          <p className="dek">On 20 November 2026 about {usd(-d.n.mv.ai_day)} left AI-linked stocks in a day. The popular story is that investors finally saw the cost of the build-out. We followed the money through {d.n.graph.n_edges} sourced deals and tested that story on {d.n.n_companies} companies. How much each one lost tracked a number you could have measured in September — and we found no link to who was spending the most.</p>
          <p className="byline">Research, analysis, code and text produced with an AI system and published with full methods · Data to {dateLong(d.meta.research_cutoff)} · Published {dateLong(d.meta.published)} · <a href="#/methodology">Methodology</a></p>
          <p className="scroll-cue" aria-hidden="true">Scroll ↓</p>
        </header>
        {chs.map((c) => (
          <section key={c.id} id={c.id} aria-labelledby={`${c.id}-h`}>
            <div className="chapter-head card"><p className="kicker">{c.kicker}</p><h2 id={`${c.id}-h`}>{c.title}</h2></div>
            {c.steps.map((s) => <div key={s.id} className="step" data-step={s.id}><div className="card">{s.body(d)}</div></div>)}
          </section>
        ))}
        <section id="observatory" className="solid" data-step="observatory" data-solid="1" aria-labelledby="obs-h">
          <div className="inner"><p className="kicker">Chapter IV, continued · The event-study observatory</p><h2 id="obs-h">Test it yourself</h2>
            <VerdictProse d={d} />
            <Observatory d={d} selectedId={selectedId} onSelect={setSelectedId} window={ov.window ?? "day"} setWindow={(w) => setOv({ ...ov, window: w })} model={ov.model ?? "raw"} setModel={(m) => setOv({ ...ov, model: m })} />
          </div>
        </section>
        <section id="chapter-5" className="solid" data-step="simulator" data-solid="1" aria-labelledby="c5-h">
          <div className="inner"><p className="kicker">Chapter V</p><h2 id="c5-h">What breaks first?</h2><SlowdownProse d={d} /><Simulator d={d} onSelect={setSelectedId} /></div>
        </section>
        <section id="chapter-6" className="solid" data-step="findings" data-solid="1" aria-labelledby="c6-h">
          <div className="inner narrow"><p className="kicker">Chapter VI</p><h2 id="c6-h">What we actually learned</h2><Findings d={d} /></div>
        </section>
        <section id="epilogue" aria-labelledby="ep-h">
          <div className="step tall" data-step="explore"><div className="card"><p className="kicker">Epilogue</p><h2 id="ep-h">Explore the system</h2>
            <p>This is the research instrument behind the story. Choose a view, filter the relationships, switch between raw and adjusted returns, and select any company to see its numbers and sources.</p>
            <p className="small">{coarse ? "Tap Expand, or tap the scene, to fill the screen. There you can drag to rotate, pinch to zoom, and tap a company." : "Drag to rotate. Pinch or Ctrl + wheel to zoom; a plain wheel scrolls the page. Full screen gives the scene the whole window."} Link to a selection with <code>?select=NVDA&view=network</code>.</p></div></div>
        </section>
        <footer className="site-footer solid">
          <div className="inner">
            <nav aria-label="Transparency pages"><a href="#/methodology">Methodology</a><a href="#/data">Data</a><a href="#/sources">Sources</a><a href="#/research-log">Research log</a><a href="#/limitations">Limitations</a><a href="#/corrections">Corrections</a><a href="#/about">About</a>
              <a href="https://github.com/earino/ai-reckoning">Code on GitHub</a></nav>
            <p>Research cutoff: {dateLong(d.meta.research_cutoff)}. Published {dateLong(d.meta.published)}. This is a static publication; it does not update automatically. {d.meta.coverage.companies} companies, {d.meta.coverage.relationships} relationships, {d.meta.coverage.sources} sources.</p>
            <p>This is journalism, not investment advice. No one sponsored it. Produced with an AI system; see About.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
