#!/usr/bin/env node
/**
 * Import 8 new grants discovered on 2026-04-16 (SOCIAL category).
 * Run: node pending-imports/import-2026-04-16.mjs
 * Requires: DATABASE_URL env var
 */

import mysql from "mysql2/promise";
import crypto from "crypto";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not set");
  process.exit(1);
}

function makeItemId(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

const newGrants = [
  {
    name: "USCRI Humanitarian Legal Services",
    category: "social_services",
    country: "US",
    eligibility: "Refugees, asylum seekers, and immigrants in need of legal assistance in the United States.",
    description: "Provides free or low-cost legal representation to refugees, asylum seekers, and immigrants. Services include assistance with asylum applications, deportation defense, family reunification petitions, and immigration court proceedings. Operates through a network of field offices across the US.",
  },
  {
    name: "National Immigrant Justice Center",
    category: "social_services",
    country: "US",
    eligibility: "Immigrants, refugees, and asylum seekers regardless of immigration status.",
    description: "Offers comprehensive legal services to immigrants, refugees, and asylum seekers. Provides direct representation in immigration court, policy advocacy, and impact litigation to protect the rights of immigrants. Also offers know-your-rights workshops and legal screenings.",
  },
  {
    name: "The Advocates for Human Rights",
    category: "social_services",
    country: "US",
    eligibility: "Asylum seekers and refugees seeking legal assistance and human rights protection.",
    description: "Volunteers attorneys and staff provide free legal representation to asylum seekers. Conducts human rights investigations, advocates for policy reform, and provides training to legal professionals on asylum and refugee law. Based in Minneapolis with national reach.",
  },
  {
    name: "NY State Legal Services for Immigrants",
    category: "social_services",
    country: "US",
    state: "NY",
    eligibility: "Low-income immigrants residing in New York State.",
    description: "Provides free immigration legal services to low-income immigrants in New York State. Covers deportation defense, asylum applications, work permits, family petitions, and naturalization assistance. Funded through state programs and nonprofit partnerships.",
  },
  {
    name: "Washington State Legal Aid for Immigrants",
    category: "social_services",
    country: "US",
    state: "WA",
    eligibility: "Low-income immigrants and refugees residing in Washington State.",
    description: "Delivers free legal aid to immigrants and refugees in Washington State. Services include immigration court representation, DACA renewals, U-visa and T-visa applications, and citizenship assistance. Partners with community organizations for outreach.",
  },
  {
    name: "Canada Resettlement Assistance Program",
    category: "housing",
    country: "Canada",
    eligibility: "Government-assisted refugees newly arrived in Canada.",
    description: "Federal program providing immediate essential services and financial support to government-assisted refugees upon arrival in Canada. Covers temporary housing, basic household goods, language assessment referrals, orientation sessions, and income support for up to one year while refugees establish themselves.",
  },
  {
    name: "ORR Refugee Benefits (food/medical/cash)",
    category: "social_services",
    country: "US",
    eligibility: "Refugees, asylees, Cuban/Haitian entrants, Special Immigrant Visa holders, and victims of trafficking in the US.",
    description: "The Office of Refugee Resettlement provides cash assistance, medical screening, food assistance, and social services to newly arrived refugees and eligible populations. Benefits include Refugee Cash Assistance (RCA) for up to 8 months, Refugee Medical Assistance (RMA), and referrals to employment programs.",
  },
  {
    name: "JCFS HIAS Legal Aid & Advocacy",
    category: "social_services",
    country: "US",
    state: "IL",
    eligibility: "Immigrants and refugees in the Chicago metropolitan area, regardless of religion or nationality.",
    description: "A partnership between Jewish Child and Family Services and HIAS providing immigration legal services in the Chicago area. Offers representation in asylum cases, adjustment of status, naturalization, VAWA petitions, and removal defense. Also provides community education on immigration rights.",
  },
];

async function main() {
  const db = await mysql.createConnection(DATABASE_URL);

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Phase 4 Import — 2026-04-16 Discovery (SOCIAL)`);
  console.log(`  ${newGrants.length} grants to import`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  let imported = 0;
  let skipped = 0;

  for (const grant of newGrants) {
    const itemId = makeItemId(grant.name);

    // Check duplicate
    const [existing] = await db.execute(
      "SELECT itemId FROM grants WHERE itemId = ? OR name = ? LIMIT 1",
      [itemId, grant.name]
    );

    if (existing.length > 0) {
      console.log(`⏭  SKIP (exists): ${grant.name}`);
      skipped++;
      continue;
    }

    await db.execute(
      `INSERT INTO grants (itemId, name, category, country, state, eligibility, description, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [
        itemId,
        grant.name,
        grant.category,
        grant.country,
        grant.state || null,
        grant.eligibility,
        grant.description,
      ]
    );

    console.log(`✅  IMPORTED: ${grant.name} [${itemId}]`);
    imported++;
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  ✅ Imported: ${imported}`);
  console.log(`  ⏭  Skipped:  ${skipped}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  await db.end();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
