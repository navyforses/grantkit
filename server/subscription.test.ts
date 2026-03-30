import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createUserContext(overrides: Partial<AuthenticatedUser> = {}): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    paddleCustomerId: null,
    paddleSubscriptionId: null,
    subscriptionStatus: "none",
    subscriptionPlanId: null,
    subscriptionCurrentPeriodEnd: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

describe("subscription.status", () => {
  it("returns subscription status for a regular user with no subscription", async () => {
    const ctx = createUserContext({ subscriptionStatus: "none" });
    const caller = appRouter.createCaller(ctx);

    const result = await caller.subscription.status();

    expect(result.subscriptionStatus).toBe("none");
    expect(result.isActive).toBe(false);
    expect(result.paddleCustomerId).toBeNull();
    expect(result.paddleSubscriptionId).toBeNull();
  });

  it("returns isActive=true for a user with active subscription", async () => {
    const ctx = createUserContext({
      subscriptionStatus: "active",
      paddleCustomerId: "ctm_123",
      paddleSubscriptionId: "sub_456",
    });
    const caller = appRouter.createCaller(ctx);

    const result = await caller.subscription.status();

    expect(result.subscriptionStatus).toBe("active");
    expect(result.isActive).toBe(true);
    expect(result.paddleCustomerId).toBe("ctm_123");
    expect(result.paddleSubscriptionId).toBe("sub_456");
  });

  it("returns isActive=true for admin users regardless of subscription status", async () => {
    const ctx = createUserContext({
      role: "admin",
      subscriptionStatus: "none",
    });
    const caller = appRouter.createCaller(ctx);

    const result = await caller.subscription.status();

    expect(result.subscriptionStatus).toBe("none");
    expect(result.isActive).toBe(true);
  });

  it("returns isActive=false for cancelled subscription", async () => {
    const ctx = createUserContext({
      subscriptionStatus: "cancelled",
    });
    const caller = appRouter.createCaller(ctx);

    const result = await caller.subscription.status();

    expect(result.subscriptionStatus).toBe("cancelled");
    expect(result.isActive).toBe(false);
  });

  it("returns isActive=false for past_due subscription", async () => {
    const ctx = createUserContext({
      subscriptionStatus: "past_due",
    });
    const caller = appRouter.createCaller(ctx);

    const result = await caller.subscription.status();

    expect(result.subscriptionStatus).toBe("past_due");
    expect(result.isActive).toBe(false);
  });

  it("throws UNAUTHORIZED for unauthenticated users", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.subscription.status()).rejects.toThrow();
  });
});

describe("auth.me", () => {
  it("returns null for unauthenticated users", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user data including subscription fields for authenticated users", async () => {
    const ctx = createUserContext({
      subscriptionStatus: "active",
      paddleCustomerId: "ctm_test",
    });
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.subscriptionStatus).toBe("active");
    expect(result?.paddleCustomerId).toBe("ctm_test");
  });
});
