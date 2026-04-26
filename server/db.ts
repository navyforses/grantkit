import { eq, and, or, like, desc, asc, count, sql, inArray, gte, lte, isNotNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, savedGrants, newsletterSubscribers, grants, grantTranslations, notificationHistory, organizations, organizationBranches } from "../drizzle/schema";
import type { Grant, InsertGrant, GrantTranslation, Organization, OrganizationBranch } from "../drizzle/schema";
import * as crypto from "crypto";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ===== Subscription helpers =====

export async function updateUserSubscription(
  userId: number,
  data: {
    paddleCustomerId?: string;
    paddleSubscriptionId?: string;
    subscriptionStatus?: "none" | "active" | "cancelled" | "past_due" | "paused";
    subscriptionPlanId?: string;
    subscriptionCurrentPeriodEnd?: Date | null;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update subscription: database not available");
    return;
  }

  const updateSet: Record<string, unknown> = {};
  if (data.paddleCustomerId !== undefined) updateSet.paddleCustomerId = data.paddleCustomerId;
  if (data.paddleSubscriptionId !== undefined) updateSet.paddleSubscriptionId = data.paddleSubscriptionId;
  if (data.subscriptionStatus !== undefined) updateSet.subscriptionStatus = data.subscriptionStatus;
  if (data.subscriptionPlanId !== undefined) updateSet.subscriptionPlanId = data.subscriptionPlanId;
  if (data.subscriptionCurrentPeriodEnd !== undefined) updateSet.subscriptionCurrentPeriodEnd = data.subscriptionCurrentPeriodEnd;

  if (Object.keys(updateSet).length === 0) return;

  await db.update(users).set(updateSet).where(eq(users.id, userId));
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByPaddleCustomerId(customerId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.paddleCustomerId, customerId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ===== Email/password auth helpers (Phase 0) =====

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createEmailPasswordUser(data: {
  openId: string;
  email: string;
  name: string | null;
  passwordHash: string;
  verificationToken: string;
  verificationTokenExpires: Date;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(users).values({
    openId: data.openId,
    email: data.email,
    name: data.name,
    passwordHash: data.passwordHash,
    loginMethod: "email",
    emailVerified: false,
    verificationToken: data.verificationToken,
    verificationTokenExpires: data.verificationTokenExpires,
  });

  return Number(result[0].insertId);
}

export async function getUserByVerificationToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.verificationToken, token)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByResetToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.resetPasswordToken, token)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function markEmailVerified(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({
    emailVerified: true,
    verificationToken: null,
    verificationTokenExpires: null,
  }).where(eq(users.id, userId));
}

export async function setVerificationToken(userId: number, token: string, expires: Date): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({
    verificationToken: token,
    verificationTokenExpires: expires,
  }).where(eq(users.id, userId));
}

export async function setResetPasswordToken(userId: number, token: string, expires: Date): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({
    resetPasswordToken: token,
    resetPasswordTokenExpires: expires,
  }).where(eq(users.id, userId));
}

export async function updatePasswordAndClearReset(userId: number, passwordHash: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({
    passwordHash,
    resetPasswordToken: null,
    resetPasswordTokenExpires: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
  }).where(eq(users.id, userId));
}

export async function incrementFailedLoginAttempts(userId: number, lockUntil: Date | null): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({
    failedLoginAttempts: sql`${users.failedLoginAttempts} + 1`,
    ...(lockUntil ? { lockedUntil: lockUntil } : {}),
  }).where(eq(users.id, userId));
}

export async function resetFailedLoginAttempts(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastSignedIn: new Date(),
  }).where(eq(users.id, userId));
}

// ===== Saved Grants helpers =====

export async function getSavedGrantIds(userId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({ grantId: savedGrants.grantId })
    .from(savedGrants)
    .where(eq(savedGrants.userId, userId))
    .orderBy(desc(savedGrants.createdAt));

  return result.map((r) => r.grantId);
}

export async function toggleSavedGrant(userId: number, grantId: string): Promise<{ saved: boolean }> {
  const db = await getDb();
  if (!db) return { saved: false };

  // Check if already saved
  const existing = await db
    .select()
    .from(savedGrants)
    .where(and(eq(savedGrants.userId, userId), eq(savedGrants.grantId, grantId)))
    .limit(1);

  if (existing.length > 0) {
    // Remove
    await db.delete(savedGrants).where(
      and(eq(savedGrants.userId, userId), eq(savedGrants.grantId, grantId))
    );
    return { saved: false };
  } else {
    // Add
    await db.insert(savedGrants).values({ userId, grantId });
    return { saved: true };
  }
}

// ===== Admin helpers =====

export async function listAllUsers(options?: {
  search?: string;
  statusFilter?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { users: [], total: 0 };

  const { search, statusFilter, limit = 50, offset = 0 } = options || {};

  let conditions: any[] = [];

  if (search) {
    conditions.push(
      or(
        like(users.name, `%${search}%`),
        like(users.email, `%${search}%`)
      )
    );
  }

  if (statusFilter && statusFilter !== "all") {
    conditions.push(eq(users.subscriptionStatus, statusFilter as any));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [userList, countResult] = await Promise.all([
    db
      .select()
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(users)
      .where(whereClause),
  ]);

  return {
    users: userList,
    total: countResult[0]?.count ?? 0,
  };
}

export async function updateUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// ===== Newsletter helpers =====

export async function subscribeNewsletter(email: string, userId?: number): Promise<{ success: boolean; alreadySubscribed?: boolean }> {
  const db = await getDb();
  if (!db) return { success: false };

  // Check if already subscribed
  const existing = await db
    .select()
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.email, email))
    .limit(1);

  if (existing.length > 0) {
    if (existing[0].isActive) {
      return { success: true, alreadySubscribed: true };
    }
    // Re-activate
    await db.update(newsletterSubscribers)
      .set({ isActive: true, unsubscribedAt: null, userId: userId || existing[0].userId })
      .where(eq(newsletterSubscribers.id, existing[0].id));
    return { success: true };
  }

  await db.insert(newsletterSubscribers).values({ email, userId });
  return { success: true };
}

/** Get all active newsletter subscribers with unsubscribe tokens */
export async function getActiveNewsletterSubscribers(): Promise<Array<{ id: number; email: string; unsubscribeToken: string }>> {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({ id: newsletterSubscribers.id, email: newsletterSubscribers.email })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.isActive, true));

  return result.map((sub) => ({
    id: sub.id,
    email: sub.email,
    // Generate a deterministic token from email for unsubscribe links
    unsubscribeToken: crypto.createHash("sha256").update(sub.email + "_grantkit_unsub").digest("hex").substring(0, 32),
  }));
}

/** Get newsletter subscriber count */
export async function getNewsletterSubscriberCount(): Promise<{ active: number; total: number }> {
  const db = await getDb();
  if (!db) return { active: 0, total: 0 };

  const [totalResult, activeResult] = await Promise.all([
    db.select({ count: count() }).from(newsletterSubscribers),
    db.select({ count: count() }).from(newsletterSubscribers).where(eq(newsletterSubscribers.isActive, true)),
  ]);

  return {
    total: totalResult[0]?.count ?? 0,
    active: activeResult[0]?.count ?? 0,
  };
}

/** Unsubscribe a newsletter subscriber by token (hashed email) */
export async function unsubscribeByToken(token: string): Promise<{ success: boolean; email?: string }> {
  const db = await getDb();
  if (!db) return { success: false };

  // Find the subscriber whose email hashes to this token
  const allActive = await db
    .select({ id: newsletterSubscribers.id, email: newsletterSubscribers.email })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.isActive, true));

  const match = allActive.find((sub) => {
    const hash = crypto.createHash("sha256").update(sub.email + "_grantkit_unsub").digest("hex").substring(0, 32);
    return hash === token;
  });

  if (!match) return { success: false };

  await db.update(newsletterSubscribers)
    .set({ isActive: false, unsubscribedAt: new Date() })
    .where(eq(newsletterSubscribers.id, match.id));

  return { success: true, email: match.email };
}

/** Create a notification history record */
export async function createNotificationRecord(data: {
  subject: string;
  grantItemIds: string[];
  recipientCount: number;
  sentBy: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(notificationHistory).values({
    subject: data.subject,
    grantItemIds: JSON.stringify(data.grantItemIds),
    recipientCount: data.recipientCount,
    sentBy: data.sentBy,
    status: "sending",
  });

  return Number(result[0].insertId);
}

/** Update a notification history record after sending */
export async function updateNotificationRecord(id: number, data: {
  successCount: number;
  failCount: number;
  status: "completed" | "failed";
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(notificationHistory)
    .set({
      successCount: data.successCount,
      failCount: data.failCount,
      status: data.status,
      completedAt: new Date(),
    })
    .where(eq(notificationHistory.id, id));
}

/** Get notification history for admin */
export async function getNotificationHistory(limit = 20): Promise<Array<{
  id: number;
  subject: string;
  grantItemIds: string;
  recipientCount: number;
  successCount: number;
  failCount: number;
  status: string;
  sentAt: Date;
  completedAt: Date | null;
}>> {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(notificationHistory)
    .orderBy(desc(notificationHistory.sentAt))
    .limit(limit);

  return result;
}

// ===== Onboarding helpers =====

export async function completeOnboarding(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ onboardingCompleted: true }).where(eq(users.id, userId));
}

export async function updateUserProfile(userId: number, profile: {
  targetCountry?: string;
  purposes?: string;
  purposeDetails?: string;
  needs?: string;
  needDetails?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(users)
    .set({ ...profile, profileCompletedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function getUserProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [user] = await db.select({
    targetCountry: users.targetCountry,
    purposes: users.purposes,
    purposeDetails: users.purposeDetails,
    needs: users.needs,
    needDetails: users.needDetails,
    profileCompletedAt: users.profileCompletedAt,
  })
  .from(users)
  .where(eq(users.id, userId));
  return user ?? null;
}

export async function getSubscriptionStats() {
  const db = await getDb();
  if (!db) return { total: 0, active: 0, cancelled: 0, none: 0, pastDue: 0, paused: 0 };

  const result = await db
    .select({
      status: users.subscriptionStatus,
      count: count(),
    })
    .from(users)
    .groupBy(users.subscriptionStatus);

  const stats = { total: 0, active: 0, cancelled: 0, none: 0, pastDue: 0, paused: 0 };
  for (const row of result) {
    const c = Number(row.count);
    stats.total += c;
    switch (row.status) {
      case "active": stats.active = c; break;
      case "cancelled": stats.cancelled = c; break;
      case "none": stats.none = c; break;
      case "past_due": stats.pastDue = c; break;
      case "paused": stats.paused = c; break;
    }
  }
  return stats;
}

// ===== Grant CRUD helpers =====

/**
 * Explicit column map for `grants` + LEFT JOIN `organizations`.
 *
 * PR#3a (2026-04-23) consolidates 11 duplicate columns (organization, phone,
 * grantEmail, state, city, address, latitude, longitude, serviceArea,
 * officeHours, website) out of the grants table into organizations. The SQL
 * aliases below preserve the pre-PR#3a payload shape — every caller of
 * listGrants / getGrantByItemId / getDiversePreviewGrants / getRelatedGrants
 * keeps receiving `organization`, `phone`, `email`, `website`, `state`,
 * `city`, `address`, `latitude`, `longitude`, `serviceArea`, `officeHours`
 * as before. This matters because `client/src/pages/Catalog.tsx` is frozen
 * per CLAUDE.md and several other pages assume the flat Grant shape.
 *
 * Used with: `.from(grants).leftJoin(organizations, eq(grants.orgId, organizations.orgId))`
 * LEFT (not INNER) because some legacy grants may still have NULL orgId
 * until Step 3b flips the column to NOT NULL.
 */
const grantWithOrgColumns = {
  // Native grants columns (kept on the table)
  id: grants.id,
  itemId: grants.itemId,
  name: grants.name,
  orgId: grants.orgId,
  description: grants.description,
  category: grants.category,
  type: grants.type,
  country: grants.country,
  eligibility: grants.eligibility,
  amount: grants.amount,
  status: grants.status,
  applicationProcess: grants.applicationProcess,
  deadline: grants.deadline,
  fundingType: grants.fundingType,
  targetDiagnosis: grants.targetDiagnosis,
  ageRange: grants.ageRange,
  geographicScope: grants.geographicScope,
  documentsRequired: grants.documentsRequired,
  b2VisaEligible: grants.b2VisaEligible,
  geocodedAt: grants.geocodedAt,
  isActive: grants.isActive,
  createdAt: grants.createdAt,
  updatedAt: grants.updatedAt,
  // Aliased from organizations (consolidated in PR#3a)
  organization: organizations.name,
  phone: organizations.phone,
  email: organizations.email,
  website: organizations.website,
  state: organizations.state,
  city: organizations.city,
  address: organizations.hqAddress,
  latitude: organizations.latitude,
  longitude: organizations.longitude,
  serviceArea: organizations.serviceArea,
  officeHours: organizations.officeHours,
};

/** List grants with search, filter, sort, and pagination.
 *  When `search` + `language` are provided, also searches grant_translations. */
export async function listGrants(options?: {
  search?: string;
  language?: string;
  category?: string;
  country?: string;
  type?: string;
  sortBy?: string;
  fundingType?: string;
  targetDiagnosis?: string;
  ageRange?: string;
  b2VisaEligible?: string;
  hasDeadline?: boolean;
  state?: string;
  city?: string;
  limit?: number;
  offset?: number;
  activeOnly?: boolean;
}) {
  const db = await getDb();
  if (!db) {
    // Static fallback: serve from catalog.json when DB is unavailable
    try {
      const fs = await import("fs");
      const path = await import("path");
      const catalogPath = path.resolve(process.cwd(), "client/src/data/catalog.json");
      const raw = fs.readFileSync(catalogPath, "utf-8");
      const allGrants: any[] = JSON.parse(raw);
      const { search, category, country, type, limit = 50, offset = 0 } = options || {};
      let filtered = allGrants;
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter((g: any) =>
          (g.name || "").toLowerCase().includes(q) ||
          (g.description || "").toLowerCase().includes(q) ||
          (g.organization || "").toLowerCase().includes(q)
        );
      }
      if (category && category !== "all") filtered = filtered.filter((g: any) => g.category === category);
      if (country && country !== "all") filtered = filtered.filter((g: any) => g.country === country);
      if (type && type !== "all") filtered = filtered.filter((g: any) => g.type === type);
      const total = filtered.length;
      const page = filtered.slice(offset, offset + limit);
      return { grants: page, total };
    } catch (e) {
      console.warn("[DB] Static fallback failed:", e);
      return { grants: [], total: 0 };
    }
  }

  const { search, language, category, country, type, sortBy = "name_asc", fundingType, targetDiagnosis, ageRange, b2VisaEligible, hasDeadline, state, city, limit = 50, offset = 0, activeOnly = true } = options || {};

  // Coerce LIMIT/OFFSET to safe non-negative integers and emit as SQL literals.
  // Reason: mysql2 prepared-statement binding of numeric LIMIT/OFFSET can fail
  // with ER_WRONG_ARGUMENTS on some MySQL server builds (observed on Railway
  // MySQL 9.6). Using sql.raw bypasses param binding for these clauses.
  const safeInt = (n: unknown, fallback: number, max: number) => {
    const v = Math.floor(Number(n));
    if (!Number.isFinite(v) || v < 0) return fallback;
    return v > max ? max : v;
  };
  // `.limit()` / `.offset()` are typed `number | Placeholder`, but Drizzle's
  // runtime accepts SQL objects (dialect.ts `buildLimit` branches on `object`).
  // Cast to any to bypass the strict type signature.
  const limitLit: any = sql.raw(String(safeInt(limit, 50, 1000)));
  const offsetLit: any = sql.raw(String(safeInt(offset, 0, 1_000_000)));

  // Helper to add enrichment filter conditions
  const addEnrichmentFilters = (conditions: any[]) => {
    if (fundingType && fundingType !== "all") {
      conditions.push(eq(grants.fundingType, fundingType));
    }
    if (targetDiagnosis && targetDiagnosis !== "all") {
      conditions.push(like(grants.targetDiagnosis, `%${targetDiagnosis}%`));
    }
    if (ageRange && ageRange !== "all") {
      conditions.push(eq(grants.ageRange, ageRange));
    }
    if (b2VisaEligible && b2VisaEligible !== "all") {
      conditions.push(eq(grants.b2VisaEligible, b2VisaEligible));
    }
    if (hasDeadline === true) {
      conditions.push(sql`${grants.deadline} IS NOT NULL AND ${grants.deadline} != '' AND ${grants.deadline} != 'Rolling/Open'`);
    }
    if (state && state !== "all") {
      conditions.push(eq(organizations.state, state));
    }
    if (city && city !== "all") {
      conditions.push(eq(organizations.city, city));
    }
  };

  // If searching with a non-English language, use a subquery approach to search translations too
  if (search && language && language !== "en") {
    // Find itemIds matching in translations
    const translationMatches = await db
      .select({ grantItemId: grantTranslations.grantItemId })
      .from(grantTranslations)
      .where(
        and(
          eq(grantTranslations.language, language),
          or(
            like(grantTranslations.name, `%${search}%`),
            like(grantTranslations.description, `%${search}%`),
            like(grantTranslations.eligibility, `%${search}%`)
          )
        )
      );
    const translationItemIds = translationMatches.map(r => r.grantItemId);

    // Build conditions: match in base fields OR in translation itemIds
    const conditions: any[] = [];
    if (activeOnly) conditions.push(eq(grants.isActive, true));

    const searchConditions = [
      like(grants.name, `%${search}%`),
      like(organizations.name, `%${search}%`),
      like(grants.description, `%${search}%`),
    ];
    if (translationItemIds.length > 0) {
      searchConditions.push(inArray(grants.itemId, translationItemIds));
    }
    conditions.push(or(...searchConditions));

    if (category && category !== "all") conditions.push(eq(grants.category, category));
    if (country && country !== "all") conditions.push(eq(grants.country, country));
    if (type && type !== "all") conditions.push(eq(grants.type, type as "grant" | "resource"));
    addEnrichmentFilters(conditions);

    const whereClause = and(...conditions);
    const orderByClause = getOrderByClause(sortBy);

    const [grantList, countResult] = await Promise.all([
      db
        .select(grantWithOrgColumns)
        .from(grants)
        .leftJoin(organizations, eq(grants.orgId, organizations.orgId))
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limitLit)
        .offset(offsetLit),
      db
        .select({ count: count() })
        .from(grants)
        .leftJoin(organizations, eq(grants.orgId, organizations.orgId))
        .where(whereClause),
    ]);

    return { grants: grantList, total: countResult[0]?.count ?? 0 };
  }

  // Standard search (English or no language specified)
  const conditions: any[] = [];

  if (activeOnly) {
    conditions.push(eq(grants.isActive, true));
  }

  if (search) {
    conditions.push(
      or(
        like(grants.name, `%${search}%`),
        like(organizations.name, `%${search}%`),
        like(grants.description, `%${search}%`)
      )
    );
  }

  if (category && category !== "all") {
    conditions.push(eq(grants.category, category));
  }

  if (country && country !== "all") {
    conditions.push(eq(grants.country, country));
  }

  if (type && type !== "all") {
    conditions.push(eq(grants.type, type as "grant" | "resource"));
  }

  addEnrichmentFilters(conditions);

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const orderByClause = getOrderByClause(sortBy);

  const [grantList, countResult] = await Promise.all([
    db
      .select(grantWithOrgColumns)
      .from(grants)
      .leftJoin(organizations, eq(grants.orgId, organizations.orgId))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limitLit)
      .offset(offsetLit),
    db
      .select({ count: count() })
      .from(grants)
      .leftJoin(organizations, eq(grants.orgId, organizations.orgId))
      .where(whereClause),
  ]);

  return {
    grants: grantList,
    total: countResult[0]?.count ?? 0,
  };
}

/** Get diverse preview grants — one from each major category for homepage showcase */
export async function getDiversePreviewGrants(limit: number = 5) {
  const db = await getDb();
  if (!db) return [];

  // Pick one grant from each of the most popular categories
  const targetCategories = [
    'medical_treatment', 'housing', 'startup', 'educational', 'research',
    'community', 'individual', 'food_basic_needs', 'financial_assistance'
  ];

  const results = [];
  for (const cat of targetCategories) {
    if (results.length >= limit) break;
    const [row] = await db
      .select(grantWithOrgColumns)
      .from(grants)
      .leftJoin(organizations, eq(grants.orgId, organizations.orgId))
      .where(and(
        eq(grants.isActive, true),
        eq(grants.category, cat),
        sql`${grants.description} IS NOT NULL AND ${grants.description} != ''`,
        sql`${grants.amount} IS NOT NULL AND ${grants.amount} != ''`
      ))
      .orderBy(sql`RAND()`)
      .limit(1);
    if (row) results.push(row);
  }

  return results;
}

/** Helper to get sort order clause.
 *  Note: `state` sort pulls from organizations.state (post-PR#3a JOIN). */
function getOrderByClause(sortBy?: string) {
  switch (sortBy) {
    case "name_desc":
      return desc(grants.name);
    case "category":
      return asc(grants.category);
    case "country":
      return asc(grants.country);
    case "newest":
      return desc(grants.createdAt);
    case "state":
      return asc(organizations.state);
    case "name_asc":
    default:
      return asc(grants.name);
  }
}

/** Get a single grant by itemId */
export async function getGrantByItemId(itemId: string) {
  const db = await getDb();
  if (!db) {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const catalogPath = path.resolve(process.cwd(), "client/src/data/catalog.json");
      const allGrants: any[] = JSON.parse(fs.readFileSync(catalogPath, "utf-8"));
      return allGrants.find((g: any) => g.id === itemId || g.itemId === itemId) || null;
    } catch { return null; }
  }
  const result = await db
    .select(grantWithOrgColumns)
    .from(grants)
    .leftJoin(organizations, eq(grants.orgId, organizations.orgId))
    .where(eq(grants.itemId, itemId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

/** Get translations for a grant */
export async function getGrantTranslations(itemId: string) {
  const db = await getDb();
  if (!db) {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const translationsPath = path.resolve(process.cwd(), "client/src/data/catalogTranslations.json");
      const all: any = JSON.parse(fs.readFileSync(translationsPath, "utf-8"));
      return all[itemId] || {};
    } catch { return {}; }
  }

  const result = await db
    .select()
    .from(grantTranslations)
    .where(eq(grantTranslations.grantItemId, itemId));

  const translations: Record<string, { name: string; description: string; eligibility: string; applicationProcess?: string; deadline?: string; targetDiagnosis?: string; ageRange?: string; geographicScope?: string; documentsRequired?: string }> = {};
  for (const row of result) {
    translations[row.language] = {
      name: row.name || "",
      description: row.description || "",
      eligibility: row.eligibility || "",
      applicationProcess: row.applicationProcess || "",
      deadline: row.deadline || "",
      targetDiagnosis: row.targetDiagnosis || "",
      ageRange: row.ageRange || "",
      geographicScope: row.geographicScope || "",
      documentsRequired: row.documentsRequired || "",
    };
  }
  return translations;
}

/** Get translations for multiple grants at once */
export async function getBulkGrantTranslations(itemIds: string[]) {
  const db = await getDb();
  if (!db) {
    if (itemIds.length === 0) return {};
    try {
      const fs = await import("fs");
      const path = await import("path");
      const translationsPath = path.resolve(process.cwd(), "client/src/data/catalogTranslations.json");
      const all: any = JSON.parse(fs.readFileSync(translationsPath, "utf-8"));
      const result: Record<string, any> = {};
      for (const id of itemIds) { if (all[id]) result[id] = all[id]; }
      return result;
    } catch { return {}; }
  }
  if (itemIds.length === 0) return {};

  const result = await db
    .select()
    .from(grantTranslations)
    .where(inArray(grantTranslations.grantItemId, itemIds));

  const translations: Record<string, Record<string, { name: string; description: string; eligibility: string; applicationProcess?: string; deadline?: string; targetDiagnosis?: string; ageRange?: string; geographicScope?: string; documentsRequired?: string }>> = {};
  for (const row of result) {
    if (!translations[row.grantItemId]) {
      translations[row.grantItemId] = {};
    }
    translations[row.grantItemId][row.language] = {
      name: row.name || "",
      description: row.description || "",
      eligibility: row.eligibility || "",
      applicationProcess: row.applicationProcess || "",
      deadline: row.deadline || "",
      targetDiagnosis: row.targetDiagnosis || "",
      ageRange: row.ageRange || "",
      geographicScope: row.geographicScope || "",
      documentsRequired: row.documentsRequired || "",
    };
  }
  return translations;
}

/** Create a new grant.
 *
 *  Post-PR#3a: org-scoped fields (organization/website/phone/email) are silently
 *  ignored — they now live on the organizations table and will be DROPped from
 *  grants in Step 3b. PR#3b will replace the admin form with an org-dropdown
 *  so the caller provides `orgId` instead. Until then, admin-created grants
 *  land with `orgId = NULL` and render without contact details. */
export async function createGrant(data: {
  name: string;
  organization?: string;   // ignored post-PR#3a
  description?: string;
  category: string;
  type: "grant" | "resource";
  country: string;
  eligibility?: string;
  website?: string;        // ignored post-PR#3a
  phone?: string;          // ignored post-PR#3a
  email?: string;          // ignored post-PR#3a
  amount?: string;
  status?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Generate a unique itemId
  const countResult = await db.select({ count: count() }).from(grants);
  const nextNum = (countResult[0]?.count ?? 0) + 1;
  const itemId = `item_${String(nextNum).padStart(4, "0")}`;

  await db.insert(grants).values({
    itemId,
    name: data.name,
    description: data.description || "",
    category: data.category,
    type: data.type,
    country: data.country,
    eligibility: data.eligibility || "",
    amount: data.amount || "",
    status: data.status || "",
    isActive: true,
  });

  return { itemId };
}

/** Update an existing grant.
 *
 *  Post-PR#3a: org-scoped fields (organization/website/phone/email) are silently
 *  ignored — they now live on the organizations table. PR#3b will add an admin
 *  flow to edit organizations directly via `organizations` router. */
export async function updateGrant(itemId: string, data: {
  name?: string;
  organization?: string;   // ignored post-PR#3a
  description?: string;
  category?: string;
  type?: "grant" | "resource";
  country?: string;
  eligibility?: string;
  website?: string;        // ignored post-PR#3a
  phone?: string;          // ignored post-PR#3a
  email?: string;          // ignored post-PR#3a
  amount?: string;
  status?: string;
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateSet: Record<string, unknown> = {};
  if (data.name !== undefined) updateSet.name = data.name;
  if (data.description !== undefined) updateSet.description = data.description;
  if (data.category !== undefined) updateSet.category = data.category;
  if (data.type !== undefined) updateSet.grantType = data.type;
  if (data.country !== undefined) updateSet.country = data.country;
  if (data.eligibility !== undefined) updateSet.eligibility = data.eligibility;
  if (data.amount !== undefined) updateSet.amount = data.amount;
  if (data.status !== undefined) updateSet.status = data.status;
  if (data.isActive !== undefined) updateSet.isActive = data.isActive;

  if (Object.keys(updateSet).length === 0) return;

  await db.update(grants).set(updateSet).where(eq(grants.itemId, itemId));
}

/** Delete a grant (soft delete — set isActive to false) */
export async function deleteGrant(itemId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(grants).set({ isActive: false }).where(eq(grants.itemId, itemId));
}

/** Hard delete a grant and its translations */
export async function hardDeleteGrant(itemId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(grantTranslations).where(eq(grantTranslations.grantItemId, itemId));
  await db.delete(grants).where(eq(grants.itemId, itemId));
}

/** Upsert grant translations */
export async function upsertGrantTranslations(itemId: string, translations: Record<string, { name?: string; description?: string; eligibility?: string }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  for (const [lang, content] of Object.entries(translations)) {
    await db.insert(grantTranslations).values({
      grantItemId: itemId,
      language: lang,
      name: content.name || "",
      description: content.description || "",
      eligibility: content.eligibility || "",
    }).onDuplicateKeyUpdate({
      set: {
        name: content.name || "",
        description: content.description || "",
        eligibility: content.eligibility || "",
      },
    });
  }
}

/** Bulk import grants with upsert support.
 *
 *  Post-PR#3a: org-scoped fields (organization/website/phone/email) are
 *  accepted in the input for backward compat but NOT written to `grants` —
 *  they'll be DROPped in Step 3b. Org attribution happens via `orgId`,
 *  which this legacy path does not yet set. PR#3b will replace this import
 *  flow with an org-aware pipeline that looks up / creates organizations
 *  first, then attaches grants via `orgId`. */
export async function bulkImportGrants(grantsData: Array<{
  itemId?: string;
  name: string;
  organization: string;   // ignored post-PR#3a
  description: string;
  category: string;
  type: "grant" | "resource";
  country: string;
  eligibility: string;
  website: string;        // ignored post-PR#3a
  phone: string;          // ignored post-PR#3a
  email: string;          // ignored post-PR#3a
  amount: string;
  status: string;
  translations: Record<string, { name: string; description: string; eligibility: string }>;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let created = 0;
  let updated = 0;
  const errors: Array<{ index: number; name: string; error: string }> = [];

  for (let i = 0; i < grantsData.length; i++) {
    const g = grantsData[i];
    try {
      let itemId = g.itemId;

      if (itemId) {
        // Check if grant exists for upsert
        const existing = await db.select({ id: grants.id }).from(grants).where(eq(grants.itemId, itemId)).limit(1);
        if (existing.length > 0) {
          // Update existing
          await db.update(grants).set({
            name: g.name,
            description: g.description,
            category: g.category,
            type: g.type,
            country: g.country,
            eligibility: g.eligibility,
            amount: g.amount,
            status: g.status,
            isActive: true,
          }).where(eq(grants.itemId, itemId));
          updated++;
        } else {
          // Create with provided itemId
          await db.insert(grants).values({
            itemId,
            name: g.name,
            description: g.description,
            category: g.category,
            type: g.type,
            country: g.country,
            eligibility: g.eligibility,
            amount: g.amount,
            status: g.status,
            isActive: true,
          });
          created++;
        }
      } else {
        // Create new with auto-generated itemId
        const countResult = await db.select({ count: count() }).from(grants);
        const nextNum = (countResult[0]?.count ?? 0) + 1;
        itemId = `item_${String(nextNum).padStart(4, "0")}`;

        await db.insert(grants).values({
          itemId,
          name: g.name,
          description: g.description,
          category: g.category,
          type: g.type,
          country: g.country,
          eligibility: g.eligibility,
          amount: g.amount,
          status: g.status,
          isActive: true,
        });
        created++;
      }

      // Upsert translations
      if (Object.keys(g.translations).length > 0) {
        await upsertGrantTranslations(itemId, g.translations);
      }
    } catch (err: any) {
      errors.push({ index: i, name: g.name, error: err.message || "Unknown error" });
    }
  }

  return { created, updated, errors, total: grantsData.length };
}

/** Get grant stats for admin dashboard */
export async function getGrantStats() {
  const db = await getDb();
  if (!db) return { total: 0, active: 0, inactive: 0, grants: 0, resources: 0 };

  const [totalResult, activeResult, typeResult] = await Promise.all([
    db.select({ count: count() }).from(grants),
    db.select({ count: count() }).from(grants).where(eq(grants.isActive, true)),
    db.select({ type: grants.type, count: count() }).from(grants).where(eq(grants.isActive, true)).groupBy(grants.type),
  ]);

  const total = totalResult[0]?.count ?? 0;
  const active = activeResult[0]?.count ?? 0;
  let grantsCount = 0;
  let resourcesCount = 0;
  for (const row of typeResult) {
    if (row.type === "grant") grantsCount = Number(row.count);
    if (row.type === "resource") resourcesCount = Number(row.count);
  }

  return { total, active, inactive: total - active, grants: grantsCount, resources: resourcesCount };
}

/** Get distinct states with grant counts for filter dropdown.
 *  Optionally filter to a specific country.
 *  Post-PR#3a: state/city live on organizations table — JOIN through orgId. */
export async function getDistinctStates(countryCode?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [
    eq(grants.isActive, true),
    sql`${organizations.state} IS NOT NULL AND ${organizations.state} != ''`,
    // Hide pseudo-locations from the cascade dropdown — they are not
    // real geographic units and would just clutter the picker.
    sql`${organizations.state} NOT IN ('Nationwide', 'International')`,
  ];
  if (countryCode) conditions.push(eq(grants.country, countryCode));

  const result = await db
    .select({ state: organizations.state, count: count() })
    .from(grants)
    .leftJoin(organizations, eq(grants.orgId, organizations.orgId))
    .where(and(...conditions))
    .groupBy(organizations.state)
    .orderBy(desc(count()));

  return result.map(r => ({ state: r.state as string, count: Number(r.count) }));
}

/** Get distinct cities for a given state with grant counts for filter dropdown.
 *  Post-PR#3a: state/city live on organizations table — JOIN through orgId. */
export async function getDistinctCities(stateName: string) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({ city: organizations.city, count: count() })
    .from(grants)
    .leftJoin(organizations, eq(grants.orgId, organizations.orgId))
    .where(
      and(
        eq(grants.isActive, true),
        eq(organizations.state, stateName),
        sql`${organizations.city} IS NOT NULL AND ${organizations.city} != ''`
      )
    )
    .groupBy(organizations.city)
    .orderBy(asc(organizations.city));

  return result.map(r => ({ city: r.city as string, count: Number(r.count) }));
}

/** Get distinct country codes with grant counts for filter dropdown.
 *  Optionally restrict to a region bucket (US / EU / GB) — used by the
 *  toolbar's cascading Country dropdown so the options narrow when the
 *  user has already picked a region. */
export async function getDistinctCountries(region?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [
    eq(grants.isActive, true),
    sql`${grants.country} IS NOT NULL AND ${grants.country} != ''`,
  ];

  if (region === "US") {
    conditions.push(eq(grants.country, "US"));
  } else if (region === "GB") {
    conditions.push(eq(grants.country, "GB"));
  } else if (region === "EU") {
    const EU_CODES = [
      "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU",
      "IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE",
    ];
    conditions.push(sql`${grants.country} IN (${sql.join(EU_CODES.map(c => sql`${c}`), sql`, `)})`);
  }

  const result = await db
    .select({ country: grants.country, count: count() })
    .from(grants)
    .where(and(...conditions))
    .groupBy(grants.country)
    .orderBy(desc(count()));

  return result.map(r => ({ country: r.country as string, count: Number(r.count) }));
}

/** Get category counts (active grants only) for filter chips */
export async function getCategoryCounts() {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({ category: grants.category, count: count() })
    .from(grants)
    .where(
      and(
        eq(grants.isActive, true),
        sql`${grants.category} IS NOT NULL AND ${grants.category} != ''`
      )
    )
    .groupBy(grants.category)
    .orderBy(desc(count()));

  return result.map(r => ({ category: r.category as string, count: Number(r.count) }));
}

/** Get related grants by category (excluding the current one) */
/** Export all grants with their translations for CSV/Excel export */
export async function exportAllGrants(options?: {
  category?: string;
  country?: string;
  type?: string;
  activeOnly?: boolean;
}) {
  const db = await getDb();
  if (!db) return [];

  const { category, country, type, activeOnly = true } = options || {};

  const conditions: any[] = [];
  if (activeOnly) conditions.push(eq(grants.isActive, true));
  if (category && category !== "all") conditions.push(eq(grants.category, category));
  if (country && country !== "all") conditions.push(eq(grants.country, country));
  if (type && type !== "all") conditions.push(eq(grants.type, type as "grant" | "resource"));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Post-PR#3a: JOIN organizations so exported rows keep the pre-migration
  // shape (organization/website/phone/email/state/city/address/etc.) via
  // `grantWithOrgColumns` aliases.
  const allGrants = await db
    .select(grantWithOrgColumns)
    .from(grants)
    .leftJoin(organizations, eq(grants.orgId, organizations.orgId))
    .where(whereClause)
    .orderBy(asc(grants.name));

  // Fetch all translations in one query
  const itemIds = allGrants.map(g => g.itemId);
  const allTranslations = itemIds.length > 0
    ? await getBulkGrantTranslations(itemIds)
    : {};

  return allGrants.map(g => ({
    ...g,
    translations: allTranslations[g.itemId] || {},
  }));
}

export async function getRelatedGrants(itemId: string, category: string, limit = 4) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select(grantWithOrgColumns)
    .from(grants)
    .leftJoin(organizations, eq(grants.orgId, organizations.orgId))
    .where(and(
      eq(grants.category, category),
      eq(grants.isActive, true),
      sql`${grants.itemId} != ${itemId}`
    ))
    .limit(limit);

  return result;
}

/** Get all active grant itemIds and updatedAt for sitemap generation */
export async function getAllGrantItemIds(): Promise<Array<{ itemId: string; updatedAt: Date }>> {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({ itemId: grants.itemId, updatedAt: grants.updatedAt })
    .from(grants)
    .where(eq(grants.isActive, true))
    .orderBy(asc(grants.name));

  return result;
}

// ===== Organizations helpers =====

/**
 * EU country codes — used by `region: "EU"` filter to expand into 27 concrete
 * country codes. Kept in sync with `getDistinctCountries`'s EU_CODES constant.
 */
const ORG_EU_CODES = [
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU",
  "IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE",
] as const;

export interface ListOrganizationsOptions {
  country?: string;
  region?: string;            // "US" | "EU" | "GB" — narrows country set
  state?: string;
  city?: string;
  category?: string;          // matched against comma-separated `categories` column
  search?: string;
  sortBy?: string;            // "name-asc" | "name-desc" | "branches-desc" | "programs-desc"
  bounds?: { swLat: number; swLng: number; neLat: number; neLng: number };
  limit?: number;
  offset?: number;
}

/**
 * Build the shared WHERE-clause conditions for organization queries.
 * Extracted so that `listOrganizations`, `getOrgDistinctCountries`, etc. can
 * reuse the same filter logic and stay in sync.
 */
function buildOrgConditions(options: ListOrganizationsOptions): any[] {
  const { country, region, state, city, category, search, bounds } = options;
  const conditions: any[] = [eq(organizations.isActive, true)];

  if (country && country !== "all") {
    conditions.push(eq(organizations.country, country));
  } else if (region === "US") {
    conditions.push(eq(organizations.country, "US"));
  } else if (region === "GB") {
    conditions.push(eq(organizations.country, "GB"));
  } else if (region === "EU") {
    conditions.push(
      sql`${organizations.country} IN (${sql.join(ORG_EU_CODES.map((c) => sql`${c}`), sql`, `)})`,
    );
  }

  if (state && state !== "all") conditions.push(eq(organizations.state, state));
  // City matches against any branch (HQ or Branch) of the org, not just the
  // HQ row's city — so picking "Lyon" returns orgs whose HQ is in Paris but
  // operate a branch in Lyon. Aligns the result list with the city dropdown,
  // which is sourced from `organization_branches` (see getOrgDistinctCities).
  if (city && city !== "all") {
    conditions.push(sql`EXISTS (
      SELECT 1 FROM ${organizationBranches}
      WHERE ${organizationBranches.orgId} = ${organizations.orgId}
        AND ${organizationBranches.city} = ${city}
    )`);
  }

  if (category && category !== "all") {
    // `categories` is a comma-separated text column — match the token with
    // boundary LIKE patterns so "medical" does not match "medical_equipment".
    conditions.push(
      or(
        eq(organizations.categories, category),
        like(organizations.categories, `${category},%`),
        like(organizations.categories, `%,${category},%`),
        like(organizations.categories, `%,${category}`),
      ),
    );
  }

  if (search) {
    conditions.push(
      or(
        like(organizations.name, `%${search}%`),
        like(organizations.description, `%${search}%`),
        like(organizations.city, `%${search}%`),
        like(organizations.state, `%${search}%`),
        like(organizations.categories, `%${search}%`),
      ),
    );
  }

  if (bounds) {
    conditions.push(
      and(
        gte(organizations.latitude, String(bounds.swLat)),
        lte(organizations.latitude, String(bounds.neLat)),
        gte(organizations.longitude, String(bounds.swLng)),
        lte(organizations.longitude, String(bounds.neLng)),
      ),
    );
  }

  return conditions;
}

/** List organizations with catalog-parity filters. Returns full rows so the
 *  catalog cards can render without a follow-up fetch. */
export async function listOrganizations(options?: ListOrganizationsOptions): Promise<{
  organizations: Array<{
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
  }>;
  total: number;
}> {
  const db = await getDb();
  if (!db) return { organizations: [], total: 0 };

  const { limit = 100, offset = 0, sortBy = "name-asc" } = options || {};
  const conditions = buildOrgConditions(options || {});
  const whereClause = and(...conditions);

  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 500);
  const safeOffset = Math.max(Math.floor(offset), 0);
  const limitLit: any = sql.raw(String(safeLimit));
  const offsetLit: any = sql.raw(String(safeOffset));

  let orderClause: any;
  switch (sortBy) {
    case "name-desc":
      orderClause = desc(organizations.name);
      break;
    case "branches-desc":
      orderClause = desc(organizations.branchesCount);
      break;
    case "programs-desc":
      orderClause = desc(organizations.programsCount);
      break;
    case "name-asc":
    default:
      orderClause = asc(organizations.name);
  }

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(organizations)
      .where(whereClause)
      .orderBy(orderClause)
      .limit(limitLit)
      .offset(offsetLit),
    db.select({ count: count() }).from(organizations).where(whereClause),
  ]);

  return {
    organizations: rows.map((r) => ({
      orgId: r.orgId,
      name: String(r.name ?? ""),
      description: r.description ?? null,
      country: r.country,
      state: r.state ?? null,
      city: r.city ?? null,
      hqAddress: r.hqAddress ?? null,
      website: r.website ?? null,
      phone: r.phone ?? null,
      email: r.email ?? null,
      latitude: r.latitude === null ? null : Number(r.latitude),
      longitude: r.longitude === null ? null : Number(r.longitude),
      programsCount: r.programsCount,
      branchesCount: r.branchesCount,
      categories: r.categories ?? null,
      serviceArea: r.serviceArea ?? null,
      officeHours: r.officeHours ?? null,
    })),
    total: countResult[0]?.count ?? 0,
  };
}

/** Distinct country codes for the organizations toolbar — optionally narrowed
 *  to a region bucket (US / EU / GB). Mirror of `getDistinctCountries`. */
export async function getOrgDistinctCountries(region?: string): Promise<Array<{ country: string; count: number }>> {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [
    eq(organizations.isActive, true),
    sql`${organizations.country} IS NOT NULL AND ${organizations.country} != ''`,
  ];

  if (region === "US") {
    conditions.push(eq(organizations.country, "US"));
  } else if (region === "GB") {
    conditions.push(eq(organizations.country, "GB"));
  } else if (region === "EU") {
    conditions.push(
      sql`${organizations.country} IN (${sql.join(ORG_EU_CODES.map((c) => sql`${c}`), sql`, `)})`,
    );
  }

  const result = await db
    .select({ country: organizations.country, count: count() })
    .from(organizations)
    .where(and(...conditions))
    .groupBy(organizations.country)
    .orderBy(desc(count()));

  return result.map((r) => ({ country: r.country as string, count: Number(r.count) }));
}

/** Distinct states with org counts — optionally narrowed to a country.
 *  Pseudo-locations (`International`) are filtered out. */
export async function getOrgDistinctStates(countryCode?: string): Promise<Array<{ state: string; count: number }>> {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [
    eq(organizations.isActive, true),
    sql`${organizations.state} IS NOT NULL AND ${organizations.state} != ''`,
    sql`${organizations.state} NOT IN ('Nationwide', 'International')`,
  ];
  if (countryCode && countryCode !== "all") conditions.push(eq(organizations.country, countryCode));

  const result = await db
    .select({ state: organizations.state, count: count() })
    .from(organizations)
    .where(and(...conditions))
    .groupBy(organizations.state)
    .orderBy(desc(count()));

  return result.map((r) => ({ state: r.state as string, count: Number(r.count) }));
}

/** Distinct cities with org counts — narrowed by country and/or state.
 *  Sources cities from `organization_branches` (which holds 1 HQ row + N
 *  Branch rows per org), so users see every city an org operates in, not
 *  just HQ cities. `COUNT(DISTINCT orgId)` ensures an org with HQ + Branch
 *  in the same city counts once. Sorted by org count desc, matching the
 *  state dropdown's relevance order. */
export async function getOrgDistinctCities(
  filter: { country?: string; state?: string } = {},
): Promise<Array<{ city: string; count: number }>> {
  const db = await getDb();
  if (!db) return [];
  if (!filter.country && !filter.state) return [];

  const conditions: any[] = [
    sql`${organizationBranches.city} IS NOT NULL AND ${organizationBranches.city} != ''`,
    // Only return cities that belong to active orgs — avoids stale branch
    // rows for orgs that have been soft-deleted.
    sql`EXISTS (
      SELECT 1 FROM ${organizations}
      WHERE ${organizations.orgId} = ${organizationBranches.orgId}
        AND ${organizations.isActive} = TRUE
    )`,
  ];
  if (filter.country) conditions.push(eq(organizationBranches.country, filter.country));
  if (filter.state)   conditions.push(eq(organizationBranches.state, filter.state));

  const result = await db
    .select({
      city: organizationBranches.city,
      count: sql<number>`COUNT(DISTINCT ${organizationBranches.orgId})`,
    })
    .from(organizationBranches)
    .where(and(...conditions))
    .groupBy(organizationBranches.city)
    .orderBy(desc(sql`COUNT(DISTINCT ${organizationBranches.orgId})`), asc(organizationBranches.city));

  return result.map((r) => ({ city: r.city as string, count: Number(r.count) }));
}

/** Tally categories across all active organizations.
 *  `categories` is a comma-separated text column — we parse in application code
 *  rather than push a GROUP BY on a normalized token list.
 *
 *  Returns counts of organizations that list each category (multi-category
 *  orgs contribute to each bucket they mention). */
export async function getOrgCategoryCounts(): Promise<Array<{ category: string; count: number }>> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({ categories: organizations.categories })
    .from(organizations)
    .where(
      and(
        eq(organizations.isActive, true),
        sql`${organizations.categories} IS NOT NULL AND ${organizations.categories} != ''`,
      ),
    );

  const tally = new Map<string, number>();
  for (const r of rows) {
    if (!r.categories) continue;
    const tokens = r.categories
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const seen = new Set<string>();
    for (const tok of tokens) {
      if (seen.has(tok)) continue;
      seen.add(tok);
      tally.set(tok, (tally.get(tok) ?? 0) + 1);
    }
  }

  return Array.from(tally.entries())
    .map(([category, c]) => ({ category, count: c }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Multi-term smart search over organizations — matches any of the given
 * terms in name, description, city, state, or categories. Mirror of
 * `searchGrantsMultiTerm` but scoped to organizations.
 */
export async function searchOrganizationsMultiTerm(
  terms: string[],
  options?: { country?: string; category?: string; limit?: number },
): Promise<Array<{
  orgId: string;
  name: string;
  description: string | null;
  country: string;
  state: string | null;
  city: string | null;
  website: string | null;
  categories: string | null;
  latitude: number | null;
  longitude: number | null;
  branchesCount: number;
}>> {
  const db = await getDb();
  if (!db) return [];
  if (terms.length === 0) return [];

  const { country, category, limit = 20 } = options || {};
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 50);
  const limitLit: any = sql.raw(String(safeLimit));

  const termConditions = terms.map((term) =>
    or(
      like(organizations.name, `%${term}%`),
      like(organizations.description, `%${term}%`),
      like(organizations.city, `%${term}%`),
      like(organizations.state, `%${term}%`),
      like(organizations.categories, `%${term}%`),
    ),
  );

  const conditions: any[] = [eq(organizations.isActive, true), or(...termConditions)];
  if (country && country !== "all") conditions.push(eq(organizations.country, country));
  if (category && category !== "all") {
    conditions.push(
      or(
        eq(organizations.categories, category),
        like(organizations.categories, `${category},%`),
        like(organizations.categories, `%,${category},%`),
        like(organizations.categories, `%,${category}`),
      ),
    );
  }

  const rows = await db
    .select({
      orgId: organizations.orgId,
      name: organizations.name,
      description: organizations.description,
      country: organizations.country,
      state: organizations.state,
      city: organizations.city,
      website: organizations.website,
      categories: organizations.categories,
      latitude: organizations.latitude,
      longitude: organizations.longitude,
      branchesCount: organizations.branchesCount,
    })
    .from(organizations)
    .where(and(...conditions))
    .orderBy(asc(organizations.name))
    .limit(limitLit);

  return rows.map((r) => ({
    orgId: r.orgId,
    name: String(r.name ?? ""),
    description: r.description ?? null,
    country: r.country,
    state: r.state ?? null,
    city: r.city ?? null,
    website: r.website ?? null,
    categories: r.categories ?? null,
    latitude: r.latitude === null ? null : Number(r.latitude),
    longitude: r.longitude === null ? null : Number(r.longitude),
    branchesCount: r.branchesCount,
  }));
}

/** Get a single organization by orgId plus its branches. */
export async function getOrganizationDetail(orgId: string): Promise<{
  organization: Organization | null;
  branches: OrganizationBranch[];
}> {
  const db = await getDb();
  if (!db) return { organization: null, branches: [] };

  const [orgRows, branchRows] = await Promise.all([
    db
      .select()
      .from(organizations)
      .where(and(eq(organizations.orgId, orgId), eq(organizations.isActive, true)))
      .limit(1),
    db
      .select()
      .from(organizationBranches)
      .where(eq(organizationBranches.orgId, orgId))
      .orderBy(asc(organizationBranches.branchType), asc(organizationBranches.city)),
  ]);

  return {
    organization: orgRows[0] ?? null,
    branches: branchRows,
  };
}

/**
 * Get branch coordinates for the catalog map markers.
 *
 * Filters to branches that belong to *organizations matching the toolbar*.
 * That is: region/country/state/city/category/search narrow the org set, and
 * we return every branch of those orgs with valid lat/lng. This lets the map
 * markers stay 1:1 in sync with the catalog list even when a branch's own
 * country differs from its HQ's country (e.g. a US org with a branch in CA).
 */
export async function getOrganizationMapPoints(options: {
  bounds?: { swLat: number; swLng: number; neLat: number; neLng: number };
  country?: string;
  region?: string;
  state?: string;
  city?: string;
  category?: string;
  search?: string;
  limit?: number;
}): Promise<Array<{
  branchId: string;
  orgId: string;
  name: string;
  branchType: "HQ" | "Branch";
  country: string;
  latitude: number;
  longitude: number;
}>> {
  const db = await getDb();
  if (!db) return [];

  const { bounds, limit = 2000 } = options;

  // Filter organizations using the same conditions as `listOrganizations`.
  // Note that bounds is NOT applied to orgs here — it's applied to branches.
  const orgConditions = buildOrgConditions({
    country: options.country,
    region: options.region,
    state: options.state,
    city: options.city,
    category: options.category,
    search: options.search,
  });

  const branchConditions: any[] = [
    isNotNull(organizationBranches.latitude),
    isNotNull(organizationBranches.longitude),
    // Reject "null island" rows (lat=0 AND lng=0). MySQL stores DECIMAL as
    // strings, so a single point off the coast of Africa can otherwise drag
    // the SuperCluster centroid hundreds of km away from the real cluster
    // (e.g. France's 438 markers visually drifting over the UK at world zoom).
    sql`NOT (${organizationBranches.latitude} = 0 AND ${organizationBranches.longitude} = 0)`,
  ];
  if (bounds) {
    branchConditions.push(
      and(
        gte(organizationBranches.latitude, String(bounds.swLat)),
        lte(organizationBranches.latitude, String(bounds.neLat)),
        gte(organizationBranches.longitude, String(bounds.swLng)),
        lte(organizationBranches.longitude, String(bounds.neLng)),
      ),
    );
  }

  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 5000);
  const limitLit: any = sql.raw(String(safeLimit));

  const rows = await db
    .select({
      branchId: organizationBranches.branchId,
      orgId: organizationBranches.orgId,
      name: organizations.name,
      branchType: organizationBranches.branchType,
      country: organizationBranches.country,
      latitude: organizationBranches.latitude,
      longitude: organizationBranches.longitude,
    })
    .from(organizationBranches)
    .innerJoin(organizations, eq(organizationBranches.orgId, organizations.orgId))
    .where(and(...orgConditions, ...branchConditions))
    .limit(limitLit);

  return rows
    .filter((r) => r.latitude !== null && r.longitude !== null)
    .map((r) => ({
      branchId: r.branchId,
      orgId: r.orgId,
      name: String(r.name ?? ""),
      branchType: r.branchType as "HQ" | "Branch",
      country: r.country,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
    }));
}
