import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import {
  updateUserSubscription, listAllUsers, updateUserRole, getSubscriptionStats,
  getUserById, getSavedGrantIds, toggleSavedGrant, subscribeNewsletter,
  completeOnboarding, listGrants, getGrantByItemId, getGrantTranslations,
  getBulkGrantTranslations, createGrant, updateGrant, deleteGrant,
  hardDeleteGrant, upsertGrantTranslations, getGrantStats, getRelatedGrants,
  getActiveNewsletterSubscribers, getNewsletterSubscriberCount, exportAllGrants,
  unsubscribeByToken, createNotificationRecord, updateNotificationRecord,
  getNotificationHistory, bulkImportGrants,
} from "./db";
import {
  sendSubscriptionEmail, sendAdminNewSubscriberNotification,
  sendBatchNewGrantNotifications, buildNewGrantsSubject,
  type GrantEmailData,
} from "./emailService";
import { parseCSV, parseExcel, validateBatch, type ImportParseResult } from "./importGrants";
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
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
      }).optional())
      .query(async ({ input }) => {
        const { search, language, category, country, type, sortBy, page = 1, pageSize = 20 } = input || {};
        const result = await listGrants({
          search,
          language,
          category,
          country,
          type,
          sortBy,
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
  }),
});

export type AppRouter = typeof appRouter;
