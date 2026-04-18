import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { randomBytes, randomUUID, timingSafeEqual } from "crypto";
import {
  updateUserSubscription, listAllUsers, updateUserRole, getSubscriptionStats,
  getUserById, getSavedGrantIds, toggleSavedGrant, subscribeNewsletter,
  completeOnboarding, updateUserProfile, getUserProfile, listGrants, getGrantByItemId, getGrantTranslations,
  getBulkGrantTranslations, createGrant, updateGrant, deleteGrant,
  hardDeleteGrant, upsertGrantTranslations, getGrantStats, getRelatedGrants,
  getActiveNewsletterSubscribers, getNewsletterSubscriberCount, exportAllGrants,
  unsubscribeByToken, createNotificationRecord, updateNotificationRecord,
  getNotificationHistory, bulkImportGrants, getDistinctStates, getDistinctCities,
  getDistinctCountries, getCategoryCounts,
  getDiversePreviewGrants,
  getUserByEmail, createEmailPasswordUser, getUserByVerificationToken,
  getUserByResetToken, markEmailVerified, setVerificationToken,
  setResetPasswordToken, updatePasswordAndClearReset,
  incrementFailedLoginAttempts, resetFailedLoginAttempts,
} from "./db";
import {
  sendSubscriptionEmail, sendAdminNewSubscriberNotification,
  sendBatchNewGrantNotifications, buildNewGrantsSubject,
  sendVerificationEmail, sendPasswordResetEmail,
  type GrantEmailData, type AuthEmailLang,
} from "./emailService";
import { parseCSV, parseExcel, validateBatch, type ImportParseResult } from "./importGrants";
import {
  searchExternalGrants, getExternalGrantDetail, searchExternalFunders,
  mapExternalGrantToLocal,
} from "./externalGrants";
import { runGrantAssistant } from "./toolboxClient";
import { expandQuery } from "./queryExpander";
import { searchGrantsMultiTerm } from "./smartSearch";
import { z } from "zod";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),

    // ===== Phase 0: Email/password authentication (Mira) =====
    // Generic success/error messages avoid leaking which accounts exist.
    // bcrypt 12 rounds + constant-time token compare for replay safety.

    register: publicProcedure
      .input(z.object({
        email: z.string().trim().toLowerCase().email().max(320),
        password: z.string().min(10).max(128),
        name: z.string().trim().min(1).max(120).optional(),
        language: z.enum(["en", "fr", "es", "ru", "ka"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const existing = await getUserByEmail(input.email);
        if (existing) {
          // Generic success — do not leak account existence.
          // If the account exists but is unverified, silently re-send verification.
          if (existing.passwordHash && !existing.emailVerified) {
            const token = randomBytes(32).toString("hex");
            const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
            await setVerificationToken(existing.id, token, expires);
            const lang = (input.language ?? "en") as AuthEmailLang;
            sendVerificationEmail(
              { email: existing.email!, name: existing.name },
              token,
              ENV.appUrl,
              lang
            ).catch((err) => console.error("[Auth] Re-send verification failed:", err));
          }
          return { success: true } as const;
        }

        const passwordHash = await bcrypt.hash(input.password, 12);
        const token = randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const openId = `email_${randomUUID()}`;

        await createEmailPasswordUser({
          openId,
          email: input.email,
          name: input.name ?? null,
          passwordHash,
          verificationToken: token,
          verificationTokenExpires: expires,
        });

        const lang = (input.language ?? "en") as AuthEmailLang;
        sendVerificationEmail(
          { email: input.email, name: input.name ?? null },
          token,
          ENV.appUrl,
          lang
        ).catch((err) => console.error("[Auth] Verification email failed:", err));

        return { success: true } as const;
      }),

    login: publicProcedure
      .input(z.object({
        email: z.string().trim().toLowerCase().email().max(320),
        password: z.string().min(1).max(128),
      }))
      .mutation(async ({ ctx, input }) => {
        const genericError = new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password.",
        });

        const user = await getUserByEmail(input.email);
        if (!user || !user.passwordHash) {
          // Constant-time dummy compare to resist user-enumeration timing attacks.
          await bcrypt.compare(input.password, "$2a$12$" + "a".repeat(53));
          throw genericError;
        }

        if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Account temporarily locked. Try again later.",
          });
        }

        const matches = await bcrypt.compare(input.password, user.passwordHash);
        if (!matches) {
          const nextAttempts = (user.failedLoginAttempts ?? 0) + 1;
          const lockUntil = nextAttempts >= 5
            ? new Date(Date.now() + 15 * 60 * 1000)
            : null;
          await incrementFailedLoginAttempts(user.id, lockUntil);
          throw genericError;
        }

        if (!user.emailVerified) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Please verify your email before signing in.",
          });
        }

        await resetFailedLoginAttempts(user.id);

        const sessionToken = await sdk.signSession({
          openId: user.openId,
          appId: ENV.appId,
          name: user.name ?? user.email ?? "",
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true } as const;
      }),

    verifyEmail: publicProcedure
      .input(z.object({ token: z.string().min(10).max(256) }))
      .mutation(async ({ input }) => {
        const user = await getUserByVerificationToken(input.token);
        if (!user || !user.verificationToken || !user.verificationTokenExpires) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired verification link." });
        }

        // Constant-time compare.
        const a = Buffer.from(user.verificationToken);
        const b = Buffer.from(input.token);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired verification link." });
        }

        if (user.verificationTokenExpires.getTime() < Date.now()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired verification link." });
        }

        await markEmailVerified(user.id);
        return { success: true } as const;
      }),

    forgotPassword: publicProcedure
      .input(z.object({
        email: z.string().trim().toLowerCase().email().max(320),
        language: z.enum(["en", "fr", "es", "ru", "ka"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const user = await getUserByEmail(input.email);
        // Always return success — do not leak which emails are registered.
        if (user && user.passwordHash) {
          const token = randomBytes(32).toString("hex");
          const expires = new Date(Date.now() + 60 * 60 * 1000);
          await setResetPasswordToken(user.id, token, expires);
          const lang = (input.language ?? "en") as AuthEmailLang;
          sendPasswordResetEmail(
            { email: user.email!, name: user.name },
            token,
            ENV.appUrl,
            lang
          ).catch((err) => console.error("[Auth] Password reset email failed:", err));
        }
        return { success: true } as const;
      }),

    resetPassword: publicProcedure
      .input(z.object({
        token: z.string().min(10).max(256),
        password: z.string().min(10).max(128),
      }))
      .mutation(async ({ input }) => {
        const user = await getUserByResetToken(input.token);
        if (!user || !user.resetPasswordToken || !user.resetPasswordTokenExpires) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired reset link." });
        }

        const a = Buffer.from(user.resetPasswordToken);
        const b = Buffer.from(input.token);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired reset link." });
        }

        if (user.resetPasswordTokenExpires.getTime() < Date.now()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired reset link." });
        }

        const passwordHash = await bcrypt.hash(input.password, 12);
        await updatePasswordAndClearReset(user.id, passwordHash);
        return { success: true } as const;
      }),
  }),

  subscription: router({
    // Get current user's subscription status
    status: protectedProcedure.query(({ ctx }) => {
      return {
        subscriptionStatus: ctx.user.subscriptionStatus,
        paddleCustomerId: ctx.user.paddleCustomerId,
        paddleSubscriptionId: ctx.user.paddleSubscriptionId,
        subscriptionCurrentPeriodEnd: ctx.user.subscriptionCurrentPeriodEnd,
        isActive: ctx.user.subscriptionStatus === "active" || ctx.user.role === "admin",
      };
    }),

    // Cancel subscription (marks as cancelled in DB)
    cancel: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.subscriptionStatus !== "active") {
        return { success: false, error: "No active subscription" };
      }
      await updateUserSubscription(ctx.user.id, {
        subscriptionStatus: "cancelled",
      });

      // Send cancellation email
      if (ctx.user.email) {
        sendSubscriptionEmail(
          { email: ctx.user.email, name: ctx.user.name },
          "cancelled"
        ).catch((err: unknown) => console.error("[Email] Cancel notification failed:", err));
      }

      return { success: true };
    }),

    // Called from frontend after successful Paddle checkout to record the subscription
    activate: protectedProcedure
      .input(z.object({
        paddleCustomerId: z.string().optional(),
        paddleSubscriptionId: z.string().optional(),
        transactionId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateUserSubscription(ctx.user.id, {
          paddleCustomerId: input.paddleCustomerId || undefined,
          paddleSubscriptionId: input.paddleSubscriptionId || undefined,
          subscriptionStatus: "active",
          subscriptionPlanId: "pri_01kmygcd8stckbs3d7vt3xenq6",
        });

        // Send activation email + admin notification
        if (ctx.user.email) {
          sendSubscriptionEmail(
            { email: ctx.user.email, name: ctx.user.name },
            "activated"
          ).catch((err: unknown) => console.error("[Email] Activation notification failed:", err));

          sendAdminNewSubscriberNotification(
            { email: ctx.user.email, name: ctx.user.name }
          ).catch((err: unknown) => console.error("[Email] Admin notification failed:", err));
        }

        return { success: true };
      }),
  }),

  // ===== Saved Grants =====
  grants: router({
    // Get list of saved grant IDs for current user
    savedList: protectedProcedure.query(async ({ ctx }) => {
      const grantIds = await getSavedGrantIds(ctx.user.id);
      return { grantIds };
    }),

    // Toggle save/unsave a grant
    toggleSave: protectedProcedure
      .input(z.object({ grantId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const result = await toggleSavedGrant(ctx.user.id, input.grantId);
        return result;
      }),
  }),

  // ===== Catalog (public/protected grant queries) =====
  catalog: router({
    // List grants with search, filter, sort, pagination
    list: publicProcedure
      .input(z.object({
        search: z.string().optional(),
        language: z.string().optional(),
        category: z.string().optional(),
        country: z.string().optional(),
        type: z.string().optional(),
        sortBy: z.string().optional(),
        // New enrichment filters
        fundingType: z.string().optional(),
        targetDiagnosis: z.string().optional(),
        ageRange: z.string().optional(),
        b2VisaEligible: z.string().optional(),
        hasDeadline: z.boolean().optional(),
        state: z.string().optional(),
        city: z.string().optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
      }).optional())
      .query(async ({ input }) => {
        const { search, language, category, country, type, sortBy, fundingType, targetDiagnosis, ageRange, b2VisaEligible, hasDeadline, state, city, page = 1, pageSize = 20 } = input || {};
        const result = await listGrants({
          search,
          language,
          category,
          country,
          type,
          sortBy,
          fundingType,
          targetDiagnosis,
          ageRange,
          b2VisaEligible,
          hasDeadline,
          state,
          city,
          limit: pageSize,
          offset: (page - 1) * pageSize,
          activeOnly: true,
        });

        // Get translations for all returned grants
        const itemIds = result.grants.map(g => g.itemId);
        const translations = await getBulkGrantTranslations(itemIds);

        return {
          grants: result.grants.map(g => ({
            id: g.itemId,
            name: g.name,
            organization: g.organization || "",
            description: g.description || "",
            category: g.category,
            type: g.type,
            country: g.country,
            eligibility: g.eligibility || "",
            website: g.website || "",
            phone: g.phone || "",
            email: g.email || "",
            amount: g.amount || "",
            status: g.status || "",
            // Enrichment fields
            applicationProcess: g.applicationProcess || "",
            deadline: g.deadline || "",
            fundingType: g.fundingType || "",
            targetDiagnosis: g.targetDiagnosis || "",
            ageRange: g.ageRange || "",
            geographicScope: g.geographicScope || "",
            documentsRequired: g.documentsRequired || "",
            b2VisaEligible: g.b2VisaEligible || "",
            state: g.state || "",
            city: g.city || "",
            // Geocoding fields (Phase 1)
            address: g.address || "",
            latitude: g.latitude ? String(g.latitude) : null,
            longitude: g.longitude ? String(g.longitude) : null,
            serviceArea: g.serviceArea || "",
            officeHours: g.officeHours || "",
            geocodedAt: g.geocodedAt ?? null,
            translations: translations[g.itemId] || {},
          })),
          total: result.total,
          page,
          pageSize,
          totalPages: Math.ceil(result.total / pageSize),
        };
      }),

    // Get a single grant by itemId
    detail: publicProcedure
      .input(z.object({ itemId: z.string() }))
      .query(async ({ input }) => {
        const grant = await getGrantByItemId(input.itemId);
        if (!grant) return null;

        const translations = await getGrantTranslations(input.itemId);
        const related = await getRelatedGrants(input.itemId, grant.category, 4);
        const relatedTranslations = await getBulkGrantTranslations(related.map(r => r.itemId));

        return {
          grant: {
            id: grant.itemId,
            name: grant.name,
            organization: grant.organization || "",
            description: grant.description || "",
            category: grant.category,
            type: grant.type,
            country: grant.country,
            eligibility: grant.eligibility || "",
            website: grant.website || "",
            phone: grant.phone || "",
            email: grant.email || "",
            amount: grant.amount || "",
            status: grant.status || "",
            // Enrichment fields
            applicationProcess: grant.applicationProcess || "",
            deadline: grant.deadline || "",
            fundingType: grant.fundingType || "",
            targetDiagnosis: grant.targetDiagnosis || "",
            ageRange: grant.ageRange || "",
            geographicScope: grant.geographicScope || "",
            documentsRequired: grant.documentsRequired || "",
            b2VisaEligible: grant.b2VisaEligible || "",
            state: grant.state || "",
            city: grant.city || "",
            // Geocoding fields (Phase 1)
            address: grant.address || "",
            latitude: grant.latitude ? String(grant.latitude) : null,
            longitude: grant.longitude ? String(grant.longitude) : null,
            serviceArea: grant.serviceArea || "",
            officeHours: grant.officeHours || "",
            geocodedAt: grant.geocodedAt ?? null,
          },
          translations,
          related: related.map(r => ({
            id: r.itemId,
            name: r.name,
            organization: r.organization || "",
            description: r.description || "",
            category: r.category,
            type: r.type,
            country: r.country,
            eligibility: r.eligibility || "",
            website: r.website || "",
            phone: r.phone || "",
            email: r.email || "",
            amount: r.amount || "",
            status: r.status || "",
            translations: relatedTranslations[r.itemId] || {},
          })),
        };
      }),

    // Get total count of active grants
    count: publicProcedure.query(async () => {
      const stats = await getGrantStats();
      return { total: stats.active, grants: stats.grants, resources: stats.resources };
    }),

    // Get diverse preview grants for homepage (one from each major category)
    preview: publicProcedure.query(async () => {
      const previewGrants = await getDiversePreviewGrants(5);
      const itemIds = previewGrants.map(g => g.itemId);
      const translations = await getBulkGrantTranslations(itemIds);

      return {
        grants: previewGrants.map(g => ({
          id: g.itemId,
          name: g.name,
          organization: g.organization || "",
          description: g.description || "",
          category: g.category,
          type: g.type,
          country: g.country,
          eligibility: g.eligibility || "",
          website: g.website || "",
          phone: g.phone || "",
          email: g.email || "",
          amount: g.amount || "",
          status: g.status || "",
          applicationProcess: g.applicationProcess || "",
          deadline: g.deadline || "",
          fundingType: g.fundingType || "",
          targetDiagnosis: g.targetDiagnosis || "",
          ageRange: g.ageRange || "",
          geographicScope: g.geographicScope || "",
          documentsRequired: g.documentsRequired || "",
          b2VisaEligible: g.b2VisaEligible || "",
          state: g.state || "",
          city: g.city || "",
          // Geocoding fields (Phase 1)
          address: g.address || "",
          latitude: g.latitude ? String(g.latitude) : null,
          longitude: g.longitude ? String(g.longitude) : null,
          serviceArea: g.serviceArea || "",
          officeHours: g.officeHours || "",
          geocodedAt: g.geocodedAt ?? null,
          translations: translations[g.itemId] || {},
        })),
      };
    }),

    // Get distinct states for filter dropdown
    states: publicProcedure.query(async () => {
      return await getDistinctStates();
    }),

    // Get distinct cities for a given state (for cascading filter)
    cities: publicProcedure
      .input(z.object({ state: z.string() }))
      .query(async ({ input }) => {
        return await getDistinctCities(input.state);
      }),

    // Get distinct regions (grouped country codes) with counts for toolbar dropdown
    regions: publicProcedure.query(async () => {
      const rows = await getDistinctCountries();
      const EU = new Set([
        "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU",
        "IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE",
      ]);
      const countryTotals = new Map<string, number>();
      for (const r of rows) countryTotals.set(r.country, r.count);

      const us = countryTotals.get("US") ?? 0;
      const gb = countryTotals.get("GB") ?? 0;
      let eu = 0;
      countryTotals.forEach((count, code) => {
        if (EU.has(code)) eu += count;
      });

      const regions: Array<{ code: string; count: number }> = [];
      if (us > 0) regions.push({ code: "US", count: us });
      if (eu > 0) regions.push({ code: "EU", count: eu });
      if (gb > 0) regions.push({ code: "GB", count: gb });
      return regions;
    }),

    // Get grant counts per category for QuickChips
    categoryCounts: publicProcedure.query(async () => {
      return await getCategoryCounts();
    }),

    // Smart Search — AI-powered multilingual search
    smartSearch: publicProcedure
      .input(z.object({
        query: z.string().min(2).max(200),
        country: z.string().optional(),
        category: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      }))
      .query(async ({ input }) => {
        try {
          const expanded = await expandQuery(input.query);

          const results = await searchGrantsMultiTerm(expanded.terms, {
            country: input.country,
            category: input.category,
            limit: input.limit,
          });

          return {
            results: results.map(r => ({
              id: r.itemId,
              name: r.name,
              organization: r.organization || "",
              description: r.description || "",
              category: r.category,
              country: r.country,
              amount: r.amount || "",
              deadline: r.deadline || "",
              website: r.website || "",
              eligibility: r.eligibility || "",
              fundingType: r.fundingType || "",
              state: r.state || "",
              city: r.city || "",
            })),
            meta: {
              originalQuery: expanded.original,
              detectedLanguage: expanded.detectedLanguage,
              englishQuery: expanded.englishQuery,
              resultCount: results.length,
              termsUsed: expanded.terms.length,
            },
          };
        } catch (err) {
          console.error("[smartSearch] Error:", err);
          return { results: [], meta: { originalQuery: input.query, detectedLanguage: "en", englishQuery: input.query, resultCount: 0, termsUsed: 0 } };
        }
      }),
  }),

  // ===== Newsletter =====
  newsletter: router({
    subscribe: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input, ctx }) => {
        const userId = ctx.user?.id;
        return await subscribeNewsletter(input.email, userId);
      }),

    // Unsubscribe via token (called from email link)
    unsubscribe: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        return await unsubscribeByToken(input.token);
      }),
  }),

  // ===== Onboarding =====
  onboarding: router({
    complete: protectedProcedure.mutation(async ({ ctx }) => {
      await completeOnboarding(ctx.user.id);
      return { success: true };
    }),

    saveProfile: protectedProcedure
      .input(z.object({
        targetCountry: z.string(),
        purposes: z.array(z.string()),
        purposeDetails: z.array(z.string()),
        needs: z.array(z.string()),
        needDetails: z.array(z.string()),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateUserProfile(ctx.user.id, {
          targetCountry: input.targetCountry,
          purposes: JSON.stringify(input.purposes),
          purposeDetails: JSON.stringify(input.purposeDetails),
          needs: JSON.stringify(input.needs),
          needDetails: JSON.stringify(input.needDetails),
        });
        await completeOnboarding(ctx.user.id);
        return { success: true };
      }),

    getProfile: protectedProcedure
      .query(async ({ ctx }) => {
        const profile = await getUserProfile(ctx.user.id);
        if (!profile) return null;

        const parseArrayField = (value: string | null): string[] => {
          if (!value) return [];
          try {
            const parsed: unknown = JSON.parse(value);
            return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
          } catch {
            return [];
          }
        };

        return {
          targetCountry: profile.targetCountry,
          purposes: parseArrayField(profile.purposes),
          purposeDetails: parseArrayField(profile.purposeDetails),
          needs: parseArrayField(profile.needs),
          needDetails: parseArrayField(profile.needDetails),
          profileCompletedAt: profile.profileCompletedAt ? profile.profileCompletedAt.toISOString() : null,
        };
      }),

    updateProfile: protectedProcedure
      .input(z.object({
        targetCountry: z.string().optional(),
        purposes: z.array(z.string()).optional(),
        purposeDetails: z.array(z.string()).optional(),
        needs: z.array(z.string()).optional(),
        needDetails: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const updatePayload: {
          targetCountry?: string;
          purposes?: string;
          purposeDetails?: string;
          needs?: string;
          needDetails?: string;
        } = {};

        if (input.targetCountry !== undefined) updatePayload.targetCountry = input.targetCountry;
        if (input.purposes !== undefined) updatePayload.purposes = JSON.stringify(input.purposes);
        if (input.purposeDetails !== undefined) updatePayload.purposeDetails = JSON.stringify(input.purposeDetails);
        if (input.needs !== undefined) updatePayload.needs = JSON.stringify(input.needs);
        if (input.needDetails !== undefined) updatePayload.needDetails = JSON.stringify(input.needDetails);

        if (Object.keys(updatePayload).length > 0) {
          await updateUserProfile(ctx.user.id, updatePayload);
        }

        return { success: true };
      }),
  }),

  // ===== Admin Panel =====
  admin: router({
    // Get subscription statistics overview
    stats: adminProcedure.query(async () => {
      return await getSubscriptionStats();
    }),

    // Get grant statistics
    grantStats: adminProcedure.query(async () => {
      return await getGrantStats();
    }),

    // Get newsletter subscriber stats
    newsletterStats: adminProcedure.query(async () => {
      return await getNewsletterSubscriberCount();
    }),

    // Get notification history
    notificationHistory: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(20) }).optional())
      .query(async ({ input }) => {
        const limit = input?.limit ?? 20;
        return await getNotificationHistory(limit);
      }),

    // Export all grants for CSV/Excel download
    exportGrants: adminProcedure
      .input(z.object({
        category: z.string().optional(),
        country: z.string().optional(),
        type: z.string().optional(),
        includeInactive: z.boolean().optional().default(false),
      }).optional())
      .query(async ({ input }) => {
        const { category, country, type, includeInactive = false } = input || {};
        const data = await exportAllGrants({
          category,
          country,
          type,
          activeOnly: !includeInactive,
        });

        return data.map(g => ({
          itemId: g.itemId,
          name: g.name,
          organization: g.organization || "",
          description: g.description || "",
          category: g.category,
          type: g.type,
          country: g.country,
          eligibility: g.eligibility || "",
          website: g.website || "",
          phone: g.phone || "",
          email: g.email || "",
          amount: g.amount || "",
          status: g.status || "",
          isActive: g.isActive,
          createdAt: g.createdAt,
          updatedAt: g.updatedAt,
          translations: g.translations,
        }));
      }),

    // Send new grant notification to all subscribers
    sendNewGrantNotification: adminProcedure
      .input(z.object({
        grantItemIds: z.array(z.string()).min(1).max(20),
      }))
      .mutation(async ({ input, ctx }) => {
        // Fetch grant details for the email
        const grantDataPromises = input.grantItemIds.map(async (itemId) => {
          const grant = await getGrantByItemId(itemId);
          if (!grant) return null;
          return {
            itemId: grant.itemId,
            name: grant.name,
            organization: grant.organization || "",
            category: grant.category,
            country: grant.country,
            description: grant.description || "",
            amount: grant.amount || "",
          } as GrantEmailData;
        });

        const grantsData = (await Promise.all(grantDataPromises)).filter(
          (g): g is GrantEmailData => g !== null
        );

        if (grantsData.length === 0) {
          return { success: false, error: "No valid grants found" };
        }

        // Get all active subscribers
        const subscribers = await getActiveNewsletterSubscribers();
        if (subscribers.length === 0) {
          return { success: false, error: "No active subscribers" };
        }

        // Create notification history record
        const subject = buildNewGrantsSubject(grantsData.length);
        const notifId = await createNotificationRecord({
          subject,
          grantItemIds: input.grantItemIds,
          recipientCount: subscribers.length,
          sentBy: ctx.user.id,
        });

        // Send emails in background (don't block the response)
        sendBatchNewGrantNotifications(
          subscribers.map((s) => ({ email: s.email, unsubscribeToken: s.unsubscribeToken })),
          grantsData
        ).then(async (result) => {
          await updateNotificationRecord(notifId, {
            successCount: result.successCount,
            failCount: result.failCount,
            status: result.failCount > result.successCount ? "failed" : "completed",
          });
        }).catch(async (err) => {
          console.error("[Notification] Batch send failed:", err);
          await updateNotificationRecord(notifId, {
            successCount: 0,
            failCount: subscribers.length,
            status: "failed",
          });
        });

        return {
          success: true,
          notificationId: notifId,
          recipientCount: subscribers.length,
          grantCount: grantsData.length,
        };
      }),

    // List all users with search, filter, and pagination
    users: adminProcedure
      .input(z.object({
        search: z.string().optional(),
        statusFilter: z.string().optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
      }).optional())
      .query(async ({ input }) => {
        const { search, statusFilter, page = 1, pageSize = 20 } = input || {};
        const result = await listAllUsers({
          search,
          statusFilter,
          limit: pageSize,
          offset: (page - 1) * pageSize,
        });
        return {
          users: result.users.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            subscriptionStatus: u.subscriptionStatus,
            paddleCustomerId: u.paddleCustomerId,
            paddleSubscriptionId: u.paddleSubscriptionId,
            subscriptionPlanId: u.subscriptionPlanId,
            subscriptionCurrentPeriodEnd: u.subscriptionCurrentPeriodEnd,
            createdAt: u.createdAt,
            lastSignedIn: u.lastSignedIn,
          })),
          total: result.total,
          page,
          pageSize,
          totalPages: Math.ceil(result.total / pageSize),
        };
      }),

    // Update user role
    updateRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(["user", "admin"]),
      }))
      .mutation(async ({ input, ctx }) => {
        // Prevent admin from demoting themselves
        if (input.userId === ctx.user.id && input.role !== "admin") {
          return { success: false, error: "Cannot demote yourself" };
        }
        await updateUserRole(input.userId, input.role);
        return { success: true };
      }),

    // Manually update user subscription status
    updateSubscription: adminProcedure
      .input(z.object({
        userId: z.number(),
        subscriptionStatus: z.enum(["none", "active", "cancelled", "past_due", "paused"]),
      }))
      .mutation(async ({ input }) => {
        await updateUserSubscription(input.userId, {
          subscriptionStatus: input.subscriptionStatus,
        });

        // Send email notification for admin-triggered status changes
        const statusEmailMap: Record<string, "activated" | "cancelled" | "paused" | "past_due"> = {
          active: "activated",
          cancelled: "cancelled",
          paused: "paused",
          past_due: "past_due",
        };
        const emailType = statusEmailMap[input.subscriptionStatus];
        if (emailType) {
          const user = await getUserById(input.userId);
          if (user?.email) {
            sendSubscriptionEmail(
              { email: user.email, name: user.name },
              emailType
            ).catch((err: unknown) => console.error("[Email] Admin status change notification failed:", err));
          }
        }

        return { success: true };
      }),

    // ===== Grant Management =====

    // List all grants (including inactive) for admin
    grants: adminProcedure
      .input(z.object({
        search: z.string().optional(),
        category: z.string().optional(),
        country: z.string().optional(),
        type: z.string().optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
      }).optional())
      .query(async ({ input }) => {
        const { search, category, country, type, page = 1, pageSize = 20 } = input || {};
        const result = await listGrants({
          search,
          category,
          country,
          type,
          limit: pageSize,
          offset: (page - 1) * pageSize,
          activeOnly: false, // Admin sees all
        });

        return {
          grants: result.grants.map(g => ({
            id: g.id,
            itemId: g.itemId,
            name: g.name,
            organization: g.organization || "",
            category: g.category,
            type: g.type,
            country: g.country,
            isActive: g.isActive,
            createdAt: g.createdAt,
            updatedAt: g.updatedAt,
            state: g.state || "",
            city: g.city || "",
            amount: g.amount || "",
            eligibility: g.eligibility || "",
            website: g.website || "",
            phone: g.phone || "",
            email: g.email || "",
            status: g.status || "",
            description: g.description || "",
          })),
          total: result.total,
          page,
          pageSize,
          totalPages: Math.ceil(result.total / pageSize),
        };
      }),

    // Get a single grant with all details for editing
    grantDetail: adminProcedure
      .input(z.object({ itemId: z.string() }))
      .query(async ({ input }) => {
        const grant = await getGrantByItemId(input.itemId);
        if (!grant) return null;

        const translations = await getGrantTranslations(input.itemId);

        return {
          id: grant.id,
          itemId: grant.itemId,
          name: grant.name,
          organization: grant.organization || "",
          description: grant.description || "",
          category: grant.category,
          type: grant.type,
          country: grant.country,
          eligibility: grant.eligibility || "",
          website: grant.website || "",
          phone: grant.phone || "",
          email: grant.email || "",
          amount: grant.amount || "",
          status: grant.status || "",
          isActive: grant.isActive,
          translations,
        };
      }),

    // Create a new grant
    createGrant: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        organization: z.string().optional(),
        description: z.string().optional(),
        category: z.string(),
        type: z.enum(["grant", "resource"]),
        country: z.string(),
        eligibility: z.string().optional(),
        website: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        amount: z.string().optional(),
        status: z.string().optional(),
        applicationProcess: z.string().optional(),
        deadline: z.string().optional(),
        fundingType: z.string().optional(),
        targetDiagnosis: z.string().optional(),
        ageRange: z.string().optional(),
        geographicScope: z.string().optional(),
        documentsRequired: z.string().optional(),
        b2VisaEligible: z.string().optional(),
        state: z.string().optional(),
        city: z.string().optional(),
        notifySubscribers: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { notifySubscribers, ...grantData } = input;
        const result = await createGrant(grantData);

        // Auto-notify subscribers if requested
        if (notifySubscribers) {
          const grant = await getGrantByItemId(result.itemId);
          if (grant) {
            const subscribers = await getActiveNewsletterSubscribers();
            if (subscribers.length > 0) {
              const grantEmailData: GrantEmailData = {
                itemId: grant.itemId,
                name: grant.name,
                organization: grant.organization || "",
                category: grant.category,
                country: grant.country,
                description: grant.description || "",
                amount: grant.amount || "",
              };

              const subject = buildNewGrantsSubject(1);
              const notifId = await createNotificationRecord({
                subject,
                grantItemIds: [result.itemId],
                recipientCount: subscribers.length,
                sentBy: ctx.user.id,
              });

              // Send in background
              sendBatchNewGrantNotifications(
                subscribers.map((s) => ({ email: s.email, unsubscribeToken: s.unsubscribeToken })),
                [grantEmailData]
              ).then(async (batchResult) => {
                await updateNotificationRecord(notifId, {
                  successCount: batchResult.successCount,
                  failCount: batchResult.failCount,
                  status: batchResult.failCount > batchResult.successCount ? "failed" : "completed",
                });
              }).catch(async (err) => {
                console.error("[Notification] Auto-notify failed:", err);
                await updateNotificationRecord(notifId, {
                  successCount: 0,
                  failCount: subscribers.length,
                  status: "failed",
                });
              });
            }
          }
        }

        return { success: true, itemId: result.itemId };
      }),

    // Update an existing grant
    updateGrant: adminProcedure
      .input(z.object({
        itemId: z.string(),
        name: z.string().optional(),
        organization: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        type: z.enum(["grant", "resource"]).optional(),
        country: z.string().optional(),
        eligibility: z.string().optional(),
        website: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        amount: z.string().optional(),
        status: z.string().optional(),
        applicationProcess: z.string().optional(),
        deadline: z.string().optional(),
        fundingType: z.string().optional(),
        targetDiagnosis: z.string().optional(),
        ageRange: z.string().optional(),
        geographicScope: z.string().optional(),
        documentsRequired: z.string().optional(),
        b2VisaEligible: z.string().optional(),
        state: z.string().optional(),
        city: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { itemId, ...data } = input;
        await updateGrant(itemId, data);
        return { success: true };
      }),

    // Update grant translations
    updateGrantTranslations: adminProcedure
      .input(z.object({
        itemId: z.string(),
        translations: z.record(z.string(), z.object({
          name: z.string().optional(),
          description: z.string().optional(),
          eligibility: z.string().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        await upsertGrantTranslations(input.itemId, input.translations);
        return { success: true };
      }),

    // Delete a grant (soft delete)
    deleteGrant: adminProcedure
      .input(z.object({ itemId: z.string() }))
      .mutation(async ({ input }) => {
        await deleteGrant(input.itemId);
        return { success: true };
      }),

    // Hard delete a grant (permanent)
    hardDeleteGrant: adminProcedure
      .input(z.object({ itemId: z.string() }))
      .mutation(async ({ input }) => {
        await hardDeleteGrant(input.itemId);
        return { success: true };
      }),

    // Parse imported file (CSV or Excel) — returns preview data
    parseImport: adminProcedure
      .input(z.object({
        content: z.string(), // Base64-encoded file content
        filename: z.string(),
        format: z.enum(["csv", "excel"]),
      }))
      .mutation(async ({ input }): Promise<ImportParseResult & { duplicateErrors: Array<{ row: number; field: string; message: string }> }> => {
        let result: ImportParseResult;

        if (input.format === "csv") {
          // Decode base64 to string
          const csvContent = Buffer.from(input.content, "base64").toString("utf-8");
          result = parseCSV(csvContent);
        } else {
          // Decode base64 to buffer
          const buffer = Buffer.from(input.content, "base64");
          result = parseExcel(buffer);
        }

        // Run batch validation for duplicates
        const duplicateErrors = validateBatch(result.grants);

        return {
          ...result,
          duplicateErrors,
        };
      }),

    // Execute the import — save parsed grants to database
    executeImport: adminProcedure
      .input(z.object({
        grants: z.array(z.object({
          itemId: z.string().optional(),
          name: z.string(),
          organization: z.string(),
          description: z.string(),
          category: z.string(),
          type: z.enum(["grant", "resource"]),
          country: z.string(),
          eligibility: z.string(),
          website: z.string(),
          phone: z.string(),
          email: z.string(),
          amount: z.string(),
          status: z.string(),
          translations: z.record(z.string(), z.object({
            name: z.string(),
            description: z.string(),
            eligibility: z.string(),
          })),
        })),
      }))
      .mutation(async ({ input }) => {
        const result = await bulkImportGrants(input.grants);
        return {
          success: true,
          created: result.created,
          updated: result.updated,
          errors: result.errors,
          total: result.total,
        };
      }),

    // ----- External grants search (GrantedAI API) -----

    searchExternal: adminProcedure
      .input(z.object({
        query: z.string().min(1),
        source: z.enum(["federal", "state", "international", "foundation"]).optional(),
        state: z.string().max(2).optional(),
        orgType: z.string().optional(),
        limit: z.number().min(1).max(15).optional(),
      }))
      .query(async ({ input }) => {
        return { results: await searchExternalGrants({ ...input, limit: input.limit ?? 15 }) };
      }),

    getExternalDetail: adminProcedure
      .input(z.object({ slug: z.string().min(1) }))
      .query(async ({ input }) => {
        const detail = await getExternalGrantDetail(input.slug);
        return { detail, mappedGrant: detail ? mapExternalGrantToLocal(detail) : null };
      }),

    importExternal: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        organization: z.string().optional(),
        description: z.string().optional(),
        category: z.string(),
        type: z.enum(["grant", "resource"]).default("grant"),
        country: z.string().default("US"),
        eligibility: z.string().optional(),
        website: z.string().optional(),
        amount: z.string().optional(),
        status: z.string().optional(),
        deadline: z.string().optional(),
        fundingType: z.string().optional(),
        geographicScope: z.string().optional(),
        notifySubscribers: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { notifySubscribers, ...grantData } = input;
        const result = await createGrant(grantData);
        if (notifySubscribers) {
          const grant = await getGrantByItemId(result.itemId);
          if (grant) {
            const subscribers = await getActiveNewsletterSubscribers();
            if (subscribers.length > 0) {
              const grantEmailData: GrantEmailData = {
                itemId: grant.itemId, name: grant.name,
                organization: grant.organization || "", category: grant.category,
                country: grant.country, description: grant.description || "",
                amount: grant.amount || "",
              };
              const subject = buildNewGrantsSubject(1);
              const notifId = await createNotificationRecord({
                subject, grantItemIds: [result.itemId],
                recipientCount: subscribers.length, sentBy: ctx.user.id,
              });
              sendBatchNewGrantNotifications(subscribers, [grantEmailData])
                .then(async (r) => { await updateNotificationRecord(notifId, { status: "completed", successCount: r.successCount, failCount: r.failCount }); })
                .catch(async () => { await updateNotificationRecord(notifId, { status: "failed", successCount: 0, failCount: subscribers.length }); });
            }
          }
        }
        return { success: true, itemId: result.itemId };
      }),

    searchFunders: adminProcedure
      .input(z.object({
        query: z.string().optional(),
        state: z.string().max(2).optional(),
        ntee: z.string().max(3).optional(),
        assetsMin: z.number().optional(),
        assetsMax: z.number().optional(),
        limit: z.number().min(1).max(15).optional(),
        sort: z.enum(["relevance", "name", "assets_desc", "income_desc"]).optional(),
      }))
      .query(async ({ input }) => {
        return { results: await searchExternalFunders({ ...input, limit: input.limit ?? 15 }) };
      }),
  }),

  // =========================================================================
  // AI Grant Assistant (powered by MCP Toolbox for Databases)
  // =========================================================================
  ai: router({
    /**
     * Natural-language grant search backed by the MCP Toolbox server.
     * The assistant uses an agentic tool-use loop to query the live MySQL
     * database and return a helpful, structured response.
     *
     * Requires:
     *   - MCP Toolbox server running (pnpm toolbox:start)
     *   - BUILT_IN_FORGE_API_KEY configured
     *   - MCP_TOOLBOX_URL pointing at the running server (default: localhost:5000)
     */
    grantChat: publicProcedure
      .input(
        z.object({
          message: z.string().min(1).max(1000),
          history: z
            .array(
              z.object({
                role: z.enum(["user", "assistant"]),
                content: z.string().max(5000),
              })
            )
            .max(20)
            .optional(),
        })
      )
      .mutation(async ({ input }) => {
        const reply = await runGrantAssistant(input.message, input.history ?? []);
        return { reply };
      }),
  }),
});

export type AppRouter = typeof appRouter;
