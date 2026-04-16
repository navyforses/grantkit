#!/usr/bin/env tsx
/**
 * daily-discovery.ts — Phase 4: ყოველდღიური ახალი გრანტების მოძიება.
 *
 * LLM-ს (OpenRouter) ეკითხება კონკრეტული კატეგორიის/ქვეყნის გრანტებს,
 * ადარებს DB-ში არსებულ გრანტებს დუბლიკატების გასაფილტრად,
 * და ახალ გრანტებს ინახავს JSON ფაილში pending-imports/ საქაღალდეში.
 *
 * გამოყენება:
 *   pnpm tsx scripts/daily-discovery.ts
 *   pnpm tsx scripts/daily-discovery.ts --category=medical_treatment --country=US
 *   pnpm tsx scripts/daily-discovery.ts --dry-run
 *
 * საჭიროა: DATABASE_URL, ENRICHMENT_API_URL, ENRICHMENT_API_KEY
 */

import "dotenv/config";
import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";

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

const DRY_RUN = process.argv.includes("--dry-run");
const TARGET_CATEGORY = arg("category");
const TARGET_COUNTRY = arg("country");

// ── Categories to rotate through ────────────────────────────────────────────

const DISCOVERY_CATEGORIES = [
  { category: "medical_treatment", countries: ["US", "Canada", "UK", "France", "Germany"] },
  { category: "housing", countries: ["US", "Canada", "UK", "France"] },
  { category: "social_services", countries: ["US", "Canada", "UK"] },
  { category: "scholarships", countries: ["US", "Canada", "UK", "France", "Germany"] },
  { category: "financial_assistance", countries: ["US", "Canada", "UK"] },
  { category: "food_basic_needs", countries: ["US", "Canada", "UK"] },
  { category: "assistive_technology", countries: ["US", "Canada", "UK"] },
  { category: "travel_transport", countries: ["US", "Canada", "UK"] },
  { category: "legal_aid", countries: ["US", "Canada", "UK"] },
  { category: "mental_health", countries: ["US", "Canada", "UK", "France"] },
];

// Pick today's category based on day of year (rotates daily)
function getTodayTargets(): { category: string; countries: string[] }[] {
  if (TARGET_CATEGORY) {
    const entry = DISCOVERY_CATEGORIES.find((c) => c.category === TARGET_CATEGORY);
    const countries = TARGET_COUNTRY ? [TARGET_COUNTRY] : entry?.countries ?? ["US"];
    return [{ category: TARGET_CATEGORY, countries }];
  }

  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  // Pick 2 categories per day
  const idx1 = dayOfYear % DISCOVERY_CATEGORIES.length;
  const idx2 = (dayOfYear + 5) % DISCOVERY_CATEGORIES.length;
  return [DISCOVERY_CATEGORIES[idx1], DISCOVERY_CATEGORIES[idx2]];
}

// ── LLM call ─────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callLLM(messages: { role: string; content: string }[], retries = 3): Promise<string> {
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

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
          ...(IS_OPENROUTER
            ? { "HTTP-Referer": "https://grantkit.app", "X-Title": "GrantKit Discovery" }
            : {}),
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 8192,
          response_format: { type: "json_object" },
        }),
      });

      if (res.status === 429 || res.status === 529) {
        const wait = attempt * 3000;
        console.log(`  ⏳ rate-limit, waiting ${wait}ms...`);
        await sleep(wait);
        continue;
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`API ${res.status}: ${errText.slice(0, 200)}`);
      }

      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) throw new Error("Empty response");
      return content;
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(3000);
    }
  }
  throw new Error("Unreachable");
}

// ── Discovery prompt ─────────────────────────────────────────────────────────

interface DiscoveredGrant {
  name: string;
  category: string;
  country: string;
  state?: string;
  eligibility: string;
  description: string;
  website?: string;
  organization?: string;
}

async function discoverGrants(
  category: string,
  country: string,
  existingNames: Set<string>,
): Promise<DiscoveredGrant[]> {
  const prompt = `You are a grants database researcher. Find REAL grants, assistance programs, foundations, and resources that exist RIGHT NOW for the following category and country.

Category: ${category}
Country: ${country}

IMPORTANT RULES:
- Only list REAL programs that actually exist — do NOT invent fictional ones
- Focus on programs that are currently active and accepting applications
- Include government programs, nonprofit foundations, and NGO resources
- Each grant must have: name, category, country, eligibility, description
- Description should be 2-4 sentences explaining what the program provides
- Return 8-12 grants
- Prioritize lesser-known programs that people might not easily find

Return a JSON object with this exact structure:
{
  "grants": [
    {
      "name": "Program Name",
      "category": "${category}",
      "country": "${country}",
      "state": "optional state/province code",
      "eligibility": "Who can apply",
      "description": "What the program provides...",
      "website": "https://...",
      "organization": "Funding organization name"
    }
  ]
}`;

  const raw = await callLLM([{ role: "user", content: prompt }]);

  let parsed: { grants?: DiscoveredGrant[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Try extracting JSON from markdown code blocks
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      parsed = JSON.parse(match[1]);
    } else {
      console.error("  ❌ Failed to parse LLM response");
      return [];
    }
  }

  if (!parsed.grants || !Array.isArray(parsed.grants)) return [];

  // Filter out duplicates against existing DB
  const newGrants = parsed.grants.filter((g) => {
    const nameLower = g.name.toLowerCase().trim();
    // Check exact match
    if (existingNames.has(nameLower)) return false;
    // Check partial match (>60% of words overlap)
    const words = nameLower.split(/\s+/);
    for (const existing of existingNames) {
      const existingWords = existing.split(/\s+/);
      const overlap = words.filter((w) => existingWords.includes(w)).length;
      if (overlap >= Math.min(words.length, existingWords.length) * 0.6) return false;
    }
    return true;
  });

  return newGrants;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!DATABASE_URL) { console.error("❌ DATABASE_URL not set"); process.exit(1); }
  if (!API_KEY) { console.error("❌ ENRICHMENT_API_KEY not set"); process.exit(1); }

  const db = await mysql.createConnection(DATABASE_URL);
  const today = new Date().toISOString().slice(0, 10);
  const targets = getTodayTargets();

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  GrantKit — Daily Discovery (${today})`);
  console.log(`  API      : ${API_URL}`);
  console.log(`  Targets  : ${targets.map((t) => t.category).join(", ")}`);
  console.log(`  Dry-run  : ${DRY_RUN ? "✅" : "❌"}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // Load existing grant names for dedup
  const [rows] = await db.execute("SELECT LOWER(name) as name FROM grants WHERE isActive = 1");
  const existingNames = new Set((rows as { name: string }[]).map((r) => r.name));
  console.log(`📊 DB-ში არსებული გრანტები: ${existingNames.size}\n`);

  const allDiscovered: DiscoveredGrant[] = [];

  for (const target of targets) {
    for (const country of target.countries) {
      process.stdout.write(`🔍 ${target.category} / ${country} … `);
      try {
        const grants = await discoverGrants(target.category, country, existingNames);
        console.log(`${grants.length} ახალი`);

        for (const g of grants) {
          allDiscovered.push(g);
          // Add to existing set to prevent cross-category duplicates
          existingNames.add(g.name.toLowerCase().trim());
        }
      } catch (err) {
        console.log(`❌ ${(err as Error).message.slice(0, 80)}`);
      }
      await sleep(1000); // rate limit
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  📋 სულ აღმოჩენილი: ${allDiscovered.length} ახალი გრანტი`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  if (allDiscovered.length === 0) {
    console.log("  ახალი გრანტი ვერ მოიძებნა.");
    await db.end();
    return;
  }

  // Print table
  allDiscovered.forEach((g, i) => {
    console.log(`  ${i + 1}. ${g.name} [${g.country}] — ${g.category}`);
  });

  // Save to pending-imports/
  const outDir = path.resolve("pending-imports");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outFile = path.join(outDir, `discovery-${today}.json`);
  fs.writeFileSync(outFile, JSON.stringify(allDiscovered, null, 2), "utf-8");
  console.log(`\n  💾 შენახულია: ${outFile}`);

  if (!DRY_RUN) {
    console.log(`\n  DB-ში ჩასაწერად გაუშვი:`);
    console.log(`    pnpm tsx scripts/import-new-grants.ts --file=${outFile}\n`);
  }

  await db.end();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
