#!/usr/bin/env tsx
/**
 * translate-missing.ts — Generate missing grant translations using Claude Haiku.
 *
 * Reads the audit report from audit-translations.ts, then for each grant
 * missing a translation, calls Claude Haiku to translate name + description.
 * Writes results to grantTranslations table via upsert.
 *
 * Usage: pnpm tsx scripts/translate-missing.ts
 *        pnpm tsx scripts/translate-missing.ts --dry-run
 *        pnpm tsx scripts/translate-missing.ts --lang=fr --limit=50
 *
 * Requires: DATABASE_URL + ANTHROPIC_API_KEY in .env or environment
 */

import "dotenv/config";
import * as fs from "fs";
import Anthropic from "@anthropic-ai/sdk";
import { drizzle } from "drizzle-orm/mysql2";
import { grants, grantTranslations } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

const LANGUAGES: Record<string, string> = {
  fr: "French",
  es: "Spanish",
  ru: "Russian",
  ka: "Georgian",
};

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 500;

const SYSTEM_PROMPT = `You are a professional translator for a grants database.
Translate the grant title and description to {target_language}.
Rules:
- Keep proper nouns (organization names, program names) in English
- Translate technical terms naturally for the target language
- Keep the same level of formality as the English original
- If the grant is region-specific (e.g. "US Federal Grant"), keep location references clear
- Output JSON: { "name": "translated title", "description": "translated description" }
- Respond with ONLY JSON, no explanation.`;

// CLI args
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const langArg = args.find((a) => a.startsWith("--lang="))?.split("=")[1];
const limitArg = args.find((a) => a.startsWith("--limit="))?.split("=")[1];
const limit = limitArg ? parseInt(limitArg, 10) : Infinity;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function translateGrant(
  client: Anthropic,
  name: string,
  description: string,
  targetLang: string
): Promise<{ name: string; description: string } | null> {
  const langName = LANGUAGES[targetLang] || targetLang;
  const prompt = SYSTEM_PROMPT.replace("{target_language}", langName);

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: prompt,
      messages: [
        {
          role: "user",
          content: `Title: ${name}\n\nDescription: ${description || "N/A"}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return null;

    const parsed = JSON.parse(textBlock.text) as {
      name?: string;
      description?: string;
    };

    if (!parsed.name) return null;
    return {
      name: parsed.name,
      description: parsed.description || "",
    };
  } catch (err) {
    console.error(`  [ERROR] Translation failed: ${(err as Error).message}`);
    return null;
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is required");
    process.exit(1);
  }

  // Read audit report
  const auditPath = "scripts/translation-audit.json";
  if (!fs.existsSync(auditPath)) {
    console.error("Run audit-translations.ts first to generate the audit report.");
    process.exit(1);
  }

  const audit = JSON.parse(fs.readFileSync(auditPath, "utf-8")) as {
    total: number;
    byLanguage: Record<string, { missing: number; missingIds: string[] }>;
  };

  const db = drizzle(process.env.DATABASE_URL);
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const langsToProcess = langArg ? [langArg] : Object.keys(LANGUAGES);
  let totalTranslated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const lang of langsToProcess) {
    const langData = audit.byLanguage[lang];
    if (!langData || langData.missing === 0) {
      console.log(`\n${lang.toUpperCase()}: No missing translations. Skipping.`);
      continue;
    }

    const missingIds = langData.missingIds.slice(0, limit);
    console.log(`\n=== ${lang.toUpperCase()}: ${missingIds.length} grants to translate ===\n`);

    // Fetch English source data for missing grants in batches
    for (let i = 0; i < missingIds.length; i += BATCH_SIZE) {
      const batch = missingIds.slice(i, i + BATCH_SIZE);

      for (const itemId of batch) {
        const idx = i + batch.indexOf(itemId) + 1;
        process.stdout.write(`  Translating grant ${idx}/${missingIds.length} to ${lang.toUpperCase()}... `);

        // Fetch English source
        const [grant] = await db
          .select({ name: grants.name, description: grants.description })
          .from(grants)
          .where(eq(grants.itemId, itemId))
          .limit(1);

        if (!grant || !grant.name) {
          console.log("SKIP (no English source)");
          totalSkipped++;
          continue;
        }

        const result = await translateGrant(client, grant.name, grant.description || "", lang);

        if (!result) {
          console.log("ERROR");
          totalErrors++;
          continue;
        }

        if (dryRun) {
          console.log(`OK (dry-run) → "${result.name.substring(0, 60)}..."`);
          totalTranslated++;
          continue;
        }

        // Upsert translation
        await db
          .insert(grantTranslations)
          .values({
            grantItemId: itemId,
            language: lang,
            name: result.name,
            description: result.description,
          })
          .onDuplicateKeyUpdate({
            set: {
              name: result.name,
              description: result.description,
            },
          });

        console.log(`OK → "${result.name.substring(0, 60)}..."`);
        totalTranslated++;
      }

      // Rate limiting between batches
      if (i + BATCH_SIZE < missingIds.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }
  }

  console.log("\n=== Translation Summary ===");
  console.log(`Translated: ${totalTranslated}`);
  console.log(`Skipped: ${totalSkipped}`);
  console.log(`Errors: ${totalErrors}`);
  if (dryRun) console.log("(dry-run mode — no database writes)");

  process.exit(0);
}

main().catch((err) => {
  console.error("Translation failed:", err);
  process.exit(1);
});
