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
