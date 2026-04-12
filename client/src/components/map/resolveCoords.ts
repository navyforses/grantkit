/*
 * resolveCoords — maps CatalogItem location fields to a Mapbox [lng, lat] pair.
 *
 * Resolution priority (most specific wins):
 *   city > state/region > country
 *
 * Input formats accepted for `country`:
 *   • ISO 3166-1 alpha-2 code ("US", "FR")
 *   • Full English country name ("United States", "France")
 *
 * Input formats accepted for `state`:
 *   • ISO state/province code ("CA", "NY")
 *   • Full state name ("California", "New York")
 *   • "Nationwide" / "National" → ignored (stays at country center)
 */

import { Country, State, City } from "country-state-city";

// ── One-time lookup tables (built at module load, ~250 entries each) ─────────

/** Lowercase country name → ISO-2 code */
const NAME_TO_ISO = new Map<string, string>(
  Country.getAllCountries().map((c) => [c.name.toLowerCase(), c.isoCode])
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function parsePair(lat?: string | null, lng?: string | null): [number, number] | null {
  const la = parseFloat(lat ?? "");
  const lo = parseFloat(lng ?? "");
  return isNaN(la) || isNaN(lo) ? null : [lo, la]; // Mapbox wants [lng, lat]
}

/** Resolve an ISO-2 code from either an ISO-2 string or a country name. */
function toIso2(field: string): string | null {
  const t = field.trim();
  if (/^[A-Z]{2}$/.test(t) && Country.getCountryByCode(t)) return t;
  return NAME_TO_ISO.get(t.toLowerCase()) ?? null;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns a Mapbox [lng, lat] coordinate for the most specific location
 * available, or `null` when no coordinates can be derived.
 */
export function resolveItemCoords(
  country?: string | null,
  state?: string | null,
  city?: string | null,
): [number, number] | null {
  if (!country) return null;

  const iso = toIso2(country);
  if (!iso) return null;

  const countryData = Country.getCountryByCode(iso);
  if (!countryData) return null;

  // Base: country center
  let coords = parsePair(countryData.latitude, countryData.longitude);
  if (!coords) return null;

  // Refine to state — skip placeholder values
  if (state && !/^(nationwide|national|all\s)/i.test(state.trim())) {
    const states = State.getStatesOfCountry(iso);
    const stateMatch = states.find(
      (s) =>
        s.isoCode === state.toUpperCase() ||
        s.name.toLowerCase() === state.toLowerCase()
    );
    const stateCoords = parsePair(stateMatch?.latitude, stateMatch?.longitude);

    if (stateCoords) {
      coords = stateCoords;

      // Refine to city
      if (city && stateMatch) {
        const cities = City.getCitiesOfState(iso, stateMatch.isoCode);
        const cityMatch = cities.find(
          (c) => c.name.toLowerCase() === city.toLowerCase()
        );
        const cityCoords = parsePair(cityMatch?.latitude, cityMatch?.longitude);
        if (cityCoords) coords = cityCoords;
      }
    }
  }

  return coords;
}
