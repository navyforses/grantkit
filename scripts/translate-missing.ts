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
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
