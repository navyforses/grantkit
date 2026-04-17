/**
 * Translate 47 Boston Housing grants into 4 languages (ka, fr, es, ru).
 * Uses LLM to translate all translatable fields.
 * 
 * Usage: node server/translate-boston-housing.mjs
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;
const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL || "https://forge.manus.im";
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!DATABASE_URL) throw new Error("DATABASE_URL required");
if (!FORGE_API_KEY) throw new Error("BUILT_IN_FORGE_API_KEY required");

const db = drizzle(DATABASE_URL);

const LANGUAGES = [
  { code: "ka", name: "Georgian (ქართული)" },
  { code: "fr", name: "French (Français)" },
  { code: "es", name: "Spanish (Español)" },
  { code: "ru", name: "Russian (Русский)" },
];

const TRANSLATE_FIELDS = [
  "name", "description", "eligibility", "applicationProcess",
  "deadline", "targetDiagnosis", "ageRange", "geographicScope", "documentsRequired"
];

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    eligibility: { type: "string" },
    applicationProcess: { type: "string" },
    deadline: { type: "string" },
    targetDiagnosis: { type: "string" },
    ageRange: { type: "string" },
    geographicScope: { type: "string" },
    documentsRequired: { type: "string" },
  },
  required: TRANSLATE_FIELDS,
  additionalProperties: false,
};

async function invokeLLM(messages, retries = 3) {
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
          max_tokens: 4096,
          thinking: { budget_tokens: 128 },
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "grant_translation",
              strict: true,
              schema: RESPONSE_SCHEMA,
            },
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`LLM API ${res.status}: ${errText.slice(0, 200)}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty LLM response");
      
      return JSON.parse(content);
    } catch (err) {
      console.error(`  Attempt ${attempt}/${retries} failed:`, err.message);
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }
}

function escapeSQL(str) {
  if (!str) return "";
  return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function translateGrant(grant, langCode, langName) {
  const sourceFields = {};
  for (const f of TRANSLATE_FIELDS) {
    sourceFields[f] = grant[f] || "";
  }

  const prompt = `Translate the following grant/housing assistance program information from English to ${langName}. 
Keep proper nouns (organization names, addresses, phone numbers, URLs) unchanged.
Keep the same format and structure. Translate naturally, not word-by-word.
For ageRange field, keep the numeric format (e.g., "18-24" stays "18-24", but "Adults 18+" can be translated).

Source data:
${JSON.stringify(sourceFields, null, 2)}`;

  const result = await invokeLLM([
    { role: "system", content: `You are a professional translator. Translate grant information to ${langName}. Keep proper nouns, addresses, phone numbers, and URLs unchanged. Respond with JSON only.` },
    { role: "user", content: prompt },
  ]);

  return result;
}

async function insertTranslation(grantItemId, langCode, translated) {
  const q = `INSERT INTO grant_translations (grantItemId, language, name, description, eligibility, applicationProcess, deadline, targetDiagnosis, ageRange, geographicScope, documentsRequired)
  VALUES ('${escapeSQL(grantItemId)}', '${langCode}', '${escapeSQL(translated.name)}', '${escapeSQL(translated.description)}', '${escapeSQL(translated.eligibility)}', '${escapeSQL(translated.applicationProcess)}', '${escapeSQL(translated.deadline)}', '${escapeSQL(translated.targetDiagnosis)}', '${escapeSQL(translated.ageRange)}', '${escapeSQL(translated.geographicScope)}', '${escapeSQL(translated.documentsRequired)}')`;
  
  await db.execute(sql.raw(q));
}

async function main() {
  console.log("=== Boston Housing Translation ===\n");

  // Fetch all Boston housing grants
  const [grants] = await db.execute(
    sql`SELECT itemId, name, description, eligibility, applicationProcess, deadline, targetDiagnosis, ageRange, geographicScope, documentsRequired FROM grants WHERE itemId LIKE 'bos_housing_%' AND isActive = 1 ORDER BY id ASC`
  );

  console.log(`Found ${grants.length} Boston housing grants to translate into ${LANGUAGES.length} languages\n`);
  console.log(`Total translations needed: ${grants.length * LANGUAGES.length}\n`);

  let translated = 0;
  let failed = 0;

  for (let i = 0; i < grants.length; i++) {
    const grant = grants[i];
    console.log(`[${i + 1}/${grants.length}] ${grant.name}`);

    // Translate to all 4 languages in parallel
    const results = await Promise.allSettled(
      LANGUAGES.map(async (lang) => {
        try {
          const result = await translateGrant(grant, lang.code, lang.name);
          await insertTranslation(grant.itemId, lang.code, result);
          return { lang: lang.code, status: "ok" };
        } catch (err) {
          return { lang: lang.code, status: "error", error: err.message };
        }
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value.status === "ok") {
        translated++;
      } else {
        failed++;
        const errMsg = r.status === "fulfilled" ? r.value.error : r.reason?.message;
        console.error(`  ✗ ${r.status === "fulfilled" ? r.value.lang : "?"}: ${errMsg}`);
      }
    }

    const successLangs = results
      .filter(r => r.status === "fulfilled" && r.value.status === "ok")
      .map(r => r.value.lang);
    console.log(`  ✓ ${successLangs.join(", ")}`);

    // Brief pause every 5 grants
    if ((i + 1) % 5 === 0 && i + 1 < grants.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log(`\n=== Translation Complete ===`);
  console.log(`Translated: ${translated}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${grants.length * LANGUAGES.length}`);

  // Verify
  const [count] = await db.execute(sql`SELECT COUNT(*) as cnt FROM grant_translations WHERE grantItemId LIKE 'bos_housing_%'`);
  console.log(`Boston housing translations in DB: ${count[0]?.cnt}`);

  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
