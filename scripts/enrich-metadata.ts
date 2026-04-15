#!/usr/bin/env tsx
/**
 * enrich-metadata.ts — AI-powered metadata enrichment using Forge API (Gemini 2.5-flash).
 *
 * For grants missing category, country, or eligibility:
 *   - Infers values from name, description, website, organization
 *   - Updates grants table with inferred values
 *
 * Usage:
 *   pnpm enrich:metadata:dry    — dry-run (no DB writes)
 *   pnpm enrich:metadata        — full run
 *   pnpm enrich:metadata --limit=50
 *
 * Requires: DATABASE_URL + BUILT_IN_FORGE_API_URL + BUILT_IN_FORGE_API_KEY in env
 */

import "dotenv/config";
import mysql from "mysql2/promise";

// ── Config ────────────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;
const FORGE_API_URL = (process.env.BUILT_IN_FORGE_API_URL || "https://forge.manus.im").replace(/\/$/, "");
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 800;
const RETRY_DELAY_MS = 3000;

// Valid category values used in the DB
const VALID_CATEGORIES = [
  "medical_treatment", "clinical_trials", "assistive_technology",
  "education", "scholarships", "housing", "food_basic_needs",
  "legal", "transport", "employment", "startup", "other",
];

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = !args.includes("--apply") && !args.some((a) => a === "enrich:metadata");
const LIMIT = parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? "9999", 10);

// ── Forge API ─────────────────────────────────────────────────────────────────

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function callForge(messages: { role: string; content: string }[], retries = 3): Promise<string> {
  const url = `${FORGE_API_URL}/v1/chat/completions`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${FORGE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
          messages,
          max_tokens: 4096,
          thinking: { budget_tokens: 128 },
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API ${res.status}: ${text.slice(0, 200)}`);
      }
      const data = await res.json() as { choices: { message: { content: string } }[] };
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty API response");
      return content;
    } catch (err) {
      if (attempt === retries) throw err;
      console.error(`    Attempt ${attempt}/${retries} failed: ${(err as Error).message}. Retrying...`);
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }
  throw new Error("All retries failed");
}

// ── Enrichment ────────────────────────────────────────────────────────────────

interface GrantRow {
  itemId: string;
  name: string;
  description: string | null;
  category: string | null;
  country: string | null;
  eligibility: string | null;
  organization: string | null;
  website: string | null;
}

interface EnrichedMetadata {
  category?: string;
  country?: string;
  eligibility?: string;
}

async function enrichBatch(grants: GrantRow[]): Promise<Record<string, EnrichedMetadata>> {
  const grantTexts = grants.map((g) =>
    `[${g.itemId}]
Name: ${g.name}
Organization: ${g.organization ?? "unknown"}
Description: ${(g.description ?? "").slice(0, 400)}
Website: ${g.website ?? "none"}
Current category: ${g.category ?? "MISSING"}
Current country: ${g.country ?? "MISSING"}
Current eligibility: ${g.eligibility ?? "MISSING"}`
  ).join("\n\n---\n\n");

  const system = `You are a data enrichment assistant for a grants database.
For each grant, infer missing metadata fields based on name, organization, description, and website.

Valid categories (pick the single best match):
${VALID_CATEGORIES.join(", ")}

For country: use ISO country name (e.g. "United States", "United Kingdom", "Canada", "Georgia").
If the grant is global/international use "International".

For eligibility: write 1-2 concise sentences about who is eligible.
Only fill fields marked as MISSING. Leave already-set fields unchanged.

Return ONLY valid JSON:
{
  "results": {
    "<itemId>": {
      "category": "...",
      "country": "...",
      "eligibility": "..."
    }
  }
}
Only include fields that were MISSING. Omit fields that already have values.`;

  const content = await callForge([
    { role: "system", content: system },
    { role: "user", content: `Enrich metadata for these ${grants.length} grants:\n\n${grantTexts}` },
  ]);

  const parsed = JSON.parse(content) as { results: Record<string, EnrichedMetadata> };
  return parsed.results ?? {};
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!DATABASE_URL) { console.error("❌ DATABASE_URL required"); process.exit(1); }
  if (!FORGE_API_KEY) { console.error("❌ BUILT_IN_FORGE_API_KEY required"); process.exit(1); }

  const db = await mysql.createConnection(DATABASE_URL);

  const mode = DRY_RUN ? "🔍 DRY-RUN — no DB writes" : "🔧 APPLY mode — DB will be updated";
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  GrantKit — Metadata Enrichment`);
  console.log(`  ${mode}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // Fetch grants missing any metadata field
  const [rows] = await db.execute<mysql.RowDataPacket[]>(
    `SELECT itemId, name, description, category, country, eligibility, organization, website
     FROM grants
     WHERE isActive = 1
       AND (
         category IS NULL OR category = '' OR
         country  IS NULL OR country  = '' OR
         eligibility IS NULL OR eligibility = ''
       )
     ORDER BY id
     LIMIT ?`,
    [LIMIT]
  );

  const grants = rows as GrantRow[];
  if (grants.length === 0) {
    console.log("✅ All grants have complete metadata. Nothing to enrich.");
    await db.end();
    process.exit(0);
  }

  // Stats
  const missingCategory    = grants.filter((g) => !g.category?.trim()).length;
  const missingCountry     = grants.filter((g) => !g.country?.trim()).length;
  const missingEligibility = grants.filter((g) => !g.eligibility?.trim()).length;

  console.log(`Found ${grants.length} grants needing metadata enrichment:`);
  console.log(`  ❌ Missing category    : ${missingCategory}`);
  console.log(`  ❌ Missing country     : ${missingCountry}`);
  console.log(`  ⚠️  Missing eligibility : ${missingEligibility}\n`);

  let enriched = 0;
  let errors = 0;

  for (let i = 0; i < grants.length; i += BATCH_SIZE) {
    const batch = grants.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(grants.length / BATCH_SIZE);

    console.log(`--- Batch ${batchNum}/${totalBatches} ---`);

    try {
      const results = await enrichBatch(batch);

      for (const g of batch) {
        const meta = results[g.itemId];
        if (!meta || Object.keys(meta).length === 0) {
          console.log(`  ⚠ ${g.itemId}: no enrichment returned`);
          continue;
        }

        // Build update only for fields that are missing AND AI provided a value
        const setClauses: string[] = [];
        const values: string[] = [];

        if (!g.category?.trim() && meta.category) {
          setClauses.push("category = ?");
          values.push(meta.category);
        }
        if (!g.country?.trim() && meta.country) {
          setClauses.push("country = ?");
          values.push(meta.country);
        }
        if (!g.eligibility?.trim() && meta.eligibility) {
          setClauses.push("eligibility = ?");
          values.push(meta.eligibility);
        }

        if (setClauses.length === 0) continue;

        const preview = Object.entries(meta)
          .map(([k, v]) => `${k}="${String(v).slice(0, 30)}"`)
          .join(", ");

        if (DRY_RUN) {
          console.log(`  ✓ ${g.itemId}: [dry-run] would set ${preview}`);
        } else {
          values.push(g.itemId);
          await db.execute(
            `UPDATE grants SET ${setClauses.join(", ")} WHERE itemId = ?`,
            values
          );
          console.log(`  ✓ ${g.itemId}: ${preview}`);
        }
        enriched++;
      }
    } catch (err) {
      console.error(`  ✗ Batch failed: ${(err as Error).message}`);
      errors += batch.length;
    }

    if (i + BATCH_SIZE < grants.length) await sleep(BATCH_DELAY_MS);
  }

  await db.end();

  console.log("\n=== Summary ===");
  console.log(`Enriched: ${enriched} grants`);
  console.log(`Errors:   ${errors}`);
  if (DRY_RUN) console.log("(dry-run — no writes to DB)\nRun with --apply to save changes.");
  else console.log("Run 'pnpm audit:metadata' to verify coverage.");

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
