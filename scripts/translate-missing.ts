/**
 * Translate missing grants — finds grants without translations and translates them.
 * Handles both core fields (name, description, eligibility) and enriched fields.
 * Uses Forge API (Gemini 2.5-flash) — same as existing translation scripts.
 *
 * Usage: pnpm tsx scripts/translate-missing.ts [--dry-run] [--batch-size=5] [--core-only] [--enriched-only]
 *
 * Flags:
 *   --dry-run        Show what would be translated without writing to DB
 *   --batch-size=N   Process N grants per LLM call (default: 5)
 *   --core-only      Only translate core fields (name, description, eligibility)
 *   --enriched-only  Only translate enriched fields (applicationProcess, deadline, etc.)
 */

import "dotenv/config";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL || "https://forge.manus.im";
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }
if (!FORGE_API_KEY) { console.error("BUILT_IN_FORGE_API_KEY not set"); process.exit(1); }

const LANGUAGES = ["ka", "fr", "es", "ru"] as const;
const LANG_NAMES: Record<string, string> = {
  ka: "Georgian", fr: "French", es: "Spanish", ru: "Russian",
};

const CORE_FIELDS = ["name", "description", "eligibility"];
const ENRICHED_FIELDS = [
  "applicationProcess", "deadline", "targetDiagnosis",
  "ageRange", "geographicScope", "documentsRequired",
];

// Parse CLI args
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const CORE_ONLY = args.includes("--core-only");
const ENRICHED_ONLY = args.includes("--enriched-only");
const BATCH_SIZE = (() => {
  const a = args.find((a) => a.startsWith("--batch-size="));
  return a ? parseInt(a.split("=")[1]) : 5;
})();

interface GrantRow {
  itemId: string;
  name: string;
  description: string | null;
  eligibility: string | null;
  applicationProcess: string | null;
  deadline: string | null;
  targetDiagnosis: string | null;
  ageRange: string | null;
  geographicScope: string | null;
  documentsRequired: string | null;
}

async function invokeLLM(messages: Array<{ role: string; content: string }>, retries = 3): Promise<any> {
  const url = `${FORGE_API_URL.replace(/\/$/, "")}/v1/chat/completions`;

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
          max_tokens: 16384,
          thinking: { budget_tokens: 128 },
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`LLM API ${res.status}: ${errText.substring(0, 200)}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty LLM response");
      return JSON.parse(content);
    } catch (err: any) {
      console.error(`  Attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

function escSql(str: string | null | undefined): string {
  if (!str) return "";
  return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function translateCoreBatch(
  connection: mysql.Connection,
  grants: GrantRow[]
): Promise<number> {
  const grantTexts = grants
    .map(
      (g) =>
        `[${g.itemId}] Name: "${g.name}" | Description: "${(g.description || "").slice(0, 500)}" | Eligibility: "${(g.eligibility || "").slice(0, 300)}"`
    )
    .join("\n\n");

  const prompt = `Translate these ${grants.length} grants into 4 languages: Georgian (ka), French (fr), Spanish (es), Russian (ru).

RULES:
- Translate name, description, and eligibility for each grant
- Keep organization names, URLs, emails, phone numbers, dollar amounts as-is
- For Georgian: use natural Georgian, not transliteration
- Keep medical/legal terms precise

Return JSON: {"translations": [{"itemId": "...", "ka": {"name": "...", "description": "...", "eligibility": "..."}, "fr": {...}, "es": {...}, "ru": {...}}, ...]}

Grants:
${grantTexts}`;

  const result = await invokeLLM([{ role: "user", content: prompt }]);
  const translations = result.translations || [];

  let count = 0;
  for (const t of translations) {
    if (!t.itemId) continue;

    for (const lang of LANGUAGES) {
      const langData = t[lang];
      if (!langData) continue;

      const name = escSql(langData.name);
      const description = escSql(langData.description);
      const eligibility = escSql(langData.eligibility);

      if (!name && !description && !eligibility) continue;

      if (!DRY_RUN) {
        await connection.execute(
          `INSERT INTO grant_translations (grantItemId, language, name, description, eligibility)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             name = IF(VALUES(name) != '', VALUES(name), name),
             description = IF(VALUES(description) != '', VALUES(description), description),
             eligibility = IF(VALUES(eligibility) != '', VALUES(eligibility), eligibility)`,
          [t.itemId, lang, langData.name || "", langData.description || "", langData.eligibility || ""]
        );
      }
    }
    count++;
    console.log(`  + ${t.itemId}`);
  }

  return count;
}

async function translateEnrichedGrant(
  connection: mysql.Connection,
  grant: GrantRow
): Promise<boolean> {
  const fieldsToTranslate: Record<string, string> = {};
  for (const f of ENRICHED_FIELDS) {
    const val = (grant as any)[f];
    if (val && val.trim()) {
      fieldsToTranslate[f] = val;
    }
  }

  if (Object.keys(fieldsToTranslate).length === 0) return false;

  const prompt = `Translate these grant fields from English into 4 languages. Return JSON with keys: ka (Georgian), fr (French), es (Spanish), ru (Russian). Each language key contains an object with the translated fields.

Rules:
- Translate naturally. Keep medical terms precise.
- Keep proper nouns (org names, program names) in English.
- Keep dates in original format.

English source:
${JSON.stringify(fieldsToTranslate)}

Return format: {"ka":{...},"fr":{...},"es":{...},"ru":{...}}`;

  const result = await invokeLLM([{ role: "user", content: prompt }]);
  if (!result) return false;

  if (!DRY_RUN) {
    for (const lang of LANGUAGES) {
      const t = result[lang];
      if (!t) continue;

      const setClauses: string[] = [];
      const values: any[] = [];

      for (const f of ENRICHED_FIELDS) {
        if (t[f] !== undefined && t[f] !== null && t[f] !== "") {
          setClauses.push(`${f} = ?`);
          values.push(t[f]);
        }
      }

      if (setClauses.length > 0) {
        values.push(grant.itemId, lang);
        await connection.execute(
          `UPDATE grant_translations SET ${setClauses.join(", ")} WHERE grantItemId = ? AND language = ?`,
          values
        );
      }
    }
  }

  return true;
}

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL!);
  console.log(`\n========== GrantKit — Translate Missing ==========`);
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"} | Batch: ${BATCH_SIZE}`);
  console.log(`Scope: ${CORE_ONLY ? "core only" : ENRICHED_ONLY ? "enriched only" : "core + enriched"}\n`);

  let coreTranslated = 0;
  let coreErrors = 0;
  let enrichedTranslated = 0;
  let enrichedErrors = 0;

  // ── Phase 1: Core fields ──
  if (!ENRICHED_ONLY) {
    console.log("=== Phase 1: Core fields (name, description, eligibility) ===\n");

    // Find grants missing translations for ANY language
    const [missingRows] = await connection.execute<mysql.RowDataPacket[]>(
      `SELECT g.itemId, g.name, g.description, g.eligibility
       FROM grants g
       WHERE g.isActive = 1
         AND EXISTS (
           SELECT 1 FROM (
             SELECT ? as lang UNION SELECT ? UNION SELECT ? UNION SELECT ?
           ) langs
           WHERE langs.lang NOT IN (
             SELECT t.language FROM grant_translations t
             WHERE t.grantItemId = g.itemId
               AND t.name IS NOT NULL AND t.name != ''
           )
         )
       ORDER BY g.id DESC`,
      [...LANGUAGES]
    );

    const missingGrants = missingRows as GrantRow[];
    console.log(`Grants needing core translations: ${missingGrants.length}\n`);

    for (let i = 0; i < missingGrants.length; i += BATCH_SIZE) {
      const batch = missingGrants.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(missingGrants.length / BATCH_SIZE);

      console.log(`Batch ${batchNum}/${totalBatches} (${batch.length} grants):`);

      try {
        const count = await translateCoreBatch(connection, batch);
        coreTranslated += count;
      } catch (err: any) {
        console.error(`  BATCH FAILED: ${err.message}`);
        coreErrors += batch.length;
      }

      // Rate limit
      if (i + BATCH_SIZE < missingGrants.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    console.log(`\nCore: ${coreTranslated} translated, ${coreErrors} errors\n`);
  }

  // ── Phase 2: Enriched fields ──
  if (!CORE_ONLY) {
    console.log("=== Phase 2: Enriched fields (applicationProcess, deadline, etc.) ===\n");

    // Find grants that have enriched fields in English but missing in translations
    const enrichedCondition = ENRICHED_FIELDS.map(
      (f) => `(g.${f} IS NOT NULL AND g.${f} != '')`
    ).join(" OR ");

    const [enrichedRows] = await connection.execute<mysql.RowDataPacket[]>(
      `SELECT g.itemId, g.name, g.description, g.eligibility,
              g.applicationProcess, g.deadline, g.targetDiagnosis,
              g.ageRange, g.geographicScope, g.documentsRequired
       FROM grants g
       WHERE g.isActive = 1
         AND (${enrichedCondition})
         AND NOT EXISTS (
           SELECT 1 FROM grant_translations t
           WHERE t.grantItemId = g.itemId
             AND t.language = 'ka'
             AND t.applicationProcess IS NOT NULL
             AND t.applicationProcess != ''
         )
       ORDER BY g.id DESC`
    );

    const enrichedGrants = enrichedRows as GrantRow[];
    console.log(`Grants needing enriched translations: ${enrichedGrants.length}\n`);

    for (let i = 0; i < enrichedGrants.length; i++) {
      const grant = enrichedGrants[i];
      const progress = `[${i + 1}/${enrichedGrants.length}]`;

      try {
        const ok = await translateEnrichedGrant(connection, grant);
        if (ok) {
          enrichedTranslated++;
          if ((i + 1) % 10 === 0 || i === enrichedGrants.length - 1) {
            console.log(`${progress} ${grant.itemId}: OK`);
          }
        } else {
          console.log(`${progress} ${grant.itemId}: skipped (no enriched content)`);
        }
      } catch (err: any) {
        enrichedErrors++;
        console.error(`${progress} ${grant.itemId}: FAILED — ${err.message}`);
      }

      // Rate limit
      await new Promise((r) => setTimeout(r, 300));
    }

    console.log(`\nEnriched: ${enrichedTranslated} translated, ${enrichedErrors} errors\n`);
  }

  // ── Summary ──
  console.log(`========== Summary ==========`);
  if (!ENRICHED_ONLY) console.log(`Core:     ${coreTranslated} done, ${coreErrors} errors`);
  if (!CORE_ONLY) console.log(`Enriched: ${enrichedTranslated} done, ${enrichedErrors} errors`);
  console.log(`Mode: ${DRY_RUN ? "DRY RUN — no changes written" : "LIVE — changes committed"}`);
  console.log(`==============================\n`);

  await connection.end();
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
