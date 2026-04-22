import { boolean, decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar, uniqueIndex, index } from "drizzle-orm/mysql-core";

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

  // Email/password auth (Phase 0)
  passwordHash: varchar("passwordHash", { length: 255 }),
  emailVerified: boolean("emailVerified").default(false).notNull(),
  verificationToken: varchar("verificationToken", { length: 100 }),
  verificationTokenExpires: timestamp("verificationTokenExpires"),
  resetPasswordToken: varchar("resetPasswordToken", { length: 100 }),
  resetPasswordTokenExpires: timestamp("resetPasswordTokenExpires"),
  failedLoginAttempts: int("failedLoginAttempts").default(0).notNull(),
  lockedUntil: timestamp("lockedUntil"),

  // Paddle subscription fields
  paddleCustomerId: varchar("paddleCustomerId", { length: 128 }),
  paddleSubscriptionId: varchar("paddleSubscriptionId", { length: 128 }),
  subscriptionStatus: mysqlEnum("subscriptionStatus", ["none", "active", "cancelled", "past_due", "paused"]).default("none").notNull(),
  subscriptionPlanId: varchar("subscriptionPlanId", { length: 128 }),
  subscriptionCurrentPeriodEnd: timestamp("subscriptionCurrentPeriodEnd"),

  // Onboarding
  onboardingCompleted: boolean("onboardingCompleted").default(false).notNull(),
  targetCountry: varchar("targetCountry", { length: 8 }),
  purposes: text("purposes"),
  purposeDetails: text("purposeDetails"),
  needs: text("needs"),
  needDetails: text("needDetails"),
  profileCompletedAt: timestamp("profileCompletedAt"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, (table) => [
  index("users_email_idx").on(table.email),
  index("users_verification_token_idx").on(table.verificationToken),
  index("users_reset_token_idx").on(table.resetPasswordToken),
]);

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

  // Geocoding fields (Phase 1)
  address: varchar("address", { length: 500 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  serviceArea: varchar("serviceArea", { length: 100 }),
  officeHours: varchar("officeHours", { length: 200 }),
  geocodedAt: timestamp("geocodedAt"),

  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("grants_category_idx").on(table.category),
  index("grants_country_idx").on(table.country),
  index("grants_type_idx").on(table.type),
  index("grants_state_idx").on(table.state),
  index("grants_lat_lng_idx").on(table.latitude, table.longitude),
  index("grants_service_area_idx").on(table.serviceArea),
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

/**
 * Organizations catalog — 538 aid/grant-providing orgs across 29 countries.
 * Imported from data/organizations-2026-04-20.xlsx.
 */
export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  orgId: varchar("orgId", { length: 16 }).notNull().unique(),   // "ORG-0001"
  name: text("name").notNull(),
  description: text("description"),
  country: varchar("country", { length: 64 }).notNull(),         // ISO alpha-2 ან scope label ("International")
  state: varchar("state", { length: 128 }),
  city: varchar("city", { length: 128 }),
  hqAddress: varchar("hqAddress", { length: 500 }),
  website: text("website"),
  phone: varchar("phone", { length: 128 }),
  email: varchar("email", { length: 320 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  programsCount: int("programsCount").default(0).notNull(),
  branchesCount: int("branchesCount").default(1).notNull(),
  categories: text("categories"),                                 // comma-separated
  serviceArea: varchar("serviceArea", { length: 255 }),
  officeHours: varchar("officeHours", { length: 255 }),

  // ── Enrichment fields (v2 — user-approved set of 7 visible signals) ──
  // All nullable or default to "unknown" so existing rows remain valid and
  // the migration needs no backfill. UI renders every field conditionally.

  // Accessibility (the five "can I use this?" questions newcomers care about)
  languages: text("orgLanguages"),                                // CSV ISO codes: "en,ka,ru,es"
  acceptsUndocumented: mysqlEnum("acceptsUndocumented",
    ["yes", "no", "case_by_case", "unknown"]).default("unknown").notNull(),
  acceptsUninsured: mysqlEnum("acceptsUninsured",
    ["yes", "no", "unknown"]).default("unknown").notNull(),
  serviceCost: mysqlEnum("serviceCost",
    ["free", "sliding_scale", "paid", "insurance", "mixed", "unknown"]).default("unknown").notNull(),
  appointmentPolicy: mysqlEnum("appointmentPolicy",
    ["required", "walk_in", "both", "unknown"]).default("unknown").notNull(),

  // Google trust signals
  googleRating: decimal("googleRating", { precision: 2, scale: 1 }),
  googleReviewCount: int("googleReviewCount"),
  googlePlaceId: varchar("googlePlaceId", { length: 128 }),       // for targeted refresh

  // Content
  missionStatement: text("missionStatement"),
  socialMedia: text("socialMedia"),                               // JSON: {facebook, linkedin, twitter, instagram, youtube}

  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("orgs_country_idx").on(table.country),
  index("orgs_lat_lng_idx").on(table.latitude, table.longitude),
  index("orgs_accepts_undocumented_idx").on(table.acceptsUndocumented),
  index("orgs_service_cost_idx").on(table.serviceCost),
]);

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

/**
 * Organization translations — per-language overrides for free-text fields.
 * Structured enum values (cost, status, appointment) are translated client-side
 * via i18n keys; this table only stores prose (name / description /
 * missionStatement). Mirrors the grant_translations pattern.
 *
 * Populated by a future translation pipeline (AI auto-translate with admin
 * override); unique (orgId, language) enforces one row per language.
 */
export const organizationTranslations = mysqlTable("organization_translations", {
  id: int("id").autoincrement().primaryKey(),
  orgId: varchar("orgId", { length: 16 }).notNull(),              // FK → organizations.orgId
  language: varchar("language", { length: 10 }).notNull(),
  name: text("name"),
  description: text("description"),
  missionStatement: text("missionStatement"),
  translatedAt: timestamp("translatedAt").defaultNow().notNull(),
  source: varchar("source", { length: 32 }),                      // "ai" | "manual" | "imported"
}, (table) => [
  uniqueIndex("org_lang_idx").on(table.orgId, table.language),
  index("org_translations_lang_idx").on(table.language),
]);

export type OrganizationTranslation = typeof organizationTranslations.$inferSelect;
export type InsertOrganizationTranslation = typeof organizationTranslations.$inferInsert;

/**
 * Organization branches — 1 HQ row + 0..N Branch rows per organization.
 * Populated from Google Places API (source = "Google Places") where available.
 */
export const organizationBranches = mysqlTable("organization_branches", {
  id: int("id").autoincrement().primaryKey(),
  branchId: varchar("branchId", { length: 24 }).notNull().unique(), // "ORG-0001-B02"
  orgId: varchar("orgId", { length: 16 }).notNull(),                // FK → organizations.orgId
  branchType: mysqlEnum("branchType", ["HQ", "Branch"]).notNull(),
  country: varchar("country", { length: 64 }).notNull(),
  state: varchar("state", { length: 128 }),
  city: varchar("city", { length: 128 }),
  address: varchar("address", { length: 500 }),
  phone: varchar("phone", { length: 128 }),
  email: varchar("email", { length: 320 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  source: varchar("source", { length: 64 }),   // "Database" | "Google Places" | "Google Places (HQ)" | "Not found"
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("branches_org_idx").on(table.orgId),
  index("branches_country_idx").on(table.country),
  index("branches_lat_lng_idx").on(table.latitude, table.longitude),
]);

export type OrganizationBranch = typeof organizationBranches.$inferSelect;
export type InsertOrganizationBranch = typeof organizationBranches.$inferInsert;
