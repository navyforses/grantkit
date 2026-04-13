/**
 * Migrate catalog.json → Supabase resources table
 *
 * Run:
 *   npx tsx scripts/migrate-catalog.ts
 *   # or with dry-run (no DB writes):
 *   npx tsx scripts/migrate-catalog.ts --dry-run
 *
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
 * (or SERVICE_ROLE_KEY if RLS restricts INSERT for anon).
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";

// ── Load .env ─────────────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env") });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "";
const DRY_RUN = process.argv.includes("--dry-run");

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Catalog field → resources table field mapping ────────────────────────────

type CatalogItem = {
  id: string;
  name: string;
  organization: string;
  description: string;
  category: string;
  type: "grant" | "resource";
  country: string;
  eligibility: string;
  website: string;
  phone: string;
  email: string;
  amount: string;
  status: string;
  state?: string;
  city?: string;
  applicationProcess?: string;
  deadline?: string;
  fundingType?: string;
  targetDiagnosis?: string;
  ageRange?: string;
  geographicScope?: string;
  documentsRequired?: string;
  b2VisaEligible?: string;
};

/** Parse amount string: "$5,000" → { min: 5000, max: 5000 } */
function parseAmount(amount: string): { min?: number; max?: number } {
  if (!amount || amount === "Varies" || amount === "") return {};
  // Remove currency symbols and commas
  const cleaned = amount.replace(/[$,€£]/g, "").trim();
  // Range like "1000 - 5000"
  const rangeMatch = cleaned.match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)$/);
  if (rangeMatch) return { min: Number(rangeMatch[1]), max: Number(rangeMatch[2]) };
  // Single value like "5000" or "~30"
  const singleMatch = cleaned.match(/^~?(\d+(?:\.\d+)?)$/);
  if (singleMatch) return { min: Number(singleMatch[1]), max: Number(singleMatch[1]) };
  return {};
}

/** Slugify title for the slug field */
function slugify(text: string, id: string): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .replace(/^-|-$/g, "");
  return base ? `${base}-${id}` : id;
}

/** Map catalog.category → category table id pattern */
const CATEGORY_MAP: Record<string, string> = {
  medical_treatment:    "GRANT.MEDICAL",
  financial_assistance: "GRANT.FINANCIAL",
  assistive_technology: "GRANT.ASSISTIVE",
  social_services:      "GRANT.SOCIAL",
  scholarships:         "GRANT.EDUCATION",
  housing:              "GRANT.HOUSING",
  travel_transport:     "GRANT.TRANSPORT",
  international:        "GRANT.INTERNATIONAL",
  other:                "GRANT.OTHER",
};

/** Map catalog.country / state to Supabase location rows */
function buildLocations(item: CatalogItem) {
  const countryCode = item.country === "International" ? "EU" : item.country || "US";
  const isNationwide = !item.state || item.state === "Nationwide" || item.state === "International";
  return [{
    country_code: countryCode === "EU" ? "EU" : countryCode,
    is_nationwide: isNationwide,
    region_name: !isNationwide ? item.state : undefined,
    city: item.city || undefined,
  }];
}

// ── Migration ─────────────────────────────────────────────────────────────────

async function run() {
  const catalogPath = join(__dirname, "..", "client", "src", "data", "catalog.json");
  const catalog: CatalogItem[] = JSON.parse(readFileSync(catalogPath, "utf-8"));

  console.log(`\n📦 GrantKit Catalog Migration`);
  console.log(`   Items found: ${catalog.length}`);
  console.log(`   Supabase URL: ${SUPABASE_URL}`);
  if (DRY_RUN) console.log(`   ⚠️  DRY RUN — no database writes will occur`);
  console.log();

  let successCount = 0;
  let failCount = 0;
  const errors: { id: string; error: string }[] = [];

  // Process in batches of 50
  const BATCH = 50;
  for (let i = 0; i < catalog.length; i += BATCH) {
    const batch = catalog.slice(i, i + BATCH);

    const rows = batch.map((item) => {
      const { min: amount_min, max: amount_max } = parseAmount(item.amount);

      return {
        // Identity
        slug: slugify(item.name, item.id),
        resource_type: "GRANT" as const,
        // Title / description
        title: item.name,
        description: item.description,
        // Financial
        amount_min,
        amount_max,
        currency: "USD",
        // Dates
        deadline: item.deadline && item.deadline.trim() ? item.deadline : null,
        is_rolling: false,
        // Status
        status: (item.status === "Active" || item.status === "Open") ? "OPEN" : "ONGOING",
        // Eligibility
        eligibility: "BOTH" as const,
        eligibility_details: item.eligibility || null,
        // Targeting
        target_groups: [] as string[],
        disease_areas: item.targetDiagnosis && item.targetDiagnosis !== "General"
          ? [item.targetDiagnosis]
          : [],
        // Links
        source_url: item.website || null,
        source_name: item.organization || null,
        application_url: item.website || null,
        // Flags
        is_verified: false,
        is_featured: false,
        // Metadata: store original id for reference
        view_count: 0,
      };
    });

    if (DRY_RUN) {
      console.log(`  [DRY] Batch ${Math.floor(i / BATCH) + 1}: would insert ${rows.length} rows`);
      successCount += rows.length;
      continue;
    }

    const { data, error } = await supabase
      .from("resources")
      .upsert(rows, { onConflict: "slug" })
      .select("id, slug");

    if (error) {
      console.error(`  ❌ Batch ${Math.floor(i / BATCH) + 1} error:`, error.message);
      for (const item of batch) {
        failCount++;
        errors.push({ id: item.id, error: error.message });
      }
    } else {
      console.log(`  ✅ Batch ${Math.floor(i / BATCH) + 1}: inserted/updated ${data?.length ?? rows.length} rows`);
      successCount += data?.length ?? rows.length;

      // Insert junction table rows for categories and locations
      if (data) {
        const categoryRows: { resource_id: string; category_id: string; is_primary: boolean }[] = [];
        const locationRows: { resource_id: string; country_code: string; is_nationwide: boolean; region_name?: string; city?: string }[] = [];

        for (let j = 0; j < data.length; j++) {
          const resource = data[j];
          const item = batch[j];

          // Map category using CATEGORY_MAP
          const categoryId = CATEGORY_MAP[item.category] ?? "GRANT.OTHER";
          categoryRows.push({
            resource_id: resource.id,
            category_id: categoryId,
            is_primary: true,
          });

          // Build location row
          const locs = buildLocations(item);
          for (const loc of locs) {
            locationRows.push({
              resource_id: resource.id,
              country_code: loc.country_code,
              is_nationwide: loc.is_nationwide,
              region_name: loc.region_name,
              city: loc.city,
            });
          }
        }

        // Upsert category junction rows
        if (categoryRows.length > 0) {
          const { error: catErr } = await supabase
            .from("resource_categories")
            .upsert(categoryRows, { onConflict: "resource_id,category_id" });
          if (catErr) {
            console.warn(`    ⚠️  resource_categories batch error:`, catErr.message);
          }
        }

        // Upsert location junction rows
        if (locationRows.length > 0) {
          const { error: locErr } = await supabase
            .from("resource_locations")
            .upsert(locationRows, { onConflict: "resource_id,country_code" });
          if (locErr) {
            console.warn(`    ⚠️  resource_locations batch error:`, locErr.message);
          }
        }
      }
    }
  }

  console.log("\n📊 Migration Summary:");
  console.log(`   Total:   ${catalog.length}`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Failed:  ${failCount}`);
  if (errors.length > 0) {
    console.log("\n❌ Errors:");
    for (const e of errors.slice(0, 10)) {
      console.log(`   ${e.id}: ${e.error}`);
    }
    if (errors.length > 10) console.log(`   ... and ${errors.length - 10} more`);
  }
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
