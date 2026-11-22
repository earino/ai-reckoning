"""Check that cited source URLs respond. Many publishers refuse automated clients (401/403); those are reported, not treated as dead."""
import json, sys
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[2]
UA = "ai-reckoning-research/1.0 (data journalism project; link check)"


def check(s):
    url = s["url"]
    try:
        r = requests.get(url, headers={"User-Agent": UA}, timeout=15, stream=True, allow_redirects=True)
        code = r.status_code; r.close()
    except requests.RequestException as e:
        code = type(e).__name__
    cls = "ok" if code == 200 else "refuses_automated_clients" if code in (401, 403, 405, 406, 429, 451, 999) else "not_found" if code in (404, 410) else "error"
    return {"id": s["id"], "url": url, "result": code, "class": cls, "kind": s["kind"]}


def main():
    srcs = json.loads((ROOT / "public/data/sources.json").read_text())["data"]
    with ThreadPoolExecutor(12) as ex:
        res = list(ex.map(check, srcs))
    counts = {}
    for r in res: counts[r["class"]] = counts.get(r["class"], 0) + 1
    out = {"checked_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"), "n": len(res), "counts": counts,
           "not_ok": [r for r in res if r["class"] != "ok"]}
    (ROOT / "data/provenance/link_audit.json").write_text(json.dumps(out, indent=1))
    print(counts)
    print([(r["id"], r["result"], r["url"][:90]) for r in res if r["class"] in ("not_found", "error")][:40])


if __name__ == "__main__":
    main()
