"""Shared helpers: polite HTTP with retries, caching and provenance logging."""
from __future__ import annotations
import csv, json, time, hashlib
from datetime import datetime, timezone
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw"
PROCESSED = ROOT / "data" / "processed"
PROVENANCE = ROOT / "data" / "provenance"
UNIVERSE = ROOT / "research" / "curated" / "universe.csv"
# Honest, generic client id. No personal contact details are sent to third parties.
UA = "ai-reckoning-research/1.0 (data journalism project)"
_last_call: dict[str, float] = {}


def universe() -> list[dict]:
    with open(UNIVERSE) as f:
        return list(csv.DictReader(f))


def get(url: str, cache: Path, min_interval: float = 0.25, retries: int = 4, refresh: bool = False):
    """GET with on-disk cache, per-host rate limit, exponential backoff. Returns (bytes|None, meta)."""
    host = url.split("/")[2]
    if cache.exists() and not refresh:
        return cache.read_bytes(), {"url": url, "cached": True}
    err = None
    for attempt in range(retries):
        wait = min_interval - (time.time() - _last_call.get(host, 0))
        if wait > 0:
            time.sleep(wait)
        _last_call[host] = time.time()
        try:
            r = requests.get(url, headers={"User-Agent": UA, "Accept-Encoding": "gzip, deflate"}, timeout=40)
            if r.status_code == 200:
                cache.parent.mkdir(parents=True, exist_ok=True)
                cache.write_bytes(r.content)
                log_provenance(url, cache, r.content)
                return r.content, {"url": url, "cached": False}
            err = f"HTTP {r.status_code}"
            if r.status_code in (401, 403, 404):
                break  # do not hammer a server that refuses us
        except requests.RequestException as e:  # network error: retry
            err = repr(e)
        time.sleep(1.5 * 2 ** attempt)
    return None, {"url": url, "error": err}


def log_provenance(url: str, path: Path, content: bytes) -> None:
    PROVENANCE.mkdir(parents=True, exist_ok=True)
    row = {
        "retrieved_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "url": url,
        "local_path": str(path.relative_to(ROOT)),
        "bytes": len(content),
        "sha256": hashlib.sha256(content).hexdigest(),
    }
    with open(PROVENANCE / "retrieval_log.jsonl", "a") as f:
        f.write(json.dumps(row) + "\n")
