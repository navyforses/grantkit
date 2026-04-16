#!/usr/bin/env tsx
/**
 * import-new-grants.ts — ახალი გრანტების სრული pipeline:
 *   1. JSON ფაილიდან წაკითხვა
 *   2. DB-ში ჩაწერა (დუბლიკატების გამორიცხვით)
 *   3. Metadata enrichment
 *   4. Description enrichment (თუ საჭიროა)
 *   5. თარგმანები (FR/ES/RU/KA)
 *
 * გამოყენება:
 *   pnpm tsx scripts/import-new-grants.ts --file=pending-imports/discovery-2026-04-16.json
 *   pnpm tsx scripts/import-new-grants.ts --file=pending-imports/discovery-2026-04-16.json --dry-run
 *
 * საჭიროა: DATABASE_URL, ENRICHMENT_API_URL, ENRICHMENT_API_KEY
 */

import "dotenv/config";
import mysql from "mysql2/promise";
import fs from "fs";

// ── Config ───────────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;
const API_URL = (
  process.env.ENRICHMENT_API_URL ||
  process.env.BUILT_IN_FORGE_API_URL ||
  ""
).replace(/\/$/, "");
const API_KEY = process.env.ENRICHMENT_API_KEY || process.env.BUILT_IN_FORGE_API_KEY;

const IS_OPENROUTER = API_URL.includes("openrouter.ai");
const IS_GOOGLE_AI = API_URL.includes("googleapis.com") || API_URL.includes("generativelanguage");

// ── CLI args ─────────────────────────────────────────────────────────────────

const arg = (name: string) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];

const FILE_PATH = arg("file");
const DRY_RUN = process.argv.includes("--dry-run");

// ── Helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function makeItemId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

async function callLLM(
  messages: { role: string; content: string }[],
  jsonMode = false,
  retries = 3,
): Promise<string> {
  const url = IS_GOOGLE_AI
    ? `${API_URL}/chat/completions`
    : `${API_URL}/v1/chat/completions`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const model = IS_GOOGLE_AI
        ? "gemini-2.0-flash"
        : IS_OPENROUTER
          ? "google/gemini-2.0-flash-001"
          : "gemini-2.5-flash";

      const body: Record<string, unknown> = { model, messages, max_tokens: 8192 };
      if (jsonMode) body.response_format = { type: "json_object" };

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
          ...(IS_OPENROUTER
            ? { "HTTP-Referer": "https://grantkit.app", "X-Title": "GrantKit Import" }
            : {}),
        },
        body: JSON.stringify(body),
      });

      if (res.status === 429 || res.status === 529) {
        await sleep(attempt * 3000);
        continue;
      }
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`API ${res.status}: ${errText.slice(0, 200)}`);
      }

      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      return data.choices?.[0]?.message?.content?.trim() || "";
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(3000);
    }
  }
  throw new Error("Unreachable");
}

// ── Enrichment functions ─────────────────────────────────────────────────────

const ENRICHED_FIELDS = [
  "deadline",
  "applicationProcess",
  "targetDiagnosis",
  "ageRange",
  "geographicScope",
  "documentsRequired",
];

async function enrichMetadata(grant: {
  name: string;
  description: string;
  eligibility: string;
  category: string;
  country: string;
}): Promise<Record<string, string>> {
  const prompt = `You are a grants database specialist. Given this grant information, generate metadata.

Name: ${grant.name}
Category: ${grant.category}
Country: ${grant.country}
Description: ${grant.description.slice(0, 600)}
Eligibility: ${grant.eligibility.slice(0, 300)}

Generate a JSON object with these fields:
- deadline: Application deadline or "Rolling/Open" or "Contact organization for current deadlines"
- applicationProcess: How to apply (2-3 sentences max)
- targetDiagnosis: Target conditions/situations (e.g., "Financial hardship", "Medical needs")
- ageRange: Age eligibility (e.g., "All ages", "18+", "0-18")
- geographicScope: Geographic area served
- documentsRequired: Common documents typically required

Return ONLY a JSON object with these 6 fields.`;

  const raw = await callLLM([{ role: "user", content: prompt }], true);
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function translateGrant(grant: {
  itemId: string;
  name: string;
  description: string;
  eligibility: string;
}, db: mysql.Connection): Promise<void> {
  const langs = [
    { code: "fr", label: "French" },
    { code: "es", label: "Spanish" },
    { code: "ru", label: "Russian" },
    { code: "ka", label: "Georgian" },
  ];

  const prompt = `Translate the following grant information into 4 languages: French, Spanish, Russian, Georgian.

Name: ${grant.name}
Description: ${grant.description.slice(0, 500)}
Eligibility: ${grant.eligibility.slice(0, 300)}

Return a JSON object:
{
  "fr": { "name": "...", "description": "...", "eligibility": "..." },
  "es": { "name": "...", "description": "...", "eligibility": "..." },
  "ru": { "name": "...", "description": "...", "eligibility": "..." },
  "ka": { "name": "...", "description": "...", "eligibility": "..." }
}`;

  const raw = await callLLM([{ role: "user", content: prompt }], true);
  let translations: Record<string, { name: string; description: string; eligibility: string }>;
  try {
    translations = JSON.parse(raw);
  } catch {
    console.log(`    ⚠️ translation parse failed`);
    return;
  }

  for (const lang of langs) {
    const t = translations[lang.code];
    if (!t) continue;

    // Check if translation already exists
    const [existing] = await db.execute(
      "SELECT id FROM grant_translations WHERE grantItemId = ? AND language = ? LIMIT 1",
      [grant.itemId, lang.code]
    );

    if ((existing as any[]).length > 0) continue;

    await db.execute(
      `INSERT INTO grant_translations (grantItemId, language, name, description, eligibility, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [grant.itemId, lang.code, t.name || grant.name, t.description || "", t.eligibility || ""]
    );
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!DATABASE_URL) { console.error("❌ DATABASE_URL not set"); process.exit(1); }
  if (!API_KEY) { console.error("❌ API key not set"); process.exit(1); }
  if (!FILE_PATH) {
    console.error("❌ --file= parameter required\n  Usage: pnpm tsx scripts/import-new-grants.ts --file=pending-imports/discovery-2026-04-16.json");
    process.exit(1);
  }
  if (!fs.existsSync(FILE_PATH)) {
    console.error(`❌ File not found: ${FILE_PATH}`);
    process.exit(1);
  }

  const grants = JSON.parse(fs.readFileSync(FILE_PATH, "utf-8")) as {
    name: string;
    category: string;
    country: string;
    state?: string;
    eligibility: string;
    description: string;
    website?: string;
    organization?: string;
  }[];

  const db = await mysql.createConnection(DATABASE_URL);

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  GrantKit — Import Pipeline`);
  console.log(`  File     : ${FILE_PATH}`);
  console.log(`  Grants   : ${grants.length}`);
  console.log(`  Dry-run  : ${DRY_RUN ? "✅" : "❌"}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < grants.length; i++) {
    const grant = grants[i];
    const itemId = makeItemId(grant.name);
    const idx = `[${i + 1}/${grants.length}]`;

    process.stdout.write(`${idx} ${grant.name.slice(0, 50)} … `);

    // Check duplicate
    const [existing] = await db.execute(
      "SELECT itemId FROM grants WHERE itemId = ? OR name = ? LIMIT 1",
      [itemId, grant.name]
    );
    if ((existing as any[]).length > 0) {
      console.log("⏭ exists");
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log("✔ dry-run");
      imported++;
      continue;
    }

    try {
      // Step 1: Insert into DB
      await db.execute(
        `INSERT INTO grants (itemId, name, category, country, state, eligibility, description, isActive, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
        [itemId, grant.name, grant.category, grant.country, grant.state || null, grant.eligibility, grant.description]
      );
      process.stdout.write("insert ✔ ");

      // Step 2: Metadata enrichment
      try {
        const metadata = await enrichMetadata(grant);
        const metaFields = Object.entries(metadata).filter(
          ([k]) => ENRICHED_FIELDS.includes(k)
        );
        if (metaFields.length > 0) {
          const setClauses = metaFields.map(([k]) => `\`${k}\` = ?`).join(", ");
          const values = metaFields.map(([, v]) => v);
          await db.execute(
            `UPDATE grants SET ${setClauses}, updatedAt = NOW() WHERE itemId = ?`,
            [...values, itemId]
          );
        }
        process.stdout.write("meta ✔ ");
      } catch {
        process.stdout.write("meta ✖ ");
      }
      await sleep(800);

      // Step 3: Translations
      try {
        await translateGrant(
          { itemId, name: grant.name, description: grant.description, eligibility: grant.eligibility },
          db
        );
        process.stdout.write("translate ✔");
      } catch {
        process.stdout.write("translate ✖");
      }
      await sleep(800);

      console.log("");
      imported++;
    } catch (err) {
      console.log(`❌ ${(err as Error).message.slice(0, 60)}`);
      errors++;
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  ✅ Imported   : ${imported}`);
  console.log(`  ⏭  Skipped    : ${skipped}`);
  console.log(`  ❌ Errors     : ${errors}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  await db.end();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
