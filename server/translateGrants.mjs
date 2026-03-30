/**
 * Grant Translation Script — Phase A
 * Translates enriched grant descriptions and eligibility to 4 languages.
 * Updates existing grant_translations rows with new enriched content.
 * 
 * Usage: node server/translateGrants.mjs [--batch-size=10] [--start=0] [--limit=630]
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

const args = process.argv.slice(2);
const getArg = (name, def) => {
  const a = args.find(a => a.startsWith(`--${name}=`));
  return a ? parseInt(a.split("=")[1]) : def;
};
const BATCH_SIZE = getArg("batch-size", 10);
const START_OFFSET = getArg("start", 0);
const LIMIT = getArg("limit", 9999);

const LANGUAGES = [
  { code: "ka", name: "Georgian" },
  { code: "fr", name: "French" },
  { code: "es", name: "Spanish" },
  { code: "ru", name: "Russian" },
];

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
          max_tokens: 8192,
          thinking: { budget_tokens: 128 },
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "translations",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  translations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        itemId: { type: "string" },
                        ka_name: { type: "string" },
                        ka_description: { type: "string" },
                        ka_eligibility: { type: "string" },
                        fr_name: { type: "string" },
                        fr_description: { type: "string" },
                        fr_eligibility: { type: "string" },
                        es_name: { type: "string" },
                        es_description: { type: "string" },
                        es_eligibility: { type: "string" },
                        ru_name: { type: "string" },
                        ru_description: { type: "string" },
                        ru_eligibility: { type: "string" },
                      },
                      required: ["itemId", "ka_name", "ka_description", "ka_eligibility", "fr_name", "fr_description", "fr_eligibility", "es_name", "es_description", "es_eligibility", "ru_name", "ru_description", "ru_eligibility"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["translations"],
                additionalProperties: false,
              },
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

function escSql(str) {
  if (!str) return "";
  return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function translateBatch(grants) {
  const grantTexts = grants.map(g => 
    `[${g.itemId}] Name: "${g.name}" | Description: "${(g.description || "").slice(0, 500)}" | Eligibility: "${(g.eligibility || "").slice(0, 300)}"`
  ).join("\n\n");

  const systemPrompt = `You are a professional translator. Translate the following grant information into 4 languages: Georgian (ka), French (fr), Spanish (es), Russian (ru).

RULES:
- Translate the name, description, and eligibility fields for each grant
- Keep organization names in their original form (don't translate proper nouns)
- Keep URLs, email addresses, phone numbers, and dollar amounts as-is
- Maintain the same meaning and tone
- For Georgian: use natural Georgian language, not transliteration
- Return all translations in the structured JSON format`;

  const result = await invokeLLM([
    { role: "system", content: systemPrompt },
    { role: "user", content: `Translate these ${grants.length} grants:\n\n${grantTexts}` },
  ]);

  return result.translations || [];
}

async function upsertTranslation(itemId, lang, name, description, eligibility) {
  const query = `INSERT INTO grant_translations (grantItemId, language, name, description, eligibility) 
    VALUES ('${escSql(itemId)}', '${escSql(lang)}', '${escSql(name)}', '${escSql(description)}', '${escSql(eligibility)}')
    ON DUPLICATE KEY UPDATE name = '${escSql(name)}', description = '${escSql(description)}', eligibility = '${escSql(eligibility)}'`;
  
  await db.execute(sql.raw(query));
}

async function main() {
  console.log("=== GrantKit Translation Script ===");
  console.log(`Batch size: ${BATCH_SIZE}, Start: ${START_OFFSET}, Limit: ${LIMIT}`);
  
  const [rows] = await db.execute(
    sql`SELECT itemId, name, description, eligibility FROM grants WHERE isActive = 1 ORDER BY id ASC LIMIT ${LIMIT} OFFSET ${START_OFFSET}`
  );
  
  const allGrants = rows;
  console.log(`Found ${allGrants.length} grants to translate\n`);

  let translated = 0;
  let failed = 0;

  for (let i = 0; i < allGrants.length; i += BATCH_SIZE) {
    const batch = allGrants.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(allGrants.length / BATCH_SIZE);
    
    console.log(`--- Batch ${batchNum}/${totalBatches} (grants ${i + 1}-${Math.min(i + BATCH_SIZE, allGrants.length)}) ---`);

    try {
      const translations = await translateBatch(batch);
      
      for (const t of translations) {
        try {
          // Upsert all 4 languages
          await upsertTranslation(t.itemId, "ka", t.ka_name, t.ka_description, t.ka_eligibility);
          await upsertTranslation(t.itemId, "fr", t.fr_name, t.fr_description, t.fr_eligibility);
          await upsertTranslation(t.itemId, "es", t.es_name, t.es_description, t.es_eligibility);
          await upsertTranslation(t.itemId, "ru", t.ru_name, t.ru_description, t.ru_eligibility);
          translated++;
          console.log(`  ✓ ${t.itemId}`);
        } catch (err) {
          console.error(`  ✗ ${t.itemId}: ${err.message}`);
          failed++;
        }
      }

      // Handle grants that weren't in the response
      const translatedIds = new Set(translations.map(t => t.itemId));
      for (const g of batch) {
        if (!translatedIds.has(g.itemId)) {
          console.log(`  ⚠ ${g.itemId} missing from response`);
          failed++;
        }
      }
    } catch (err) {
      console.error(`  ✗ Batch failed: ${err.message}`);
      failed += batch.length;
    }

    // Brief pause between batches
    if (i + BATCH_SIZE < allGrants.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log(`\n=== Translation Complete ===`);
  console.log(`Translated: ${translated}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${allGrants.length}`);
  
  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
