#!/usr/bin/env tsx
/**
 * enrich-descriptions.ts
 *
 * პოულობს ყველა grant-ს რომელსაც description არ აქვს ან 50 სიმბოლოზე მოკლეა,
 * და LLM-ით (OpenRouter / Google AI Studio / Manus Forge) აგენერირებს
 * ადეკვატურ description-ს grant-ის სახელის, კატეგორიის, ქვეყნისა და
 * eligibility-ის საფუძველზე.
 *
 * გამოყენება:
 *   pnpm enrich:descriptions
 *   pnpm enrich:descriptions:dry
 *   pnpm tsx scripts/enrich-descriptions.ts --limit=20 --dry-run --min-length=100
 *
 * საჭიროა:
 *   DATABASE_URL=mysql://...
 *   ENRICHMENT_API_URL (ან BUILT_IN_FORGE_API_URL)
 *   ENRICHMENT_API_KEY (ან BUILT_IN_FORGE_API_KEY)
 */

import "dotenv/config";
import mysql from "mysql2/promise";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DATABASE_URL = process.env.DATABASE_URL;
const FORGE_API_URL = (
  process.env.ENRICHMENT_API_URL ||
  process.env.BUILT_IN_FORGE_API_URL ||
  "https://forge.manus.im"
).replace(/\/$/, "");
const FORGE_API_KEY =
  process.env.ENRICHMENT_API_KEY || process.env.BUILT_IN_FORGE_API_KEY;

const IS_GOOGLE_AI =
  FORGE_API_URL.includes("googleapis.com") ||
  FORGE_API_URL.includes("generativelanguage");
const IS_OPENROUTER = FORGE_API_URL.includes("openrouter.ai");

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const arg = (name: string) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];

const LIMIT = parseInt(arg("limit") ?? "9999");
const MIN_LENGTH = parseInt(arg("min-length") ?? "50");
const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_DELAY_MS = IS_GOOGLE_AI ? 4500 : 800;
const RETRY_DELAY_MS = 3000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// LLM call
// ---------------------------------------------------------------------------

async function callLLM(
  messages: { role: string; content: string }[],
  retries = 3,
): Promise<string> {
  const url = IS_GOOGLE_AI
    ? `${FORGE_API_URL}/chat/completions`
    : `${FORGE_API_URL}/v1/chat/completions`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const model = IS_GOOGLE_AI
        ? "gemini-2.0-flash"
        : IS_OPENROUTER
          ? "google/gemini-2.0-flash-001"
          : "gemini-2.5-flash";

      const body: Record<string, unknown> = {
        model,
        messages,
        max_tokens: 1024,
      };

      // Thinking param only for Manus Forge
      if (!IS_GOOGLE_AI && !IS_OPENROUTER) {
        body.thinking = { budget_tokens: 128 };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${FORGE_API_KEY}`,
          ...(IS_OPENROUTER
            ? { "HTTP-Referer": "https://grantkit.app", "X-Title": "GrantKit" }
            : {}),
        },
        body: JSON.stringify(body),
      });

      if (res.status === 429 || res.status === 529) {
        const wait = attempt * RETRY_DELAY_MS;
        console.log(` ⏳ rate-limit (${res.status}), ${wait}ms...`);
        await sleep(wait);
        continue;
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`API ${res.status}: ${errText.slice(0, 200)}`);
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };

      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) throw new Error("Empty response from API");
      return content;
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(RETRY_DELAY_MS);
    }
  }
  throw new Error("Unreachable");
}

// ---------------------------------------------------------------------------
// Description generation
// ---------------------------------------------------------------------------

async function generateDescription(grant: {
  name: string;
  description: string | null;
  category: string | null;
  country: string | null;
  eligibility: string | null;
}): Promise<string> {
  const prompt = `You are a grants database editor. Write a clear, informative description for the following grant/assistance program.

Grant name: ${grant.name}
Category: ${grant.category || "Unknown"}
Country: ${grant.country || "Unknown"}
Eligibility: ${grant.eligibility || "Not specified"}
Current description: ${grant.description || "None"}

Requirements:
- Write 2-4 sentences (100-300 characters) in English
- Describe what the program provides, who it's for, and key benefits
- Be factual and specific based on the grant name and available info
- Do NOT invent specific dollar amounts, dates, or application URLs
- Do NOT include phrases like "This grant..." — start directly with what it does
- Return ONLY the description text, no quotes, no labels, no JSON`;

  const result = await callLLM([{ role: "user", content: prompt }]);

  // Clean up: remove surrounding quotes if present
  let cleaned = result.replace(/^["']|["']$/g, "").trim();
  // Remove "Description:" prefix if LLM added it
  cleaned = cleaned.replace(/^(Description|Summary|Output):\s*/i, "").trim();

  return cleaned;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!DATABASE_URL) {
    console.error("\n❌  DATABASE_URL არ არის სეტილი.\n");
    process.exit(1);
  }
  if (!FORGE_API_KEY) {
    console.error(
      "\n❌  API key არ არის სეტილი.\n" +
        "    დააყენე ENRICHMENT_API_KEY ან BUILT_IN_FORGE_API_KEY\n",
    );
    process.exit(1);
  }

  const db = await mysql.createConnection(DATABASE_URL);

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  GrantKit — Description Enrichment (LLM)`);
  console.log(`  API         : ${FORGE_API_URL}`);
  console.log(`  მინ. სიმბოლო: ${MIN_LENGTH}`);
  console.log(`  ლიმიტი      : ${LIMIT}`);
  console.log(
    `  Dry-run     : ${DRY_RUN ? "✅ დიახ (DB არ შეიცვლება)" : "❌ გამოთიშული"}`,
  );
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // ამოიღოს grant-ები სადაც description NULL, ცარიელია ან MIN_LENGTH-ზე მოკლე
  const [rows] = await db.execute(
    `SELECT itemId, name, description, category, country, eligibility
     FROM grants
     WHERE isActive = 1
       AND (description IS NULL
            OR description = ''
            OR CHAR_LENGTH(description) < ${Number(MIN_LENGTH)})
     ORDER BY CHAR_LENGTH(COALESCE(description, '')) ASC
     LIMIT ${Number(LIMIT)}`,
  );

  const candidates = rows as {
    itemId: string;
    name: string;
    description: string | null;
    category: string | null;
    country: string | null;
    eligibility: string | null;
  }[];

  if (!candidates.length) {
    console.log(
      `✅  ყველა grant-ს აქვს მინ. ${MIN_LENGTH} სიმბოლოიანი description.`,
    );
    await db.end();
    return;
  }

  const empty = candidates.filter(
    (g) => !g.description || g.description.trim() === "",
  ).length;
  const tooShort = candidates.length - empty;
  console.log(`📋  ნაპოვნია ${candidates.length} grant:`);
  console.log(`    • ${empty} — description სრულიად აკლია`);
  console.log(`    • ${tooShort} — description ${MIN_LENGTH} სიმბოლოზე მოკლეა\n`);

  let improved = 0;
  let skipped = 0;
  let errors = 0;
  const failed: string[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const grant = candidates[i];
    const idx = `[${String(i + 1).padStart(3)}/${candidates.length}]`;
    const oldLen = grant.description?.trim().length ?? 0;

    process.stdout.write(
      `${idx} "${grant.name.slice(0, 55)}" (${oldLen} სიმბ.) … `,
    );

    try {
      const newDesc = await generateDescription(grant);

      if (newDesc.length < 30) {
        console.log(`— LLM-მა ძალიან მოკლე პასუხი დააბრუნა (${newDesc.length})`);
        skipped++;
      } else if (DRY_RUN) {
        console.log(
          `✔  dry-run | ${newDesc.length} სიმბ. | "${newDesc.slice(0, 60)}…"`,
        );
        improved++;
      } else {
        await db.execute(
          `UPDATE grants SET description = ?, updatedAt = NOW() WHERE itemId = ?`,
          [newDesc, grant.itemId],
        );
        console.log(
          `✔  განახლდა | ${oldLen} → ${newDesc.length} სიმბ.`,
        );
        improved++;
      }
    } catch (err) {
      console.log(`✖  შეცდომა: ${(err as Error).message.slice(0, 80)}`);
      failed.push(grant.name);
      errors++;
    }

    if (i < candidates.length - 1) await sleep(BATCH_DELAY_MS);
  }

  // ---------------------------------------------------------------------------
  // Final report
  // ---------------------------------------------------------------------------
  console.log(`\n${"━".repeat(50)}`);
  console.log(`📊  შედეგი:`);
  console.log(`   ✔  განახლდა    : ${improved}`);
  console.log(`   –  გამოტოვდა  : ${skipped}`);
  console.log(`   ✖  შეცდომა    : ${errors}`);
  console.log(`   📝 სულ შემოწმდა: ${candidates.length}`);
  if (DRY_RUN) {
    console.log(`\n   ℹ️  Dry-run რეჟიმი — DB არ შეცვლილა.`);
    console.log(
      `   გამოიყენე --dry-run-ის გარეშე ცვლილებების გამოსაყენებლად.`,
    );
  }
  if (failed.length) {
    console.log(`\n   შეცდომიანი grant-ები:`);
    failed.forEach((n) => console.log(`     • ${n}`));
  }
  console.log(`${"━".repeat(50)}\n`);

  await db.end();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
