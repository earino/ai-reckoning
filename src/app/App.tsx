import { useEffect, useState } from "react";
import type { DataBundle } from "../data/types";
import { loadData } from "../data/load";
import Story from "../narrative/Story";
import Doc, { DOC_PAGES } from "../pages/Doc";

function useRoute(): string {
  const [h, setH] = useState(window.location.hash);
  useEffect(() => { const f = () => setH(window.location.hash); window.addEventListener("hashchange", f); return () => window.removeEventListener("hashchange", f); }, []);
  return h.startsWith("#/") ? h.slice(2) : "";
}

export default function App() {
  const [d, setD] = useState<DataBundle | null>(null); const [err, setErr] = useState<string | null>(null);
  const route = useRoute();
  useEffect(() => { loadData().then(setD).catch((e) => setErr(String(e.message ?? e))); }, []);
  useEffect(() => { if (route) window.scrollTo(0, 0); document.title = route && DOC_PAGES[route] ? `${DOC_PAGES[route].title} — The AI Reckoning` : "The AI Reckoning — the crash followed the beta, not the bill"; }, [route]);
  return (
    <>
      <a className="skip" href="#main">Skip to the article</a>
      <nav className="topnav" aria-label="Site">
        <a className="brand" href="#prologue" onClick={() => { if (route) window.location.hash = ""; }}>The AI Reckoning</a>
        <div className="links">
          {!route && <><a href="#chapter-2">Network</a><a href="#observatory">Event study</a><a href="#chapter-5">Simulator</a><a href="#epilogue">Explore</a></>}
          {route && <a href="#prologue">← Story</a>}
          <a href="#/methodology">Methods</a><a href="#/sources">Sources</a>
        </div>
      </nav>
      {err && <main id="main" className="doc"><h1>The data did not load</h1><p role="alert">{err}. Reload the page. If the problem continues, the data files are in the public repository.</p></main>}
      {!err && !d && <main id="main" className="loading" aria-busy="true"><p className="kicker">The AI Reckoning</p><h1>The crash followed the beta, not the bill</h1><p>Loading data…</p></main>}
      {!err && d && (route ? <Doc page={route} d={d} /> : <Story d={d} />)}
    </>
  );
}
