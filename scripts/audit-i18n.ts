#!/usr/bin/env tsx
/**
 * audit-i18n.ts — Check UI string coverage across all i18n language files.
 *
 * Uses en.ts as the source of truth and checks if fr.ts, es.ts, ru.ts, ka.ts
 * have every key defined with a non-empty value.
 *
 * Usage: pnpm tsx scripts/audit-i18n.ts
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const I18N_DIR = path.resolve(__dirname, "../client/src/i18n");
const LANGUAGES = ["fr", "es", "ru", "ka"] as const;

/**
 * Extract all nested keys from a TypeScript i18n file by evaluating its default export.
 * Returns a flat array of dot-separated key paths.
 */
function extractKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      keys.push(...extractKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

/**
 * Get nested value from object by dot path.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

async function main() {
  // Dynamically import each i18n file (named exports: en, fr, es, ru, ka)
  const enModule = await import(path.join(I18N_DIR, "en.ts"));
  const enData = enModule.en as Record<string, unknown>;
  const enKeys = extractKeys(enData);

  console.log(`=== i18n Audit ===\n`);
  console.log(`Source (en.ts): ${enKeys.length} keys\n`);

  const report: Record<string, { total: number; present: number; missing: string[]; extra: string[] }> = {};

  for (const lang of LANGUAGES) {
    const langModule = await import(path.join(I18N_DIR, `${lang}.ts`));
    const langData = langModule[lang] as Record<string, unknown>;
    const langKeys = extractKeys(langData);

    const missingKeys: string[] = [];
    const extraKeys: string[] = [];

    // Check for missing keys (in en but not in lang)
    for (const key of enKeys) {
      const value = getNestedValue(langData, key);
      if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
        missingKeys.push(key);
      }
    }

    // Check for extra keys (in lang but not in en)
    for (const key of langKeys) {
      const value = getNestedValue(enData, key);
      if (value === undefined) {
        extraKeys.push(key);
      }
    }

    const present = enKeys.length - missingKeys.length;
    const pct = ((present / enKeys.length) * 100).toFixed(1);

    report[lang] = { total: enKeys.length, present, missing: missingKeys, extra: extraKeys };
    console.log(`${lang.toUpperCase()}: ${present}/${enKeys.length} (${pct}%) — ${missingKeys.length} missing`);

    if (missingKeys.length > 0) {
      console.log(`  Missing keys:`);
      for (const key of missingKeys.slice(0, 20)) {
        console.log(`    - ${key}`);
      }
      if (missingKeys.length > 20) {
        console.log(`    ... and ${missingKeys.length - 20} more`);
      }
    }

    if (extraKeys.length > 0) {
      console.log(`  Extra keys (not in en.ts):`);
      for (const key of extraKeys) {
        console.log(`    - ${key}`);
      }
    }
    console.log();
  }

  // Save report
  const jsonReport = {
    sourceKeyCount: enKeys.length,
    byLanguage: report,
  };

  fs.writeFileSync("scripts/i18n-audit.json", JSON.stringify(jsonReport, null, 2));
  console.log("Report saved to scripts/i18n-audit.json");
}

main().catch((err) => {
  console.error("i18n audit failed:", err);
  process.exit(1);
});
