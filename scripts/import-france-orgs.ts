/**
 * import-france-orgs.ts — bulk import 624 French organizations from
 * data/France_Emigration_Organizations_5_Languages.xlsx into the MySQL
 * `organizations` + `organization_housing` + `organization_branches` tables.
 *
 * The Excel file has 5 sheets, each row is the same logical organization:
 *   ქართული (30 cols, full data including housing-specific fields 22–30)
 *   English  / Español / Français / Русский (21 cols each, translations only)
 *
 * Translations are stored as JSON in `organizations.translations`:
 *   {
 *     en: { description, servicesOffered, targetAudience },
 *     fr: { ... }, es: { ... }, ru: { ... }, ka: { ... }
 *   }
 * — language keys are omitted entirely when all three fields are NULL.
 *
 * Five fixed decisions (see .grantkit-redesign/PLAN-france-orgs-import.md §8):
 *   1. NEW (Excel) overrides OLD on every non-NULL cell during UPSERT.
 *   2. Cost text → 6-enum via COST_MAPPING (free / paid / sliding_scale /
 *      insurance / mixed / unknown). Unknown is the fallback.
 *   3. Multi-city: rows listing ≥10 cities → isNational=true + serviceArea
 *      string + a single HQ branch (no per-city branch fan-out).
 *   4. Translation gaps: cells whose source value is Georgian on a non-KA
 *      sheet stay NULL (translate-pipeline fills them later).
 *   5. Housing relevanceNotes (col 30, ~72/102 housing orgs) preserved
 *      as-is for the UI yellow banner.
 *
 * Flags:
 *   --dry-run        Default. Parse + match against DB, no writes.
 *   --apply          Write to DB (mutually exclusive with --dry-run).
 *   --notify         If --apply succeeds, send Resend batch to subscribers.
 *   --limit=N        Process only the first N rows (for smoke tests).
 *   --batch-id=ID    Batch tag (default: france-YYYY-MM-DD).
 *   --file=PATH      Override Excel path (default:
 *                    data/France_Emigration_Organizations_5_Languages.xlsx).
 *   --verbose        Print headers + per-row debug.
 *
 * Requires DATABASE_URL. For local runs against Railway MySQL, export
 * MYSQL_PUBLIC_URL as DATABASE_URL — see .grantkit-redesign/OPS.md.
 */

import "dotenv/config";
import path from "path";
import ExcelJS from "exceljs";
import mysql from "mysql2/promise";

// ─── Types ────────────────────────────────────────────────────────────────

export interface Flags {
  dryRun: boolean;
  apply: boolean;
  notify: boolean;
  limit: number | null;
  batchId: string;
  file: string;
  verbose: boolean;
}

export type Lang = "en" | "fr" | "es" | "ru" | "ka";

/** One row read from a single sheet — positional, language-agnostic. */
export interface RawRow {
  rowIndex: number;            // 1-based row number in the sheet (excludes header)
  name: string | null;
  abbreviation: string | null;
  organizationType: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  servicesOffered: string | null;
  targetAudience: string | null;
  category: string | null;
  emigrationPurpose: string | null;
  serviceLanguages: string | null;
  cost: string | null;
  coverageArea: string | null;
  foundedYear: number | null;
  legalStatus: string | null;
  mainCategory: string | null;
  cities: string | null;
  isNational: boolean | null;
  // Housing — Georgian sheet only, cols 22–30
  housingType: string | null;
  housingDescription: string | null;
  registrationProcess: string | null;
  costDetails: string | null;
  maxStayDuration: string | null;
  capacity: string | null;
  childrenFriendly: string | null;
  disabledAccessible: string | null;
  relevanceNotes: string | null;
}

/** Per-language block stored in organizations.translations JSON. */
export interface TranslationBlock {
  description?: string;
  servicesOffered?: string;
  targetAudience?: string;
}

export type TranslationsJson = Partial<Record<Lang, TranslationBlock>>;

/** Cross-sheet unified row — Georgian as base + 4 translation sheets. */
export interface MergedRow {
  rowIndex: number;
  base: RawRow;                            // Georgian sheet
  translations: Record<Lang, RawRow>;      // all 5 sheets keyed by lang
}

export interface Stats {
  rowsProcessed: number;
  matchedExisting: number;
  createdNew: number;
  translationSkipped: number;              // count of cells dropped (KA on non-KA sheet)
  housingRecords: number;
  nationalOrgs: number;
  costMapped: number;                      // cells successfully mapped
  costUnknown: number;                     // cells that fell through to "unknown"
  errors: number;
}

// ─── CLI flag parser ──────────────────────────────────────────────────────

const DEFAULT_FILE = path.resolve(
  process.cwd(),
  "data/France_Emigration_Organizations_5_Languages.xlsx"
);

function todayBatchId(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `france-${yyyy}-${mm}-${dd}`;
}

export function parseFlags(argv: string[] = process.argv.slice(2)): Flags {
  const out: Flags = {
    dryRun: true,
    apply: false,
    notify: false,
    limit: null,
    batchId: todayBatchId(),
    file: DEFAULT_FILE,
    verbose: false,
  };

  for (const a of argv) {
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--apply") out.apply = true;
    else if (a === "--notify") out.notify = true;
    else if (a === "--verbose") out.verbose = true;
    else if (a.startsWith("--limit=")) {
      const n = Number(a.slice("--limit=".length));
      out.limit = Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
    } else if (a.startsWith("--batch-id=")) {
      out.batchId = a.slice("--batch-id=".length).trim() || out.batchId;
    } else if (a.startsWith("--file=")) {
      out.file = path.resolve(process.cwd(), a.slice("--file=".length));
    } else {
      console.warn(`[flags] ignoring unknown flag: ${a}`);
    }
  }

  if (out.apply) out.dryRun = false;
  if (out.dryRun && out.apply) {
    throw new Error("--dry-run and --apply are mutually exclusive");
  }
  if (out.notify && !out.apply) {
    console.warn("[flags] --notify requires --apply; ignoring --notify");
    out.notify = false;
  }

  return out;
}

// ─── Excel cell utilities ─────────────────────────────────────────────────

export function cellToString(v: ExcelJS.CellValue): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object" && v !== null) {
    const any = v as Record<string, unknown>;
    if (typeof any.text === "string") return (any.text as string).trim() || null;
    if (typeof any.hyperlink === "string") return String(any.hyperlink).trim() || null;
    if (Array.isArray(any.richText)) {
      return (any.richText as Array<{ text?: string }>)
        .map((p) => p.text ?? "")
        .join("")
        .trim() || null;
    }
    if (typeof any.result !== "undefined") return cellToString(any.result as ExcelJS.CellValue);
    if (typeof any.formula === "string") return null;
  }
  return null;
}

export function cellToNumber(v: ExcelJS.CellValue): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = cellToString(v);
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function cellToInt(v: ExcelJS.CellValue, fallback: number | null = null): number | null {
  const n = cellToNumber(v);
  if (n === null) return fallback;
  return Math.floor(n);
}

export function cellToBool(v: ExcelJS.CellValue): boolean | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const s = cellToString(v);
  if (!s) return null;
  const lower = s.toLowerCase();
  if (["yes", "true", "1", "y", "კი"].includes(lower)) return true;
  if (["no", "false", "0", "n", "არა"].includes(lower)) return false;
  return null;
}

// ─── Field parsers ────────────────────────────────────────────────────────

export type ServiceCost =
  | "free"
  | "sliding_scale"
  | "paid"
  | "insurance"
  | "mixed"
  | "unknown";

/**
 * COST_MAPPING — Georgian text → 6-enum value.
 *
 * Source: HANDOFF brief + PLAN doc §8 cost mapping table.
 * Match policy: exact-after-trim. Anything not in this map → "unknown".
 */
export const COST_MAPPING: Record<string, ServiceCost> = {
  // free (4)
  "უფასო": "free",
  "უფასო (მიგრანტებისთვის)": "free",
  "უფასო (სამონტაჟოებისთვის)": "free",
  "სერვისები უფასოა საჭიროების შემთხვევაში.": "free",

  // paid (5)
  "ფასიანი": "paid",
  "გადახდილი": "paid",
  "გადახდადი": "paid",
  "გადასახადი": "paid",
  "გადასახადიანი": "paid",

  // sliding_scale (10)
  "სუბსიდირებული": "sliding_scale",
  "უფასო / სუბსიდირებული": "sliding_scale",
  "უფასო/სუბსიდირებული": "sliding_scale",
  "უფასო ან სუბსიდირებული": "sliding_scale",
  "დაფინანსებული": "sliding_scale",
  "საბაზისო დაფინანსება": "sliding_scale",
  "საფინანსო მხარდაჭერით": "sliding_scale",
  "შემწეობილი": "sliding_scale",
  "წახალისებული": "sliding_scale",
  "შემცირებული": "sliding_scale",

  // insurance (3)
  "გადახდილი (ჩვეულებრივ ინსტიტუტების მიერ)": "insurance",
  "სუბსიდირებული / ინსტიტუტების მიერ გადახდილი": "insurance",
  "ფასიანი (კერძო პროფესიონალები)": "insurance",

  // mixed (10)
  "უფასო / ფასიანი": "mixed",
  "ფასიანი/სუბსიდირებული": "mixed",
  "ფასიანი / სუბსიდირებული": "mixed",
  "გადის / სუბსიდირებული": "mixed",
  "უფასო / წევრობის საფასური": "mixed",
  "უფასო / წევრობის გადასახადი": "mixed",
  "წევრობის საფასური": "mixed",
  "გაწევრიანების საკრედიტო გადასახადი": "mixed",
  "დაახლოებით 10 ევრო ღამეში.": "mixed",
  "უფასო კონსულტაცია": "mixed",
};

/** mapCost — null/empty → "unknown"; trimmed lookup; fallback "unknown". */
export function mapCost(raw: string | null): ServiceCost {
  if (!raw) return "unknown";
  const trimmed = raw.trim();
  if (!trimmed) return "unknown";
  return COST_MAPPING[trimmed] ?? "unknown";
}

/**
 * National-org threshold per PLAN §8 decision #3 — rows listing ≥10 cities
 * collapse to a single HQ branch + serviceArea string, isNational=true.
 */
export const NATIONAL_CITY_THRESHOLD = 10;

export interface CitiesParse {
  isNational: boolean;
  cityList: string[];
  primaryCity: string | null;
  serviceArea: string | null;
}

export function parseCities(citiesCell: string | null): CitiesParse {
  if (!citiesCell) {
    return { isNational: false, cityList: [], primaryCity: null, serviceArea: null };
  }
  const split = citiesCell
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const primaryCity = split[0] ?? null;
  if (split.length >= NATIONAL_CITY_THRESHOLD) {
    return {
      isNational: true,
      cityList: split,
      primaryCity,
      serviceArea: `Available in ${split.length} cities: ${split.join(", ")}`,
    };
  }
  return {
    isNational: false,
    cityList: split,
    primaryCity,
    serviceArea: split.length > 1 ? split.join(", ") : null,
  };
}

/**
 * Founded-year validation. Excel data covers 1229–2024 (PLAN §1).
 * Anything outside the range → null (treat as unknown).
 */
export const FOUNDED_YEAR_MIN = 1229;
export const FOUNDED_YEAR_MAX = 2024;

export function parseFoundedYear(v: ExcelJS.CellValue): number | null {
  const n = cellToInt(v);
  if (n === null) return null;
  if (n < FOUNDED_YEAR_MIN || n > FOUNDED_YEAR_MAX) return null;
  return n;
}

/** Yes/No/კი/არა/1/0/true/false → boolean | null (delegates to cellToBool). */
export function parseIsNational(v: ExcelJS.CellValue): boolean | null {
  return cellToBool(v);
}

/**
 * Detect Georgian script anywhere in the string. Used for translation-gap
 * detection: a non-KA sheet cell whose value is Georgian → drop, leave
 * NULL for translate-pipeline to fill in later.
 *
 * Asomtavruli: U+10A0–U+10CF; Mkhedruli: U+10D0–U+10FF.
 */
export function isGeorgianText(s: string | null): boolean {
  if (!s) return false;
  return /[Ⴀ-ჿ]/.test(s);
}

/**
 * Normalize a phone string for de-dup matching. Strips non-digits while
 * preserving a leading +. French local 0XXXXXXXXX → 33XXXXXXXXX. Returns
 * null on empty/digit-less input.
 */
export function normalizePhone(raw: string | null): string | null {
  if (!raw) return null;
  let s = raw.trim();
  if (!s) return null;
  const hasPlus = s.startsWith("+");
  s = s.replace(/[^\d]/g, "");
  if (!s) return null;
  if (!hasPlus && /^0\d{9}$/.test(s)) {
    // French national format → E.164 country code
    s = "33" + s.slice(1);
    return "+" + s;
  }
  return (hasPlus ? "+" : "") + s;
}

/**
 * Extract bare lowercased domain from a URL.
 *   "https://www.example.org/foo?x=1" → "example.org"
 * Returns null on input without a recognizable domain.
 */
export function extractDomain(url: string | null): string | null {
  if (!url) return null;
  let s = url.trim();
  if (!s) return null;
  s = s.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  const head = s.split("/")[0]?.split("?")[0]?.split("#")[0] ?? "";
  const cleaned = head.toLowerCase();
  if (!cleaned || !cleaned.includes(".")) return null;
  return cleaned;
}

// ─── Sheet name resolver ──────────────────────────────────────────────────

const SHEET_ALIASES: Record<Lang, string[]> = {
  ka: ["ქართული", "georgian", "ka", "kartuli"],
  en: ["english", "en", "ინგლისური"],
  es: ["español", "espanol", "spanish", "es", "ესპანური"],
  fr: ["français", "francais", "french", "fr", "ფრანგული"],
  ru: ["русский", "russian", "ru", "რუსული"],
};

export function findSheet(workbook: ExcelJS.Workbook, lang: Lang): ExcelJS.Worksheet {
  const aliases = SHEET_ALIASES[lang].map((a) => a.toLowerCase());
  for (const ws of workbook.worksheets) {
    if (aliases.includes(ws.name.trim().toLowerCase())) return ws;
  }
  const available = workbook.worksheets.map((w) => `"${w.name}"`).join(", ");
  throw new Error(
    `Sheet for lang="${lang}" not found. Tried [${SHEET_ALIASES[lang].join(", ")}]. Available: ${available}`
  );
}

// ─── Header diagnostic (verbose mode) ─────────────────────────────────────

export function dumpSheetHeaders(ws: ExcelJS.Worksheet): void {
  const headerRow = ws.getRow(1);
  const cells: string[] = [];
  // ExcelJS columns are 1-based; iterate up to the actual count.
  for (let c = 1; c <= ws.columnCount; c++) {
    const v = cellToString(headerRow.getCell(c).value);
    cells.push(`${c}=${v ?? "—"}`);
  }
  console.log(`[headers] ${ws.name} (${ws.rowCount - 1} rows): ${cells.join(" | ")}`);
}

// ─── Row reader + cross-sheet merger ─────────────────────────────────────

/**
 * Column positions (1-based, ExcelJS-style). Same across all 5 sheets for
 * cols 1–21; cols 22–30 are housing-specific and present only on the
 * Georgian sheet.
 *
 * If actual Excel positions differ, run with --verbose to dump the headers
 * row from every sheet and adjust this table.
 */
export const COL = {
  index: 1,
  name: 2,
  abbreviation: 3,
  organizationType: 4,
  address: 5,
  phone: 6,
  email: 7,
  website: 8,
  description: 9,
  servicesOffered: 10,
  targetAudience: 11,
  category: 12,
  emigrationPurpose: 13,
  serviceLanguages: 14,
  cost: 15,
  coverageArea: 16,
  foundedYear: 17,
  legalStatus: 18,
  mainCategory: 19,
  cities: 20,
  isNational: 21,
  // Georgian sheet only — cols 22–30
  housingType: 22,
  housingDescription: 23,
  registrationProcess: 24,
  costDetails: 25,
  maxStayDuration: 26,
  capacity: 27,
  childrenFriendly: 28,
  disabledAccessible: 29,
  relevanceNotes: 30,
} as const;

/**
 * Read all data rows from a single sheet. Skips rows whose `name` cell is
 * empty (treats them as trailing whitespace). The Georgian sheet supplies
 * the housing fields; non-KA sheets leave those nullable fields as null.
 *
 * @param ws       The worksheet
 * @param isGeorgian If true, also reads cols 22–30 (housing-specific)
 */
export function parseSheetRows(ws: ExcelJS.Worksheet, isGeorgian: boolean): RawRow[] {
  const rows: RawRow[] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const name = cellToString(row.getCell(COL.name).value);
    if (!name) continue;

    const raw: RawRow = {
      rowIndex: r,
      name,
      abbreviation: cellToString(row.getCell(COL.abbreviation).value),
      organizationType: cellToString(row.getCell(COL.organizationType).value),
      address: cellToString(row.getCell(COL.address).value),
      phone: cellToString(row.getCell(COL.phone).value),
      email: cellToString(row.getCell(COL.email).value),
      website: cellToString(row.getCell(COL.website).value),
      description: cellToString(row.getCell(COL.description).value),
      servicesOffered: cellToString(row.getCell(COL.servicesOffered).value),
      targetAudience: cellToString(row.getCell(COL.targetAudience).value),
      category: cellToString(row.getCell(COL.category).value),
      emigrationPurpose: cellToString(row.getCell(COL.emigrationPurpose).value),
      serviceLanguages: cellToString(row.getCell(COL.serviceLanguages).value),
      cost: cellToString(row.getCell(COL.cost).value),
      coverageArea: cellToString(row.getCell(COL.coverageArea).value),
      foundedYear: parseFoundedYear(row.getCell(COL.foundedYear).value),
      legalStatus: cellToString(row.getCell(COL.legalStatus).value),
      mainCategory: cellToString(row.getCell(COL.mainCategory).value),
      cities: cellToString(row.getCell(COL.cities).value),
      isNational: parseIsNational(row.getCell(COL.isNational).value),
      // Housing — Georgian only
      housingType: isGeorgian ? cellToString(row.getCell(COL.housingType).value) : null,
      housingDescription: isGeorgian
        ? cellToString(row.getCell(COL.housingDescription).value)
        : null,
      registrationProcess: isGeorgian
        ? cellToString(row.getCell(COL.registrationProcess).value)
        : null,
      costDetails: isGeorgian ? cellToString(row.getCell(COL.costDetails).value) : null,
      maxStayDuration: isGeorgian
        ? cellToString(row.getCell(COL.maxStayDuration).value)
        : null,
      capacity: isGeorgian ? cellToString(row.getCell(COL.capacity).value) : null,
      childrenFriendly: isGeorgian
        ? cellToString(row.getCell(COL.childrenFriendly).value)
        : null,
      disabledAccessible: isGeorgian
        ? cellToString(row.getCell(COL.disabledAccessible).value)
        : null,
      relevanceNotes: isGeorgian
        ? cellToString(row.getCell(COL.relevanceNotes).value)
        : null,
    };
    rows.push(raw);
  }
  return rows;
}

/**
 * Apply translation-gap policy: on non-KA sheets, drop description /
 * servicesOffered / targetAudience cells whose value is still in Georgian
 * (~20% of cells per PLAN §3). Returns a copy with those fields nulled.
 *
 * Mutates the returned RawRow's three translation fields, leaves the
 * original untouched. Increments `skipped` counter for stats.
 */
export function applyTranslationGap(
  raw: RawRow,
  lang: Lang,
  skipped: { count: number }
): RawRow {
  if (lang === "ka") return raw;
  const out: RawRow = { ...raw };
  if (isGeorgianText(out.description)) {
    if (out.description) skipped.count += 1;
    out.description = null;
  }
  if (isGeorgianText(out.servicesOffered)) {
    if (out.servicesOffered) skipped.count += 1;
    out.servicesOffered = null;
  }
  if (isGeorgianText(out.targetAudience)) {
    if (out.targetAudience) skipped.count += 1;
    out.targetAudience = null;
  }
  return out;
}

/**
 * Merge per-sheet row arrays into one array of MergedRow keyed by row index.
 * Georgian sheet is the base (must include every row). Translation sheets
 * may have fewer rows; missing rows degrade gracefully (lang block stays
 * empty during JSON build).
 */
export function mergeRowsAcrossSheets(
  rowsByLang: Record<Lang, RawRow[]>,
  skipped: { count: number }
): MergedRow[] {
  const baseRows = rowsByLang.ka;
  const merged: MergedRow[] = [];

  for (const base of baseRows) {
    const translations: Record<Lang, RawRow> = {
      ka: base,
      en: rowsByLang.en.find((r) => r.rowIndex === base.rowIndex) ?? base,
      fr: rowsByLang.fr.find((r) => r.rowIndex === base.rowIndex) ?? base,
      es: rowsByLang.es.find((r) => r.rowIndex === base.rowIndex) ?? base,
      ru: rowsByLang.ru.find((r) => r.rowIndex === base.rowIndex) ?? base,
    };

    // Apply gap policy to the four non-KA translations.
    const cleaned: Record<Lang, RawRow> = {
      ka: translations.ka,
      en: applyTranslationGap(translations.en, "en", skipped),
      fr: applyTranslationGap(translations.fr, "fr", skipped),
      es: applyTranslationGap(translations.es, "es", skipped),
      ru: applyTranslationGap(translations.ru, "ru", skipped),
    };

    merged.push({
      rowIndex: base.rowIndex,
      base,
      translations: cleaned,
    });
  }

  return merged;
}

/**
 * Build the JSON value for organizations.translations:
 *   {
 *     en: { description?, servicesOffered?, targetAudience? },
 *     fr: { ... }, es: { ... }, ru: { ... }, ka: { ... }
 *   }
 *
 * A language key is omitted entirely when all three sub-fields are null —
 * keeps the JSON compact and lets translate-pipeline detect missing
 * languages by key absence rather than by null-walking nested objects.
 */
export function buildTranslationsJson(merged: MergedRow): TranslationsJson {
  const out: TranslationsJson = {};
  const langs: Lang[] = ["en", "fr", "es", "ru", "ka"];
  for (const lang of langs) {
    const r = merged.translations[lang];
    const block: TranslationBlock = {};
    if (r.description) block.description = r.description;
    if (r.servicesOffered) block.servicesOffered = r.servicesOffered;
    if (r.targetAudience) block.targetAudience = r.targetAudience;
    if (Object.keys(block).length > 0) out[lang] = block;
  }
  return out;
}

/**
 * Map the merged row into the column-shape that `upsertOrganization`
 * writes (chunk 4). The Georgian sheet supplies the canonical top-level
 * value for `description` / `servicesOffered` / `targetAudience`; per-
 * language overrides live in `translations`.
 *
 * city + serviceArea + isNational follow PLAN §8 decision #3:
 *   ≥10 cities listed → isNational=true, city=primaryCity, serviceArea
 *   ="Available in N cities: ..."; otherwise per-row HQ city only.
 *
 * Excel-side `isNational` (col 21) ORs into the cities-derived flag — if
 * either signals national coverage, the row is marked national.
 */
export interface OrgPayload {
  name: string;
  abbreviation: string | null;
  organizationType: string | null;       // raw text; chunk 4 normalizes to enum
  description: string | null;
  country: "FR";
  city: string | null;
  hqAddress: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  servicesOffered: string | null;
  targetAudience: string | null;
  emigrationPurpose: string | null;
  foundedYear: number | null;
  legalStatus: string | null;
  mainCategory: string | null;
  serviceArea: string | null;
  serviceCost: ServiceCost;
  isNational: boolean;
  languages: string | null;
  categories: string | null;
  translations: TranslationsJson;
}

export function buildOrgPayload(merged: MergedRow): OrgPayload {
  const base = merged.base;
  const cities = parseCities(base.cities);
  const isNational = cities.isNational || base.isNational === true;

  return {
    name: base.name as string,             // parseSheetRows skips null-name rows
    abbreviation: base.abbreviation,
    organizationType: base.organizationType,
    description: base.description,
    country: "FR",
    city: cities.primaryCity,
    hqAddress: base.address,
    website: base.website,
    phone: base.phone,
    email: base.email,
    servicesOffered: base.servicesOffered,
    targetAudience: base.targetAudience,
    emigrationPurpose: base.emigrationPurpose,
    foundedYear: base.foundedYear,
    legalStatus: base.legalStatus,
    mainCategory: base.mainCategory,
    serviceArea: cities.serviceArea,
    serviceCost: mapCost(base.cost),
    isNational,
    languages: base.serviceLanguages,
    categories: base.category,
    translations: buildTranslationsJson(merged),
  };
}

// ─── DB enum normalizers ──────────────────────────────────────────────────

export type OrganizationType = "NGO" | "association" | "government" | "private";

/** Pass-through if the raw text matches the schema enum exactly (case-insensitive); else null. */
export function normalizeOrganizationType(raw: string | null): OrganizationType | null {
  if (!raw) return null;
  const lower = raw.trim().toLowerCase();
  if (lower === "ngo") return "NGO";
  if (lower === "association") return "association";
  if (lower === "government") return "government";
  if (lower === "private") return "private";
  return null;
}

export type HousingType =
  | "parents_house"
  | "shelter"
  | "social"
  | "temporary"
  | "hotel"
  | "apartment"
  | "other";

const HOUSING_TYPE_VALUES: readonly HousingType[] = [
  "parents_house",
  "shelter",
  "social",
  "temporary",
  "hotel",
  "apartment",
  "other",
];

export function normalizeHousingType(raw: string | null): HousingType | null {
  if (!raw) return null;
  const lower = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return (HOUSING_TYPE_VALUES as readonly string[]).includes(lower)
    ? (lower as HousingType)
    : null;
}

export type YesNoUnknown = "yes" | "no" | "unknown";

/** Map free-form yes/no text (incl. Georgian and French variants) → enum. */
export function parseYesNoUnknown(raw: string | null): YesNoUnknown {
  if (!raw) return "unknown";
  const lower = raw.trim().toLowerCase();
  if (["yes", "true", "1", "y", "კი", "oui"].includes(lower)) return "yes";
  if (["no", "false", "0", "n", "არა", "non"].includes(lower)) return "no";
  return "unknown";
}

// ─── Org ID generator (loaded once, increment in-memory) ──────────────────

export class OrgIdGenerator {
  private next: number;
  constructor(start: number) {
    this.next = start;
  }
  nextId(): string {
    const id = `ORG-${String(this.next).padStart(4, "0")}`;
    this.next += 1;
    return id;
  }
  peek(): number {
    return this.next;
  }
}

export async function loadOrgIdGenerator(
  conn: mysql.Connection
): Promise<OrgIdGenerator> {
  const [rows] = (await conn.query(
    `SELECT MAX(CAST(SUBSTRING(orgId, 5) AS UNSIGNED)) AS maxN
       FROM organizations
      WHERE orgId REGEXP '^ORG-[0-9]+$'`
  )) as [Array<{ maxN: number | null }>, unknown];
  const maxN = rows[0]?.maxN ?? 0;
  return new OrgIdGenerator(Number(maxN) + 1);
}

// ─── 3-phase de-dup matcher (PLAN §4) ─────────────────────────────────────

export interface MatchResult {
  orgId: string;
  phase: "name" | "domain" | "phone";
}

/**
 * Find an existing organization that the Excel row should UPDATE rather than
 * INSERT. Three phases tried in order; first hit wins.
 *
 *   Phase 1: LOWER(TRIM(name)) = ?  AND country = 'FR'
 *   Phase 2: extractDomain(website) appears in any organization's website
 *   Phase 3: normalizePhone(phone) = normalizePhone(organizations.phone)
 *
 * Returns null if none of the three matches.
 */
export async function findExistingOrg(
  conn: mysql.Connection,
  payload: OrgPayload
): Promise<MatchResult | null> {
  // Phase 1 — name + country
  const nameKey = payload.name.toLowerCase().trim();
  if (nameKey) {
    const [rows] = (await conn.query(
      `SELECT orgId FROM organizations
        WHERE LOWER(TRIM(name)) = ? AND country = 'FR'
        LIMIT 1`,
      [nameKey]
    )) as [Array<{ orgId: string }>, unknown];
    if (rows[0]) return { orgId: rows[0].orgId, phase: "name" };
  }

  // Phase 2 — website domain (substring match)
  const domain = extractDomain(payload.website);
  if (domain) {
    const [rows] = (await conn.query(
      `SELECT orgId FROM organizations
        WHERE LOWER(website) LIKE CONCAT('%', ?, '%')
        LIMIT 1`,
      [domain]
    )) as [Array<{ orgId: string }>, unknown];
    if (rows[0]) return { orgId: rows[0].orgId, phase: "domain" };
  }

  // Phase 3 — phone (normalize both sides for the comparison)
  const phone = normalizePhone(payload.phone);
  if (phone) {
    // Pull candidates by country=FR to keep the table scan bounded, then
    // compare normalized values in JS — phone column has unpredictable
    // formatting so we can't safely do a SQL-side normalize.
    const [rows] = (await conn.query(
      `SELECT orgId, phone FROM organizations
        WHERE country = 'FR' AND phone IS NOT NULL`
    )) as [Array<{ orgId: string; phone: string | null }>, unknown];
    for (const row of rows) {
      if (normalizePhone(row.phone) === phone) {
        return { orgId: row.orgId, phase: "phone" };
      }
    }
  }

  return null;
}

// ─── UPSERT operations ────────────────────────────────────────────────────

/**
 * INSERT a new organization row. Caller guarantees orgId is unique (came
 * from OrgIdGenerator). Sets contactEnrichmentStatus='pending' so the
 * existing Phase B scraper picks the row up later.
 */
export async function insertOrganization(
  conn: mysql.Connection,
  orgId: string,
  payload: OrgPayload
): Promise<void> {
  const orgType = normalizeOrganizationType(payload.organizationType);
  const translationsJson =
    Object.keys(payload.translations).length > 0
      ? JSON.stringify(payload.translations)
      : null;

  await conn.query(
    `INSERT INTO organizations (
       orgId, name, abbreviation, organizationType, description, country,
       city, hqAddress, website, phone, email, servicesOffered, targetAudience,
       emigrationPurpose, foundedYear, legalStatus, mainCategory, serviceArea,
       serviceCost, isNational, orgLanguages, categories, translations,
       branchesCount, programsCount, isActive
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 1)`,
    [
      orgId,
      payload.name,
      payload.abbreviation,
      orgType,
      payload.description,
      payload.country,
      payload.city,
      payload.hqAddress,
      payload.website,
      payload.phone,
      payload.email,
      payload.servicesOffered,
      payload.targetAudience,
      payload.emigrationPurpose,
      payload.foundedYear,
      payload.legalStatus,
      payload.mainCategory,
      payload.serviceArea,
      payload.serviceCost,
      payload.isNational ? 1 : 0,
      payload.languages,
      payload.categories,
      translationsJson,
    ]
  );
}

/**
 * UPDATE an existing organization with NEW-overrides-OLD policy: COALESCE
 * keeps the existing DB value when the Excel cell is null, overwrites
 * otherwise. Enums (serviceCost, isNational) always overwrite — they're
 * never null in the payload.
 *
 * `name` always overwrites — duplicate-name rows by definition have the
 * same name, so this is a no-op rather than a destructive change.
 */
export async function updateOrganization(
  conn: mysql.Connection,
  orgId: string,
  payload: OrgPayload
): Promise<void> {
  const orgType = normalizeOrganizationType(payload.organizationType);
  const translationsJson =
    Object.keys(payload.translations).length > 0
      ? JSON.stringify(payload.translations)
      : null;

  await conn.query(
    `UPDATE organizations
        SET name              = ?,
            abbreviation      = COALESCE(?, abbreviation),
            organizationType  = COALESCE(?, organizationType),
            description       = COALESCE(?, description),
            city              = COALESCE(?, city),
            hqAddress         = COALESCE(?, hqAddress),
            website           = COALESCE(?, website),
            phone             = COALESCE(?, phone),
            email             = COALESCE(?, email),
            servicesOffered   = COALESCE(?, servicesOffered),
            targetAudience    = COALESCE(?, targetAudience),
            emigrationPurpose = COALESCE(?, emigrationPurpose),
            foundedYear       = COALESCE(?, foundedYear),
            legalStatus       = COALESCE(?, legalStatus),
            mainCategory      = COALESCE(?, mainCategory),
            serviceArea       = COALESCE(?, serviceArea),
            serviceCost       = ?,
            isNational        = ?,
            orgLanguages      = COALESCE(?, orgLanguages),
            categories        = COALESCE(?, categories),
            translations      = COALESCE(?, translations)
      WHERE orgId = ?`,
    [
      payload.name,
      payload.abbreviation,
      orgType,
      payload.description,
      payload.city,
      payload.hqAddress,
      payload.website,
      payload.phone,
      payload.email,
      payload.servicesOffered,
      payload.targetAudience,
      payload.emigrationPurpose,
      payload.foundedYear,
      payload.legalStatus,
      payload.mainCategory,
      payload.serviceArea,
      payload.serviceCost,
      payload.isNational ? 1 : 0,
      payload.languages,
      payload.categories,
      translationsJson,
      orgId,
    ]
  );
}

/**
 * UPSERT housing record for the org. Skips when housingType is missing or
 * not in the schema enum (raw text outside the 7 values → null → skip).
 *
 * UNIQUE(orgId) on the table means a re-run updates the same row.
 */
export async function upsertHousing(
  conn: mysql.Connection,
  orgId: string,
  base: RawRow
): Promise<boolean> {
  const housingType = normalizeHousingType(base.housingType);
  if (!housingType) return false;

  const childrenFriendly = parseYesNoUnknown(base.childrenFriendly);
  const disabledAccessible = parseYesNoUnknown(base.disabledAccessible);

  await conn.query(
    `INSERT INTO organization_housing (
       orgId, housingType, description, registrationProcess, costDetails,
       maxStayDuration, capacity, childrenFriendly, disabledAccessible,
       relevanceNotes
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       housingType         = VALUES(housingType),
       description         = COALESCE(VALUES(description), description),
       registrationProcess = COALESCE(VALUES(registrationProcess), registrationProcess),
       costDetails         = COALESCE(VALUES(costDetails), costDetails),
       maxStayDuration     = COALESCE(VALUES(maxStayDuration), maxStayDuration),
       capacity            = COALESCE(VALUES(capacity), capacity),
       childrenFriendly    = VALUES(childrenFriendly),
       disabledAccessible  = VALUES(disabledAccessible),
       relevanceNotes      = COALESCE(VALUES(relevanceNotes), relevanceNotes)`,
    [
      orgId,
      housingType,
      base.housingDescription,
      base.registrationProcess,
      base.costDetails,
      base.maxStayDuration,
      base.capacity,
      childrenFriendly,
      disabledAccessible,
      base.relevanceNotes,
    ]
  );
  return true;
}

/**
 * UPSERT a single HQ branch per org. branchId follows the existing
 * convention `<orgId>-B01`. `notes` stores the import batch tag for
 * traceability since organizations table has no batch column yet.
 */
export async function upsertHqBranch(
  conn: mysql.Connection,
  orgId: string,
  payload: OrgPayload,
  batchId: string
): Promise<void> {
  const branchId = `${orgId}-B01`;
  const notes = `France import ${batchId}`;

  await conn.query(
    `INSERT INTO organization_branches (
       branchId, orgId, branchType, country, city, address,
       phone, email, source, notes
     ) VALUES (?, ?, 'HQ', 'FR', ?, ?, ?, ?, 'France Excel import', ?)
     ON DUPLICATE KEY UPDATE
       city     = COALESCE(VALUES(city), city),
       address  = COALESCE(VALUES(address), address),
       phone    = COALESCE(VALUES(phone), phone),
       email    = COALESCE(VALUES(email), email),
       notes    = VALUES(notes)`,
    [
      branchId,
      orgId,
      payload.city,
      payload.hqAddress,
      payload.phone,
      payload.email,
      notes,
    ]
  );
}

// ─── Main (placeholder for Chunk 1) ───────────────────────────────────────
// The full pipeline (parse → merge → de-dup → upsert/report) is implemented
// in Chunks 2–5. This entry point currently validates flags and confirms the
// Excel file is reachable + all 5 sheets are present.

async function main(): Promise<void> {
  const flags = parseFlags();
  console.log(
    `[france-import] mode=${flags.apply ? "APPLY" : "DRY-RUN"}  batch=${flags.batchId}  ` +
      `limit=${flags.limit ?? "all"}  file=${flags.file}`
  );

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(flags.file);

  const sheets: Record<Lang, ExcelJS.Worksheet> = {
    ka: findSheet(wb, "ka"),
    en: findSheet(wb, "en"),
    es: findSheet(wb, "es"),
    fr: findSheet(wb, "fr"),
    ru: findSheet(wb, "ru"),
  };
  console.log(
    `[france-import] sheets resolved: ` +
      (Object.entries(sheets) as Array<[Lang, ExcelJS.Worksheet]>)
        .map(([l, w]) => `${l}="${w.name}" (${w.rowCount - 1} rows)`)
        .join(", ")
  );

  if (flags.verbose) {
    for (const ws of Object.values(sheets)) dumpSheetHeaders(ws);
  }

  // TODO(chunk-2..5): field parsers, row reader, merger, de-dup, upsert,
  // report, --notify. The skeleton above is intentionally minimal to keep
  // chunk 1 reviewable on its own.
  console.log(
    `\n[france-import] chunk 1 (foundation) ready. Pipeline pending in chunks 2–5.`
  );

  // DB connection sanity-check (only if URL is present; pipeline will use it).
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn(
      `[france-import] DATABASE_URL not set — full pipeline cannot run yet.`
    );
    return;
  }
  const conn = await mysql.createConnection(url);
  try {
    const [[row]] = (await conn.query(
      `SELECT COUNT(*) AS total FROM organizations WHERE country = 'FR'`
    )) as [Array<{ total: number }>, unknown];
    console.log(`[france-import] FR orgs already in DB: ${row.total}`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(`[france-import] FAILED: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
