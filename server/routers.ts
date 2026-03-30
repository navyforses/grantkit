import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { updateUserSubscription, listAllUsers, updateUserRole, getSubscriptionStats } from "./db";
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
        return { success: true };
      }),
  }),

  // ===== Admin Panel =====
  admin: router({
    // Get subscription statistics overview
    stats: adminProcedure.query(async () => {
      return await getSubscriptionStats();
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
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
