#!/usr/bin/env python3
"""
Phase 3b: Branch enrichment via Google Places API (New) Text Search.

Reads data/orgs-phase2.json (538 organizations), queries Places API for each,
saves all matching physical locations as branches to data/orgs-phase3b.json.

Environment:
  GOOGLE_MAPS_API_KEY  — server key (grantkit-server-geocoding-v2), IP-unrestricted
  START_IDX            — optional, resume from this index (default 0)
  LIMIT                — optional, stop after N orgs (default all)

Output schema (per org):
  {
    "org_id": "ORG-0001",
    "organization": "...",
    "country": "US",
    "hq": { formatted_address, lat, lng, place_id, matched_name },
    "branches": [ { formatted_address, lat, lng, place_id, matched_name }, ... ],
    "places_found": N,
    "places_filtered": M,
    "search_status": "ok" | "zero_results" | "error"
  }

Pricing: Text Search (New) = $32/1000 calls; 538 calls = ~$17 (covered by $200/mo free credit).
"""
import json
import os
import sys
import time
import re
from pathlib import Path
from urllib import request as urlreq
from urllib.error import HTTPError, URLError

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
INPUT_FILE = DATA_DIR / "orgs-phase2.json"
OUTPUT_FILE = DATA_DIR / "orgs-phase3b.json"
CHECKPOINT_FILE = DATA_DIR / "orgs-phase3b.checkpoint.json"

# If the script is invoked from the sandbox where `data/` lives under outputs/
if not INPUT_FILE.exists():
    alt_dir = Path("/sessions/modest-magical-goldberg/mnt/outputs/data")
    if (alt_dir / "orgs-phase2.json").exists():
        INPUT_FILE = alt_dir / "orgs-phase2.json"
        OUTPUT_FILE = alt_dir / "orgs-phase3b.json"
        CHECKPOINT_FILE = alt_dir / "orgs-phase3b.checkpoint.json"

PLACES_ENDPOINT = "https://places.googleapis.com/v1/places:searchText"
FIELD_MASK = ",".join([
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.location",
    "places.types",
    "places.primaryType",
    "places.businessStatus",
    "places.googleMapsUri",
    "places.nationalPhoneNumber",
    "places.websiteUri",
    "places.addressComponents",
])

# Types we reject outright (online-only, non-physical)
REJECT_TYPES = {
    "establishment",  # too generic, kept only if another specific type present
}
# Types we strongly prefer (real physical locations)
PREFER_TYPES = {
    "hospital", "clinic", "pharmacy", "doctor",
    "school", "university", "library",
    "charity", "non_profit_organization",
    "local_government_office", "city_hall",
    "community_center", "church", "place_of_worship",
    "health", "medical_lab", "physiotherapist",
    "social_services_organization",
    "point_of_interest",
}

COUNTRY_CODE_MAP = {
    "US": "us", "CA": "ca", "GB": "gb", "UK": "gb",
    "FR": "fr", "DE": "de", "ES": "es", "IT": "it",
    "AU": "au", "NZ": "nz", "JP": "jp", "KR": "kr",
    "NL": "nl", "SE": "se", "NO": "no", "FI": "fi",
    "DK": "dk", "IE": "ie", "BE": "be", "AT": "at",
    "CH": "ch", "PL": "pl", "PT": "pt", "CZ": "cz",
    "BR": "br", "MX": "mx", "AR": "ar", "CL": "cl",
    "IN": "in", "IL": "il", "ZA": "za", "GE": "ge",
}


def clean_query(org_name: str) -> str:
    """Strip program suffixes that hurt search accuracy."""
    q = org_name
    # Remove common program-description suffixes after dashes
    q = re.split(r"\s+[-–—]\s+", q, maxsplit=1)[0]
    # Remove trailing parentheticals
    q = re.sub(r"\s*\([^)]*\)\s*$", "", q)
    return q.strip()


def normalise(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


def name_matches(query: str, candidate: str) -> bool:
    """True if the candidate place name overlaps the query enough to trust."""
    q = normalise(query)
    c = normalise(candidate)
    if not q or not c:
        return False
    if q in c or c in q:
        return True
    # Token overlap fallback — at least half the query tokens appear
    q_tokens = set(re.findall(r"[a-z0-9]+", query.lower()))
    c_tokens = set(re.findall(r"[a-z0-9]+", candidate.lower()))
    q_tokens = {t for t in q_tokens if len(t) > 2 and t not in {"the", "and", "for", "inc", "llc", "org"}}
    if not q_tokens:
        return False
    overlap = len(q_tokens & c_tokens)
    return overlap / len(q_tokens) >= 0.5


def is_physical_place(place: dict) -> bool:
    types = set(place.get("types", []))
    # Reject outright: "lodging", "point_of_interest" only (without any other type) are too generic
    if not types:
        return False
    # At least one non-generic type should be present
    specific = types - {"establishment", "point_of_interest"}
    return bool(specific)


def places_text_search(api_key: str, query: str, country: str | None = None, max_results: int = 10) -> dict:
    body = {
        "textQuery": query,
        "maxResultCount": max_results,
        "languageCode": "en",
    }
    if country and country.upper() in COUNTRY_CODE_MAP:
        body["regionCode"] = COUNTRY_CODE_MAP[country.upper()].upper()
    data = json.dumps(body).encode("utf-8")
    req = urlreq.Request(
        PLACES_ENDPOINT,
        data=data,
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": FIELD_MASK,
        },
        method="POST",
    )
    try:
        with urlreq.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except HTTPError as e:
        body_text = e.read().decode("utf-8", errors="replace")
        return {"_error": f"HTTP {e.code}: {body_text[:300]}"}
    except URLError as e:
        return {"_error": f"URL error: {e}"}


def extract_country_code(place: dict) -> str | None:
    for comp in place.get("addressComponents", []) or []:
        if "country" in (comp.get("types") or []):
            code = comp.get("shortText") or comp.get("short_name")
            if code:
                return code.upper()
    return None


def pick_branches(places: list, org_name: str, org_country: str) -> tuple[dict | None, list]:
    """Split matched places into HQ (best match) + branches."""
    accepted = []
    for p in places:
        name = (p.get("displayName") or {}).get("text", "")
        if not name_matches(org_name, name):
            continue
        if not is_physical_place(p):
            continue
        if p.get("businessStatus") and p["businessStatus"] not in ("OPERATIONAL", "BUSINESS_STATUS_UNSPECIFIED", None):
            continue
        country_code = extract_country_code(p)
        if country_code and org_country and country_code != org_country.upper():
            # Relax for US/CA ambiguity only; otherwise skip
            continue
        loc = p.get("location") or {}
        accepted.append({
            "place_id": p.get("id"),
            "name": name,
            "formatted_address": p.get("formattedAddress"),
            "latitude": loc.get("latitude"),
            "longitude": loc.get("longitude"),
            "types": p.get("types", []),
            "primary_type": p.get("primaryType"),
            "google_maps_uri": p.get("googleMapsUri"),
            "phone": p.get("nationalPhoneNumber"),
            "website": p.get("websiteUri"),
            "country": extract_country_code(p),
        })
    if not accepted:
        return None, []
    # HQ = first accepted (Places API orders by relevance)
    hq = accepted[0]
    branches = accepted[1:]
    return hq, branches


def load_checkpoint() -> dict:
    if CHECKPOINT_FILE.exists():
        with open(CHECKPOINT_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"processed": [], "results": []}


def save_checkpoint(state: dict):
    tmp = CHECKPOINT_FILE.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)
    tmp.replace(CHECKPOINT_FILE)


def main():
    api_key = os.environ.get("GOOGLE_MAPS_API_KEY", "").strip()
    if not api_key:
        print("ERROR: GOOGLE_MAPS_API_KEY env var not set", file=sys.stderr)
        print("Export the grantkit-server-geocoding-v2 server key value.", file=sys.stderr)
        sys.exit(2)

    start_idx = int(os.environ.get("START_IDX", "0"))
    limit = int(os.environ.get("LIMIT", "0")) or None

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        orgs = json.load(f)

    state = load_checkpoint()
    done_ids = {r["org_id"] for r in state["results"]}

    end_idx = len(orgs) if limit is None else min(len(orgs), start_idx + limit)
    print(f"Processing orgs[{start_idx}:{end_idx}] — {end_idx - start_idx} total")

    errors = 0
    for i in range(start_idx, end_idx):
        org = orgs[i]
        org_id = f"ORG-{i+1:04d}"
        if org_id in done_ids:
            continue

        name = org.get("organization") or ""
        country = org.get("country") or ""
        query = clean_query(name)
        if not query:
            state["results"].append({
                "org_id": org_id, "organization": name, "country": country,
                "hq": None, "branches": [], "places_found": 0, "places_filtered": 0,
                "search_status": "empty_query",
            })
            continue

        resp = places_text_search(api_key, query, country=country, max_results=10)
        if "_error" in resp:
            errors += 1
            print(f"  [{i+1}/{end_idx}] {org_id} ERROR: {resp['_error']}")
            state["results"].append({
                "org_id": org_id, "organization": name, "country": country,
                "hq": None, "branches": [], "places_found": 0, "places_filtered": 0,
                "search_status": "error", "error": resp["_error"],
            })
            if errors > 20:
                print("Too many errors; halting. Check API key + quota.", file=sys.stderr)
                save_checkpoint(state)
                sys.exit(3)
            save_checkpoint(state)
            time.sleep(0.5)
            continue

        places = resp.get("places") or []
        hq, branches = pick_branches(places, query, country)
        status = "ok" if hq else ("zero_results" if not places else "no_match")
        state["results"].append({
            "org_id": org_id,
            "organization": name,
            "country": country,
            "query": query,
            "hq": hq,
            "branches": branches,
            "places_found": len(places),
            "places_filtered": (1 if hq else 0) + len(branches),
            "search_status": status,
        })
        marker = "✓" if hq else "·"
        print(f"  [{i+1}/{end_idx}] {marker} {org_id} — {query[:60]}  (found={len(places)}, kept={(1 if hq else 0) + len(branches)})")

        # Save every 10 orgs
        if (i - start_idx + 1) % 10 == 0:
            save_checkpoint(state)

        # Polite rate-limit (Places API allows ~100 QPS, but stay well under)
        time.sleep(0.1)

    save_checkpoint(state)

    # Final write
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(state["results"], f, ensure_ascii=False, indent=2)
    print(f"\nSaved {len(state['results'])} results to {OUTPUT_FILE}")
    ok = sum(1 for r in state["results"] if r["search_status"] == "ok")
    print(f"ok={ok}, total={len(state['results'])}, errors={errors}")


if __name__ == "__main__":
    main()
