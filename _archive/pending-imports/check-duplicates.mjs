import mysql from "mysql2/promise";

const db = await mysql.createConnection(process.env.DATABASE_URL);
const names = [
  "USCRI Humanitarian Legal Services",
  "National Immigrant Justice Center",
  "The Advocates for Human Rights",
  "NY State Legal Services for Immigrants",
  "Washington State Legal Aid for Immigrants",
  "Canada Resettlement Assistance Program",
  "ORR Refugee Benefits",
  "JCFS HIAS Legal Aid & Advocacy"
];

for (const name of names) {
  const [rows] = await db.execute(
    "SELECT itemId, name FROM grants WHERE name LIKE ? LIMIT 1",
    [`%${name}%`]
  );
  console.log(rows.length > 0 ? `EXISTS: ${rows[0].name}` : `NEW: ${name}`);
}
await db.end();
