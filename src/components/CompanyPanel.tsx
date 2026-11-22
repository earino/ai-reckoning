import type { DataBundle, GEdge } from "../data/types";
import { EDGE_TYPE_LABEL, ROLE_LABEL, STATUS_LABEL } from "../data/roles";
import { NA, num, pct, usd } from "../data/format";

function EdgeItem({ e, me, d }: { e: GEdge; me: string; d: DataBundle }) {
  const out = e.source === me; const other = d.nodeBy.get(out ? e.target : e.source);
  const amt = e.announced_amount == null ? "amount undisclosed"
    : `${usd(e.announced_amount)} ${e.amount_state === "ceiling" ? "(ceiling, “up to”)" : e.amount_state === "stake_value_not_cash" ? "(stake value, not cash)" : e.amount_state === "annual_run_rate" ? "(per year)" : "(contract total)"}`;
  return (
    <li className={`edge-item st-${e.status}`}>
      <div className="edge-head"><span className="dir">{out ? "pays / funds →" : "← receives from"}</span> <b>{other?.name ?? (out ? e.target : e.source)}</b></div>
      <div className="edge-meta">{EDGE_TYPE_LABEL[e.type]} · <span className={`badge b-${e.status}`}>{e.status}</span> · {amt}
        {e.realized_amount != null && <> · <b>{usd(e.realized_amount)} realised</b></>}{e.cancelled && <> · <b>cancelled</b></>}</div>
      <p>{e.description}</p>
      {e.notes && <p className="note">Note: {e.notes}</p>}
      <div className="edge-src">Disclosed {e.disclosure_date ?? NA} · confidence {e.confidence} · <a href={e.source_url} target="_blank" rel="noreferrer">{e.source_publisher ?? "source"} ↗</a>
        {e.secondary_url && <> · <a href={e.secondary_url} target="_blank" rel="noreferrer">second source ↗</a></>}</div>
    </li>
  );
}

export default function CompanyPanel({ id, d, onClose }: { id: string; d: DataBundle; onClose: () => void }) {
  const c = d.byTicker.get(id), g = d.nodeBy.get(id), f = d.finBy.get(id), ev = d.evBy.get(id);
  const name = c?.name ?? g?.name ?? id; const role = c?.role ?? g?.role ?? "other";
  const edges = d.graph.edges.filter((e) => e.source === id || e.target === id);
  const cur = f?.fin_currency && f.fin_currency !== "USD" ? ` (${f.fin_currency})` : "";
  const money = (v: number | null | undefined) => (v == null ? NA : f?.fin_currency === "USD" ? usd(v) : `${(v / 1e9).toFixed(1)}bn ${f?.fin_currency ?? ""}`);
  return (
    <aside className="company-panel" aria-label={`Details for ${name}`}>
      <button className="close" onClick={onClose} aria-label="Close details">×</button>
      <p className="kicker">{ROLE_LABEL[role]}{c ? ` · ${c.subrole.replace(/_/g, " ")} · ${c.tier.replace("_", " ")}` : g ? ` · ${g.kind}` : ""}</p>
      <h3>{name}{c && <span className="tk"> {c.ticker}</span>}</h3>
      {c && <p className="basis">Why it is here: {c.classification_basis}.{c.history === "limited" && " Limited trading history: shown, but excluded from every model."}</p>}
      {!c && g && <p className="basis">Not a listed company in the study universe. It appears only because sourced relationships name it.</p>}
      {ev && (
        <table className="mini"><caption>Share-price returns (observed) and model-adjusted returns</caption>
          <thead><tr><th scope="col">Window</th><th scope="col">Raw</th><th scope="col">Expected from beta</th><th scope="col">Difference</th></tr></thead>
          <tbody>
            {(["day", "week", "peak"] as const).map((w) => (
              <tr key={w}><th scope="row">{w === "day" ? "20 Nov" : w === "week" ? "16–20 Nov" : "6 Oct–20 Nov"}</th><td>{pct(ev[w].raw)}</td><td>{pct(ev[w].expected_m2)}</td>
                <td>{pct(ev[w].m2_market_model)}{ev[w].m2_se != null && <small> ±{(ev[w].m2_se! * 196).toFixed(1)}</small>}</td></tr>
            ))}
          </tbody>
        </table>
      )}
      {ev && <p className="small">Beta before the selloff: {num(ev.beta)}{ev.beta_se != null && ` (s.e. ${num(ev.beta_se)})`}. “Difference” is observed minus expected, with an approximate 95% range in points. It is not a causal effect.</p>}
      {f && f.status === "ok" && (
        <table className="mini"><caption>Trailing twelve months to {f.fin_period_end}{cur}, filed {f.fin_filed}</caption>
          <tbody>
            <tr><th scope="row">Revenue</th><td>{money(f.revenue)}</td><th scope="row">Operating income</th><td>{money(f.operating_income)}</td></tr>
            <tr><th scope="row">Operating cash flow</th><td>{money(f.operating_cash_flow)}</td><th scope="row">Capital spending</th><td>{money(f.capex)}</td></tr>
            <tr><th scope="row">Capex ÷ revenue</th><td>{f.capex_to_revenue != null ? pct(f.capex_to_revenue, 1, false) : (f.capex_to_revenue_status ?? NA).replace(/_/g, " ")}</td>
              <th scope="row">Net debt ÷ EBITDA</th><td>{f.net_debt_to_ebitda != null ? num(f.net_debt_to_ebitda, 1) + "×" : (f.net_debt_to_ebitda_status ?? NA).replace(/_/g, " ")}</td></tr>
            <tr><th scope="row">Market value, 20 Nov</th><td>{usd(c?.mcap_event)} <small>approx.</small></td><th scope="row">EV ÷ sales</th><td>{f.ev_to_sales != null ? num(f.ev_to_sales, 1) + "×" : NA}</td></tr>
          </tbody>
        </table>
      )}
      {f && f.status !== "ok" && <p className="small">No structured SEC financial data were available for this company before the cutoff.</p>}
      {f?.filing_url && <p className="small"><a href={f.filing_url} target="_blank" rel="noreferrer">Latest filing used (SEC EDGAR) ↗</a>{f.fin_stale ? " — note: this is older than December 2025." : ""}</p>}
      <h4>Documented relationships ({edges.length})</h4>
      {edges.length === 0 ? <p className="small">None in our sourced dataset. That means “not documented by us”, not “none exist”.</p>
        : <ul className="edge-list">{edges.sort((a, b) => (b.comparable_amount ?? 0) - (a.comparable_amount ?? 0)).map((e) => <EdgeItem key={e.id} e={e} me={id} d={d} />)}</ul>}
      <p className="small">Status key: {Object.entries(STATUS_LABEL).map(([k, v]) => v).join(" · ")}</p>
    </aside>
  );
}
