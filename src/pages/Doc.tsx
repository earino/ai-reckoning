import { useMemo, useState } from "react";
import { marked } from "marked";
import type { DataBundle } from "../data/types";
import { dateLong } from "../data/format";
import methods from "../../methodology/methods.md?raw";
import limitations from "../../methodology/limitations.md?raw";
import dictionary from "../../methodology/data-dictionary.md?raw";
import researchLog from "../../editorial/research-log.md?raw";
import factCheck from "../../editorial/fact-check.md?raw";
import corrections from "../../CORRECTIONS.md?raw";
import about from "../../editorial/about.md?raw";

export const DOC_PAGES: Record<string, { title: string; md?: string }> = {
  methodology: { title: "Methodology", md: methods }, limitations: { title: "Limitations", md: limitations }, data: { title: "Data", md: dictionary },
  sources: { title: "Sources" }, "research-log": { title: "Research log", md: researchLog }, "fact-check": { title: "Fact-check record", md: factCheck },
  corrections: { title: "Corrections", md: corrections }, about: { title: "About", md: about },
};
const FILES = ["companies", "prices", "financials", "relationships", "event-study", "models", "scenarios", "sources", "timeline", "story-numbers", "publication-metadata"];

function Sources({ d }: { d: DataBundle }) {
  const [q, setQ] = useState(""); const [kind, setKind] = useState("all");
  const kinds = useMemo(() => ["all", ...new Set(d.sources.map((s) => s.kind))], [d]);
  const rows = d.sources.filter((s) => (kind === "all" || s.kind === kind) && (q === "" || `${s.title} ${s.publisher} ${s.url} ${s.used_for}`.toLowerCase().includes(q.toLowerCase())));
  return (<>
    <h1>Sources</h1>
    <p>{d.sources.length} sources support this investigation. Every relationship in the network, every timeline entry and every company's financial data links to one of them. News sources were used for chronology and for deals that have no filing; numbers used in calculations come from SEC filings and market data.</p>
    <h2>Event timeline</h2>
    <ol className="timeline">{d.timeline.map((t, i) => (
      <li key={i}><time dateTime={t.date}>{dateLong(t.date)}</time> <span className={`badge c-${t.confidence}`}>{t.confidence} confidence</span><h3>{t.title}</h3><p>{t.description}</p>
        {t.conflicts && <p className="note">Source conflict: {t.conflicts}</p>}
        <p className="small">{t.sources.map((s, j) => <span key={j}><a href={s.url} target="_blank" rel="noreferrer">{s.publisher}{s.title ? `: ${s.title}` : ""} ↗</a>{j < t.sources.length - 1 ? " · " : ""}</span>)}</p></li>
    ))}</ol>
    <h2>All sources</h2>
    <div className="controls"><label>Filter <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="publisher, title, ticker…" /></label>
      <label>Kind <select value={kind} onChange={(e) => setKind(e.target.value)}>{kinds.map((k) => <option key={k} value={k}>{k.replace(/_/g, " ")}</option>)}</select></label><span>{rows.length} shown</span></div>
    <div className="table-wrap" tabIndex={0} role="region" aria-label="Table of sources"><table className="data"><thead><tr><th scope="col">ID</th><th scope="col">Publisher</th><th scope="col">Title / description</th><th scope="col">Kind</th><th scope="col">Used for</th></tr></thead>
      <tbody>{rows.map((s) => <tr key={s.id}><td>{s.id}</td><td>{s.publisher ?? "—"}</td><td><a href={s.url} target="_blank" rel="noreferrer">{s.title ?? s.url} ↗</a></td><td>{s.kind.replace(/_/g, " ")}</td><td>{s.used_for}</td></tr>)}</tbody></table></div>
  </>);
}

export default function Doc({ page, d }: { page: string; d: DataBundle }) {
  const p = DOC_PAGES[page];
  const html = useMemo(() => (p?.md ? (marked.parse(p.md, { async: false }) as string)
    .replace(/<table>/g, '<div class="table-scroll" tabindex="0" role="region" aria-label="Table"><table>').replace(/<\/table>/g, "</table></div>")
    .replace(/<pre>/g, '<pre tabindex="0">') : ""), [p]);
  if (!p) return <main id="main" className="doc"><h1>Page not found</h1><p><a href="#prologue">Return to the story</a></p></main>;
  return (
    <main id="main" className="doc">
      <nav className="docnav" aria-label="Transparency pages">{Object.entries(DOC_PAGES).map(([k, v]) => <a key={k} href={`#/${k}`} aria-current={k === page ? "page" : undefined}>{v.title}</a>)}</nav>
      {page === "sources" ? <Sources d={d} /> : <article dangerouslySetInnerHTML={{ __html: html }} />}
      {page === "data" && <section><h2>Download the published data</h2><p>Each file is JSON with a metadata header: schema version, generation time, source cutoff, units and missing-value rules.</p>
        <ul>{FILES.map((f) => <li key={f}><a href={`${import.meta.env.BASE_URL}data/${f}.json`}>{f}.json</a></li>)}</ul></section>}
      <p className="asof">Research cutoff {dateLong(d.meta.research_cutoff)} · published {dateLong(d.meta.published)} · data files generated {d.meta.generated_utc} · static, not live.</p>
    </main>
  );
}
