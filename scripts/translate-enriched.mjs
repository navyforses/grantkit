/**
 * Translate enriched grant fields into 4 languages (KA, FR, ES, RU).
 * Processes ONE grant at a time to avoid JSON truncation issues.
 * Translates ALL 4 languages in a single LLM call per grant.
 */

import 'dotenv/config';
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL || 'https://forge.manus.im';
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!DATABASE_URL) throw new Error('DATABASE_URL not set');
if (!FORGE_API_KEY) throw new Error('BUILT_IN_FORGE_API_KEY not set');

const LANGUAGES = ['ka', 'fr', 'es', 'ru'];
const LANG_NAMES = { ka: 'Georgian', fr: 'French', es: 'Spanish', ru: 'Russian' };

const FIELDS = [
  'applicationProcess',
  'deadline',
  'targetDiagnosis',
  'ageRange',
  'geographicScope',
  'documentsRequired',
];

async function invokeLLM(messages) {
  const url = `${FORGE_API_URL.replace(/\/$/, '')}/v1/chat/completions`;
  const payload = {
    model: 'gemini-2.5-flash',
    messages,
    max_tokens: 16384,
    thinking: { budget_tokens: 128 },
    response_format: { type: 'json_object' },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${FORGE_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM error ${res.status}: ${errText.substring(0, 200)}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

async function translateGrant(grant) {
  // Build a compact object with only non-empty fields
  const fieldsToTranslate = {};
  for (const f of FIELDS) {
    if (grant[f] && grant[f].trim()) {
      fieldsToTranslate[f] = grant[f];
    }
  }

  if (Object.keys(fieldsToTranslate).length === 0) return null;

  const prompt = `Translate these grant fields from English into 4 languages. Return JSON with keys: ka (Georgian), fr (French), es (Spanish), ru (Russian). Each language key contains an object with the translated fields.

Rules:
- Translate naturally. Keep medical terms precise.
- Keep proper nouns (org names, program names) in English.
- Keep dates in original format.

English source:
${JSON.stringify(fieldsToTranslate)}

Return format: {"ka":{...},"fr":{...},"es":{...},"ru":{...}}`;

  const content = await invokeLLM([{ role: 'user', content: prompt }]);

  try {
    return JSON.parse(content);
  } catch (e) {
    console.error(`  Parse error for ${grant.itemId}:`, e.message);
    return null;
  }
}

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  console.log('Connected to database');

  // Check for --resume flag to skip already translated grants
  const resume = process.argv.includes('--resume');

  // Get all active grants with enriched fields
  const [rows] = await connection.execute(
    `SELECT itemId, applicationProcess, deadline, targetDiagnosis, ageRange, geographicScope, documentsRequired 
     FROM grants WHERE isActive = 1 ORDER BY itemId`
  );

  // Filter to only grants that have at least one enriched field
  const grantsWithContent = rows.filter(g =>
    FIELDS.some(f => g[f] && g[f].trim())
  );
  console.log(`${grantsWithContent.length} grants have enriched content to translate`);

  let toProcess = grantsWithContent;

  if (resume) {
    // Find grants that don't have translations yet for enriched fields
    const [translated] = await connection.execute(
      `SELECT DISTINCT grantItemId FROM grant_translations 
       WHERE language = 'ka' AND applicationProcess IS NOT NULL AND applicationProcess != ''`
    );
    const translatedIds = new Set(translated.map(r => r.grantItemId));
    toProcess = grantsWithContent.filter(g => !translatedIds.has(g.itemId));
    console.log(`Resuming: ${toProcess.length} grants remaining (${translatedIds.size} already done)`);
  }

  let success = 0;
  let errors = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const grant = toProcess[i];
    const progress = `[${i + 1}/${toProcess.length}]`;

    try {
      const translations = await translateGrant(grant);

      if (!translations) {
        console.log(`${progress} ${grant.itemId}: skipped (no content)`);
        continue;
      }

      // Update each language
      for (const lang of LANGUAGES) {
        const t = translations[lang];
        if (!t) continue;

        const setClauses = [];
        const values = [];

        for (const f of FIELDS) {
          if (t[f] !== undefined && t[f] !== null && t[f] !== '') {
            setClauses.push(`${f} = ?`);
            values.push(t[f]);
          }
        }

        if (setClauses.length > 0) {
          values.push(grant.itemId, lang);
          await connection.execute(
            `UPDATE grant_translations SET ${setClauses.join(', ')} WHERE grantItemId = ? AND language = ?`,
            values
          );
        }
      }

      success++;
      if ((i + 1) % 20 === 0 || i === toProcess.length - 1) {
        console.log(`${progress} ${grant.itemId}: OK (${success} done, ${errors} errors)`);
      }
    } catch (e) {
      errors++;
      console.error(`${progress} ${grant.itemId}: FAILED - ${e.message}`);

      // Wait and retry once
      await new Promise(r => setTimeout(r, 3000));
      try {
        const translations = await translateGrant(grant);
        if (translations) {
          for (const lang of LANGUAGES) {
            const t = translations[lang];
            if (!t) continue;
            const setClauses = [];
            const values = [];
            for (const f of FIELDS) {
              if (t[f] !== undefined && t[f] !== null && t[f] !== '') {
                setClauses.push(`${f} = ?`);
                values.push(t[f]);
              }
            }
            if (setClauses.length > 0) {
              values.push(grant.itemId, lang);
              await connection.execute(
                `UPDATE grant_translations SET ${setClauses.join(', ')} WHERE grantItemId = ? AND language = ?`,
                values
              );
            }
          }
          success++;
          errors--;
          console.log(`${progress} ${grant.itemId}: RETRY OK`);
        }
      } catch (e2) {
        console.error(`${progress} ${grant.itemId}: RETRY FAILED - ${e2.message}`);
      }
    }

    // Small delay between grants
    await new Promise(r => setTimeout(r, 300));
  }

  // Final stats
  console.log(`\n=== Results: ${success} translated, ${errors} errors ===`);

  const [stats] = await connection.execute(
    `SELECT language, 
      SUM(CASE WHEN applicationProcess IS NOT NULL AND applicationProcess != '' THEN 1 ELSE 0 END) as appProcess,
      SUM(CASE WHEN deadline IS NOT NULL AND deadline != '' THEN 1 ELSE 0 END) as deadline,
      SUM(CASE WHEN targetDiagnosis IS NOT NULL AND targetDiagnosis != '' THEN 1 ELSE 0 END) as diagnosis,
      SUM(CASE WHEN ageRange IS NOT NULL AND ageRange != '' THEN 1 ELSE 0 END) as age,
      SUM(CASE WHEN geographicScope IS NOT NULL AND geographicScope != '' THEN 1 ELSE 0 END) as geo,
      SUM(CASE WHEN documentsRequired IS NOT NULL AND documentsRequired != '' THEN 1 ELSE 0 END) as docs
    FROM grant_translations GROUP BY language`
  );

  console.log('\n=== Translation Coverage ===');
  for (const s of stats) {
    console.log(`${s.language}: appProcess=${s.appProcess}, deadline=${s.deadline}, diagnosis=${s.diagnosis}, age=${s.age}, geo=${s.geo}, docs=${s.docs}`);
  }

  await connection.end();
  console.log('\nDone!');
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
