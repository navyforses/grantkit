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
 *   • "Nationwide" / "National" → triggers cross-state city search when city present,
 *     otherwise stays at country center.
 *
 * Nationwide + city handling:
 *   484 of 643 catalog items have state="Nationwide" plus a non-empty city.
 *   Without cross-state search, all 484 are pinned to the US country center.
 *   With it, each unique city is searched once across all states and cached.
 */

import { Country, State, City } from "country-state-city";

// ── One-time lookup tables (built at module load, ~250 entries each) ─────────

/** Lowercase country name → ISO-2 code */
const NAME_TO_ISO = new Map<string, string>(
  Country.getAllCountries().map((c) => [c.name.toLowerCase(), c.isoCode])
);

// ── Coordinate cache ──────────────────────────────────────────────────────────
// Keyed by "country\0state\0city" — memoizes expensive country-state-city lookups
// across repeated calls for the same location (e.g. on every filter change).

const COORD_CACHE = new Map<string, [number, number] | null>();

function cacheKey(country?: string | null, state?: string | null, city?: string | null): string {
  return `${country ?? ""}\0${state ?? ""}\0${city ?? ""}`;
}

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

  const key = cacheKey(country, state, city);
  if (COORD_CACHE.has(key)) return COORD_CACHE.get(key)!;

  const result = _resolveItemCoords(country, state, city);
  COORD_CACHE.set(key, result);
  return result;
}

function _resolveItemCoords(
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

  const isNationwide = !state || /^(nationwide|national|all\s)/i.test(state.trim());

  if (!isNationwide) {
    // ── Refine to state ───────────────────────────────────────────────────
    const states = State.getStatesOfCountry(iso);
    const stateMatch = states.find(
      (s) =>
        s.isoCode === state!.toUpperCase() ||
        s.name.toLowerCase() === state!.toLowerCase()
    );
    const stateCoords = parsePair(stateMatch?.latitude, stateMatch?.longitude);

    if (stateCoords) {
      coords = stateCoords;

      // ── Refine to city ──────────────────────────────────────────────────
      if (city && stateMatch) {
        const cities = City.getCitiesOfState(iso, stateMatch.isoCode);
        const cityMatch = cities.find(
          (c) => c.name.toLowerCase() === city.toLowerCase()
        );
        const cityCoords = parsePair(cityMatch?.latitude, cityMatch?.longitude);
        if (cityCoords) coords = cityCoords;
      }
    }
  } else if (city) {
    // ── Nationwide + city: search across all states ───────────────────────
    // Many items have state="Nationwide" but include a city (e.g. "Omaha", "Austin").
    // Search every state in the country and take the first coordinate match.
    // COORD_CACHE ensures each unique (country, "Nationwide", city) triplet is
    // computed only once, regardless of how many items share the same city.
    const allStates = State.getStatesOfCountry(iso);
    for (const st of allStates) {
      const cities = City.getCitiesOfState(iso, st.isoCode);
      const cityMatch = cities.find(
        (c) => c.name.toLowerCase() === city.toLowerCase()
      );
      if (cityMatch) {
        const cityCoords = parsePair(cityMatch.latitude, cityMatch.longitude);
        if (cityCoords) { coords = cityCoords; break; }
      }
    }
  }

  return coords;
}
