import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { updateUserSubscription } from "./db";
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
});

export type AppRouter = typeof appRouter;
