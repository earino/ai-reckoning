import { useMemo, useState } from "react";
import type { DataBundle, ScenarioParams } from "../data/types";
import { runScenario } from "../data/scenario";
import { ROLE_COLOR, ROLE_SHORT } from "../data/roles";
import { pct, usd } from "../data/format";

type Tab = "gap" | "interest" | "backlog";
const TAB_LABEL: Record<Tab, string> = { gap: "Financing gap", interest: "Interest burden", backlog: "Unpaid model-developer contracts" };

export default function Simulator({ d, onSelect }: { d: DataBundle; onSelect: (id: string) => void }) {
  const [p, setP] = useState<ScenarioParams>(d.scenarios.presets.baseline);
  const [tab, setTab] = useState<Tab>("gap");
  const set = (k: keyof ScenarioParams, v: number) => setP({ ...p, [k]: v });
  const presetName = Object.entries(d.scenarios.presets).find(([, v]) => JSON.stringify(v) === JSON.stringify(p))?.[0] ?? "custom";
  const res = useMemo(() => d.scenarios.companies.filter((c) => c.usd_reporter).map((c) => ({ c, r: runScenario(c, p), co: d.byTicker.get(c.ticker)! })), [d, p]);
  const sum = (f: (x: (typeof res)[number]) => number | null) => res.reduce((a, x) => a + (f(x) ?? 0), 0);
  const gapBefore = sum((x) => x.r.fundingGapBefore), gapAfter = sum((x) => x.r.fundingGap);
  const interest = sum((x) => x.r.extraInterest), intLo = sum((x) => x.r.extraInterestRange?.[0] ?? null), intHi = sum((x) => x.r.extraInterestRange?.[1] ?? null);
  const backlog = sum((x) => x.r.backlogAtRisk), bLo = sum((x) => x.r.backlogAtRiskRange[0]), bHi = sum((x) => x.r.backlogAtRiskRange[1]);
  const nBack = res.filter((x) => x.c.model_developer_backlog > 0).length; const nNoEdges = res.filter((x) => (x.co?.graph_degree ?? 0) === 0).length;
  const metric = (x: (typeof res)[number]) => tab === "gap" ? { v: x.r.fundingGap, lo: null as number | null, hi: null as number | null, ref: x.r.fundingGapBefore, sub: x.c.capex ? `capex ${usd(x.c.capex)} vs cash from operations ${usd(x.c.operating_cash_flow)}` : "" }
    : tab === "interest" ? { v: x.r.extraInterest, lo: x.r.extraInterestRange?.[0] ?? null, hi: x.r.extraInterestRange?.[1] ?? null, ref: null, sub: x.r.extraInterestToEbitda != null ? `${pct(x.r.extraInterestToEbitda, 1, false)} of EBITDA · debt ${usd(x.c.total_debt)}` : `EBITDA not positive · debt ${usd(x.c.total_debt)}` }
    : { v: x.r.backlogAtRisk, lo: x.r.backlogAtRiskRange[0], hi: x.r.backlogAtRiskRange[1], ref: null, sub: x.r.backlogAtRiskToRevenue != null ? `${x.r.backlogAtRiskToRevenue.toFixed(1)}× one year of revenue · disclosed backlog ${usd(x.c.model_developer_backlog)}` : "" };
  const top = res.map((x) => ({ x, m: metric(x) })).filter((t) => (t.m.v ?? 0) > 0 || (t.m.ref ?? 0) > 0).sort((a, b) => Math.max(b.m.v ?? 0, b.m.ref ?? 0) - Math.max(a.m.v ?? 0, a.m.ref ?? 0)).slice(0, 12);
  const max = Math.max(1, ...top.map((t) => Math.max(t.m.v ?? 0, t.m.hi ?? 0, t.m.ref ?? 0)));
  const slider = (k: keyof ScenarioParams, label: string, min: number, maxv: number, stepv: number, fmt: (v: number) => string, help: string) => (
    <label className="slider"><span>{label}: <b>{fmt(p[k])}</b></span>
      <input type="range" min={min} max={maxv} step={stepv} value={p[k]} onChange={(e) => set(k, Number(e.target.value))} aria-describedby={`h-${k}`} />
      <small id={`h-${k}`}>{help}</small></label>
  );
  return (
    <div className="simulator">
      <p className="hypo-banner"><b>Hypothetical.</b> {d.scenarios.disclaimer} Every output is arithmetic you can check; the formulas are printed below.</p>
      <div className="controls"><fieldset><legend>Assumption sets</legend>
        {Object.keys(d.scenarios.presets).map((k) => <button key={k} aria-pressed={presetName === k} onClick={() => setP(d.scenarios.presets[k])}>{k[0].toUpperCase() + k.slice(1)}</button>)}
        <span className="tag modeled">{presetName === "custom" ? "Custom assumptions" : `${presetName} assumptions`}</span></fieldset></div>
      <div className="sliders">
        {slider("capex_cut", "Cut in capital spending", 0, 0.6, 0.05, (v) => pct(-v, 0), "Applied to each company’s own trailing capex. Direct effect.")}
        {slider("rate_rise_bp", "Rise in borrowing cost", 0, 400, 25, (v) => `+${v} bp`, "100 basis points = 1 percentage point.")}
        {slider("refinance_share", "Share of debt that reprices", 0.25, 1, 0.05, (v) => pct(v, 0, false), "Low for long fixed-rate bonds, high for floating-rate loans. We do not know each company’s mix, so the range 25–100% is always shown.")}
        {slider("fulfilment", "Model developers pay this share of contracts", 0.3, 1, 0.05, (v) => pct(v, 0, false), "Applies to disclosed, binding contracts owed by OpenAI, Anthropic and SpaceX/xAI. Modeled, one step only.")}
      </div>
      <div className="tiles">
        <div className="tile"><span className="tile-k">Cash to raise outside operations <span className="tag observed">direct</span></span><b>{usd(gapAfter, 0)}</b><small>per year, sum over companies whose capex exceeds operating cash flow. With today’s spending: {usd(gapBefore, 0)}.</small></div>
        <div className="tile"><span className="tile-k">Added yearly interest <span className="tag observed">direct</span></span><b>{usd(interest, 0)}</b><small>range {usd(intLo, 0)} – {usd(intHi, 0)} depending on how much debt reprices.</small></div>
        <div className="tile"><span className="tile-k">Contract value not paid <span className="tag modeled">modeled, one step</span></span><b>{usd(backlog, 0)}</b><small>range {usd(bLo, 0)} – {usd(bHi, 0)}; multi-year totals, not annual revenue. {nBack} listed companies have such disclosed contracts.</small></div>
      </div>
      <div className="controls" role="group" aria-label="Exposure type">{(Object.keys(TAB_LABEL) as Tab[]).map((t) => <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>{TAB_LABEL[t]}</button>)}</div>
      <ol className="bars" aria-label={`Twelve largest exposures: ${TAB_LABEL[tab]}`}>
        {top.map(({ x, m }) => (
          <li key={x.c.ticker}>
            <button className="linklike" onClick={() => onSelect(x.c.ticker)}><i className="sw" style={{ background: ROLE_COLOR[x.co.role] }} />{x.co.name} <small>{ROLE_SHORT[x.co.role]}</small></button>
            <div className="bar-track">
              {m.ref != null && <div className="bar ref" style={{ width: `${(m.ref / max) * 100}%` }} title="With today’s spending" />}
              <div className="bar" style={{ width: `${((m.v ?? 0) / max) * 100}%`, background: ROLE_COLOR[x.co.role] }} />
              {m.lo != null && m.hi != null && <div className="whisker" style={{ left: `${(m.lo / max) * 100}%`, width: `${((m.hi - m.lo) / max) * 100}%` }} />}
            </div>
            <span className="bar-val">{usd(m.v)}{m.lo != null && <small> ({usd(m.lo)}–{usd(m.hi)})</small>}</span>
            <small className="bar-sub">{m.sub}</small>
          </li>
        ))}
      </ol>
      {tab === "gap" && <p className="method-note">Grey outline: the gap at today’s spending. Solid: the gap after the assumed cut. A cut in spending closes the spender’s gap but removes the same dollars from suppliers’ revenue; we do not allocate that loss to individual suppliers because supplier-level AI revenue shares are not disclosed consistently.</p>}
      <details className="formulas"><summary>Formulas, known gaps and limits</summary>
        <dl>{Object.entries(d.scenarios.formulas).map(([k, v]) => <div key={k}><dt>{k.replace(/_/g, " ")}</dt><dd>{v}</dd></div>)}</dl>
        <p>Known and missing relationships: {nBack} of {res.length} listed AI companies have a disclosed binding contract with a model developer in our dataset. {nNoEdges} have no documented relationship at all — for them exposure through contracts is <b>unknown, not zero</b>. Non-USD reporters are excluded from the sums. No effect is passed on a second time through the network.</p>
      </details>
    </div>
  );
}
