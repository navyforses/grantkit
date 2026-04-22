/*
 * orgEnrichment — helpers for the organisation detail page's Phase 6
 * enrichment sections (trust panel, "who we help", "what to bring",
 * social media).
 *
 * The organisation row carries the enrichment fields as lenient strings
 * or enums (see drizzle/schema.ts). This module:
 *   - parses the CSV / JSON columns into structured shapes the UI can
 *     render directly (languages[], socialMedia{}, documents[]);
 *   - maps enum values into translated labels via a single lookup;
 *   - formats language codes into the reader's native language names
 *     (uses Intl.DisplayNames with a safe fallback).
 *
 * Every accessor returns a typed default (null / empty array) when the
 * field is missing so the UI can rely on the shape and hide empty
 * sections without extra guards.
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
export type OrgType =
  | "nonprofit"
  | "ngo"
  | "government"
  | "religious"
  | "private"
  | "hospital"
  | "university"
  | "other";

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

export function parseRequiredDocuments(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    if (Array.isArray(v)) {
      return v.filter((x) => typeof x === "string" && x.trim().length > 0);
    }
  } catch {
    // fall through to CSV split for lenient editing
  }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
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

/** Convert an ISO language code into the reader's native language name. */
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
export function orgTypeLabel(t: E, value: OrgType | null | undefined): string | null {
  if (!value) return null;
  return t.orgType[value];
}

/**
 * Is this enum value "real" (i.e. worth highlighting)? Values of
 * "unknown" are rendered as greyed-out placeholders instead of active
 * badges so the UI can signal "data missing" without hiding the row.
 */
export function isKnownEnum(value: string | null | undefined): boolean {
  return Boolean(value) && value !== "unknown";
}

// ── Social icon registry ────────────────────────────────────────────────
//
// Keeps the ordering stable so chips render in the same order on every
// render and component tests don't depend on object-key iteration order.
export const SOCIAL_PLATFORMS: Array<keyof SocialMediaLinks> = [
  "facebook",
  "linkedin",
  "twitter",
  "instagram",
  "youtube",
];
