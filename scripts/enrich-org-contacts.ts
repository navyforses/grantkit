#!/usr/bin/env tsx
/**
 * enrich-org-contacts.ts
 *
 * Fills `organizations.phone` and `organizations.email` with VERIFIED
 * data from two sources:
 *
 *   1. Google Places API (New) → Text Search → Place Details
 *      Returns the business phone + website as structured JSON. Zero
 *      LLM involvement, no hallucination risk.
 *
 *   2. Website scraping (regex only, domain-validated)
 *      If Places returns a website, fetch /contact (and a few variants),
 *      regex out `mailto:` links and plain emails. Only keep emails whose
 *      domain matches the website's domain — so we never store
 *      "invented" emails like info@generic-placeholder.com.
 *
 * Every written value carries provenance — phoneSource, phoneVerifiedAt,
 * emailSource, emailVerifiedAt, contactFormUrl — so the UI can show
 * "Verified via Google Places, N days ago" and a scheduled job can
 * re-verify stale rows.
 *
 * Usage:
 *   pnpm enrich:contacts:dry                            # dry-run, CSV output, no DB writes
 *   pnpm enrich:contacts -- --limit=10 --dry-run        # 10-row smoke test
 *   pnpm enrich:contacts -- --limit=50                  # real run, 50 orgs
 *   pnpm enrich:contacts -- --batch-id=2026-04-23-001   # tag this batch
 *   pnpm enrich:contacts -- --force                     # re-enrich already-processed rows
 *
 * Env vars:
 *   DATABASE_URL           (required) — Railway MySQL public URL
 *   GOOGLE_MAPS_API_KEY    (required) — server key "grantkit-server-geocoding-v2"
 *
 * Default: processes rows where contactEnrichmentStatus = 'pending'.
 * Pass --force to re-process rows already enriched.
 */

import "dotenv/config";
import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";

// ─── Config ────────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;
const GOOGLE_KEY =
  process.env.GOOGLE_MAPS_API_KEY ??
  process.env.GOOGLE_PLACES_API_KEY ??
  process.env.VITE_GOOGLE_MAPS_API_KEY;

const PLACES_TEXT_SEARCH = "https://places.googleapis.com/v1/places:searchText";
const TEXT_SEARCH_FIELDS = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.types",
].join(",");

const DELAY_MS_PLACES = 150;         // Google Places throttle
const DELAY_MS_WEBSITE = 800;        // be polite to org websites
const WEBSITE_FETCH_TIMEOUT_MS = 8000;
const CONTACT_PATHS = ["/contact", "/contact-us", "/contacts", "/about", "/about-us", "/"];
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const MAILTO_REGEX = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
// Emails we refuse to store — placeholders commonly seen on templates.
const DENYLIST_LOCAL = new Set(["example", "test", "admin", "noreply", "no-reply", "donotreply"]);

const REPORT_PATH = path.resolve("contact-enrichment-report.json");
const DRY_CSV_PATH = path.resolve("contact-enrichment-dry-run.csv");

// ─── CLI flags ─────────────────────────────────────────────────────────────

const arg = (name: string) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");
const LIMIT = parseInt(arg("limit") ?? "50", 10);
const BATCH_ID = arg("batch-id") ?? new Date().toISOString().slice(0, 10) + "-manual";

// ─── Types ─────────────────────────────────────────────────────────────────

interface OrgRow {
  id: number;
  orgId: string;
  name: string;
  country: string;
  state: string | null;
  city: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
}

interface PlacesHit {
  placeId: string;
  displayName: string;
  phone: string | null;
  website: string | null;
}

interface EnrichmentOutcome {
  orgId: string;
  name: string;
  status: "enriched" | "no_data" | "failed";
  phone: string | null;
  phoneSource: string | null;
  email: string | null;
  emailSource: string | null;
  contactFormUrl: string | null;
  googlePlaceId: string | null;
  reason?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function countryDisplay(code: string): string {
  if (!code) return "";
  if (code.length === 2) {
    try { return regionNames.of(code.toUpperCase()) ?? code; }
    catch { return code; }
  }
  return code;
}

function normalizeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    return u.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function hostnameOf(url: string | null): string | null {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); }
  catch { return null; }
}

/**
 * Guard against fabricated/placeholder emails. Accepts only emails whose
 * domain (or a parent of it) matches the org's website domain.
 *
 * Examples (website = example.org):
 *   ✅ info@example.org         → same domain
 *   ✅ hello@mail.example.org   → subdomain
 *   ❌ info@mailinator.com      → unrelated
 *   ❌ example@example.com      → local-part blacklist
 */
function isEmailDomainSafe(email: string, websiteHost: string | null): boolean {
  const [local, domain] = email.toLowerCase().split("@");
  if (!local || !domain) return false;
  if (DENYLIST_LOCAL.has(local)) return false;
  if (!websiteHost) return false;
  // Strip "www." and require suffix match.
  const host = websiteHost.replace(/^www\./, "");
  return domain === host || domain.endsWith(`.${host}`);
}

// ─── Google Places ─────────────────────────────────────────────────────────

async function placesTextSearch(query: string): Promise<PlacesHit | null> {
  if (!GOOGLE_KEY) throw new Error("GOOGLE_MAPS_API_KEY is not set");
  const res = await fetch(PLACES_TEXT_SEARCH, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_KEY,
      "X-Goog-FieldMask": TEXT_SEARCH_FIELDS,
    },
    body: JSON.stringify({ textQuery: query, pageSize: 1 }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Places API ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    places?: Array<{
      id?: string;
      displayName?: { text?: string };
      nationalPhoneNumber?: string;
      internationalPhoneNumber?: string;
      websiteUri?: string;
    }>;
  };
  const hit = data.places?.[0];
  if (!hit?.id) return null;
  return {
    placeId: hit.id,
    displayName: hit.displayName?.text ?? "",
    phone: hit.internationalPhoneNumber ?? hit.nationalPhoneNumber ?? null,
    website: normalizeUrl(hit.websiteUri ?? null),
  };
}

// ─── Website scraping ──────────────────────────────────────────────────────

async function fetchPage(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBSITE_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "GrantKitContactBot/1.0 (+https://grantkit-production-06f7.up.railway.app)" },
    });
    if (!res.ok) return null;
    const ctype = res.headers.get("content-type") ?? "";
    if (!ctype.includes("text/html") && !ctype.includes("application/xhtml")) return null;
    const text = await res.text();
    return text.length > 0 && text.length < 2_000_000 ? text : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Extract (1) an org-domain-matching email, (2) a contact-form URL, from
 * an org's website. Returns { email, contactFormUrl } — either may be null.
 *
 * Strategy:
 *   1. Fetch candidate paths on the org's domain.
 *   2. Pull every `mailto:` link + every plain-text email.
 *   3. Keep only those whose domain matches the website's.
 *   4. If no email, look for a contact form URL (any page that contains
 *      a <form> element on a /contact* path).
 */
async function scrapeContact(
  websiteUrl: string,
): Promise<{ email: string | null; emailSourcePath: string | null; contactFormUrl: string | null }> {
  const host = hostnameOf(websiteUrl);
  if (!host) return { email: null, emailSourcePath: null, contactFormUrl: null };

  let firstEmail: string | null = null;
  let firstEmailPath: string | null = null;
  let contactFormUrl: string | null = null;

  for (const p of CONTACT_PATHS) {
    const pageUrl = new URL(p, websiteUrl).toString();
    const html = await fetchPage(pageUrl);
    await sleep(DELAY_MS_WEBSITE);
    if (!html) continue;

    // 1. mailto: links (most reliable)
    const mailtos = Array.from(html.matchAll(MAILTO_REGEX)).map((m) => m[1].toLowerCase());
    // 2. plain emails in text
    const plain = Array.from(html.matchAll(EMAIL_REGEX)).map((m) => m[0].toLowerCase());
    const allEmails = Array.from(new Set([...mailtos, ...plain]));

    for (const email of allEmails) {
      if (isEmailDomainSafe(email, host)) {
        firstEmail = email;
        firstEmailPath = pageUrl;
        break;
      }
    }

    // 3. contact form fallback — any <form> on a /contact* URL counts
    if (!contactFormUrl && /<form[\s>]/i.test(html) && /\/contact/i.test(pageUrl)) {
      contactFormUrl = pageUrl;
    }

    if (firstEmail) break;
  }

  return { email: firstEmail, emailSourcePath: firstEmailPath, contactFormUrl };
}

// ─── Single-org pipeline ───────────────────────────────────────────────────

async function enrichOne(org: OrgRow): Promise<EnrichmentOutcome> {
  const outcome: EnrichmentOutcome = {
    orgId: org.orgId,
    name: org.name,
    status: "no_data",
    phone: null,
    phoneSource: null,
    email: null,
    emailSource: null,
    contactFormUrl: null,
    googlePlaceId: null,
  };

  // 1. Google Places — Text Search for "{name}, {city}, {country}"
  const queryParts = [org.name, org.city, org.state, countryDisplay(org.country)].filter(Boolean);
  const query = queryParts.join(", ");
  let hit: PlacesHit | null = null;
  try {
    hit = await placesTextSearch(query);
    await sleep(DELAY_MS_PLACES);
  } catch (err) {
    outcome.status = "failed";
    outcome.reason = `Places API error: ${(err as Error).message}`;
    return outcome;
  }

  if (hit) {
    outcome.googlePlaceId = hit.placeId;
    if (hit.phone) {
      outcome.phone = hit.phone;
      outcome.phoneSource = "google_places";
    }
  }

  // 2. Website scraping for email (prefer Google-returned website, fall back to DB value)
  const websiteUrl = hit?.website ?? normalizeUrl(org.website);
  if (websiteUrl) {
    try {
      const scraped = await scrapeContact(websiteUrl);
      if (scraped.email) {
        outcome.email = scraped.email;
        outcome.emailSource = `website:${scraped.emailSourcePath}`;
      } else if (scraped.contactFormUrl) {
        outcome.contactFormUrl = scraped.contactFormUrl;
      }
    } catch {
      // swallow — website being down shouldn't fail the enrichment
    }
  }

  outcome.status = outcome.phone || outcome.email ? "enriched" : "no_data";
  return outcome;
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");
  if (!GOOGLE_KEY) throw new Error("GOOGLE_MAPS_API_KEY is not set (server key 'grantkit-server-geocoding-v2')");

  console.log(`\n🔍 Contact enrichment — ${DRY_RUN ? "DRY RUN (no DB writes)" : "LIVE"}`);
  console.log(`   limit: ${LIMIT}, batch-id: ${BATCH_ID}, force: ${FORCE}\n`);

  const conn = await mysql.createConnection(DATABASE_URL);
  try {
    const whereClause = FORCE
      ? "isActive = 1"
      : "isActive = 1 AND contactEnrichmentStatus = 'pending'";
    const [rows] = await conn.query(
      `SELECT id, orgId, CAST(name AS CHAR) AS name, country, state, city,
              CAST(website AS CHAR) AS website, phone, email
       FROM organizations
       WHERE ${whereClause}
       ORDER BY orgId
       LIMIT ?`,
      [LIMIT],
    );
    const orgs = rows as OrgRow[];
    console.log(`📋 Loaded ${orgs.length} orgs to process\n`);

    const outcomes: EnrichmentOutcome[] = [];
    for (let i = 0; i < orgs.length; i++) {
      const org = orgs[i];
      process.stdout.write(`[${i + 1}/${orgs.length}] ${org.orgId} ${org.name.slice(0, 50)}... `);
      const out = await enrichOne(org);
      outcomes.push(out);
      process.stdout.write(`${out.status}`);
      if (out.phone) process.stdout.write(` 📞`);
      if (out.email) process.stdout.write(` ✉`);
      if (out.contactFormUrl) process.stdout.write(` 📝`);
      process.stdout.write("\n");

      if (!DRY_RUN) {
        await writeOutcome(conn, out);
      }
    }

    // Summary
    const stats = {
      total: outcomes.length,
      enriched: outcomes.filter((o) => o.status === "enriched").length,
      no_data: outcomes.filter((o) => o.status === "no_data").length,
      failed: outcomes.filter((o) => o.status === "failed").length,
      withPhone: outcomes.filter((o) => o.phone).length,
      withEmail: outcomes.filter((o) => o.email).length,
      withForm: outcomes.filter((o) => o.contactFormUrl).length,
    };
    console.log(`\n─── Summary ─────────────────────────`);
    console.log(`   Total:        ${stats.total}`);
    console.log(`   ✓ Enriched:   ${stats.enriched}`);
    console.log(`   — No data:    ${stats.no_data}`);
    console.log(`   ✗ Failed:     ${stats.failed}`);
    console.log(`   📞 Phone:     ${stats.withPhone}`);
    console.log(`   ✉  Email:     ${stats.withEmail}`);
    console.log(`   📝 Form only: ${stats.withForm}\n`);

    fs.writeFileSync(REPORT_PATH, JSON.stringify({ batchId: BATCH_ID, stats, outcomes }, null, 2));
    console.log(`📄 Report: ${REPORT_PATH}`);

    if (DRY_RUN) {
      const csv = [
        "orgId,name,status,phone,phoneSource,email,emailSource,contactFormUrl,placeId,reason",
        ...outcomes.map((o) => [
          o.orgId, csvEsc(o.name), o.status, csvEsc(o.phone), o.phoneSource,
          csvEsc(o.email), csvEsc(o.emailSource), csvEsc(o.contactFormUrl),
          o.googlePlaceId, csvEsc(o.reason),
        ].join(",")),
      ].join("\n");
      fs.writeFileSync(DRY_CSV_PATH, csv);
      console.log(`📄 Dry-run CSV: ${DRY_CSV_PATH}`);
    }
  } finally {
    await conn.end();
  }
}

function csvEsc(v: string | null | undefined): string {
  if (v == null) return "";
  const s = String(v).replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}

async function writeOutcome(conn: mysql.Connection, out: EnrichmentOutcome) {
  const now = new Date();
  const sets: string[] = [
    "contactEnrichmentBatch = ?",
    "contactEnrichmentStatus = ?",
  ];
  const vals: unknown[] = [BATCH_ID, out.status];

  if (out.phone) {
    sets.push("phone = ?", "phoneSource = ?", "phoneVerifiedAt = ?");
    vals.push(out.phone, out.phoneSource, now);
  }
  if (out.email) {
    sets.push("email = ?", "emailSource = ?", "emailVerifiedAt = ?");
    vals.push(out.email, out.emailSource, now);
  }
  if (out.contactFormUrl) {
    sets.push("contactFormUrl = ?");
    vals.push(out.contactFormUrl);
  }
  if (out.googlePlaceId) {
    sets.push("googlePlaceId = ?");
    vals.push(out.googlePlaceId);
  }

  vals.push(out.orgId);
  await conn.query(
    `UPDATE organizations SET ${sets.join(", ")} WHERE orgId = ?`,
    vals,
  );
}

main().catch((err) => {
  console.error("\n❌ Fatal:", err);
  process.exit(1);
});
