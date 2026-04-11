#!/usr/bin/env tsx
/**
 * enrich-descriptions.ts
 *
 * პოულობს ყველა grant-ს რომელსაც:
 *   - description სრულიად აკლია (NULL ან ცარიელი), ან
 *   - description 200 სიმბოლოზე მოკლეა (ძალიან მოკლე / არასაკმარისი)
 *
 * GrantedAI API-ში მოძებნის grant-ის სახელით, შეადარებს შედეგს და
 * განაახლებს მხოლოდ მაშინ, თუ ახალი description ძველზე გრძელი და
 * სულ მცირე 200 სიმბოლოა.
 *
 * გამოყენება:
 *   pnpm enrich:descriptions
 *   pnpm enrich:descriptions:dry
 *   pnpm tsx scripts/enrich-descriptions.ts --limit=20 --dry-run --min-length=300
 *
 * საჭიროა:
 *   DATABASE_URL=mysql://...  .env ფაილში ან გარემოში
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { and, eq, isNull, or, lt, sql } from "drizzle-orm";
import { grants } from "../drizzle/schema.js";
import { searchExternalGrants, getExternalGrantDetail } from "../server/externalGrants.js";

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const arg = (name: string) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];

const LIMIT      = parseInt(arg("limit")      ?? "50");
const MIN_LENGTH = parseInt(arg("min-length") ?? "200"); // მინ. სიმბოლოების რაოდენობა
const DELAY_MS   = parseInt(arg("delay")      ?? "700"); // ms API call-ებს შორის
const DRY_RUN    = process.argv.includes("--dry-run");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** whitespace-ის ნორმალიზაცია, trim */
function clean(text: string | null | undefined): string | null {
  if (!text) return null;
  const t = text.replace(/\s+/g, " ").trim();
  return t.length >= 20 ? t : null;
}

/** ახალი description ღირს DB-ში ჩაწერა? */
function isBetter(newDesc: string, oldDesc: string | null): boolean {
  if (!oldDesc || oldDesc.trim().length === 0) return true;
  // ახალი უნდა იყოს მინ. MIN_LENGTH სიმბოლო და ძველზე გრძელი
  return newDesc.length >= MIN_LENGTH && newDesc.length > oldDesc.trim().length;
}

/**
 * GrantedAI შედეგებიდან საუკეთესო description-ის პოვნა.
 * ცდის: სრული detail → exact name match → partial match → first with summary.
 */
async function findBestDescription(
  grantName: string,
  results: Awaited<ReturnType<typeof searchExternalGrants>>,
): Promise<string | null> {
  if (!results.length) return null;

  const nameLower = grantName.toLowerCase().trim();

  // 1. ზუსტი სახელის დამთხვევა
  const exact = results.find((r) => r.name.toLowerCase().trim() === nameLower);

  // 2. ნაწილობრივი სახელის დამთხვევა
  const partial = results.find(
    (r) =>
      r.name.toLowerCase().includes(nameLower.slice(0, 20)) ||
      nameLower.includes(r.name.toLowerCase().slice(0, 20)),
  );

  const candidate = exact ?? partial ?? results[0];
  if (!candidate) return null;

  // slug გვაქვს — სრული detail-ი ვცადოთ (გრძელი description შეიძლება იყოს)
  if (candidate.slug) {
    try {
      const detail = await getExternalGrantDetail(candidate.slug);
      if (detail) {
        // detail.summary ჩვეულებრივ გრძელია
        const detailDesc = clean(detail.summary);
        if (detailDesc && detailDesc.length >= MIN_LENGTH) return detailDesc;

        // eligibility + summary გავაერთიანოთ თუ summary მოკლეა
        if (detailDesc && detail.eligibility) {
          const combined = `${detailDesc} Eligibility: ${detail.eligibility}`.trim();
          if (combined.length >= MIN_LENGTH) return combined;
        }
      }
    } catch {
      // detail call ვერ მოხდა — გავაგრძელოთ summary-ით
    }
  }

  // fallback — search შედეგის summary
  const summary = clean(candidate.summary);
  return summary && summary.length >= MIN_LENGTH ? summary : null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(
      "\n❌  DATABASE_URL არ არის სეტილი.\n" +
      "    გააკეთე: cp .env.example .env  და შეავსე DATABASE_URL\n",
    );
    process.exit(1);
  }

  const db = drizzle(databaseUrl);

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  GrantKit — Description Enrichment`);
  console.log(`  მინ. სიმბოლო : ${MIN_LENGTH}`);
  console.log(`  ლიმიტი       : ${LIMIT}`);
  console.log(`  Dry-run      : ${DRY_RUN ? "✅ დიახ (DB არ შეიცვლება)" : "❌ გამოთიშული"}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // ამოიღოს grant-ები სადაც description NULL, ცარიელია ან MIN_LENGTH-ზე მოკლე
  const candidates = await db
    .select({
      itemId:      grants.itemId,
      name:        grants.name,
      description: grants.description,
    })
    .from(grants)
    .where(
      and(
        eq(grants.isActive, true),
        or(
          isNull(grants.description),
          eq(grants.description, ""),
          lt(sql`CHAR_LENGTH(${grants.description})`, MIN_LENGTH),
        ),
      ),
    )
    .orderBy(sql`CHAR_LENGTH(${grants.description}) ASC`) // ყველაზე მოკლეებიდან
    .limit(LIMIT);

  if (!candidates.length) {
    console.log(`✅  ყველა grant-ს აქვს მინ. ${MIN_LENGTH} სიმბოლოიანი description — სამუშაო არ არის.`);
    return;
  }

  // მოკლე/ცარიელი სტატისტიკა
  const empty   = candidates.filter((g) => !g.description || g.description.trim() === "").length;
  const tooShort = candidates.length - empty;
  console.log(`📋  ნაპოვნია ${candidates.length} grant:`);
  console.log(`    • ${empty} — description სრულიად აკლია`);
  console.log(`    • ${tooShort} — description ${MIN_LENGTH} სიმბოლოზე მოკლეა\n`);

  // Counters
  let improved  = 0; // description განახლდა
  let skipped   = 0; // GrantedAI-ში ვერ მოიძებნა ან ახალი უარესია
  let errors    = 0; // API/DB შეცდომა
  const failed: string[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const { itemId, name, description: oldDesc } = candidates[i];
    const idx  = `[${String(i + 1).padStart(2)}/${candidates.length}]`;
    const oldLen = oldDesc?.trim().length ?? 0;

    process.stdout.write(`${idx} "${name.slice(0, 55)}" (${oldLen} სიმბ.) … `);

    try {
      const results = await searchExternalGrants({ query: name, limit: 5 });
      const newDesc = await findBestDescription(name, results);

      if (!newDesc) {
        console.log("— GrantedAI-ში ვერ მოიძებნა");
        skipped++;
      } else if (!isBetter(newDesc, oldDesc ?? null)) {
        console.log(`— ახალი (${newDesc.length} სიმბ.) ძველს არ სჯობს, გამოტოვება`);
        skipped++;
      } else if (DRY_RUN) {
        console.log(`✔  dry-run | ${newDesc.length} სიმბ. | "${newDesc.slice(0, 60)}…"`);
        improved++;
      } else {
        await db
          .update(grants)
          .set({ description: newDesc, updatedAt: new Date() })
          .where(eq(grants.itemId, itemId));
        console.log(`✔  განახლდა | ${oldLen} → ${newDesc.length} სიმბ. | "${newDesc.slice(0, 50)}…"`);
        improved++;
      }
    } catch (err) {
      console.log(`✖  შეცდომა: ${(err as Error).message.slice(0, 80)}`);
      failed.push(name);
      errors++;
    }

    if (i < candidates.length - 1) await sleep(DELAY_MS);
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
    console.log(`   გამოიყენე --dry-run-ის გარეშე ცვლილებების გამოსაყენებლად.`);
  }
  if (failed.length) {
    console.log(`\n   შეცდომიანი grant-ები:`);
    failed.forEach((n) => console.log(`     • ${n}`));
  }
  console.log(`${"━".repeat(50)}\n`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
