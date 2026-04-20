/**
 * import-organizations.ts — bulk import organizations + branches from Excel.
 *
 * Reads data/organizations-2026-04-20.xlsx and upserts into the MySQL
 * `organizations` and `organization_branches` tables.
 *
 * Flags:
 *   --dry-run    Parse + count, no writes
 *   --verbose    Log every row
 *   --file=...   Override path (default: data/organizations-2026-04-20.xlsx)
 *
 * Requires DATABASE_URL. For local runs against Railway MySQL, export
 * MYSQL_PUBLIC_URL as DATABASE_URL — see .grantkit-redesign/OPS.md.
 */

import "dotenv/config";
import path from "path";
import ExcelJS from "exceljs";
import mysql from "mysql2/promise";

type Flags = { dryRun: boolean; verbose: boolean; file: string };

function parseFlags(): Flags {
  const args = process.argv.slice(2);
  const out: Flags = {
    dryRun: false,
    verbose: false,
    file: path.resolve(process.cwd(), "data/organizations-2026-04-20.xlsx"),
  };
  for (const a of args) {
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--verbose") out.verbose = true;
    else if (a.startsWith("--file=")) out.file = path.resolve(process.cwd(), a.slice("--file=".length));
  }
  return out;
}

function cellToString(v: ExcelJS.CellValue): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object" && v !== null) {
    // Hyperlink { text, hyperlink } or rich-text { richText: [...] }
    const any = v as any;
    if (typeof any.text === "string") return any.text.trim() || null;
    if (typeof any.hyperlink === "string") return String(any.hyperlink).trim() || null;
    if (Array.isArray(any.richText)) {
      return any.richText.map((p: any) => p.text ?? "").join("").trim() || null;
    }
    if (typeof any.result !== "undefined") return cellToString(any.result);
    if (typeof any.formula === "string") return null;
  }
  return null;
}

function cellToNumber(v: ExcelJS.CellValue): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = cellToString(v);
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function cellToInt(v: ExcelJS.CellValue, fallback: number): number {
  const n = cellToNumber(v);
  if (n === null) return fallback;
  return Math.max(0, Math.floor(n));
}

interface OrgRow {
  orgId: string;
  name: string;
  description: string | null;
  country: string;
  state: string | null;
  city: string | null;
  hqAddress: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  programsCount: number;
  branchesCount: number;
  categories: string | null;
  serviceArea: string | null;
  officeHours: string | null;
}

interface BranchRow {
  branchId: string;
  orgId: string;
  branchType: "HQ" | "Branch";
  country: string;
  state: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  source: string | null;
  notes: string | null;
}

async function parseOrganizations(ws: ExcelJS.Worksheet): Promise<OrgRow[]> {
  const rows: OrgRow[] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const orgId = cellToString(row.getCell(1).value);
    const name = cellToString(row.getCell(2).value);
    if (!orgId || !name) continue;
    const country = cellToString(row.getCell(4).value);
    if (!country) {
      console.warn(`[orgs] Row ${r} missing country for ${orgId}; skipping.`);
      continue;
    }
    rows.push({
      orgId,
      name,
      description: cellToString(row.getCell(3).value),
      country,
      state: cellToString(row.getCell(5).value),
      city: cellToString(row.getCell(6).value),
      hqAddress: cellToString(row.getCell(7).value),
      website: cellToString(row.getCell(8).value),
      phone: cellToString(row.getCell(9).value),
      email: cellToString(row.getCell(10).value),
      latitude: cellToNumber(row.getCell(11).value),
      longitude: cellToNumber(row.getCell(12).value),
      programsCount: cellToInt(row.getCell(13).value, 0),
      branchesCount: cellToInt(row.getCell(14).value, 1),
      categories: cellToString(row.getCell(15).value),
      serviceArea: cellToString(row.getCell(16).value),
      officeHours: cellToString(row.getCell(17).value),
    });
  }
  return rows;
}

async function parseBranches(ws: ExcelJS.Worksheet): Promise<BranchRow[]> {
  const rows: BranchRow[] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const orgId = cellToString(row.getCell(1).value);
    const branchId = cellToString(row.getCell(2).value);
    if (!orgId || !branchId) continue;
    const typeRaw = cellToString(row.getCell(4).value) ?? "Branch";
    const branchType: "HQ" | "Branch" = typeRaw.toLowerCase() === "hq" ? "HQ" : "Branch";
    const country = cellToString(row.getCell(5).value);
    if (!country) {
      console.warn(`[branches] Row ${r} missing country for ${branchId}; skipping.`);
      continue;
    }
    rows.push({
      branchId,
      orgId,
      branchType,
      country,
      state: cellToString(row.getCell(6).value),
      city: cellToString(row.getCell(7).value),
      address: cellToString(row.getCell(8).value),
      phone: cellToString(row.getCell(9).value),
      email: cellToString(row.getCell(10).value),
      latitude: cellToNumber(row.getCell(11).value),
      longitude: cellToNumber(row.getCell(12).value),
      source: cellToString(row.getCell(13).value),
      notes: cellToString(row.getCell(14).value),
    });
  }
  return rows;
}

const BATCH_SIZE = 100;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function upsertOrganizationsBatch(conn: mysql.Connection, batch: OrgRow[]) {
  if (batch.length === 0) return;
  const cols = [
    "orgId", "name", "description", "country", "state", "city", "hqAddress",
    "website", "phone", "email", "latitude", "longitude", "programsCount",
    "branchesCount", "categories", "serviceArea", "officeHours",
  ];
  const placeholders = batch.map(() => `(${cols.map(() => "?").join(",")})`).join(",");
  const values: any[] = [];
  for (const o of batch) {
    values.push(
      o.orgId, o.name, o.description, o.country, o.state, o.city, o.hqAddress,
      o.website, o.phone, o.email, o.latitude, o.longitude, o.programsCount,
      o.branchesCount, o.categories, o.serviceArea, o.officeHours,
    );
  }
  const update = cols
    .filter((c) => c !== "orgId")
    .map((c) => `\`${c}\` = VALUES(\`${c}\`)`)
    .join(", ");
  const sql =
    `INSERT INTO \`organizations\` (${cols.map((c) => `\`${c}\``).join(",")}) ` +
    `VALUES ${placeholders} ` +
    `ON DUPLICATE KEY UPDATE ${update}, \`updatedAt\` = CURRENT_TIMESTAMP`;
  await conn.query(sql, values);
}

async function upsertBranchesBatch(conn: mysql.Connection, batch: BranchRow[]) {
  if (batch.length === 0) return;
  const cols = [
    "branchId", "orgId", "branchType", "country", "state", "city", "address",
    "phone", "email", "latitude", "longitude", "source", "notes",
  ];
  const placeholders = batch.map(() => `(${cols.map(() => "?").join(",")})`).join(",");
  const values: any[] = [];
  for (const b of batch) {
    values.push(
      b.branchId, b.orgId, b.branchType, b.country, b.state, b.city, b.address,
      b.phone, b.email, b.latitude, b.longitude, b.source, b.notes,
    );
  }
  const update = cols
    .filter((c) => c !== "branchId")
    .map((c) => `\`${c}\` = VALUES(\`${c}\`)`)
    .join(", ");
  const sql =
    `INSERT INTO \`organization_branches\` (${cols.map((c) => `\`${c}\``).join(",")}) ` +
    `VALUES ${placeholders} ` +
    `ON DUPLICATE KEY UPDATE ${update}`;
  await conn.query(sql, values);
}

async function main() {
  const flags = parseFlags();
  console.log("[import-orgs] Starting", {
    file: flags.file, dryRun: flags.dryRun, verbose: flags.verbose,
  });

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(flags.file);

  const orgsSheet = wb.getWorksheet("Organizations");
  const branchesSheet = wb.getWorksheet("Branches");
  if (!orgsSheet) throw new Error("'Organizations' sheet not found");
  if (!branchesSheet) throw new Error("'Branches' sheet not found");

  const orgs = await parseOrganizations(orgsSheet);
  const branches = await parseBranches(branchesSheet);

  console.log(`[import-orgs] Parsed ${orgs.length} organizations`);
  console.log(`[import-orgs] Parsed ${branches.length} branches (${branches.filter((b) => b.branchType === "HQ").length} HQ, ${branches.filter((b) => b.branchType === "Branch").length} Branch)`);

  if (flags.verbose) {
    for (const o of orgs) console.log(`  org ${o.orgId} ${o.country}/${o.city ?? "-"} ${o.name}`);
    for (const b of branches) console.log(`  branch ${b.branchId} ${b.branchType} ${b.country}/${b.city ?? "-"}`);
  }

  if (flags.dryRun) {
    console.log("[import-orgs] --dry-run: no writes. Exiting.");
    return;
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required. For Railway, use MYSQL_PUBLIC_URL (see .grantkit-redesign/OPS.md).");
  }

  const conn = await mysql.createConnection({
    uri: url,
    // Keep the default multipleStatements=false. We only send one batched
    // INSERT per query, so there is no need to relax this safety flag.
  });

  try {
    // ── Organizations transaction ──
    await conn.beginTransaction();
    try {
      const [[countBefore]] = (await conn.query("SELECT COUNT(*) AS c FROM organizations")) as any;
      for (const batch of chunk(orgs, BATCH_SIZE)) {
        await upsertOrganizationsBatch(conn, batch);
      }
      const [[countAfter]] = (await conn.query("SELECT COUNT(*) AS c FROM organizations")) as any;
      await conn.commit();
      console.log(`[import-orgs] organizations: before=${countBefore.c} after=${countAfter.c} diff=${countAfter.c - countBefore.c}`);
    } catch (err) {
      await conn.rollback();
      throw err;
    }

    // ── Branches transaction ──
    await conn.beginTransaction();
    try {
      const [[countBefore]] = (await conn.query("SELECT COUNT(*) AS c FROM organization_branches")) as any;
      for (const batch of chunk(branches, BATCH_SIZE)) {
        await upsertBranchesBatch(conn, batch);
      }
      const [[countAfter]] = (await conn.query("SELECT COUNT(*) AS c FROM organization_branches")) as any;
      await conn.commit();
      console.log(`[import-orgs] branches: before=${countBefore.c} after=${countAfter.c} diff=${countAfter.c - countBefore.c}`);
    } catch (err) {
      await conn.rollback();
      throw err;
    }

    const [[orgsFinal]] = (await conn.query("SELECT COUNT(*) AS c FROM organizations")) as any;
    const [[hqFinal]] = (await conn.query("SELECT COUNT(*) AS c FROM organization_branches WHERE branchType='HQ'")) as any;
    const [[branchFinal]] = (await conn.query("SELECT COUNT(*) AS c FROM organization_branches WHERE branchType='Branch'")) as any;
    console.log("[import-orgs] Final: orgs=%d, HQ=%d, Branch=%d", orgsFinal.c, hqFinal.c, branchFinal.c);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("[import-orgs] Failed:", err);
  process.exit(1);
});
