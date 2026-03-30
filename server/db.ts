import { eq, and, or, like, desc, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, savedGrants, newsletterSubscribers } from "../drizzle/schema";
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
