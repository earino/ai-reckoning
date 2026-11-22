import type { DataBundle, Envelope } from "./types";

const base = import.meta.env.BASE_URL;
async function get<T>(name: string): Promise<Envelope<T>> {
  const r = await fetch(`${base}data/${name}.json`);
  if (!r.ok) throw new Error(`Could not load ${name}.json (HTTP ${r.status})`);
  return r.json();
}

export async function loadData(): Promise<DataBundle> {
  const [companies, prices, financials, events, models, graph, scenarios, sources, timeline, numbers, meta] = await Promise.all([
    get<any>("companies"), get<any>("prices"), get<any>("financials"), get<any>("event-study"), get<any>("models"), get<any>("relationships"),
    get<any>("scenarios"), get<any>("sources"), get<any>("timeline"), get<any>("story-numbers"), get<any>("publication-metadata"),
  ]);
  return {
    companies: companies.data, prices: prices.data, financials: financials.data, events: events.data, eventMeta: events, models: models.data,
    graph: graph.data, scenarios: scenarios.data, sources: sources.data, timeline: timeline.data, n: numbers.data, meta: { ...meta.data, generated_utc: meta.generated_utc },
    byTicker: new Map(companies.data.map((c: any) => [c.ticker, c])), finBy: new Map(financials.data.map((f: any) => [f.ticker, f])),
    evBy: new Map(events.data.map((e: any) => [e.ticker, e])), nodeBy: new Map(graph.data.nodes.map((g: any) => [g.id, g])),
  };
}
