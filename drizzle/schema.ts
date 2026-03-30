import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar, uniqueIndex } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with Paddle subscription fields for payment gating.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),

  // Paddle subscription fields
  paddleCustomerId: varchar("paddleCustomerId", { length: 128 }),
  paddleSubscriptionId: varchar("paddleSubscriptionId", { length: 128 }),
  subscriptionStatus: mysqlEnum("subscriptionStatus", ["none", "active", "cancelled", "past_due", "paused"]).default("none").notNull(),
  subscriptionPlanId: varchar("subscriptionPlanId", { length: 128 }),
  subscriptionCurrentPeriodEnd: timestamp("subscriptionCurrentPeriodEnd"),

  // Onboarding
  onboardingCompleted: boolean("onboardingCompleted").default(false).notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Saved/bookmarked grants for users.
 * Each row represents a user saving a specific grant from the catalog.
 */
export const savedGrants = mysqlTable("saved_grants", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  grantId: varchar("grantId", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("user_grant_idx").on(table.userId, table.grantId),
]);

export type SavedGrant = typeof savedGrants.$inferSelect;
export type InsertSavedGrant = typeof savedGrants.$inferInsert;

/**
 * Newsletter subscribers — both anonymous visitors and registered users.
 */
export const newsletterSubscribers = mysqlTable("newsletter_subscribers", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  userId: int("userId"),
  subscribedAt: timestamp("subscribedAt").defaultNow().notNull(),
  unsubscribedAt: timestamp("unsubscribedAt"),
  isActive: boolean("isActive").default(true).notNull(),
});

export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type InsertNewsletterSubscriber = typeof newsletterSubscribers.$inferInsert;
