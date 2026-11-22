"""Download daily price history from the Yahoo Finance chart endpoint.

Licensing: Yahoo price data is NOT redistributable. Raw files stay in data/raw (git-ignored).
The repository publishes only derived statistics (returns, betas, indexed series).
"""
from __future__ import annotations
import json, sys
from urllib.parse import quote
import pandas as pd
from common import RAW, PROCESSED, get, universe

BENCHMARKS = {
    "SPY": "S&P 500 ETF", "QQQ": "Nasdaq-100 ETF", "IWM": "Russell 2000 ETF", "RSP": "S&P 500 equal weight ETF",
    "IWD": "Russell 1000 Value ETF", "IWF": "Russell 1000 Growth ETF", "MTUM": "MSCI USA Momentum ETF",
    "XLK": "Technology", "XLC": "Communication Services", "XLY": "Consumer Discretionary", "XLP": "Consumer Staples",
    "XLE": "Energy", "XLF": "Financials", "XLV": "Health Care", "XLI": "Industrials", "XLB": "Materials",
    "XLRE": "Real Estate", "XLU": "Utilities", "SMH": "Semiconductors ETF", "IGV": "Software ETF",
    "^GSPC": "S&P 500", "^IXIC": "Nasdaq Composite", "^NDX": "Nasdaq-100", "^DJI": "Dow Jones Industrial Average",
    "^RUT": "Russell 2000", "^VIX": "CBOE Volatility Index", "^TNX": "10-year Treasury yield (x10)",
}
P1, P2 = 1719792000, 1795478400  # 2024-07-01 .. 2026-11-23 UTC


def fetch(ticker: str, refresh=False):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{quote(ticker)}?period1={P1}&period2={P2}&interval=1d&events=div%2Csplits"
    safe = ticker.replace("^", "_idx_")
    raw, meta = get(url, RAW / "prices" / f"{safe}.json", min_interval=0.5, refresh=refresh)
    if raw is None:
        return None, meta.get("error")
    try:
        res = json.loads(raw)["chart"]["result"][0]
        ts = pd.to_datetime(res["timestamp"], unit="s", utc=True).tz_convert("America/New_York").normalize().tz_localize(None)
        q = res["indicators"]["quote"][0]
        adj = res["indicators"].get("adjclose", [{}])[0].get("adjclose", q["close"])
        df = pd.DataFrame({"date": ts, "close": q["close"], "adj_close": adj, "volume": q["volume"]})
        df["ticker"] = ticker
        m = res["meta"]
        info = {"ticker": ticker, "exchange": m.get("fullExchangeName"), "currency": m.get("currency"),
                "yahoo_name": m.get("longName") or m.get("shortName"), "instrument": m.get("instrumentType")}
        return df.dropna(subset=["adj_close"]), info
    except Exception as e:  # malformed payload
        return None, repr(e)


def main():
    refresh = "--refresh" in sys.argv
    tickers = [r["ticker"] for r in universe()] + list(BENCHMARKS)
    frames, infos, failures = [], [], []
    for t in tickers:
        df, info = fetch(t, refresh)
        if df is None or df.empty:
            failures.append({"ticker": t, "error": str(info)})
            continue
        frames.append(df); infos.append(info)
    allp = pd.concat(frames, ignore_index=True)
    allp.to_parquet(RAW / "prices_all.parquet", index=False)
    pd.DataFrame(infos).to_csv(RAW / "price_meta.csv", index=False)
    PROCESSED.mkdir(parents=True, exist_ok=True)
    (PROCESSED / "price_failures.json").write_text(json.dumps(failures, indent=1))
    print(f"ok {len(frames)} tickers, {len(allp)} rows, last date {allp.date.max().date()}, failures: {failures}")


if __name__ == "__main__":
    main()
