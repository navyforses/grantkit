#!/usr/bin/env tsx
/**
 * translate-missing.ts
 *
 * პოულობს აქტიურ grant-ებს, რომლებსაც აკლია თარგმანი (FR/ES/RU/KA)
 * და თარგმნის core + enriched ველებს ერთ LLM call-ში per grant.
 *
 * Forge API (Gemini 2.5 Flash) გამოიყენება.
 *
 * გამოყენება:
 *   pnpm translate:missing                    # Railway-ით: railway run pnpm translate:missing
 *   pnpm translate:missing:dry                # dry-run: DB-ს არ ცვლის
 *   pnpm tsx scripts/translate-missing.ts --limit=50 --dry-run
 *
 * საჭიროა:
 *   DATABASE_URL, BUILT_IN_FORGE_API_URL, BUILT_IN_FORGE_API_KEY
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { sql, eq, and, or, isNull } from "drizzle-orm";
import { grants, grantTranslations } from "../drizzle/schema.js";

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const arg = (name: string) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];

const LIMIT = parseInt(arg("limit") ?? "500");
const DELAY_MS = parseInt(arg("delay") ?? "400");
const DRY_RUN = process.argv.includes("--dry-run");
const MAX_RETRIES = 3;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL ?? "";
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY ?? "";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}
if (!FORGE_API_KEY) {
  console.error("BUILT_IN_FORGE_API_KEY not set");
  process.exit(1);
}

const LANGUAGES = ["fr", "es", "ru", "ka"] as const;
const LANG_NAMES: Record<string, string> = {
  fr: "French",
  es: "Spanish",
  ru: "Russian",
  ka: "Georgian",
};

const CORE_FIELDS = ["name", "description", "eligibility"] as const;
const ENRICHED_FIELDS = [
  "applicationProcess",
  "deadline",
  "targetDiagnosis",
  "ageRange",
  "geographicScope",
  "documentsRequired",
] as const;
const ALL_FIELDS = [...CORE_FIELDS, ...ENRICHED_FIELDS] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function invokeLLM(prompt: string): Promise<string> {
  const url = `${FORGE_API_URL.replace(/\/$/, "")}/v1/chat/completions`;
  const payload = {
    model: "gemini-2.5-flash",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 16384,
    thinking: { budget_tokens: 128 },
    response_format: { type: "json_object" },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${FORGE_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM ${res.status}: ${errText.substring(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  return data.choices[0].message.content;
}

interface GrantRow {
  itemId: string;
  name: string | null;
  description: string | null;
  eligibility: string | null;
  applicationProcess: string | null;
  deadline: string | null;
  targetDiagnosis: string | null;
  ageRange: string | null;
  geographicScope: string | null;
  documentsRequired: string | null;
}

type Translations = Record<string, Record<string, string>>;

async function translateGrant(
  grant: GrantRow,
  targetLangs: string[]
): Promise<Translations | null> {
  // Collect non-empty fields
  const source: Record<string, string> = {};
  for (const f of ALL_FIELDS) {
    const val = grant[f as keyof GrantRow] as string | null;
    if (val && val.trim()) {
      source[f] = val;
    }
  }

  if (Object.keys(source).length === 0) return null;

  const langList = targetLangs
    .map((l) => `${l} (${LANG_NAMES[l]})`)
    .join(", ");

  const prompt = `Translate these grant fields from English into the following languages: ${langList}.

Return JSON with language codes as top-level keys. Each language key contains an object with the translated fields.

Rules:
- Translate naturally into each target language.
- Keep medical and legal terms precise.
- Keep proper nouns (organization names, programme names) in English.
- Keep dates, phone numbers, emails in original format.
- Keep URLs unchanged.
- For Georgian (ka): use proper Georgian script.

English source:
${JSON.stringify(source)}

Return format: {${targetLangs.map((l) => `"${l}":{...}`).join(",")}}`;

  const content = await invokeLLM(prompt);

  try {
    return JSON.parse(content) as Translations;
  } catch {
    // Try to extract JSON from content (sometimes wrapped in markdown)
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]) as Translations;
    }
    throw new Error(`JSON parse failed: ${content.substring(0, 100)}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const db = drizzle(process.env.DATABASE_URL!);

  console.log(`\n=== GrantKit Translation: Missing Grants ===`);
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no DB writes)" : "LIVE"}`);
  console.log(`Limit: ${LIMIT} | Delay: ${DELAY_MS}ms\n`);

  // Find grants missing translations for any of FR/ES/RU/KA
  // A grant is "missing" if it has no translation row or the name is empty for that language
  const missingByLang: Record<string, string[]> = {};

  for (const lang of LANGUAGES) {
    const missing = await db
      .select({ itemId: grants.itemId })
      .from(grants)
      .leftJoin(
        grantTranslations,
        and(
          eq(grantTranslations.grantItemId, grants.itemId),
          eq(grantTranslations.language, lang)
        )
      )
      .where(
        and(
          eq(grants.isActive, true),
          or(
            isNull(grantTranslations.id),
            sql`${grantTranslations.name} IS NULL OR ${grantTranslations.name} = ''`
          )
        )
      );

    missingByLang[lang] = missing.map((m) => m.itemId);
    console.log(`${lang}: ${missing.length} grants missing translations`);
  }

  // Collect unique itemIds that need translation
  const allMissingIds = [...new Set(Object.values(missingByLang).flat())];
  console.log(`\nUnique grants needing translation: ${allMissingIds.length}`);

  if (allMissingIds.length === 0) {
    console.log("All translations are complete!");
    process.exit(0);
  }

  // Fetch grant data for missing items
  const toProcess = allMissingIds.slice(0, LIMIT);
  console.log(`Processing: ${toProcess.length} grants\n`);

  let success = 0;
  let errors = 0;
  let skipped = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const itemId = toProcess[i];
    const progress = `[${i + 1}/${toProcess.length}]`;

    // Determine which languages are missing for this grant
    const langsNeeded = LANGUAGES.filter((l) =>
      missingByLang[l].includes(itemId)
    );

    if (langsNeeded.length === 0) {
      skipped++;
      continue;
    }

    // Fetch the English source data
    const [grantRow] = await db
      .select({
        itemId: grants.itemId,
        name: grants.name,
        description: grants.description,
        eligibility: grants.eligibility,
        applicationProcess: grants.applicationProcess,
        deadline: grants.deadline,
        targetDiagnosis: grants.targetDiagnosis,
        ageRange: grants.ageRange,
        geographicScope: grants.geographicScope,
        documentsRequired: grants.documentsRequired,
      })
      .from(grants)
      .where(eq(grants.itemId, itemId))
      .limit(1);

    if (!grantRow) {
      console.log(`${progress} ${itemId}: not found, skipping`);
      skipped++;
      continue;
    }

    // Translate with retry
    let translations: Translations | null = null;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        translations = await translateGrant(grantRow, [...langsNeeded]);
        break;
      } catch (e) {
        lastError = e as Error;
        if (attempt < MAX_RETRIES) {
          const backoff = attempt * 2000;
          console.log(
            `${progress} ${itemId}: attempt ${attempt} failed, retrying in ${backoff}ms...`
          );
          await sleep(backoff);
        }
      }
    }

    if (!translations) {
      errors++;
      console.error(
        `${progress} ${itemId}: FAILED after ${MAX_RETRIES} attempts — ${lastError?.message}`
      );
      continue;
    }

    if (DRY_RUN) {
      const langKeys = Object.keys(translations).join(",");
      console.log(`${progress} ${itemId}: would insert [${langKeys}]`);
      success++;
    } else {
      // Upsert translations for each language
      try {
        for (const lang of langsNeeded) {
          const t = translations[lang];
          if (!t) continue;

          const insertValues: Record<string, string | null> = {
            grantItemId: itemId,
            language: lang,
            name: t.name ?? null,
            description: t.description ?? null,
            eligibility: t.eligibility ?? null,
            applicationProcess: t.applicationProcess ?? null,
            deadline: t.deadline ?? null,
            targetDiagnosis: t.targetDiagnosis ?? null,
            ageRange: t.ageRange ?? null,
            geographicScope: t.geographicScope ?? null,
            documentsRequired: t.documentsRequired ?? null,
          };

          await db
            .insert(grantTranslations)
            .values(insertValues as any)
            .onDuplicateKeyUpdate({
              set: {
                name: sql`VALUES(name)`,
                description: sql`VALUES(description)`,
                eligibility: sql`VALUES(eligibility)`,
                applicationProcess: sql`VALUES(applicationProcess)`,
                deadline: sql`VALUES(deadline)`,
                targetDiagnosis: sql`VALUES(targetDiagnosis)`,
                ageRange: sql`VALUES(ageRange)`,
                geographicScope: sql`VALUES(geographicScope)`,
                documentsRequired: sql`VALUES(documentsRequired)`,
              },
            });
        }
        success++;
        if ((i + 1) % 10 === 0 || i === toProcess.length - 1) {
          console.log(
            `${progress} ${itemId}: OK (${success} done, ${errors} errors)`
          );
        }
      } catch (e) {
        errors++;
        console.error(
          `${progress} ${itemId}: DB error — ${(e as Error).message}`
        );
      }
    }

    await sleep(DELAY_MS);
  }

  console.log(
    `\n=== Done: ${success} translated, ${errors} errors, ${skipped} skipped ===`
  );
 * translate-missing.ts — Translate missing grant entries using Forge API (Gemini 2.5-flash).
 *
 * 1. Reads audit report (scripts/translation-audit.json) — run audit first
 * 2. Finds grants missing translations in any of: FR, ES, RU, KA
 * 3. Translates core fields (name, description, eligibility) in batches of 5
 * 4. Also translates enriched fields (applicationProcess, deadline, etc.) when present
 * 5. Upserts results into grant_translations table
 *
 * Usage:
 *   pnpm translate:missing           — full run
 *   pnpm translate:missing:dry       — dry-run (no DB writes)
 *   pnpm translate:missing --lang=fr — single language
 *   pnpm translate:missing --limit=50
 *
 * Requires: DATABASE_URL + BUILT_IN_FORGE_API_URL + BUILT_IN_FORGE_API_KEY in env
 */

import "dotenv/config";
import * as fs from "fs";
import mysql from "mysql2/promise";

// ── Config ────────────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;
const FORGE_API_URL = (process.env.BUILT_IN_FORGE_API_URL || "https://forge.manus.im").replace(/\/$/, "");
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

const CORE_FIELDS = ["name", "description", "eligibility"] as const;
const ENRICHED_FIELDS = ["applicationProcess", "deadline", "targetDiagnosis", "ageRange", "geographicScope", "documentsRequired"] as const;
const LANGUAGES = ["fr", "es", "ru", "ka"] as const;
const LANG_NAMES: Record<string, string> = { fr: "French", es: "Spanish", ru: "Russian", ka: "Georgian" };
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 600;
const RETRY_DELAY_MS = 3000;

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const LANG_FILTER = args.find((a) => a.startsWith("--lang="))?.split("=")[1];
const LIMIT = parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? "9999", 10);

// ── Forge API ─────────────────────────────────────────────────────────────────

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
          max_tokens: 8192,
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

// ── Translation helpers ───────────────────────────────────────────────────────

async function translateCoreBatch(
  grants: { itemId: string; name: string; description: string | null; eligibility: string | null }[]
): Promise<Record<string, Record<string, Record<string, string>>>> {
  const grantTexts = grants
    .map(
      (g) =>
        `[${g.itemId}]\nName: ${g.name}\nDescription: ${(g.description || "").slice(0, 500)}\nEligibility: ${(g.eligibility || "").slice(0, 300)}`
    )
    .join("\n\n---\n\n");

  const system = `You are a professional translator for a grants database.
Translate each grant's name, description, and eligibility into French (fr), Spanish (es), Russian (ru), and Georgian (ka).

Rules:
- Keep organization names and program names in English
- Keep URLs, emails, amounts as-is
- Use natural language for each target language
- For Georgian: use Georgian script, not transliteration
- Return ONLY valid JSON, no explanation

Format:
{
  "results": {
    "<itemId>": {
      "fr": { "name": "...", "description": "...", "eligibility": "..." },
      "es": { "name": "...", "description": "...", "eligibility": "..." },
      "ru": { "name": "...", "description": "...", "eligibility": "..." },
      "ka": { "name": "...", "description": "...", "eligibility": "..." }
    }
  }
}`;

  const content = await callForge([
    { role: "system", content: system },
    { role: "user", content: `Translate these ${grants.length} grants:\n\n${grantTexts}` },
  ]);

  const parsed = JSON.parse(content) as { results: Record<string, Record<string, Record<string, string>>> };
  return parsed.results ?? {};
}

async function translateEnrichedFields(
  grant: { itemId: string } & Record<string, string | null>
): Promise<Record<string, Record<string, string>> | null> {
  const fieldsToTranslate: Record<string, string> = {};
  for (const f of ENRICHED_FIELDS) {
    const val = grant[f];
    if (val && val.trim()) fieldsToTranslate[f] = val;
  }
  if (Object.keys(fieldsToTranslate).length === 0) return null;

  const prompt = `Translate the following grant fields from English into 4 languages.
Return JSON with keys: ka (Georgian), fr (French), es (Spanish), ru (Russian).
Each language key maps to an object with the translated fields.

Rules:
- Translate naturally. Keep medical terms precise.
- Keep proper nouns in English.
- Keep dates in original format.
- Return ONLY valid JSON.

English:
${JSON.stringify(fieldsToTranslate, null, 2)}

Format: {"ka":{...},"fr":{...},"es":{...},"ru":{...}}`;

  const content = await callForge([{ role: "user", content: prompt }]);
  try {
    return JSON.parse(content) as Record<string, Record<string, string>>;
  } catch {
    return null;
  }
}

// ── DB helpers ────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function upsertCore(
  db: mysql.Connection,
  itemId: string,
  lang: string,
  name: string,
  description: string,
  eligibility: string
) {
  await db.execute(
    `INSERT INTO grant_translations (grantItemId, language, name, description, eligibility)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), eligibility = VALUES(eligibility)`,
    [itemId, lang, name, description, eligibility]
  );
}

async function upsertEnriched(
  db: mysql.Connection,
  itemId: string,
  lang: string,
  fields: Record<string, string>
) {
  const setClauses: string[] = [];
  const values: string[] = [];
  for (const f of ENRICHED_FIELDS) {
    if (fields[f]) {
      setClauses.push(`${f} = ?`);
      values.push(fields[f]);
    }
  }
  if (setClauses.length === 0) return;
  values.push(itemId, lang);
  await db.execute(
    `UPDATE grant_translations SET ${setClauses.join(", ")} WHERE grantItemId = ? AND language = ?`,
    values
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!DATABASE_URL) { console.error("❌ DATABASE_URL required"); process.exit(1); }
  if (!FORGE_API_KEY) { console.error("❌ BUILT_IN_FORGE_API_KEY required"); process.exit(1); }

  // Read audit report
  const auditPath = "scripts/translation-audit.json";
  if (!fs.existsSync(auditPath)) {
    console.error("❌ Run 'pnpm translate:audit' first to generate translation-audit.json");
    process.exit(1);
  }

  const audit = JSON.parse(fs.readFileSync(auditPath, "utf-8")) as {
    total: number;
    byLanguage: Record<string, { missingIds: string[] }>;
  };

  if (DRY_RUN) console.log("🔍 DRY-RUN mode — no DB writes\n");

  // Collect all grants that need ANY language
  const langsToProcess = LANG_FILTER ? [LANG_FILTER] : [...LANGUAGES];
  const allMissingSet = new Set<string>();
  for (const lang of langsToProcess) {
    for (const id of (audit.byLanguage[lang]?.missingIds ?? [])) {
      allMissingSet.add(id);
    }
  }

  const allMissing = Array.from(allMissingSet).slice(0, LIMIT);
  if (allMissing.length === 0) {
    console.log("✅ Nothing to translate. All languages are complete.");
    process.exit(0);
  }

  console.log(`Found ${allMissing.length} grants needing translations (langs: ${langsToProcess.join(", ")})\n`);

  const db = await mysql.createConnection(DATABASE_URL);

  let translated = 0;
  let errors = 0;

  // Process in batches
  for (let i = 0; i < allMissing.length; i += BATCH_SIZE) {
    const batch = allMissing.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(allMissing.length / BATCH_SIZE);

    console.log(`--- Batch ${batchNum}/${totalBatches} (grants ${i + 1}–${Math.min(i + BATCH_SIZE, allMissing.length)}) ---`);

    // Fetch English source
    const placeholders = batch.map(() => "?").join(",");
    const [rows] = await db.execute<mysql.RowDataPacket[]>(
      `SELECT itemId, name, description, eligibility, applicationProcess, deadline,
              targetDiagnosis, ageRange, geographicScope, documentsRequired
       FROM grants WHERE itemId IN (${placeholders}) AND isActive = 1`,
      batch
    );

    const grantsInBatch = rows as (Record<string, string | null> & { itemId: string })[];
    if (grantsInBatch.length === 0) continue;

    // 1. Translate core fields
    try {
      const results = await translateCoreBatch(
        grantsInBatch.map((g) => ({
          itemId: g.itemId,
          name: g.name ?? "",
          description: g.description,
          eligibility: g.eligibility,
        }))
      );

      for (const g of grantsInBatch) {
        const gResult = results[g.itemId];
        if (!gResult) {
          console.log(`  ⚠ ${g.itemId}: missing from core response`);
          errors++;
          continue;
        }

        for (const lang of langsToProcess) {
          const t = gResult[lang];
          if (!t?.name) continue;

          if (!DRY_RUN) {
            await upsertCore(db, g.itemId, lang, t.name, t.description ?? "", t.eligibility ?? "");
          }
        }

        console.log(`  ✓ ${g.itemId}: core translated`);
        translated++;
      }
    } catch (err) {
      console.error(`  ✗ Batch core translation failed: ${(err as Error).message}`);
      errors += grantsInBatch.length;
    }

    // 2. Translate enriched fields (one by one for accuracy)
    for (const g of grantsInBatch) {
      const hasEnriched = ENRICHED_FIELDS.some((f) => g[f] && (g[f] as string).trim());
      if (!hasEnriched) continue;

      try {
        const enriched = await translateEnrichedFields(g);
        if (enriched && !DRY_RUN) {
          for (const lang of langsToProcess) {
            if (enriched[lang]) await upsertEnriched(db, g.itemId, lang, enriched[lang]);
          }
          console.log(`  ✓ ${g.itemId}: enriched fields translated`);
        }
        await sleep(300);
      } catch (err) {
        console.error(`  ⚠ ${g.itemId} enriched failed: ${(err as Error).message}`);
      }
    }

    if (i + BATCH_SIZE < allMissing.length) await sleep(BATCH_DELAY_MS);
  }

  await db.end();

  console.log("\n=== Summary ===");
  console.log(`Translated: ${translated} grants`);
  console.log(`Errors:     ${errors}`);
  if (DRY_RUN) console.log("(dry-run — no writes to DB)");
  else console.log("Run 'pnpm translate:audit' to verify coverage.");

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  console.error("Fatal:", err.message);
  process.exit(1);
});
