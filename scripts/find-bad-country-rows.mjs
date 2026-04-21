#!/usr/bin/env node
/**
 * find-bad-country-rows.mjs
 *
 * კითხულობს data/organizations-2026-04-20.xlsx-ს და ასახელებს ყველა რიგს
 * სადაც country ველი > 8 სიმბოლოა (schema: country varchar(8) NOT NULL).
 *
 * აჩვენებს: Organizations sheet + Branches sheet.
 *
 * გაშვება: node scripts/find-bad-country-rows.mjs
 */

import path from "path";
import ExcelJS from "exceljs";

function cellToString(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object" && v !== null) {
    const any = v;
    if (typeof any.text === "string") return any.text.trim() || null;
    if (typeof any.hyperlink === "string") return String(any.hyperlink).trim() || null;
    if (Array.isArray(any.richText)) {
      return any.richText.map((p) => p.text ?? "").join("").trim() || null;
    }
    if (typeof any.result !== "undefined") return cellToString(any.result);
    if (typeof any.formula === "string") return null;
  }
  return null;
}

const filePath = path.resolve(process.cwd(), "data/organizations-2026-04-20.xlsx");
console.log(`[find-bad] ფაილი: ${filePath}\n`);

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(filePath);

// --- Organizations sheet: country = column 4 ---
const orgsSheet = wb.getWorksheet("Organizations");
if (!orgsSheet) {
  console.error("❌ 'Organizations' sheet ვერ მოიძებნა");
  process.exit(1);
}

console.log("=== Organizations sheet (column 4 = country) ===\n");
const orgBad = [];
const orgCountryFreq = new Map();
for (let r = 2; r <= orgsSheet.rowCount; r++) {
  const row = orgsSheet.getRow(r);
  const orgId = cellToString(row.getCell(1).value);
  const name = cellToString(row.getCell(2).value);
  const country = cellToString(row.getCell(4).value);
  if (!orgId || !name || !country) continue;
  orgCountryFreq.set(country, (orgCountryFreq.get(country) ?? 0) + 1);
  if (country.length > 8) {
    orgBad.push({ row: r, orgId, name, country, len: country.length });
  }
}
console.log(`სულ ${orgBad.length} რიგი country > 8 სიმბოლოთი:\n`);
for (const b of orgBad) {
  console.log(`   row=${b.row}  ${b.orgId}  len=${b.len}  country="${b.country}"  name="${b.name}"`);
}

console.log(`\nOrganizations country frequency (sorted):\n`);
const orgSorted = [...orgCountryFreq.entries()].sort((a, b) => b[1] - a[1]);
for (const [c, n] of orgSorted) {
  const flag = c.length > 8 ? " ❌" : "";
  console.log(`   "${c}"  count=${n}  len=${c.length}${flag}`);
}

// --- Branches sheet: country = column 5 ---
const branchesSheet = wb.getWorksheet("Branches");
if (!branchesSheet) {
  console.error("❌ 'Branches' sheet ვერ მოიძებნა");
  process.exit(1);
}

console.log("\n\n=== Branches sheet (column 5 = country) ===\n");
const branchBad = [];
const branchCountryFreq = new Map();
for (let r = 2; r <= branchesSheet.rowCount; r++) {
  const row = branchesSheet.getRow(r);
  const orgId = cellToString(row.getCell(1).value);
  const branchId = cellToString(row.getCell(2).value);
  const country = cellToString(row.getCell(5).value);
  if (!orgId || !branchId || !country) continue;
  branchCountryFreq.set(country, (branchCountryFreq.get(country) ?? 0) + 1);
  if (country.length > 8) {
    branchBad.push({ row: r, branchId, orgId, country, len: country.length });
  }
}
console.log(`სულ ${branchBad.length} რიგი country > 8 სიმბოლოთი:\n`);
for (const b of branchBad) {
  console.log(`   row=${b.row}  ${b.branchId}  orgId=${b.orgId}  len=${b.len}  country="${b.country}"`);
}

console.log(`\nBranches country frequency (sorted):\n`);
const brSorted = [...branchCountryFreq.entries()].sort((a, b) => b[1] - a[1]);
for (const [c, n] of brSorted) {
  const flag = c.length > 8 ? " ❌" : "";
  console.log(`   "${c}"  count=${n}  len=${c.length}${flag}`);
}

console.log(`\n=== შემაჯამებელი ===`);
console.log(`   Organizations: ${orgBad.length} bad rows`);
console.log(`   Branches:      ${branchBad.length} bad rows`);
console.log(`   Schema:        country varchar(8) NOT NULL`);
console.log(`\n[find-bad] დასრულდა.`);
