import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar, uniqueIndex, index } from "drizzle-orm/mysql-core";

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

/**
 * Grants catalog — all grants and resources stored in the database.
 * Replaces the static catalog.json file.
 */
export const grants = mysqlTable("grants", {
  id: int("id").autoincrement().primaryKey(),
  itemId: varchar("itemId", { length: 64 }).notNull().unique(),
  name: text("name").notNull(),
  organization: text("organization"),
  description: text("description"),
  category: varchar("category", { length: 64 }).notNull(),
  type: mysqlEnum("grantType", ["grant", "resource"]).default("grant").notNull(),
  country: varchar("country", { length: 64 }).notNull(),
  eligibility: text("eligibility"),
  website: text("website"),
  phone: varchar("phone", { length: 128 }),
  email: varchar("grantEmail", { length: 320 }),
  amount: text("amount"),
  status: text("status"),

  // Enrichment fields (Phase A)
  applicationProcess: text("applicationProcess"),
  deadline: text("deadline"),
  fundingType: varchar("fundingType", { length: 64 }),
  targetDiagnosis: text("targetDiagnosis"),
  ageRange: varchar("ageRange", { length: 32 }),
  geographicScope: text("geographicScope"),
  documentsRequired: text("documentsRequired"),
  b2VisaEligible: varchar("b2VisaEligible", { length: 32 }),

  // Location fields
  state: varchar("state", { length: 128 }),
  city: varchar("city", { length: 128 }),

  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("grants_category_idx").on(table.category),
  index("grants_country_idx").on(table.country),
  index("grants_type_idx").on(table.type),
  index("grants_state_idx").on(table.state),
]);

export type Grant = typeof grants.$inferSelect;
export type InsertGrant = typeof grants.$inferInsert;

/**
 * Grant translations — multilingual content for each grant.
 * Stores translated name, description, and eligibility per language.
 */
export const grantTranslations = mysqlTable("grant_translations", {
  id: int("id").autoincrement().primaryKey(),
  grantItemId: varchar("grantItemId", { length: 64 }).notNull(),
  language: varchar("language", { length: 10 }).notNull(),
  name: text("name"),
  description: text("description"),
  eligibility: text("eligibility"),

  // Enrichment fields translations
  applicationProcess: text("applicationProcess"),
  deadline: text("deadline"),
  targetDiagnosis: text("targetDiagnosis"),
  ageRange: varchar("ageRange", { length: 64 }),
  geographicScope: text("geographicScope"),
  documentsRequired: text("documentsRequired"),
}, (table) => [
  uniqueIndex("grant_lang_idx").on(table.grantItemId, table.language),
  index("grant_translations_lang_idx").on(table.language),
]);

export type GrantTranslation = typeof grantTranslations.$inferSelect;
export type InsertGrantTranslation = typeof grantTranslations.$inferInsert;

/**
 * Newsletter notification history — tracks sent email campaigns.
 * Records each batch of new-grant notification emails sent to subscribers.
 */
export const notificationHistory = mysqlTable("notification_history", {
  id: int("id").autoincrement().primaryKey(),
  subject: text("subject").notNull(),
  grantItemIds: text("grantItemIds").notNull(), // JSON array of grant itemIds included
  recipientCount: int("recipientCount").notNull().default(0),
  successCount: int("successCount").notNull().default(0),
  failCount: int("failCount").notNull().default(0),
  status: mysqlEnum("notifStatus", ["sending", "completed", "failed"]).default("sending").notNull(),
  sentBy: int("sentBy"), // admin user ID who triggered the send
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type NotificationHistory = typeof notificationHistory.$inferSelect;
export type InsertNotificationHistory = typeof notificationHistory.$inferInsert;
