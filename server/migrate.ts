/**
 * server/migrate.ts
 * Runs Drizzle ORM migrations programmatically at server startup.
 * Compiled to dist/migrate.js and called before dist/index.js.
 */

import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("[migrate] No DATABASE_URL set — skipping migrations.");
    return;
  }

  console.log("[migrate] Running database migrations...");

  const db = drizzle(url);
  // drizzle/meta/_journal.json + drizzle/*.sql must be present at this path
  const migrationsFolder = join(__dirname, "../drizzle");

  await migrate(db, { migrationsFolder });

  console.log("[migrate] All migrations applied.");
}

runMigrations().catch((err) => {
  console.error("[migrate] Migration failed:", err);
  process.exit(1);
});
