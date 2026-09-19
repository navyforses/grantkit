/**
 * Client-only onboarding answers (Phase 1.3, owner decision D6).
 *
 * Immigration status is Art. 9-sensitive: it lives in this browser's
 * localStorage only and is NEVER part of any tRPC payload. The server-side
 * profile schema has no status field (see server/onboarding.test.ts).
 * City is kept client-side too — the server profile has no city column and
 * Phase 1 makes no schema change.
 */

export const VIEWER_STATUS_KEY = "grantkit_viewer_status";
export const VIEWER_CITY_KEY = "grantkit_viewer_city";

export const VIEWER_STATUSES = [
  "asylum_seeker",
  "refugee",
  "residence_permit",
  "undocumented",
  "other",
] as const;

export type ViewerStatus = (typeof VIEWER_STATUSES)[number];

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* private mode / blocked storage — the answer is optional anyway */
  }
}

export function readViewerStatus(): ViewerStatus | null {
  const raw = read(VIEWER_STATUS_KEY);
  return (VIEWER_STATUSES as readonly string[]).includes(raw ?? "") ? (raw as ViewerStatus) : null;
}

export function writeViewerStatus(status: ViewerStatus | null): void {
  write(VIEWER_STATUS_KEY, status);
}

export function readViewerCity(): string | null {
  return read(VIEWER_CITY_KEY);
}

export function writeViewerCity(city: string | null): void {
  write(VIEWER_CITY_KEY, city?.trim() || null);
}
