/**
 * Grant State/City Enrichment Script
 * Uses LLM to determine the state and city for each grant based on
 * organization name, geographic scope, and other available data.
 * 
 * Usage: node server/enrichStateCity.mjs [--batch-size=10] [--start=0] [--limit=9999]
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

// Parse CLI args
const args = process.argv.slice(2);
const getArg = (name, def) => {
  const a = args.find(a => a.startsWith(`--${name}=`));
  return a ? parseInt(a.split("=")[1]) : def;
};
const BATCH_SIZE = getArg("batch-size", 10);
const START_OFFSET = getArg("start", 0);
const LIMIT = getArg("limit", 9999);

const SYSTEM_PROMPT = `You are a grant location research assistant. Given a list of grants with their names, organizations, and geographic scope, determine the US state and city where each organization is headquartered or primarily operates.

IMPORTANT RULES:
- For "state": Use the full US state name (e.g., "California", "New York", "Texas"). 
  - If the grant is "Nationwide USA" or operates across the entire US, use "Nationwide".
  - If the grant is "International" or not US-based, use "International".
  - If the grant operates in a specific region spanning multiple states, pick the state where the HQ is located.
- For "city": Use the city name where the organization is headquartered.
  - If nationwide with no specific city, use the HQ city if known, otherwise "N/A".
  - If international, use the HQ city if known, otherwise "N/A".
- Use your knowledge of these organizations to determine their actual headquarters location.
- If you truly cannot determine the location, use state="Unknown" and city="Unknown".

Respond with a JSON array of objects, each with "itemId", "state", and "city". No markdown, no explanation.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    grants: {
      type: "array",
      items: {
        type: "object",
        properties: {
          itemId: { type: "string", description: "The grant itemId" },
          state: { type: "string", description: "US state name, 'Nationwide', or 'International'" },
          city: { type: "string", description: "City name or 'N/A'" },
        },
        required: ["itemId", "state", "city"],
        additionalProperties: false,
      },
    },
  },
  required: ["grants"],
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
          max_tokens: 8192,
          thinking: { budget_tokens: 128 },
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "grant_locations",
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

async function main() {
  console.log("=== GrantKit State/City Enrichment ===");
  console.log(`Batch size: ${BATCH_SIZE}, Start: ${START_OFFSET}, Limit: ${LIMIT}`);
  
  // Fetch all active grants that need state/city
  const [rows] = await db.execute(
    sql`SELECT id, itemId, name, organization, geographicScope, country, website FROM grants WHERE isActive = 1 ORDER BY id ASC LIMIT ${LIMIT} OFFSET ${START_OFFSET}`
  );
  
  const allGrants = rows;
  console.log(`Found ${allGrants.length} grants to process\n`);

  let updated = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < allGrants.length; i += BATCH_SIZE) {
    const batch = allGrants.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(allGrants.length / BATCH_SIZE);
    
    console.log(`--- Batch ${batchNum}/${totalBatches} (grants ${i + 1}-${Math.min(i + BATCH_SIZE, allGrants.length)}) ---`);

    // Build the user message with all grants in this batch
    const grantList = batch.map(g => 
      `- itemId: ${g.itemId} | Name: ${g.name} | Org: ${g.organization || 'N/A'} | Scope: ${g.geographicScope || 'N/A'} | Country: ${g.country} | Website: ${g.website || 'N/A'}`
    ).join("\n");

    const userMessage = `Determine the US state and city for each of these grants/organizations:\n\n${grantList}`;

    try {
      const result = await invokeLLM([
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ]);

      const grantLocations = result.grants || [];

      // Update each grant in the batch
      for (const loc of grantLocations) {
        const state = loc.state?.trim();
        const city = loc.city?.trim();
        
        if (!state || state === "Unknown") {
          console.log(`  ○ ${loc.itemId}: skipped (unknown state)`);
          skipped++;
          continue;
        }

        const safeState = state.replace(/'/g, "''");
        const safeCity = (city && city !== "N/A" && city !== "Unknown") ? city.replace(/'/g, "''") : null;

        let updateQuery;
        if (safeCity) {
          updateQuery = `UPDATE grants SET state = '${safeState}', city = '${safeCity}' WHERE itemId = '${loc.itemId}' AND isActive = 1`;
        } else {
          updateQuery = `UPDATE grants SET state = '${safeState}' WHERE itemId = '${loc.itemId}' AND isActive = 1`;
        }

        await db.execute(sql.raw(updateQuery));
        console.log(`  ✓ ${loc.itemId}: ${state}${safeCity ? `, ${city}` : ''}`);
        updated++;
      }
    } catch (err) {
      console.error(`  ✗ Batch ${batchNum} failed: ${err.message}`);
      failed += batch.length;
    }

    // Brief pause between batches
    if (i + BATCH_SIZE < allGrants.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log(`\n=== State/City Enrichment Complete ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${allGrants.length}`);
  
  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
