/**
 * Grant Import Parser & Validator
 * Parses CSV/Excel data and validates it for bulk grant import.
 */

import Papa from "papaparse";
import * as XLSX from "xlsx";

// Valid categories and countries for validation
const VALID_CATEGORIES = [
  "medical_treatment", "financial_assistance", "assistive_technology",
  "social_services", "scholarships", "housing", "travel_transport",
  "international", "food_basic_needs", "other",
];

const VALID_COUNTRIES = ["US", "International"];
const VALID_TYPES = ["grant", "resource"];
const SUPPORTED_LANGUAGES = ["en", "ka", "fr", "es", "ru"];

export interface ImportedGrant {
  itemId?: string; // If provided, will update existing grant
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
  translations: Record<string, { name: string; description: string; eligibility: string }>;
}

export interface ImportValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ImportParseResult {
  grants: ImportedGrant[];
  errors: ImportValidationError[];
  totalRows: number;
  validRows: number;
  skippedRows: number;
}

/**
 * Normalize a header string to a standard key.
 * Handles variations like "Item ID", "item_id", "ITEM ID", "ItemId", etc.
 */
function normalizeHeader(header: string): string {
  const h = header.trim().toLowerCase().replace(/[\s_-]+/g, "_");

  // Map common variations to standard keys
  const headerMap: Record<string, string> = {
    item_id: "itemId",
    itemid: "itemId",
    name: "name",
    organization: "organization",
    org: "organization",
    description: "description",
    desc: "description",
    category: "category",
    type: "type",
    grant_type: "type",
    granttype: "type",
    country: "country",
    eligibility: "eligibility",
    website: "website",
    url: "website",
    phone: "phone",
    telephone: "phone",
    email: "email",
    grant_email: "email",
    grantemail: "email",
    amount: "amount",
    funding_amount: "amount",
    status: "status",
    active: "active",
    is_active: "active",
    isactive: "active",
  };

  // Check for translation headers like "EN Name", "KA Description", etc.
  for (const lang of SUPPORTED_LANGUAGES) {
    const langUpper = lang.toUpperCase();
    if (h.startsWith(`${lang}_`) || h.startsWith(`${langUpper.toLowerCase()}_`)) {
      const field = h.replace(new RegExp(`^${lang}_`, "i"), "");
      if (field === "name") return `trans_${lang}_name`;
      if (field === "description" || field === "desc") return `trans_${lang}_description`;
      if (field === "eligibility") return `trans_${lang}_eligibility`;
    }
    // Also handle "EN Name" format (with space)
    const spacePattern = new RegExp(`^${lang}\\s+`, "i");
    if (spacePattern.test(h)) {
      const field = h.replace(spacePattern, "").replace(/[\s_-]+/g, "_");
      if (field === "name") return `trans_${lang}_name`;
      if (field === "description" || field === "desc") return `trans_${lang}_description`;
      if (field === "eligibility") return `trans_${lang}_eligibility`;
    }
  }

  return headerMap[h] || h;
}

/**
 * Parse a raw row (key-value object with normalized headers) into an ImportedGrant.
 */
function parseRow(
  row: Record<string, string>,
  rowIndex: number,
  errors: ImportValidationError[]
): ImportedGrant | null {
  const name = (row.name || "").trim();
  const category = (row.category || "").trim().toLowerCase();
  const type = (row.type || "grant").trim().toLowerCase();
  const country = (row.country || "").trim();

  // Validate required fields
  if (!name) {
    errors.push({ row: rowIndex, field: "name", message: "Name is required" });
    return null;
  }

  if (!category) {
    errors.push({ row: rowIndex, field: "category", message: "Category is required" });
    return null;
  }

  if (!VALID_CATEGORIES.includes(category)) {
    errors.push({
      row: rowIndex,
      field: "category",
      message: `Invalid category "${category}". Valid: ${VALID_CATEGORIES.join(", ")}`,
    });
    return null;
  }

  if (type && !VALID_TYPES.includes(type)) {
    errors.push({
      row: rowIndex,
      field: "type",
      message: `Invalid type "${type}". Valid: grant, resource`,
    });
    return null;
  }

  if (!country) {
    errors.push({ row: rowIndex, field: "country", message: "Country is required" });
    return null;
  }

  if (!VALID_COUNTRIES.includes(country)) {
    errors.push({
      row: rowIndex,
      field: "country",
      message: `Invalid country "${country}". Valid: ${VALID_COUNTRIES.join(", ")}`,
    });
    return null;
  }

  // Build translations from trans_* fields
  const translations: Record<string, { name: string; description: string; eligibility: string }> = {};
  for (const lang of SUPPORTED_LANGUAGES) {
    const tName = (row[`trans_${lang}_name`] || "").trim();
    const tDesc = (row[`trans_${lang}_description`] || "").trim();
    const tElig = (row[`trans_${lang}_eligibility`] || "").trim();

    if (tName || tDesc || tElig) {
      translations[lang] = {
        name: tName,
        description: tDesc,
        eligibility: tElig,
      };
    }
  }

  return {
    itemId: (row.itemId || "").trim() || undefined,
    name,
    organization: (row.organization || "").trim(),
    description: (row.description || "").trim(),
    category,
    type: type as "grant" | "resource",
    country,
    eligibility: (row.eligibility || "").trim(),
    website: (row.website || "").trim(),
    phone: (row.phone || "").trim(),
    email: (row.email || "").trim(),
    amount: (row.amount || "").trim(),
    status: (row.status || "").trim(),
    translations,
  };
}

/**
 * Parse CSV string content into ImportParseResult.
 */
export function parseCSV(csvContent: string): ImportParseResult {
  const errors: ImportValidationError[] = [];

  // Parse CSV with papaparse
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => normalizeHeader(header),
  });

  if (parsed.errors.length > 0) {
    for (const err of parsed.errors) {
      errors.push({
        row: (err.row ?? 0) + 2, // +2 for 1-indexed + header row
        field: "csv",
        message: err.message,
      });
    }
  }

  const grants: ImportedGrant[] = [];
  const rows = parsed.data as Record<string, string>[];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // Skip completely empty rows
    const hasContent = Object.values(row).some(v => v && v.trim());
    if (!hasContent) continue;

    const grant = parseRow(row, i + 2, errors); // +2 for 1-indexed + header
    if (grant) {
      grants.push(grant);
    }
  }

  return {
    grants,
    errors,
    totalRows: rows.length,
    validRows: grants.length,
    skippedRows: rows.length - grants.length,
  };
}

/**
 * Parse Excel file buffer into ImportParseResult.
 */
export function parseExcel(buffer: Buffer): ImportParseResult {
  const errors: ImportValidationError[] = [];

  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { grants: [], errors: [{ row: 0, field: "file", message: "No sheets found in Excel file" }], totalRows: 0, validRows: 0, skippedRows: 0 };
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

  // Normalize headers
  const rows: Record<string, string>[] = rawRows.map(row => {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      const normalizedKey = normalizeHeader(key);
      normalized[normalizedKey] = String(value ?? "");
    }
    return normalized;
  });

  const grants: ImportedGrant[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const hasContent = Object.values(row).some(v => v && v.trim());
    if (!hasContent) continue;

    const grant = parseRow(row, i + 2, errors); // +2 for 1-indexed + header
    if (grant) {
      grants.push(grant);
    }
  }

  return {
    grants,
    errors,
    totalRows: rows.length,
    validRows: grants.length,
    skippedRows: rows.length - grants.length,
  };
}

/**
 * Validate a batch of imported grants for duplicates and other issues.
 */
export function validateBatch(grants: ImportedGrant[]): ImportValidationError[] {
  const errors: ImportValidationError[] = [];
  const seenNames = new Map<string, number>();

  for (let i = 0; i < grants.length; i++) {
    const g = grants[i];
    const nameKey = g.name.toLowerCase();

    if (seenNames.has(nameKey)) {
      errors.push({
        row: i + 2,
        field: "name",
        message: `Duplicate name "${g.name}" (also on row ${seenNames.get(nameKey)})`,
      });
    } else {
      seenNames.set(nameKey, i + 2);
    }
  }

  return errors;
}

// Re-export for convenience
export { VALID_CATEGORIES, VALID_COUNTRIES, VALID_TYPES, SUPPORTED_LANGUAGES };
