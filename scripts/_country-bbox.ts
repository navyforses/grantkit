/**
 * Country bounding boxes — used by audit-branches-coords + geocode-branches
 * to flag rows whose lat/lng falls outside the named country.
 *
 * Boxes are intentionally loose: wide enough to allow legitimate suburb /
 * branch / overseas-territory locations, tight enough to flag a row that's
 * clearly geocoded into a neighbour (e.g. a "FR" branch landing in London).
 *
 * Coverage: every country we currently import data for + the 27 EU member
 * states (so EU expansion data lands cleanly even before the country has
 * its own catalog rows). Add new entries here, not in callers.
 */

export interface CountryBox {
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
}

export const COUNTRY_BBOX: Record<string, CountryBox> = {
  // Catalog primary countries
  US: { latMin: 24.0, latMax: 49.5, lngMin: -125.0, lngMax: -66.5 },
  GB: { latMin: 49.5, latMax: 61.0, lngMin: -8.7,   lngMax: 2.0 },
  CA: { latMin: 41.5, latMax: 70.0, lngMin: -141.5, lngMax: -52.0 },
  GE: { latMin: 41.0, latMax: 43.6, lngMin: 40.0,   lngMax: 46.7 },

  // EU 27 — covers mainland + nearby islands; excludes far overseas
  // territories (DOM-TOMs etc.) intentionally so they're flagged as
  // outliers and re-geocoded with explicit overseas queries if needed.
  AT: { latMin: 46.3, latMax: 49.1, lngMin: 9.5,    lngMax: 17.2 },
  BE: { latMin: 49.4, latMax: 51.6, lngMin: 2.5,    lngMax: 6.5 },
  BG: { latMin: 41.2, latMax: 44.3, lngMin: 22.3,   lngMax: 28.7 },
  HR: { latMin: 42.3, latMax: 46.6, lngMin: 13.4,   lngMax: 19.5 },
  CY: { latMin: 34.5, latMax: 35.8, lngMin: 32.2,   lngMax: 34.7 },
  CZ: { latMin: 48.5, latMax: 51.1, lngMin: 12.0,   lngMax: 18.9 },
  DK: { latMin: 54.5, latMax: 57.8, lngMin: 8.0,    lngMax: 15.2 },
  EE: { latMin: 57.5, latMax: 59.7, lngMin: 21.7,   lngMax: 28.3 },
  FI: { latMin: 59.8, latMax: 70.1, lngMin: 19.5,   lngMax: 31.6 },
  FR: { latMin: 41.0, latMax: 51.5, lngMin: -5.5,   lngMax: 9.8 },
  DE: { latMin: 47.2, latMax: 55.1, lngMin: 5.9,    lngMax: 15.1 },
  GR: { latMin: 34.8, latMax: 41.8, lngMin: 19.3,   lngMax: 29.7 },
  HU: { latMin: 45.7, latMax: 48.6, lngMin: 16.1,   lngMax: 22.9 },
  IE: { latMin: 51.4, latMax: 55.5, lngMin: -10.6,  lngMax: -5.4 },
  IT: { latMin: 35.5, latMax: 47.1, lngMin: 6.6,    lngMax: 18.6 },
  LV: { latMin: 55.7, latMax: 58.1, lngMin: 20.9,   lngMax: 28.3 },
  LT: { latMin: 53.9, latMax: 56.5, lngMin: 20.9,   lngMax: 26.9 },
  LU: { latMin: 49.4, latMax: 50.2, lngMin: 5.7,    lngMax: 6.6 },
  MT: { latMin: 35.8, latMax: 36.1, lngMin: 14.1,   lngMax: 14.6 },
  NL: { latMin: 50.7, latMax: 53.7, lngMin: 3.3,    lngMax: 7.3 },
  PL: { latMin: 49.0, latMax: 54.9, lngMin: 14.1,   lngMax: 24.2 },
  PT: { latMin: 36.9, latMax: 42.2, lngMin: -9.6,   lngMax: -6.2 },
  RO: { latMin: 43.6, latMax: 48.3, lngMin: 20.2,   lngMax: 29.7 },
  SK: { latMin: 47.7, latMax: 49.6, lngMin: 16.8,   lngMax: 22.6 },
  SI: { latMin: 45.4, latMax: 46.9, lngMin: 13.4,   lngMax: 16.7 },
  ES: { latMin: 35.9, latMax: 43.9, lngMin: -9.4,   lngMax: 4.4 },
  SE: { latMin: 55.3, latMax: 69.1, lngMin: 11.0,   lngMax: 24.2 },
};

/** Returns true when (lat, lng) sits inside the named country's box, or
 *  when we have no box for that country (we don't know → can't reject). */
export function isInsideCountryBox(country: string, lat: number, lng: number): boolean {
  const box = COUNTRY_BBOX[country.toUpperCase()];
  if (!box) return true;
  return lat >= box.latMin && lat <= box.latMax
      && lng >= box.lngMin && lng <= box.lngMax;
}
