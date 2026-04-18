#!/usr/bin/env tsx
/**
 * enrich-metadata.ts — Enrich grant metadata using Forge API (Gemini 2.5-flash).
 *
 * Fills in empty enriched fields: deadline, applicationProcess, targetDiagnosis,
 * ageRange, geographicScope, documentsRequired.
 *
 * Uses the grant's name + description + eligibility + category + country as context
 * and asks the AI to infer/generate reasonable metadata.
 *
 * Usage:
 *   pnpm enrich:metadata           — full run
 *   pnpm enrich:metadata:dry       — dry-run (no DB writes)
 *   pnpm enrich:metadata --limit=50
 *   pnpm enrich:metadata --field=deadline  — single field only
 *
 * Requires: DATABASE_URL + BUILT_IN_FORGE_API_URL + BUILT_IN_FORGE_API_KEY in env
 */

import "dotenv/config";
import mysql from "mysql2/promise";

// ── Config ────────────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;
// ENRICHMENT_API_* vars take priority (for Google AI Studio / OpenRouter)
// Falls back to BUILT_IN_FORGE_API_* (Manus Forge) if not set
const FORGE_API_URL = (process.env.ENRICHMENT_API_URL || process.env.BUILT_IN_FORGE_API_URL || "https://forge.manus.im").replace(/\/$/, "");
const FORGE_API_KEY = process.env.ENRICHMENT_API_KEY || process.env.BUILT_IN_FORGE_API_KEY;

// Auto-detect Google AI Studio (different endpoint path + rate limits)
const IS_GOOGLE_AI = FORGE_API_URL.includes("googleapis.com") || FORGE_API_URL.includes("generativelanguage");
const IS_OPENROUTER = FORGE_API_URL.includes("openrouter.ai");

const ENRICHED_FIELDS = [
  "deadline",
  "applicationProcess",
  "targetDiagnosis",
  "ageRange",
  "geographicScope",
  "documentsRequired",
] as const;

type EnrichedField = (typeof ENRICHED_FIELDS)[number];

const BATCH_SIZE = 5;
// Google free tier = 15 RPM → need ~4.5s between requests
const BATCH_DELAY_MS = IS_GOOGLE_AI ? 4500 : 800;
const RETRY_DELAY_MS = 3000;

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const LIMIT = parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? "9999", 10);
const FIELD_FILTER = args.find((a) => a.startsWith("--field="))?.split("=")[1] as EnrichedField | undefined;

// ── Forge API ─────────────────────────────────────────────────────────────────

async function callForge(messages: { role: string; content: string }[], retries = 3): Promise<string> {
  // Google AI Studio OpenAI compat: /chat/completions (no /v1 prefix)
  // Forge / OpenRouter: /v1/chat/completions
  const url = IS_GOOGLE_AI
    ? `${FORGE_API_URL}/chat/completions`
    : `${FORGE_API_URL}/v1/chat/completions`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const model = IS_GOOGLE_AI
        ? "gemini-2.0-flash"
        : IS_OPENROUTER
          ? "google/gemini-2.0-flash-001"
          : "gemini-2.5-flash";

      const body: Record<string, unknown> = {
        model,
        messages,
        max_tokens: 8192,
        response_format: { type: "json_object" },
      };
      // thinking param only works with Forge API
      if (!IS_GOOGLE_AI && !IS_OPENROUTER) {
        body.thinking = { budget_tokens: 128 };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${FORGE_API_KEY}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API ${res.status}: ${text.slice(0, 200)}`);
      }

      const data = (await res.json()) as { choices: { message: { content: string } }[] };
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

// ── Enrichment prompt ─────────────────────────────────────────────────────────

async function enrichBatch(
  grants: {
    itemId: string;
    name: string;
    description: string | null;
    eligibility: string | null;
    category: string;
    country: string;
  }[]
): Promise<Record<string, Record<string, string>>> {
  const grantTexts = grants
    .map(
      (g) =>
        `[${g.itemId}]\nName: ${g.name}\nCategory: ${g.category}\nCountry: ${g.country}\nDescription: ${(g.description || "N/A").slice(0, 600)}\nEligibility: ${(g.eligibility || "N/A").slice(0, 300)}`
    )
    .join("\n\n---\n\n");

  const fieldsToEnrich = FIELD_FILTER ? [FIELD_FILTER] : [...ENRICHED_FIELDS];

  const system = `You are a grants database specialist. Given grant information, infer and generate metadata for the following fields:

${fieldsToEnrich.map((f) => `- ${f}`).join("\n")}

Field descriptions:
- deadline: Application deadline. If ongoing/rolling, say "Rolling/Open". If unknown, say "Contact organization for current deadlines". Use format like "March 31, 2026" or "Rolling/Open".
- applicationProcess: Brief description of how to apply (e.g., "Submit online application through website", "Contact organization directly"). 2-3 sentences max.
- targetDiagnosis: Medical conditions or situations this grant targets. If not medical, describe the target situation (e.g., "Financial hardship", "Educational needs"). If general purpose, say "General/All conditions".
- ageRange: Age eligibility (e.g., "0-18", "18+", "All ages", "Under 21"). Keep it short.
- geographicScope: Geographic area served (e.g., "United States - Nationwide", "California only", "International"). Based on the country and any clues in description.
- documentsRequired: Common documents typically required (e.g., "Proof of diagnosis, Financial information, Photo ID"). Infer from grant type if not explicit.

Rules:
- Be concise and practical
- If you cannot determine a field with reasonable confidence, use a sensible default based on the grant type
- Keep medical terminology precise
- Return ONLY valid JSON

Format:
{
  "results": {
    "<itemId>": {
      ${fieldsToEnrich.map((f) => `"${f}": "..."`).join(",\n      ")}
    }
  }
}`;

  const content = await callForge([
    { role: "system", content: system },
    { role: "user", content: `Enrich metadata for these ${grants.length} grants:\n\n${grantTexts}` },
  ]);

  const parsed = JSON.parse(content) as { results: Record<string, Record<string, string>> };
  return parsed.results ?? {};
}

// ── DB helpers ────────────────────────────────────────────────────────────────

async function updateGrant(
  db: mysql.Connection,
  itemId: string,
  fields: Record<string, string>
) {
  const setClauses: string[] = [];
  const values: (string | Date)[] = [];

  for (const f of ENRICHED_FIELDS) {
    if (fields[f] && fields[f].trim()) {
      setClauses.push(`\`${f}\` = ?`);
      values.push(fields[f].trim());
    }
  }

  if (setClauses.length === 0) return 0;

  setClauses.push("`updatedAt` = ?");
  values.push(new Date());
  values.push(itemId);

  await db.execute(
    `UPDATE grants SET ${setClauses.join(", ")} WHERE itemId = ?`,
    values
  );

  return setClauses.length - 1; // exclude updatedAt from count
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL required");
    process.exit(1);
  }
  if (!FORGE_API_KEY) {
    console.error("❌ BUILT_IN_FORGE_API_KEY required");
    process.exit(1);
  }

  if (DRY_RUN) console.log("🔍 DRY-RUN mode — no DB writes\n");

  const fieldsToEnrich = FIELD_FILTER ? [FIELD_FILTER] : [...ENRICHED_FIELDS];
  console.log(`Fields to enrich: ${fieldsToEnrich.join(", ")}`);
  console.log(`Limit: ${LIMIT}\n`);

  const db = await mysql.createConnection(DATABASE_URL);

  // Find grants that have at least one empty enriched field
  const fieldConditions = fieldsToEnrich
    .map((f) => `(\`${f}\` IS NULL OR \`${f}\` = '')`)
    .join(" OR ");

  const [rows] = await db.execute<mysql.RowDataPacket[]>(
    `SELECT itemId, name, description, eligibility, category, country,
            ${ENRICHED_FIELDS.map((f) => `\`${f}\``).join(", ")}
     FROM grants
     WHERE isActive = 1 AND (${fieldConditions})
     ORDER BY id
     LIMIT ${Number(LIMIT)}`,
    []
  );

  const grantsToEnrich = rows as (Record<string, string | null> & {
    itemId: string;
    name: string;
    category: string;
    country: string;
  })[];

  if (grantsToEnrich.length === 0) {
    console.log("✅ All enriched fields are populated. Nothing to do.");
    await db.end();
    process.exit(0);
  }

  console.log(`Found ${grantsToEnrich.length} grants needing metadata enrichment\n`);

  let enriched = 0;
  let fieldsUpdated = 0;
  let errors = 0;

  // Process in batches
  for (let i = 0; i < grantsToEnrich.length; i += BATCH_SIZE) {
    const batch = grantsToEnrich.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(grantsToEnrich.length / BATCH_SIZE);

    console.log(
      `--- Batch ${batchNum}/${totalBatches} (grants ${i + 1}–${Math.min(i + BATCH_SIZE, grantsToEnrich.length)}) ---`
    );

    try {
      const results = await enrichBatch(
        batch.map((g) => ({
          itemId: g.itemId,
          name: g.name,
          description: g.description,
          eligibility: g.eligibility,
          category: g.category,
          country: g.country,
        }))
      );

      for (const g of batch) {
        const gResult = results[g.itemId];
        if (!gResult) {
          console.log(`  ⚠ ${g.itemId}: missing from API response`);
          errors++;
          continue;
        }

        // Only update fields that are currently empty
        const fieldsToWrite: Record<string, string> = {};
        for (const f of fieldsToEnrich) {
          const currentVal = g[f];
          if ((!currentVal || currentVal.trim() === "") && gResult[f] && gResult[f].trim()) {
            fieldsToWrite[f] = gResult[f];
          }
        }

        if (Object.keys(fieldsToWrite).length === 0) {
          console.log(`  – ${g.itemId}: no new fields to update`);
          continue;
        }

        if (!DRY_RUN) {
          const count = await updateGrant(db, g.itemId, fieldsToWrite);
          fieldsUpdated += count;
        } else {
          fieldsUpdated += Object.keys(fieldsToWrite).length;
        }

        const fieldNames = Object.keys(fieldsToWrite).join(", ");
        console.log(`  ✓ ${g.itemId}: ${Object.keys(fieldsToWrite).length} fields (${fieldNames})`);
        enriched++;
      }
    } catch (err) {
      console.error(`  ✗ Batch failed: ${(err as Error).message}`);
      errors += batch.length;
    }

    if (i + BATCH_SIZE < grantsToEnrich.length) await sleep(BATCH_DELAY_MS);
  }

  await db.end();

  console.log("\n=== Summary ===");
  console.log(`Grants enriched: ${enriched}`);
  console.log(`Fields updated:  ${fieldsUpdated}`);
  console.log(`Errors:          ${errors}`);
  if (DRY_RUN) console.log("(dry-run — no writes to DB)");
  else console.log("Done. Run audit queries to verify coverage.");

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
