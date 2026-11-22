"""Resolve tickers to SEC CIKs and download submissions + XBRL company facts from data.sec.gov.

CIK resolution uses only data.sec.gov: the XBRL "frames" API lists every filer (cik, entityName) that
reported a concept; candidates are name-matched and then VERIFIED against the submissions API, which
returns the tickers registered to that CIK. A CIK is accepted only if the ticker matches.
"""
from __future__ import annotations
import json, re, sys
from common import RAW, PROCESSED, get, universe

FRAMES = [
    "us-gaap/Assets/USD/CY2026Q2I", "us-gaap/Assets/USD/CY2026Q1I", "us-gaap/Assets/USD/CY2025Q4I",
    "us-gaap/Assets/USD/CY2026Q3I", "ifrs-full/Assets/USD/CY2025Q4I", "ifrs-full/Assets/TWD/CY2025Q4I",
    "ifrs-full/Assets/EUR/CY2025Q4I", "us-gaap/Assets/EUR/CY2025Q4I", "us-gaap/StockholdersEquity/USD/CY2025Q4I",
]
STOP = {"INC", "CORP", "CORPORATION", "CO", "COMPANY", "LTD", "LIMITED", "PLC", "HOLDINGS", "HOLDING", "GROUP", "THE",
        "CLASS", "A", "B", "ADR", "NY", "SHARES", "NV", "SA", "AG", "SE", "COM", "INCORPORATED", "DE", "COMPANIES",
        "TECHNOLOGIES", "TECHNOLOGY", "INTERNATIONAL", "SYSTEMS", "US", "USA", "PBC", "TRUST"}
# Names in universe.csv that differ from the SEC conformed name.
ALIAS = {"GOOGL": "ALPHABET", "TSM": "TAIWAN SEMICONDUCTOR MANUFACTURING", "BRK-B": "BERKSHIRE HATHAWAY", "IBM": "INTERNATIONAL BUSINESS MACHINES",
         "HPE": "HEWLETT PACKARD ENTERPRISE", "ADP": "AUTOMATIC DATA PROCESSING", "PEG": "PUBLIC SERVICE ENTERPRISE", "T": "AT&T",
         "MCD": "MCDONALDS", "LOW": "LOWES", "UPS": "UNITED PARCEL SERVICE", "PM": "PHILIP MORRIS", "KO": "COCA COLA", "AI": "C3.AI",
         "SOUN": "SOUNDHOUND", "BBAI": "BIGBEAR", "NVT": "NVENT", "OBDC": "BLUE OWL CAPITAL CORP", "OWL": "BLUE OWL CAPITAL INC",
         "DIS": "WALT DISNEY", "MDLZ": "MONDELEZ", "CL": "COLGATE PALMOLIVE", "SHW": "SHERWIN WILLIAMS", "JNJ": "JOHNSON & JOHNSON",
         "PG": "PROCTER & GAMBLE", "SPGI": "S&P GLOBAL", "ANT": "ANTHROPIC", "SFTBY": "SOFTBANK", "TMUS": "T-MOBILE", "TTWO": "TAKE-TWO",
         "FSK": "FS KKR CAPITAL", "AEP": "AMERICAN ELECTRIC POWER", "D": "DOMINION ENERGY", "SO": "SOUTHERN CO", "FIX": "COMFORT SYSTEMS",
         "TT": "TRANE", "JCI": "JOHNSON CONTROLS", "ON": "ON SEMICONDUCTOR", "NXPI": "NXP SEMICONDUCTORS", "U": "UNITY SOFTWARE", "ARM": "ARM HOLDINGS",
         "DBRG": "DIGITALBRIDGE", "BAM": "BROOKFIELD ASSET MANAGEMENT", "TPG": "TPG INC", "C": "CITIGROUP", "MS": "MORGAN STANLEY", "O": "REALTY INCOME",
         "GEV": "GE VERNOVA", "META": "META PLATFORMS", "AMD": "ADVANCED MICRO DEVICES", "MU": "MICRON", "STX": "SEAGATE", "CEG": "CONSTELLATION ENERGY",
         "CRM": "SALESFORCE", "NOW": "SERVICENOW", "PATH": "UIPATH", "APP": "APPLOVIN", "TEM": "TEMPUS AI", "NET": "CLOUDFLARE", "ZS": "ZSCALER"}


def norm(s: str) -> list[str]:
    toks = re.sub(r"[^A-Z0-9& ]", " ", s.upper().replace("'", "")).split()
    return [t for t in toks if t not in STOP]


def load_entities() -> dict[str, str]:
    ents: dict[str, str] = {}
    for fr in FRAMES:
        raw, _ = get(f"https://data.sec.gov/api/xbrl/frames/{fr}.json", RAW / "sec" / "frames" / (fr.replace("/", "_") + ".json"), 0.15)
        if raw:
            for d in json.loads(raw)["data"]:
                ents.setdefault(str(d["cik"]).zfill(10), d["entityName"])
    return ents


def submissions(cik: str):
    raw, meta = get(f"https://data.sec.gov/submissions/CIK{cik}.json", RAW / "sec" / "submissions" / f"{cik}.json", 0.15)
    return json.loads(raw) if raw else None


# Candidate CIKs for names the matcher misses. Each is still verified against the submissions ticker list.
CANDIDATE_CIK = {"MCD": "0000063908", "LOW": "0000060667", "BAC": "0000070858", "DBRG": "0001679688", "EA": "0000712515",
                 "TSM": "0001046179", "CCJ": "0001009001", "BTDR": "0001899123", "ANT": "0002130357"}


def resolve(row, ents):
    tkr = row["ticker"]
    if tkr in CANDIDATE_CIK:
        sub = submissions(CANDIDATE_CIK[tkr])
        if sub and tkr in sub.get("tickers", []):
            return sub
    want = norm(ALIAS.get(tkr, row["name"]))
    if not want:
        return None
    scored = []
    for cik, name in ents.items():
        have = norm(name)
        if not have:
            continue
        common = 0
        for a, b in zip(want, have):
            if a == b: common += 1
            else: break
        if common == 0 and want[0] not in have:
            continue
        scored.append((-(common * 10 + (want[0] in have)) , abs(len(have) - len(want)), cik))
    scored.sort()
    for _, _, cik in scored[:12]:
        sub = submissions(cik)
        if sub and tkr.replace("-", "").upper() in [t.replace("-", "").upper() for t in sub.get("tickers", [])]:
            return sub
    return None


def main():
    ents = load_entities()
    print("entities in frames:", len(ents))
    out, missing = [], []
    for row in universe():
        sub = resolve(row, ents)
        if not sub:
            missing.append(row["ticker"]); continue
        cik = str(sub["cik"]).zfill(10)
        facts, meta = get(f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json", RAW / "sec" / "facts" / f"{cik}.json", 0.15)
        out.append({"ticker": row["ticker"], "cik": cik, "sec_name": sub["name"], "sic": sub.get("sic"), "sic_description": sub.get("sicDescription"),
                    "exchanges": sub.get("exchanges"), "sec_tickers": sub.get("tickers"), "state_of_incorporation": sub.get("stateOfIncorporation"),
                    "fiscal_year_end": sub.get("fiscalYearEnd"), "entity_type": sub.get("entityType"), "has_companyfacts": facts is not None,
                    "submissions_url": f"https://data.sec.gov/submissions/CIK{cik}.json"})
    PROCESSED.mkdir(parents=True, exist_ok=True)
    (PROCESSED / "identity_sec.json").write_text(json.dumps({"resolved": out, "unresolved": missing}, indent=1))
    print(f"resolved {len(out)}; no facts: {[o['ticker'] for o in out if not o['has_companyfacts']]}; unresolved: {missing}")


if __name__ == "__main__":
    main()
