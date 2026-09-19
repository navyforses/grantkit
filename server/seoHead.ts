/**
 * seoHead — server-rendered <head> for the SPA (Phase 1.8, I30).
 *
 * The client's react-helmet-async only runs after JS; crawlers and link
 * previews see the static index.html. This module rewrites <title>, meta
 * description, og:*, canonical, hreflang and (for /organizations/:orgId)
 * an NGO JSON-LD block before index.html is sent. One HTML for every
 * user-agent — no cloaking. Helmet overwrites the same tags on hydration.
 *
 * Language scheme: the client has no /:lang routes yet (Phase 4). It does
 * honour `?lang=xx` (LanguageContext), so hreflang ×5 points at
 * `<path>?lang=xx` and x-default at the bare path. The canonical is the
 * request path plus `?lang=` when a valid one is present, so each
 * alternate is self-canonical.
 *
 * Never throws: any lookup or render failure returns the untouched HTML.
 */

import type { Request } from "express";
import { LRUCache } from "lru-cache";
import { getOrganizationDetail } from "./db";

export const SITE_NAME = "GrantKit";
export const LANGS = ["en", "fr", "es", "ru", "ka"] as const;
export type Lang = (typeof LANGS)[number];

/** Landing routes that get canonical + hreflang (title/description stay static). */
const LANDING_PATHS = new Set(["/", "/organizations", "/contact", "/privacy", "/terms", "/refund", "/trust"]);
const ORG_PATH = /^\/organizations\/([A-Za-z0-9_-]{1,16})$/;
const DESCRIPTION_MAX = 160;

/** The subset of an organizations row that the head needs. */
export interface OrgSeoData {
  orgId: string;
  name: string;
  description?: string | null;
  missionStatement?: string | null;
  country: string;
  state?: string | null;
  city?: string | null;
  hqAddress?: string | null;
  website?: string | null;
  phone?: string | null;
  phoneSource?: string | null;
  phoneVerifiedAt?: Date | null;
  languages?: string | null;
  organizationType?: "NGO" | "association" | "government" | "private" | null;
  translations?: unknown;
}

export type OrgLookup = (orgId: string) => Promise<OrgSeoData | null>;

const defaultLookup: OrgLookup = async (orgId) =>
  (await getOrganizationDetail(orgId)).organization;

// Per-orgId cache: 10 min, null cached too so a missing org isn't re-queried.
const orgCache = new LRUCache<string, { org: OrgSeoData | null }>({ max: 500, ttl: 10 * 60_000 });

export function clearSeoHeadCache(): void {
  orgCache.clear();
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function getBaseUrl(req: Pick<Request, "get" | "protocol">): string {
  const host = req.get("host") || process.env.RAILWAY_PUBLIC_DOMAIN || "localhost:3000";
  const protocol = req.get("x-forwarded-proto") || req.protocol || "https";
  return `${protocol}://${host}`;
}

export function parseLang(value: unknown): Lang | null {
  return typeof value === "string" && (LANGS as readonly string[]).includes(value) ? (value as Lang) : null;
}

function localized(org: OrgSeoData, lang: Lang | null, field: "name" | "description"): string | null {
  const tr = org.translations as Record<string, Record<string, unknown>> | null | undefined;
  const v = lang && tr && typeof tr === "object" ? tr[lang]?.[field] : null;
  return typeof v === "string" && v.trim() ? v : null;
}

function oneLine(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
}

/** hreflang ×5 (`?lang=`) + x-default (bare path). */
export function hreflangLinks(baseUrl: string, path: string): string {
  const lines = LANGS.map(
    (l) => `<link rel="alternate" hreflang="${l}" href="${escapeHtml(`${baseUrl}${path}?lang=${l}`)}" />`
  );
  lines.push(`<link rel="alternate" hreflang="x-default" href="${escapeHtml(baseUrl + path)}" />`);
  return lines.join("\n    ");
}

/** schema.org NGO / GovernmentOrganization. telephone only with provenance. */
export function orgJsonLd(org: OrgSeoData, lang: Lang | null, canonical: string): Record<string, unknown> {
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": org.organizationType === "government" ? "GovernmentOrganization" : "NGO",
    name: localized(org, lang, "name") ?? org.name,
    url: org.website || canonical,
    mainEntityOfPage: canonical,
  };
  const description = localized(org, lang, "description") ?? org.description ?? org.missionStatement;
  if (description) ld.description = oneLine(description, 300);
  if (org.hqAddress || org.city || org.state) {
    ld.address = {
      "@type": "PostalAddress",
      ...(org.hqAddress ? { streetAddress: org.hqAddress } : {}),
      ...(org.city ? { addressLocality: org.city } : {}),
      ...(org.state ? { addressRegion: org.state } : {}),
      addressCountry: org.country,
    };
  }
  // D7/D8 trust rule: a phone is published only when we know where it came from.
  if (org.phone && (org.phoneVerifiedAt || org.phoneSource)) ld.telephone = org.phone;
  const langs = (org.languages ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (langs.length) ld.availableLanguage = langs;
  return ld;
}

export interface HeadTags {
  title?: string;
  description?: string;
  canonical: string;
  hreflang: string;
  jsonLd?: Record<string, unknown>;
}

/**
 * Decide the head tags for a request. Returns null for routes this module
 * does not touch (the HTML is then served as-is).
 */
export async function buildHeadTags(
  req: Pick<Request, "path" | "query" | "get" | "protocol">,
  lookup: OrgLookup = defaultLookup
): Promise<HeadTags | null> {
  const path = req.path.length > 1 ? req.path.replace(/\/+$/, "") : req.path;
  const lang = parseLang(req.query?.lang);
  const orgMatch = ORG_PATH.exec(path);
  if (!orgMatch && !LANDING_PATHS.has(path)) return null;

  const baseUrl = getBaseUrl(req);
  const canonical = `${baseUrl}${path}${lang ? `?lang=${lang}` : ""}`;
  const tags: HeadTags = { canonical, hreflang: hreflangLinks(baseUrl, path) };
  if (!orgMatch) return tags;

  const orgId = orgMatch[1];
  let cached = orgCache.get(orgId);
  if (!cached) {
    cached = { org: await lookup(orgId) };
    orgCache.set(orgId, cached);
  }
  const org = cached.org;
  if (!org) return tags;

  tags.title = `${localized(org, lang, "name") ?? org.name} | ${SITE_NAME}`;
  const description = localized(org, lang, "description") ?? org.description ?? org.missionStatement;
  tags.description = description
    ? oneLine(description, DESCRIPTION_MAX)
    : `${org.name} — ${[org.city, org.country].filter(Boolean).join(", ")}`;
  tags.jsonLd = orgJsonLd(org, lang, canonical);
  return tags;
}

/** Apply tags to an index.html string. Pure. */
export function applyHeadTags(html: string, tags: HeadTags): string {
  let out = html;
  if (tags.title) {
    const t = escapeHtml(tags.title);
    out = out
      .replace(/<title>[^<]*<\/title>/, `<title>${t}</title>`)
      .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${t}" />`);
  }
  if (tags.description) {
    const d = escapeHtml(tags.description);
    out = out
      .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${d}" />`)
      .replace(/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${d}" />`);
  }
  const extra = [
    `<link rel="canonical" href="${escapeHtml(tags.canonical)}" />`,
    `<meta property="og:url" content="${escapeHtml(tags.canonical)}" />`,
    tags.hreflang,
    // JSON.stringify output contains no "</" unless a value does; neutralise it.
    tags.jsonLd
      ? `<script type="application/ld+json">${JSON.stringify(tags.jsonLd).replace(/<\//g, "<\\/")}</script>`
      : "",
  ]
    .filter(Boolean)
    .join("\n    ");
  return out.replace("</head>", `    ${extra}\n  </head>`);
}

/**
 * Entry point for the SPA fallbacks (static.ts / vite.ts). Never throws.
 */
export async function renderIndexHtml(
  html: string,
  req: Pick<Request, "path" | "query" | "get" | "protocol">,
  lookup: OrgLookup = defaultLookup
): Promise<string> {
  try {
    const tags = await buildHeadTags(req, lookup);
    return tags ? applyHeadTags(html, tags) : html;
  } catch (err) {
    console.warn("[seoHead] falling back to static index.html:", err);
    return html;
  }
}
