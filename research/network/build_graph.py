"""Merge the two sourced relationship files into one canonical directed graph and compute descriptive metrics.

Rules that prevent misleading sums:
- Amounts are never added across status classes (completed / ongoing / announced / conditional / estimated).
- Stake values (mark-to-market) and annual run-rates are excluded from every total.
- Reciprocal pairs (A pays B and B pays A) are flagged; they are not netted and not added together.
- Centrality is a description of the documented graph, not a measure of systemic risk.
"""
from __future__ import annotations
import json, math, re
from collections import defaultdict
from pathlib import Path
import networkx as nx, pandas as pd

ROOT = Path(__file__).resolve().parents[2]
PROV, PROCESSED = ROOT / "data" / "provenance", ROOT / "data" / "processed"

# ordered (regex, id, display name, kind, role). kind: company | private | vehicle | pool | consortium | government
RULES = [
    (r"bond investors|Bond and equity investors", "pool:bonds", "Bond investors (public debt markets)", "pool", "capital"),
    (r"syndicate|bank group|-led financing|21 lenders|initial lender", "pool:banks", "Bank loan syndicates", "pool", "capital"),
    (r"Public market investors|Equity investors \(", "pool:equity", "Public equity investors (IPOs, share sales)", "pool", "capital"),
    (r"^Series |Atreides|TWG Global|Institutional investors|GIC and CPP", "pool:private", "Private-round investors", "pool", "capital"),
    (r"Apollo, BlackRock, Blackstone, Brookfield", "cons:sixfirms", "Six Wall Street firms (Nvidia MOUs)", "consortium", "capital"),
    (r"Nvidia-ecosystem AI infrastructure", "veh:nvda-eco", "Nvidia-ecosystem projects (MOU pipeline)", "vehicle", "infrastructure"),
    (r"Beignet|Hyperion joint venture", "veh:hyperion", "Hyperion JV (Meta–Blue Owl, Louisiana)", "vehicle", "infrastructure"),
    (r"El Paso joint venture", "veh:elpaso", "El Paso JV (Meta–BlackRock)", "vehicle", "infrastructure"),
    (r"Blue Owl-STACK", "veh:jupiter", "Project Jupiter (Blue Owl–STACK, New Mexico)", "vehicle", "infrastructure"),
    (r"Crusoe-Blue Owl-Primary", "veh:abilene", "Abilene JV (Crusoe–Blue Owl)", "vehicle", "infrastructure"),
    (r"TeraWulf-Fluidstack joint venture", "veh:abernathy", "Abernathy JV (TeraWulf–Fluidstack)", "vehicle", "infrastructure"),
    (r"Broadcom AI XPV", "veh:xpv", "Broadcom XPV platform (compute for Anthropic)", "vehicle", "compute"),
    (r"Valor Compute|vehicle that leases Nvidia chips", "veh:valor", "Valor Compute Infrastructure (chip lessor to xAI)", "vehicle", "capital"),
    (r"^Stargate", "veh:stargate", "Stargate (OpenAI–SoftBank JV)", "vehicle", "infrastructure"),
    (r"Equinix xScale", "veh:xscale", "Equinix xScale US JV", "vehicle", "infrastructure"),
    (r"Digital Realty U\.S\. Hyperscale", "veh:dlrfund", "Digital Realty US Hyperscale Fund", "vehicle", "infrastructure"),
    (r"Brookfield Artificial Intelligence Infrastructure Fund", "veh:bamai", "Brookfield AI Infrastructure Fund", "vehicle", "capital"),
    (r"^AIP, MGX", "cons:aip", "AIP consortium (BlackRock GIP, MGX and partners)", "consortium", "capital"),
    (r"Amazon \(AWS\) and Google Cloud", "cons:aws-gcp", "AWS + Google Cloud (combined, split undisclosed)", "consortium", "infrastructure"),
    (r"Microsoft and Meta Platforms \(two", "cons:msft-meta", "Microsoft + Meta (unnamed >10% customers)", "consortium", "infrastructure"),
    (r"Silver Lake and DigitalBridge", "priv:silverlake-dbrg", "Silver Lake / DigitalBridge", "private", "capital"),
    (r"Apollo-led funds|^Apollo", "APO", None, "company", None), (r"^Blue Owl Capital", "OWL", None, "company", None),
    (r"^Brookfield", "BAM", None, "company", None), (r"^BlackRock", "BLK", "BlackRock", "company", "capital"),
    (r"^Alphabet", "GOOGL", None, "company", None), (r"^Amazon", "AMZN", None, "company", None), (r"^Meta", "META", None, "company", None),
    (r"^Microsoft", "MSFT", None, "company", None), (r"^Nebius", "NBIS", None, "company", None), (r"^Applied Digital", "APLD", None, "company", None),
    (r"^American Electric Power", "AEP", None, "company", None), (r"^SpaceX|^xAI", "SPCX", None, "company", None),
    (r"^SoftBank", "SFTBY", None, "company", None), (r"^TSMC", "TSM", None, "company", None), (r"^SK hynix", "SKHY", None, "company", None),
    (r"^Anthropic", "ANT", None, "company", None), (r"^Cerebras", "CBRS", None, "company", None), (r"^Vantage", "priv:vantage", "Vantage Data Centers", "private", "infrastructure"),
    (r"^Aligned", "priv:aligned", "Aligned Data Centers", "private", "infrastructure"), (r"^Related Digital", "priv:related", "Related Digital", "private", "infrastructure"),
    (r"^Calpine", "priv:calpine", "Calpine", "private", "energy"), (r"^SB Energy", "priv:sbenergy", "SB Energy", "private", "infrastructure"),
    (r"^DigitalBridge", "priv:dbrg", "DigitalBridge (delisted 2026)", "private", "capital"),
    (r"^US Department of Energy", "gov:doe", "US Department of Energy (Loan Programs Office)", "government", "capital"),
    (r"^Macquarie", "MQG", "Macquarie Asset Management", "company", "capital"),
]
PRIVATE_ROLE = {"OpenAI": "models_apps", "Mistral AI": "models_apps", "Scale AI": "models_apps", "X Corp (Elon Musk)": "models_apps",
                "Fluidstack": "infrastructure", "Crusoe": "infrastructure", "Lambda": "infrastructure", "Nscale": "infrastructure", "Switch": "infrastructure",
                "Groq": "compute", "Ampere Computing": "compute", "Samsung Electronics": "compute", "Nokia": "compute", "Schneider Electric": "energy",
                "Kairos Power": "energy", "X-energy": "energy", "TerraPower": "energy", "Walt Disney": "other", "Tesla": "models_apps"}
STATUS_ORDER = ["completed", "ongoing", "announced", "conditional", "estimated"]


def canon(name, ticker, uni):
    for rx, cid, disp, kind, role in RULES:
        if re.search(rx, name):
            if cid in uni.index:
                return cid, uni.loc[cid, "name"], "company", uni.loc[cid, "role"]
            return cid, disp or name, kind, role
    if ticker and ticker in uni.index:
        return ticker, uni.loc[ticker, "name"], "company", uni.loc[ticker, "role"]
    kind = "company" if ticker else "private"
    return (ticker or "priv:" + re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")), name, kind, PRIVATE_ROLE.get(name, "other")


def main():
    uni = pd.read_csv(ROOT / "research" / "curated" / "universe.csv").set_index("ticker")
    raw = json.loads((PROV / "relationships_part_a.json").read_text()) + json.loads((PROV / "relationships_part_b.json").read_text())
    nodes, edges = {}, []
    for e in raw:
        if re.search(r"CANCELLED", e.get("notes") or ""):
            e["status_detail"] = "cancelled"
        ends = []
        for side in ("source", "target"):
            cid, disp, kind, role = canon(e[side], e.get(f"{side}_ticker"), uni)
            in_uni = cid in uni.index
            nodes.setdefault(cid, {"id": cid, "name": disp, "kind": kind, "role": role or "other", "ticker": cid if kind == "company" else None,
                                   "in_universe": bool(in_uni), "raw_names": set()})["raw_names"].add(e[side])
            ends.append(cid)
        if ends[0] == ends[1]:
            continue
        amt_ok = e.get("announced_amount") is not None and e.get("amount_basis") in ("total_contract", "up_to")
        edges.append({"id": e["id"], "source": ends[0], "target": ends[1], "source_as_reported": e["source"], "target_as_reported": e["target"],
                      "type": e["type"], "description": e["description"], "announced_amount": e.get("announced_amount"),
                      "realized_amount": e.get("realized_amount"), "currency": e.get("currency", "USD"), "amount_basis": e.get("amount_basis"),
                      "amount_state": ("undisclosed" if e.get("announced_amount") is None else "stake_value_not_cash" if e.get("amount_basis") == "stake_value"
                                       else "annual_run_rate" if e.get("amount_basis") == "annual" else "ceiling" if e.get("amount_basis") == "up_to" else "contract_total"),
                      "comparable_amount": e["announced_amount"] if amt_ok else None,
                      "period": e.get("period"), "capacity_gw": e.get("capacity_gw"), "disclosure_date": e.get("disclosure_date"),
                      "status": "announced" if e.get("status_detail") == "cancelled" else e["status"], "cancelled": e.get("status_detail") == "cancelled",
                      "source_url": e["source_url"], "source_publisher": e.get("source_publisher"), "source_type": e.get("source_type"),
                      "secondary_url": e.get("secondary_url"), "confidence": e["confidence"], "notes": e.get("notes")})
    live = [e for e in edges if not e["cancelled"]]
    # reciprocal pairs
    pairset = defaultdict(list)
    for e in live: pairset[(e["source"], e["target"])].append(e["id"])
    recips = sorted({tuple(sorted([a, b])) for (a, b) in pairset if (b, a) in pairset})
    for e in edges: e["reciprocal_pair"] = tuple(sorted([e["source"], e["target"]])) in recips
    # graph metrics
    G = nx.MultiDiGraph()
    for e in live: G.add_edge(e["source"], e["target"], key=e["id"], **e)
    UG = nx.Graph()
    for e in live:
        w = UG.get_edge_data(e["source"], e["target"], {}).get("weight", 0) + 1
        UG.add_edge(e["source"], e["target"], weight=w)
    comms = list(nx.community.greedy_modularity_communities(UG, weight="weight"))
    comm_of = {n: i for i, c in enumerate(comms) for n in c}
    btw = nx.betweenness_centrality(UG)
    def strength(n, direction, status_set):
        it = G.in_edges(n, data=True) if direction == "in" else G.out_edges(n, data=True)
        return sum(d["comparable_amount"] for _, _, d in it if d["comparable_amount"] and d["status"] in status_set)
    firm, soft = {"completed", "ongoing"}, {"announced", "conditional", "estimated"}
    for n, nd in nodes.items():
        nd["raw_names"] = sorted(nd["raw_names"])
        if n not in G: nd.update(degree=0); continue
        nbrs = set(UG.neighbors(n))
        nd.update(degree=len(nbrs), n_edges=G.in_degree(n) + G.out_degree(n), in_edges=G.in_degree(n), out_edges=G.out_degree(n),
                  inflow_firm=strength(n, "in", firm), outflow_firm=strength(n, "out", firm),
                  inflow_soft=strength(n, "in", soft), outflow_soft=strength(n, "out", soft),
                  realized_in=sum(d["realized_amount"] or 0 for _, _, d in G.in_edges(n, data=True)),
                  realized_out=sum(d["realized_amount"] or 0 for _, _, d in G.out_edges(n, data=True)),
                  betweenness=btw.get(n, 0), community=comm_of.get(n))
        # counterparty concentration of firm inflows (who pays this node)
        by = defaultdict(float)
        for s, _, d in G.in_edges(n, data=True):
            if d["comparable_amount"] and d["status"] in firm: by[s] += d["comparable_amount"]
        tot = sum(by.values())
        nd["top_payer"] = max(by, key=by.get) if by else None
        nd["top_payer_share_of_firm_inflow"] = max(by.values()) / tot if tot else None
    # deterministic layout: height = layer of the money chain; radius = fewer documented counterparties -> further out
    layer_y = {"capital": 4, "models_apps": 3, "infrastructure": 2, "compute": 1, "energy": 0, "other": 3.5, "control_tech": 3.5, "control_other": 3.5}
    for role, grp in pd.DataFrame(nodes.values()).groupby("role"):
        grp = grp.sort_values(["degree", "id"], ascending=[False, True]).reset_index(drop=True)
        for i, r in grp.iterrows():
            ang = i * 2.399963229728653  # golden angle: deterministic, even spread
            rad = 0.9 * math.sqrt(i + 0.35)
            nodes[r["id"]].update(x=round(rad * math.cos(ang), 4), z=round(rad * math.sin(ang), 4), y=layer_y.get(role, 3.5) * 2.2, layout_rank=int(i))
    # totals by status (never summed across statuses)
    tot = defaultdict(lambda: defaultdict(float)); cnt = defaultdict(int)
    for e in live:
        cnt[e["status"]] += 1
        if e["comparable_amount"]: tot[e["status"]][e["amount_state"]] += e["comparable_amount"]
    realized_total = sum(e["realized_amount"] or 0 for e in live)
    # concentration: share of comparable firm commitments that touch the top-k nodes
    firm_edges = [e for e in live if e["comparable_amount"] and e["status"] in firm]
    firm_total = sum(e["comparable_amount"] for e in firm_edges)
    touch = defaultdict(float)
    for e in firm_edges:
        touch[e["source"]] += e["comparable_amount"]; touch[e["target"]] += e["comparable_amount"]
    rank = sorted(touch.items(), key=lambda kv: -kv[1])
    def share_touching(ids): return sum(e["comparable_amount"] for e in firm_edges if e["source"] in ids or e["target"] in ids) / firm_total
    conc = {"firm_commitment_total_usd": firm_total, "n_firm_edges_with_amount": len(firm_edges),
            "top_nodes_by_firm_amount_touched": [{"id": k, "name": nodes[k]["name"], "amount": v, "share_of_total": v / firm_total} for k, v in rank[:12]],
            "share_touching_top1": share_touching({rank[0][0]}), "share_touching_top2": share_touching({r[0] for r in rank[:2]}),
            "share_touching_top5": share_touching({r[0] for r in rank[:5]}),
            "payer_hhi": sum((v / firm_total) ** 2 for v in pd.Series({e["id"]: e["comparable_amount"] for e in firm_edges}).groupby([e["source"] for e in firm_edges]).sum()),
            "payer_shares": sorted(({"id": k, "name": nodes[k]["name"], "share": v / firm_total, "amount": v} for k, v in
                                    pd.Series([e["comparable_amount"] for e in firm_edges]).groupby([e["source"] for e in firm_edges]).sum().items()), key=lambda r: -r["share"])[:10],
            "recipient_shares": sorted(({"id": k, "name": nodes[k]["name"], "share": v / firm_total, "amount": v} for k, v in
                                        pd.Series([e["comparable_amount"] for e in firm_edges]).groupby([e["target"] for e in firm_edges]).sum().items()), key=lambda r: -r["share"])[:10],
            "note": "Firm = status completed or ongoing with a contract total or ceiling. Excludes stake values, annual run-rates and undisclosed amounts. Shares describe DISCLOSED amounts only."}
    summary = {"n_edges_raw": len(raw), "n_edges": len(edges), "n_live_edges": len(live), "n_nodes": len(nodes), "n_universe_nodes": sum(n["in_universe"] for n in nodes.values()),
               "edges_by_status": dict(cnt), "edges_by_type": pd.Series([e["type"] for e in live]).value_counts().to_dict(),
               "edges_by_confidence": pd.Series([e["confidence"] for e in live]).value_counts().to_dict(),
               "edges_by_source_type": pd.Series([e["source_type"] for e in live]).value_counts().to_dict(),
               "edges_with_amount": sum(e["announced_amount"] is not None for e in live), "edges_with_realized_amount": sum(e["realized_amount"] is not None for e in live),
               "amount_totals_by_status_usd": {s: dict(v) for s, v in tot.items()}, "realized_total_usd": realized_total,
               "reciprocal_pairs": [{"a": a, "b": b, "edges_a_to_b": pairset[(a, b)], "edges_b_to_a": pairset[(b, a)]} for a, b in recips],
               "communities": [{"id": i, "size": len(c), "members": sorted(c, key=lambda n: -nodes[n]["degree"])[:8]} for i, c in enumerate(comms) if len(c) >= 3],
               "density": nx.density(UG), "concentration": conc,
               "degree_top": sorted(({"id": n["id"], "name": n["name"], "degree": n["degree"], "betweenness": round(n.get("betweenness", 0), 4)} for n in nodes.values()), key=lambda r: -r["degree"])[:15]}
    PROCESSED.mkdir(exist_ok=True)
    (PROCESSED / "graph_edges.json").write_text(json.dumps(edges, indent=1))
    (PROCESSED / "graph_node_metrics.json").write_text(json.dumps({"nodes": list(nodes.values())}, indent=1))
    (PROCESSED / "graph_summary.json").write_text(json.dumps(summary, indent=1))
    s = summary
    print({k: s[k] for k in ["n_edges", "n_live_edges", "n_nodes", "n_universe_nodes", "edges_by_status", "edges_with_amount", "edges_with_realized_amount", "density"]})
    print("totals", {k: {a: round(b / 1e9) for a, b in v.items()} for k, v in s["amount_totals_by_status_usd"].items()}, "realized bn", round(realized_total / 1e9))
    print("degree", [(d["name"], d["degree"]) for d in s["degree_top"]])
    print("conc", round(conc["firm_commitment_total_usd"] / 1e9), conc["share_touching_top1"], conc["share_touching_top2"], conc["share_touching_top5"], "HHI", conc["payer_hhi"])
    print("payers", [(d["name"], round(d["share"], 3)) for d in conc["payer_shares"]])
    print("recips", [(d["name"], round(d["share"], 3)) for d in conc["recipient_shares"]])
    print("touch", [(d["name"], round(d["share_of_total"], 3)) for d in conc["top_nodes_by_firm_amount_touched"]])
    print("reciprocal", [(r["a"], r["b"]) for r in s["reciprocal_pairs"]])
    print("comms", [(c["size"], c["members"][:5]) for c in s["communities"]])
    print("other-role nodes:", [n["name"] for n in nodes.values() if n["role"] == "other"])


if __name__ == "__main__":
    main()
