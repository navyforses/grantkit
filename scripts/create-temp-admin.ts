#!/usr/bin/env tsx

import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { users } from "../drizzle/schema";
import { getDb } from "../server/db";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is required");
    process.exit(1);
  }

  const db = await getDb();
  if (!db) {
    console.error("❌ Database is not available");
    process.exit(1);
  }

  const email = process.env.TEMP_ADMIN_EMAIL || "admin-temp@grantkit.local";
  const password = process.env.TEMP_ADMIN_PASSWORD || "GrantKitAdmin2026!";
  const name = process.env.TEMP_ADMIN_NAME || "Temporary Admin";

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const passwordHash = await bcrypt.hash(password, 12);

  if (existing.length > 0) {
    await db
      .update(users)
      .set({
        name,
        role: "admin",
        loginMethod: "email",
        passwordHash,
        emailVerified: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      })
      .where(eq(users.id, existing[0].id));
    console.log(`✅ Updated existing admin user: ${email}`);
  } else {
    await db.insert(users).values({
      openId: `temp-admin-${nanoid(10)}`,
      email,
      name,
      role: "admin",
      loginMethod: "email",
      passwordHash,
      emailVerified: true,
      failedLoginAttempts: 0,
      subscriptionStatus: "none",
      onboardingCompleted: true,
      createdAt: new Date(),
    });
    console.log(`✅ Created temporary admin user: ${email}`);
  }

  console.log("\nTemporary admin credentials:");
  console.log(`username/email: ${email}`);
  console.log(`password: ${password}`);
  console.log("\n⚠️ Rotate or delete this account after use.");
}

main().catch((error) => {
  console.error("❌ Failed to create temporary admin:", error);
  process.exit(1);
});
