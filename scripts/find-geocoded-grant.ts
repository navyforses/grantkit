/*
 * Diagnostic helper — prints a few geocoded grants' itemIds so we can
 * navigate directly to /grant/{itemId} for LocationMap verification.
 *
 * Usage:  pnpm tsx scripts/find-geocoded-grant.ts
 */

import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");

  const conn = await mysql.createConnection(url);
  try {
    const [rows] = await conn.query<any[]>(
      `SELECT id, itemId, LEFT(organization, 50) AS organization,
              country, latitude, longitude, LEFT(address, 80) AS address
         FROM grants
        WHERE isActive = 1
          AND latitude IS NOT NULL
          AND longitude IS NOT NULL
        ORDER BY id ASC
        LIMIT 10`
    );
    console.log("\n=== First 10 geocoded grants (use itemId for /grant/:id) ===");
    if (rows.length === 0) {
      console.log("(no geocoded grants found)");
    } else {
      console.table(rows);
      console.log(`\nNavigate to: http://localhost:3000/grant/${rows[0].itemId}`);
    }
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
