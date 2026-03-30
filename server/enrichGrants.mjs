/**
 * Grant Enrichment Script — Phase A
 * Uses LLM to research each organization and fill missing grant data.
 * Processes grants in batches of 5 with structured JSON output.
 * 
 * Usage: node server/enrichGrants.mjs [--batch-size=5] [--start=0] [--limit=630]
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
const BATCH_SIZE = getArg("batch-size", 5);
const START_OFFSET = getArg("start", 0);
const LIMIT = getArg("limit", 9999);

const ENRICHMENT_PROMPT = `You are a grant research assistant. Given a grant/resource entry with its name, organization, and existing data, research the organization and provide comprehensive, accurate information.

IMPORTANT RULES:
- Only provide information you are confident about. If unsure, use "Unknown" or leave empty.
- For website: provide the official organization website URL (must start with https:// or http://)
- For email: provide the main contact email if publicly available
- For phone: provide the main contact phone number if publicly available
- For amount: provide the grant amount or range (e.g., "$500-$5,000", "Up to $10,000", "Varies")
- For description: write a comprehensive 2-4 sentence description of what this organization/program does, who it helps, and what kind of support it provides. Be specific and informative.
- For eligibility: describe who can apply — age range, diagnosis/condition, location requirements, financial requirements, citizenship/visa requirements
- For applicationProcess: describe how to apply (e.g., "Online application through website", "Phone referral required", "Contact via email")
- For deadline: application deadline info (e.g., "Rolling/Open", "Annual - March 31", "Quarterly")
- For fundingType: one of "one_time", "recurring", "reimbursement", "varies", "unknown"
- For targetDiagnosis: specific conditions this grant targets, comma-separated (e.g., "Cancer, Leukemia" or "General" or "Autism, Developmental Disabilities")
- For ageRange: age range in format "min-max" (e.g., "0-18", "18-100", "0-100")
- For geographicScope: where applicants must be located (e.g., "Nationwide USA", "Ohio, USA", "International", "California, USA")
- For documentsRequired: what documents are needed to apply, comma-separated (e.g., "Medical records, Proof of diagnosis, Financial documentation")
- For b2VisaEligible: whether B-2 visa holders can apply — "yes", "no", "uncertain", or "unknown"

Respond with valid JSON only. No markdown, no explanation.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    website: { type: "string", description: "Official website URL" },
    email: { type: "string", description: "Contact email" },
    phone: { type: "string", description: "Contact phone" },
    amount: { type: "string", description: "Grant amount or range" },
    description: { type: "string", description: "Comprehensive 2-4 sentence description" },
    eligibility: { type: "string", description: "Who can apply — detailed eligibility criteria" },
    applicationProcess: { type: "string", description: "How to apply" },
    deadline: { type: "string", description: "Application deadline info" },
    fundingType: { type: "string", enum: ["one_time", "recurring", "reimbursement", "varies", "unknown"], description: "Type of funding" },
    targetDiagnosis: { type: "string", description: "Target conditions, comma-separated" },
    ageRange: { type: "string", description: "Age range in min-max format" },
    geographicScope: { type: "string", description: "Geographic scope" },
    documentsRequired: { type: "string", description: "Required documents, comma-separated" },
    b2VisaEligible: { type: "string", enum: ["yes", "no", "uncertain", "unknown"], description: "B-2 visa eligibility" },
  },
  required: ["website", "email", "phone", "amount", "description", "eligibility", "applicationProcess", "deadline", "fundingType", "targetDiagnosis", "ageRange", "geographicScope", "documentsRequired", "b2VisaEligible"],
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
              name: "grant_enrichment",
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

async function enrichGrant(grant) {
  const existingInfo = [];
  if (grant.description && grant.description.length > 20) existingInfo.push(`Current description: ${grant.description}`);
  if (grant.eligibility) existingInfo.push(`Current eligibility: ${grant.eligibility}`);
  if (grant.category) existingInfo.push(`Category: ${grant.category}`);
  if (grant.country) existingInfo.push(`Country: ${grant.country}`);
  if (grant.grantType) existingInfo.push(`Type: ${grant.grantType}`);
  if (grant.status) existingInfo.push(`Status: ${grant.status}`);

  const userMessage = `Research this grant/resource and provide comprehensive information:

Name: ${grant.name}
Organization: ${grant.organization || grant.name}
${existingInfo.join("\n")}

Please research "${grant.organization || grant.name}" and provide all available information.`;

  const result = await invokeLLM([
    { role: "system", content: ENRICHMENT_PROMPT },
    { role: "user", content: userMessage },
  ]);

  return result;
}

async function updateGrant(itemId, enrichedData) {
  // Build SET clause dynamically — only update non-empty values
  const updates = {};
  
  // Only update if the field was previously empty or very short
  const fieldMap = {
    website: "website",
    email: "grantEmail",
    phone: "phone",
    amount: "amount",
    description: "description",
    eligibility: "eligibility",
    applicationProcess: "applicationProcess",
    deadline: "deadline",
    fundingType: "fundingType",
    targetDiagnosis: "targetDiagnosis",
    ageRange: "ageRange",
    geographicScope: "geographicScope",
    documentsRequired: "documentsRequired",
    b2VisaEligible: "b2VisaEligible",
  };

  const setClauses = [];
  const values = [];

  for (const [jsonKey, dbCol] of Object.entries(fieldMap)) {
    const val = enrichedData[jsonKey];
    if (val && val.trim() && val.toLowerCase() !== "unknown" && val.toLowerCase() !== "n/a") {
      setClauses.push(`\`${dbCol}\` = ?`);
      values.push(val.trim());
    }
  }

  if (setClauses.length === 0) return 0;

  values.push(itemId);
  const query = `UPDATE grants SET ${setClauses.join(", ")} WHERE itemId = ? AND isActive = 1`;
  
  await db.execute(sql.raw(query), values);
  return setClauses.length;
}

async function main() {
  console.log("=== GrantKit AI Enrichment ===");
  console.log(`Batch size: ${BATCH_SIZE}, Start: ${START_OFFSET}, Limit: ${LIMIT}`);
  
  // Fetch all active grants
  const [rows] = await db.execute(
    sql`SELECT id, itemId, name, organization, description, eligibility, category, country, grantType, status, website, phone, grantEmail, amount FROM grants WHERE isActive = 1 ORDER BY id ASC LIMIT ${LIMIT} OFFSET ${START_OFFSET}`
  );
  
  const allGrants = rows;
  console.log(`Found ${allGrants.length} grants to enrich\n`);

  let enriched = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < allGrants.length; i += BATCH_SIZE) {
    const batch = allGrants.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(allGrants.length / BATCH_SIZE);
    
    console.log(`--- Batch ${batchNum}/${totalBatches} (grants ${i + 1}-${Math.min(i + BATCH_SIZE, allGrants.length)}) ---`);

    // Process batch items in parallel (5 at a time)
    const results = await Promise.allSettled(
      batch.map(async (grant) => {
        try {
          const data = await enrichGrant(grant);
          
          // Build update — only overwrite empty/short fields for description and eligibility
          const finalData = { ...data };
          
          // Keep existing good description if present
          if (grant.description && grant.description.length > 50) {
            // Append AI description as additional context if it's substantially different
            if (data.description && data.description.length > grant.description.length * 1.5) {
              finalData.description = data.description;
            } else {
              delete finalData.description; // Keep existing
            }
          }
          
          // Keep existing eligibility if it's in the structured Ages format
          if (grant.eligibility && grant.eligibility.startsWith("Ages ")) {
            // Still update with AI data since it's more comprehensive
          }
          
          // Don't overwrite existing website/email/phone if they exist
          if (grant.website && grant.website.length > 5) delete finalData.website;
          if (grant.grantEmail && grant.grantEmail.length > 3) delete finalData.email;
          if (grant.phone && grant.phone.length > 3) delete finalData.phone;
          if (grant.amount && grant.amount.length > 1) delete finalData.amount;

          // Use raw SQL for the update
          const setClauses = [];
          const vals = [];
          const fieldMap = {
            website: "website",
            email: "grantEmail",
            phone: "phone",
            amount: "amount",
            description: "description",
            eligibility: "eligibility",
            applicationProcess: "applicationProcess",
            deadline: "deadline",
            fundingType: "fundingType",
            targetDiagnosis: "targetDiagnosis",
            ageRange: "ageRange",
            geographicScope: "geographicScope",
            documentsRequired: "documentsRequired",
            b2VisaEligible: "b2VisaEligible",
          };

          for (const [jsonKey, dbCol] of Object.entries(fieldMap)) {
            const val = finalData[jsonKey];
            if (val && val.trim() && val.toLowerCase() !== "unknown" && val.toLowerCase() !== "n/a" && val.trim() !== "") {
              setClauses.push(`${dbCol} = '${val.trim().replace(/'/g, "''")}'`);
            }
          }

          if (setClauses.length > 0) {
            const updateQuery = `UPDATE grants SET ${setClauses.join(", ")} WHERE itemId = '${grant.itemId}' AND isActive = 1`;
            await db.execute(sql.raw(updateQuery));
            console.log(`  ✓ ${grant.name} (${setClauses.length} fields updated)`);
            return { status: "enriched", fields: setClauses.length };
          } else {
            console.log(`  ○ ${grant.name} (no updates needed)`);
            return { status: "skipped" };
          }
        } catch (err) {
          console.error(`  ✗ ${grant.name}: ${err.message}`);
          return { status: "failed", error: err.message };
        }
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled") {
        if (r.value.status === "enriched") enriched++;
        else if (r.value.status === "skipped") skipped++;
        else failed++;
      } else {
        failed++;
      }
    }

    // Brief pause between batches to avoid rate limiting
    if (i + BATCH_SIZE < allGrants.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log(`\n=== Enrichment Complete ===`);
  console.log(`Enriched: ${enriched}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${allGrants.length}`);
  
  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
