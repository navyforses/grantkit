/**
 * Migrate catalog.json → Supabase resources table
 *
 * Modes:
 *   npx tsx scripts/migrate-catalog.ts                  # full migrate (upsert resources + junctions)
 *   npx tsx scripts/migrate-catalog.ts --dry-run        # no DB writes
 *   npx tsx scripts/migrate-catalog.ts --populate-junctions   # second pass: fill junctions for
 *                                                               # already-inserted resources
 *
 * Requires VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY) in .env
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
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "";
const DRY_RUN = process.argv.includes("--dry-run");
const POPULATE_JUNCTIONS_ONLY = process.argv.includes("--populate-junctions");

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_ANON_KEY in .env"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parse amount string: "$5,000" → { min: 5000, max: 5000 } */
function parseAmount(amount: string): { min?: number; max?: number } {
  if (!amount || amount === "Varies" || amount === "") return {};
  const cleaned = amount.replace(/[$,€£]/g, "").trim();
  const rangeMatch = cleaned.match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)$/);
  if (rangeMatch) return { min: Number(rangeMatch[1]), max: Number(rangeMatch[2]) };
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

/**
 * Build a CATEGORY_MAP at runtime based on what actually exists in Supabase.
 *
 * Strategy (in order of preference for each catalog category string):
 *  1. Look for a category whose id contains a keyword from the catalog value
 *  2. Fall back to any GRANT.* category that exists
 *  3. Return null → skip resource_categories for this row
 */
async function buildCategoryMap(
  catalogCategories: string[]
): Promise<{ map: Record<string, string>; fallback: string | null }> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, resource_type")
    .eq("resource_type", "GRANT");

  if (error || !data || data.length === 0) {
    console.warn("  ⚠️  Could not load categories from Supabase:", error?.message ?? "empty result");
    return { map: {}, fallback: null };
  }

  console.log(`  📋 Found ${data.length} GRANT categories in Supabase:`);
  for (const c of data) {
    console.log(`     ${c.id}  →  ${c.name}`);
  }

  // Build keyword → category ID lookup from the actual Supabase category IDs/names
  const grantCategoryIds = (data as { id: string; name: string }[]).map((c) => c.id);

  // Keyword buckets: map catalog category string fragments to Supabase ID fragments
  const KEYWORD_BUCKETS: Record<string, string[]> = {
    medical_treatment:    ["medical", "health", "treatment", "disease", "clinical"],
    financial_assistance: ["financial", "finance", "assistance", "emergency", "aid"],
    assistive_technology: ["assistive", "technology", "tech", "device", "equipment"],
    social_services:      ["social", "community", "welfare", "support"],
    scholarships:         ["education", "scholarship", "academic", "student", "training"],
    housing:              ["housing", "home", "shelter", "accommodation"],
    travel_transport:     ["travel", "transport", "mobility"],
    international:        ["international", "global", "world"],
    other:                ["other", "general", "misc"],
  };

  function findBestMatch(catalogCat: string): string | null {
    const keywords = KEYWORD_BUCKETS[catalogCat] ?? [catalogCat];
    for (const kw of keywords) {
      const match = grantCategoryIds.find(
        (id) => id.toLowerCase().includes(kw) || id.toLowerCase().replace(/[._]/g, " ").includes(kw)
      );
      if (match) return match;
    }
    return null;
  }

  // Find a generic fallback — prefer any "OTHER" or just the first available
  const fallback =
    grantCategoryIds.find((id) => id.toLowerCase().includes("other")) ??
    grantCategoryIds[0] ??
    null;

  const map: Record<string, string> = {};
  for (const cat of catalogCategories) {
    map[cat] = findBestMatch(cat) ?? fallback ?? "";
  }

  console.log("  📦 Category mapping resolved:");
  for (const [k, v] of Object.entries(map)) {
    console.log(`     ${k.padEnd(25)} → ${v || "(skipped)"}`);
  }

  return { map, fallback };
}

/**
 * Build resource_locations rows.
 * Valid columns: resource_id, country_code, region_id, is_nationwide.
 * No 'city', no 'region_name' at the DB level.
 */
function buildLocationRow(item: CatalogItem): {
  country_code: string;
  region_id: string | null;
  is_nationwide: boolean;
} {
  // Normalize country code
  let countryCode = (item.country ?? "US").trim();
  if (countryCode === "International" || countryCode === "") countryCode = "US";
  // Keep at most 2 chars for ISO codes; if it's a full name, map common ones
  const COUNTRY_NAME_MAP: Record<string, string> = {
    "United States":   "US",
    "United Kingdom":  "GB",
    "Canada":          "CA",
    "Australia":       "AU",
    "Germany":         "DE",
    "France":          "FR",
    "Netherlands":     "NL",
    "Sweden":          "SE",
    "Switzerland":     "CH",
    "Italy":           "IT",
    "Spain":           "ES",
    "Belgium":         "BE",
    "Denmark":         "DK",
    "Norway":          "NO",
    "Austria":         "AT",
    "Israel":          "IL",
    "Japan":           "JP",
    "South Korea":     "KR",
    "Brazil":          "BR",
    "India":           "IN",
    "Mexico":          "MX",
    "Poland":          "PL",
    "Portugal":        "PT",
    "Georgia":         "GE",
    "EU":              "EU",
  };
  const mapped = COUNTRY_NAME_MAP[countryCode];
  if (mapped) countryCode = mapped;
  // Truncate to 5 chars max (some codes might be EU etc.)
  countryCode = countryCode.slice(0, 5);

  const isNationwide =
    !item.state ||
    item.state.trim() === "" ||
    item.state === "Nationwide" ||
    item.state === "International" ||
    item.state === "All States" ||
    item.state === "N/A";

  return {
    country_code: countryCode,
    // region_id is a foreign key to regions.id — we don't have those IDs from catalog.json,
    // so leave null. Only set it if you can look up the actual region row.
    region_id: null,
    is_nationwide: isNationwide,
  };
}

// ── Junction insert helpers ───────────────────────────────────────────────────

async function insertJunctions(
  resourceId: string,
  item: CatalogItem,
  categoryMap: Record<string, string>,
  fallbackCategoryId: string | null,
  isDry: boolean
): Promise<{ catOk: boolean; locOk: boolean }> {
  let catOk = true;
  let locOk = true;

  // --- resource_categories ---
  const categoryId = categoryMap[item.category] ?? fallbackCategoryId;
  if (categoryId) {
    if (!isDry) {
      const { error } = await supabase
        .from("resource_categories")
        .upsert(
          { resource_id: resourceId, category_id: categoryId, is_primary: true },
          { onConflict: "resource_id,category_id" }
        );
      if (error) {
        console.warn(`    ⚠️  resource_categories error (${resourceId}):`, error.message);
        catOk = false;
      }
    }
  } else {
    console.warn(`    ⚠️  No category found for catalog category "${item.category}" — skipping`);
    catOk = false;
  }

  // --- resource_locations ---
  const loc = buildLocationRow(item);
  if (!isDry) {
    const { error } = await supabase
      .from("resource_locations")
      .upsert(
        { resource_id: resourceId, ...loc },
        { onConflict: "resource_id,country_code" }
      );
    if (error) {
      console.warn(`    ⚠️  resource_locations error (${resourceId}):`, error.message);
      locOk = false;
    }
  }

  return { catOk, locOk };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  const catalogPath = join(__dirname, "..", "client", "src", "data", "catalog.json");
  const catalog: CatalogItem[] = JSON.parse(readFileSync(catalogPath, "utf-8"));

  console.log(`\n📦 GrantKit Catalog Migration`);
  console.log(`   Items: ${catalog.length}`);
  console.log(`   Supabase URL: ${SUPABASE_URL}`);
  if (DRY_RUN) console.log(`   ⚠️  DRY RUN — no DB writes`);
  if (POPULATE_JUNCTIONS_ONLY) console.log(`   🔄 MODE: populate junctions only (resources already inserted)`);
  console.log();

  // Build category map from actual Supabase data
  const uniqueCatalogCategories = [...new Set(catalog.map((i) => i.category))];
  const { map: categoryMap, fallback: fallbackCategoryId } = await buildCategoryMap(
    uniqueCatalogCategories
  );
  console.log();

  // ── MODE: populate-junctions only ────────────────────────────────────────────
  if (POPULATE_JUNCTIONS_ONLY) {
    await populateJunctionsPass(catalog, categoryMap, fallbackCategoryId);
    return;
  }

  // ── MODE: full migrate (upsert resources + junctions) ────────────────────────
  let successCount = 0;
  let failCount = 0;
  let catFail = 0;
  let locFail = 0;
  const errors: { id: string; error: string }[] = [];

  const BATCH = 50;
  for (let i = 0; i < catalog.length; i += BATCH) {
    const batch = catalog.slice(i, i + BATCH);
    const batchNum = Math.floor(i / BATCH) + 1;

    const rows = batch.map((item) => {
      const { min: amount_min, max: amount_max } = parseAmount(item.amount);
      return {
        slug: slugify(item.name, item.id),
        resource_type: "GRANT" as const,
        title: item.name,
        description: item.description,
        amount_min,
        amount_max,
        currency: "USD",
        deadline: item.deadline && item.deadline.trim() ? item.deadline : null,
        is_rolling: false,
        status: item.status === "Active" || item.status === "Open" ? "OPEN" : "ONGOING",
        eligibility: "BOTH" as const,
        eligibility_details: item.eligibility || null,
        target_groups: [] as string[],
        disease_areas:
          item.targetDiagnosis && item.targetDiagnosis !== "General"
            ? [item.targetDiagnosis]
            : [],
        source_url: item.website || null,
        source_name: item.organization || null,
        application_url: item.website || null,
        is_verified: false,
        is_featured: false,
        view_count: 0,
      };
    });

    if (DRY_RUN) {
      console.log(`  [DRY] Batch ${batchNum}: would upsert ${rows.length} rows`);
      successCount += rows.length;
      continue;
    }

    const { data, error } = await supabase
      .from("resources")
      .upsert(rows, { onConflict: "slug" })
      .select("id, slug");

    if (error) {
      console.error(`  ❌ Batch ${batchNum} resource upsert error:`, error.message);
      for (const item of batch) {
        failCount++;
        errors.push({ id: item.id, error: error.message });
      }
      continue;
    }

    console.log(`  ✅ Batch ${batchNum}: ${data?.length ?? rows.length} resources upserted`);
    successCount += data?.length ?? rows.length;

    // Insert junctions for this batch
    if (data) {
      let batchCatFail = 0;
      let batchLocFail = 0;
      for (let j = 0; j < data.length; j++) {
        const resource = data[j];
        const item = batch[j];
        const { catOk, locOk } = await insertJunctions(
          resource.id,
          item,
          categoryMap,
          fallbackCategoryId,
          false
        );
        if (!catOk) batchCatFail++;
        if (!locOk) batchLocFail++;
      }
      catFail += batchCatFail;
      locFail += batchLocFail;
      if (batchCatFail === 0 && batchLocFail === 0) {
        console.log(`     ↳ Junctions OK`);
      } else {
        console.log(`     ↳ Junctions: ${batchCatFail} cat failures, ${batchLocFail} loc failures`);
      }
    }
  }

  console.log("\n📊 Migration Summary:");
  console.log(`   Resources upserted: ${successCount}`);
  console.log(`   Resources failed:   ${failCount}`);
  console.log(`   Category junctions missed: ${catFail}`);
  console.log(`   Location junctions missed: ${locFail}`);
  if (errors.length > 0) {
    console.log("\n❌ Errors:");
    for (const e of errors.slice(0, 10)) {
      console.log(`   ${e.id}: ${e.error}`);
    }
    if (errors.length > 10) console.log(`   ... and ${errors.length - 10} more`);
  }
}

// ── Second pass: populate junction tables for already-inserted resources ───────

async function populateJunctionsPass(
  catalog: CatalogItem[],
  categoryMap: Record<string, string>,
  fallbackCategoryId: string | null
) {
  console.log("🔄 Second pass: fetching all existing resources from Supabase...\n");

  // Fetch all resources (id + slug) — paginate if needed
  const PAGE = 1000;
  let allResources: { id: string; slug: string }[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("resources")
      .select("id, slug")
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("❌ Failed to fetch resources:", error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    allResources = allResources.concat(data as { id: string; slug: string }[]);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  console.log(`   Found ${allResources.length} resources in Supabase\n`);

  // Build slug → catalog item map
  const slugToCatalogItem = new Map<string, CatalogItem>();
  for (const item of catalog) {
    const slug = slugify(item.name, item.id);
    slugToCatalogItem.set(slug, item);
  }

  let catOkCount = 0;
  let catFailCount = 0;
  let locOkCount = 0;
  let locFailCount = 0;
  let unmatchedCount = 0;

  // Process in chunks to avoid hammering the API
  const CHUNK = 100;
  for (let i = 0; i < allResources.length; i += CHUNK) {
    const chunk = allResources.slice(i, i + CHUNK);
    const chunkNum = Math.floor(i / CHUNK) + 1;

    const catRows: { resource_id: string; category_id: string; is_primary: boolean }[] = [];
    const locRows: { resource_id: string; country_code: string; region_id: string | null; is_nationwide: boolean }[] = [];
    let chunkUnmatched = 0;

    for (const resource of chunk) {
      const item = slugToCatalogItem.get(resource.slug);
      if (!item) {
        chunkUnmatched++;
        unmatchedCount++;
        continue;
      }

      // Category row
      const categoryId = categoryMap[item.category] ?? fallbackCategoryId;
      if (categoryId) {
        catRows.push({ resource_id: resource.id, category_id: categoryId, is_primary: true });
      } else {
        catFailCount++;
      }

      // Location row
      const loc = buildLocationRow(item);
      locRows.push({ resource_id: resource.id, ...loc });
    }

    // Batch upsert categories
    if (catRows.length > 0) {
      const { error } = await supabase
        .from("resource_categories")
        .upsert(catRows, { onConflict: "resource_id,category_id" });
      if (error) {
        console.warn(`  ⚠️  chunk ${chunkNum} resource_categories error:`, error.message);
        catFailCount += catRows.length;
      } else {
        catOkCount += catRows.length;
      }
    }

    // Batch upsert locations
    if (locRows.length > 0) {
      const { error } = await supabase
        .from("resource_locations")
        .upsert(locRows, { onConflict: "resource_id,country_code" });
      if (error) {
        console.warn(`  ⚠️  chunk ${chunkNum} resource_locations error:`, error.message);
        locFailCount += locRows.length;
      } else {
        locOkCount += locRows.length;
      }
    }

    const matched = chunk.length - chunkUnmatched;
    console.log(
      `  Chunk ${String(chunkNum).padStart(2)}: ${matched} matched, ${chunkUnmatched} unmatched — ` +
        `cats ${catRows.length} OK, locs ${locRows.length} OK`
    );
  }

  console.log("\n📊 Second Pass Summary:");
  console.log(`   Total resources processed: ${allResources.length}`);
  console.log(`   Unmatched (no catalog entry): ${unmatchedCount}`);
  console.log(`   resource_categories inserted: ${catOkCount}  failed: ${catFailCount}`);
  console.log(`   resource_locations  inserted: ${locOkCount}  failed: ${locFailCount}`);
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
