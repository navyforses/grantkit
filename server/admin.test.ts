import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): { ctx: TrpcContext; clearedCookies: any[] } {
  const clearedCookies: any[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@grantkit.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    paddleCustomerId: null,
    paddleSubscriptionId: null,
    subscriptionStatus: "none",
    subscriptionPlanId: null,
    subscriptionCurrentPeriodEnd: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

function createRegularUserContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    paddleCustomerId: null,
    paddleSubscriptionId: null,
    subscriptionStatus: "active",
    subscriptionPlanId: "pri_test",
    subscriptionCurrentPeriodEnd: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

function createUnauthContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("admin.stats", () => {
  it("rejects unauthenticated users", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.stats()).rejects.toThrow();
  });

  it("rejects non-admin users", async () => {
    const { ctx } = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.stats()).rejects.toThrow();
  });
});

describe("admin.users", () => {
  it("rejects unauthenticated users", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.users()).rejects.toThrow();
  });

  it("rejects non-admin users", async () => {
    const { ctx } = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.users()).rejects.toThrow();
  });
});

describe("admin.updateRole", () => {
  it("rejects unauthenticated users", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.admin.updateRole({ userId: 2, role: "admin" })
    ).rejects.toThrow();
  });

  it("rejects non-admin users", async () => {
    const { ctx } = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.admin.updateRole({ userId: 1, role: "admin" })
    ).rejects.toThrow();
  });

  it("prevents admin from demoting themselves", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.updateRole({ userId: 1, role: "user" });
    expect(result.success).toBe(false);
    expect(result.error).toBe("Cannot demote yourself");
  });
});

describe("admin.updateSubscription", () => {
  it("rejects unauthenticated users", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.admin.updateSubscription({ userId: 2, subscriptionStatus: "active" })
    ).rejects.toThrow();
  });

  it("rejects non-admin users", async () => {
    const { ctx } = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.admin.updateSubscription({ userId: 1, subscriptionStatus: "active" })
    ).rejects.toThrow();
  });
});
