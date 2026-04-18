import "dotenv/config";
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL არ არის"); process.exit(1); }

const conn = await mysql.createConnection(url);

// Summary
const [summary] = await conn.query<any[]>(`
  SELECT
    COUNT(*) AS total,
    SUM(CASE WHEN latitude IS NOT NULL THEN 1 ELSE 0 END) AS geocoded,
    SUM(CASE WHEN latitude IS NULL THEN 1 ELSE 0 END) AS not_geocoded
  FROM grants WHERE isActive = 1
`);
console.log("\n=== Geocoding coverage ===");
console.table(summary);

// Already geocoded grants (first 20)
const [geocoded] = await conn.query<any[]>(`
  SELECT id, itemId, LEFT(organization, 40) AS organization, country,
         latitude, longitude, LEFT(address, 60) AS address
  FROM grants WHERE latitude IS NOT NULL
  ORDER BY id ASC LIMIT 20
`);
console.log("\n=== Already geocoded (first 20) ===");
console.table(geocoded);

// Flag suspicious Tierra del Fuego / Argentina coordinates for non-AR grants
const [suspicious] = await conn.query<any[]>(`
  SELECT id, itemId, LEFT(organization, 40) AS organization, country, latitude, longitude
  FROM grants
  WHERE latitude IS NOT NULL
    AND country != 'AR'
    AND latitude < -30
  ORDER BY id ASC
`);
console.log("\n=== Suspicious: non-AR grants with southern hemisphere coords ===");
if (suspicious.length === 0) console.log("(none)");
else console.table(suspicious);

await conn.end();
process.exit(0);
