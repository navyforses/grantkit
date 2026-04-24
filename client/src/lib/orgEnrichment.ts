/*
 * orgEnrichment — helpers for the Phase 6 v2 enrichment sections on the
 * organisation detail page (Google trust panel, "Who we help", social
 * media row, mission-statement banner).
 *
 * The org row carries enrichment fields as lenient strings or enums
 * (see drizzle/schema.ts). This module:
 *   - parses the CSV / JSON columns into structured shapes the UI can
 *     render directly (languages[], socialMedia{});
 *   - maps enum values to translated labels via a single lookup;
 *   - formats language codes into the reader's locale via Intl.DisplayNames.
 *
 * Every accessor returns a typed default (null / empty array) so the UI
 * relies on the shape and can hide empty sections without extra guards.
 */

import type { Translations } from "@/i18n/types";

// ── Types ───────────────────────────────────────────────────────────────

export type AcceptsUndocumented = "yes" | "no" | "case_by_case" | "unknown";
export type AcceptsUninsured = "yes" | "no" | "unknown";
export type ServiceCost =
  | "free"
  | "sliding_scale"
  | "paid"
  | "insurance"
  | "mixed"
  | "unknown";
export type AppointmentPolicy = "required" | "walk_in" | "both" | "unknown";

export interface SocialMediaLinks {
  facebook?: string;
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  youtube?: string;
}

// ── Parsers ─────────────────────────────────────────────────────────────

export function parseLanguages(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[a-z]{2,3}(-[a-z0-9]{2,4})?$/i.test(s));
}

export function parseSocialMedia(raw: string | null | undefined): SocialMediaLinks {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    if (v && typeof v === "object" && !Array.isArray(v)) {
      return v as SocialMediaLinks;
    }
  } catch {
    // fall through to empty
  }
  return {};
}

// ── Language name formatting ────────────────────────────────────────────

const languageNamesCache = new Map<string, Intl.DisplayNames>();

function getLanguageNames(locale: string): Intl.DisplayNames | null {
  if (typeof Intl === "undefined" || typeof Intl.DisplayNames !== "function") {
    return null;
  }
  let existing = languageNamesCache.get(locale);
  if (!existing) {
    try {
      existing = new Intl.DisplayNames([locale], { type: "language" });
      languageNamesCache.set(locale, existing);
    } catch {
      return null;
    }
  }
  return existing;
}

export function formatLanguageName(code: string, locale: string): string {
  const names = getLanguageNames(locale);
  if (names) {
    const display = names.of(code);
    if (display) return display;
  }
  return code.toUpperCase();
}

// ── Enum → translated-label mappers ─────────────────────────────────────

type E = Translations["orgEnrichment"];

export function statusLabel(t: E, value: AcceptsUndocumented | null | undefined): string {
  return t.status[value ?? "unknown"];
}
export function insuranceLabel(t: E, value: AcceptsUninsured | null | undefined): string {
  return t.insurance[value ?? "unknown"];
}
export function costLabel(t: E, value: ServiceCost | null | undefined): string {
  return t.cost[value ?? "unknown"];
}
export function appointmentLabel(t: E, value: AppointmentPolicy | null | undefined): string {
  return t.appointment[value ?? "unknown"];
}

/**
 * Is this enum value "real" (worth highlighting)? `"unknown"` renders as
 * a greyed placeholder instead of an active badge so the UI signals
 * "data missing" without hiding the row.
 */
export function isKnownEnum(value: string | null | undefined): boolean {
  return Boolean(value) && value !== "unknown";
}

// ── Social platforms registry ────────────────────────────────────────────
// Stable ordering so chips render identically every time.
export const SOCIAL_PLATFORMS: Array<keyof SocialMediaLinks> = [
  "facebook",
  "linkedin",
  "twitter",
  "instagram",
  "youtube",
];
