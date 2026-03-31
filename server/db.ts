import { eq, and, or, like, desc, asc, count, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, savedGrants, newsletterSubscribers, grants, grantTranslations, notificationHistory } from "../drizzle/schema";
import type { Grant, InsertGrant, GrantTranslation } from "../drizzle/schema";
import * as crypto from "crypto";
import { ENV } from './_core/env';

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
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
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
  if (!db) return { grants: [], total: 0 };

  const { search, language, category, country, type, sortBy = "name_asc", fundingType, targetDiagnosis, ageRange, b2VisaEligible, hasDeadline, state, city, limit = 50, offset = 0, activeOnly = true } = options || {};

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
      conditions.push(eq(grants.state, state));
    }
    if (city && city !== "all") {
      conditions.push(eq(grants.city, city));
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
      like(grants.organization, `%${search}%`),
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
      db.select().from(grants).where(whereClause).orderBy(orderByClause).limit(limit).offset(offset),
      db.select({ count: count() }).from(grants).where(whereClause),
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
        like(grants.organization, `%${search}%`),
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
      .select()
      .from(grants)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(grants)
      .where(whereClause),
  ]);

  return {
    grants: grantList,
    total: countResult[0]?.count ?? 0,
  };
}

/** Helper to get sort order clause */
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
      return asc(grants.state);
    case "name_asc":
    default:
      return asc(grants.name);
  }
}

/** Get a single grant by itemId */
export async function getGrantByItemId(itemId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(grants).where(eq(grants.itemId, itemId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

/** Get translations for a grant */
export async function getGrantTranslations(itemId: string) {
  const db = await getDb();
  if (!db) return {};

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
  if (!db || itemIds.length === 0) return {};

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

/** Create a new grant */
export async function createGrant(data: {
  name: string;
  organization?: string;
  description?: string;
  category: string;
  type: "grant" | "resource";
  country: string;
  eligibility?: string;
  website?: string;
  phone?: string;
  email?: string;
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
    organization: data.organization || "",
    description: data.description || "",
    category: data.category,
    type: data.type,
    country: data.country,
    eligibility: data.eligibility || "",
    website: data.website || "",
    phone: data.phone || "",
    email: data.email || "",
    amount: data.amount || "",
    status: data.status || "",
    isActive: true,
  });

  return { itemId };
}

/** Update an existing grant */
export async function updateGrant(itemId: string, data: {
  name?: string;
  organization?: string;
  description?: string;
  category?: string;
  type?: "grant" | "resource";
  country?: string;
  eligibility?: string;
  website?: string;
  phone?: string;
  email?: string;
  amount?: string;
  status?: string;
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateSet: Record<string, unknown> = {};
  if (data.name !== undefined) updateSet.name = data.name;
  if (data.organization !== undefined) updateSet.organization = data.organization;
  if (data.description !== undefined) updateSet.description = data.description;
  if (data.category !== undefined) updateSet.category = data.category;
  if (data.type !== undefined) updateSet.grantType = data.type;
  if (data.country !== undefined) updateSet.country = data.country;
  if (data.eligibility !== undefined) updateSet.eligibility = data.eligibility;
  if (data.website !== undefined) updateSet.website = data.website;
  if (data.phone !== undefined) updateSet.phone = data.phone;
  if (data.email !== undefined) updateSet.grantEmail = data.email;
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

/** Bulk import grants with upsert support */
export async function bulkImportGrants(grantsData: Array<{
  itemId?: string;
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
            organization: g.organization,
            description: g.description,
            category: g.category,
            type: g.type,
            country: g.country,
            eligibility: g.eligibility,
            website: g.website,
            phone: g.phone,
            email: g.email,
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
            organization: g.organization,
            description: g.description,
            category: g.category,
            type: g.type,
            country: g.country,
            eligibility: g.eligibility,
            website: g.website,
            phone: g.phone,
            email: g.email,
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
          organization: g.organization,
          description: g.description,
          category: g.category,
          type: g.type,
          country: g.country,
          eligibility: g.eligibility,
          website: g.website,
          phone: g.phone,
          email: g.email,
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

/** Get distinct states with grant counts for filter dropdown */
export async function getDistinctStates() {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({ state: grants.state, count: count() })
    .from(grants)
    .where(
      and(
        eq(grants.isActive, true),
        sql`${grants.state} IS NOT NULL AND ${grants.state} != ''`
      )
    )
    .groupBy(grants.state)
    .orderBy(desc(count()));

  return result.map(r => ({ state: r.state as string, count: Number(r.count) }));
}

/** Get distinct cities for a given state with grant counts for filter dropdown */
export async function getDistinctCities(stateName: string) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({ city: grants.city, count: count() })
    .from(grants)
    .where(
      and(
        eq(grants.isActive, true),
        eq(grants.state, stateName),
        sql`${grants.city} IS NOT NULL AND ${grants.city} != ''`
      )
    )
    .groupBy(grants.city)
    .orderBy(asc(grants.city));

  return result.map(r => ({ city: r.city as string, count: Number(r.count) }));
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

  const allGrants = await db
    .select()
    .from(grants)
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
    .select()
    .from(grants)
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
