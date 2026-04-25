import { boolean, decimal, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar, uniqueIndex, index } from "drizzle-orm/mysql-core";

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
  // ── Org-centric migration (Wave 1 / PR#1, 2026-04-23) ────────────────
  // Foreign key → organizations.orgId. NULL-able in PR#1 so the
  // deployment is non-breaking; PR#2 backfills values via fuzzy match
  // on `organization` + `country`, PR#3 flips to NOT NULL and drops
  // the duplicate columns (phone, email, hqAddress, latitude,
  // longitude, address). See .grantkit-redesign/EXECUTION-PLAN.md §3.
  orgId: varchar("orgId", { length: 16 }),
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
  index("grants_orgid_idx").on(table.orgId),
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

  // ── Contact provenance (Phase A — anti-hallucination tracking) ────────
  // Every phone/email we store must have a source and a verification
  // timestamp. UI badges show source on hover; scheduled re-verification
  // can target rows where `phoneVerifiedAt` is stale. Values mirror the
  // sources the scraper supports — free-form VARCHAR keeps us flexible
  // to add new sources without a migration.
  phoneSource: varchar("phoneSource", { length: 32 }),            // "google_places" | "website" | "manual" | "imported"
  phoneVerifiedAt: timestamp("phoneVerifiedAt"),
  emailSource: varchar("emailSource", { length: 32 }),
  emailVerifiedAt: timestamp("emailVerifiedAt"),
  contactFormUrl: varchar("contactFormUrl", { length: 500 }),     // fallback when org has no public email but a form
  contactEnrichmentBatch: varchar("contactEnrichmentBatch", { length: 32 }),  // "2026-04-23-001"
  contactEnrichmentStatus: mysqlEnum("contactEnrichmentStatus",
    ["pending", "enriched", "no_data", "failed"]).default("pending").notNull(),

  // ── France Import (Wave 2 — migration 0018) ──────────────────────────
  // Per-language prose stored as JSON: {en:{name,description,services,target},
  // fr:{...}, es:{...}, ru:{...}, ka:{...}}. Replaces the dropped
  // organization_translations table. Cells whose source value is Georgian on
  // a non-KA sheet stay NULL (handled by the import script's gap policy).
  translations: json("translations"),

  // France-specific descriptive fields (filled from the 5-language Excel).
  abbreviation: varchar("abbreviation", { length: 32 }),
  organizationType: mysqlEnum("organizationType", ["NGO", "association", "government", "private"]),
  servicesOffered: text("servicesOffered"),
  targetAudience: text("targetAudience"),
  emigrationPurpose: varchar("emigrationPurpose", { length: 64 }),  // CSV: "all,study,medical,work"
  foundedYear: int("foundedYear"),
  legalStatus: varchar("legalStatus", { length: 255 }),
  mainCategory: varchar("mainCategory", { length: 64 }),
  isNational: boolean("isNational").default(false).notNull(),

  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("orgs_country_idx").on(table.country),
  index("orgs_lat_lng_idx").on(table.latitude, table.longitude),
  index("orgs_accepts_undocumented_idx").on(table.acceptsUndocumented),
  index("orgs_service_cost_idx").on(table.serviceCost),
  index("orgs_contact_batch_idx").on(table.contactEnrichmentBatch),
  index("orgs_contact_status_idx").on(table.contactEnrichmentStatus),
  index("orgs_main_category_idx").on(table.mainCategory),
  index("orgs_is_national_idx").on(table.isNational),
  index("orgs_org_type_idx").on(table.organizationType),
]);

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

/**
 * Organization housing — 102 housing-specific records (shelters, temporary
 * stays, social housing) attached to organizations whose Georgian-sheet
 * `housingType` cell is non-NULL. One row per organization.
 */
export const organizationHousing = mysqlTable("organization_housing", {
  id: int("id").autoincrement().primaryKey(),
  orgId: varchar("orgId", { length: 16 }).notNull(),              // FK → organizations.orgId
  housingType: mysqlEnum("housingType",
    ["parents_house", "shelter", "social", "temporary", "hotel", "apartment", "other"]),
  description: text("description"),
  registrationProcess: text("registrationProcess"),
  costDetails: text("costDetails"),
  maxStayDuration: varchar("maxStayDuration", { length: 64 }),
  capacity: varchar("capacity", { length: 64 }),
  childrenFriendly: mysqlEnum("childrenFriendly", ["yes", "no", "unknown"]).default("unknown"),
  disabledAccessible: mysqlEnum("disabledAccessible", ["yes", "no", "unknown"]).default("unknown"),
  relevanceNotes: text("relevanceNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("org_housing_idx").on(table.orgId),
  index("housing_type_idx").on(table.housingType),
]);

export type OrganizationHousing = typeof organizationHousing.$inferSelect;
export type InsertOrganizationHousing = typeof organizationHousing.$inferInsert;

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
