import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

// Mock the db module
vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  // In-memory stores
  let newsletterSubs: Map<string, { email: string; isActive: boolean; userId?: number }> = new Map();
  let onboardingCompleted: Set<number> = new Set();

  return {
    ...actual,
    subscribeNewsletter: vi.fn(async (email: string, userId?: number) => {
      const existing = newsletterSubs.get(email);
      if (existing) {
        if (existing.isActive) {
          return { success: true, alreadySubscribed: true };
        }
        existing.isActive = true;
        return { success: true };
      }
      newsletterSubs.set(email, { email, isActive: true, userId });
      return { success: true };
    }),
    completeOnboarding: vi.fn(async (userId: number) => {
      onboardingCompleted.add(userId);
    }),
    // Keep existing mocks working
    getSavedGrantIds: vi.fn(async () => []),
    toggleSavedGrant: vi.fn(async () => ({ saved: true })),
    getSubscriptionStats: vi.fn(async () => ({
      total: 0, active: 0, cancelled: 0, none: 0, pastDue: 0, paused: 0,
    })),
    listAllUsers: vi.fn(async () => ({ users: [], total: 0 })),
    updateUserRole: vi.fn(async () => {}),
    updateUserSubscription: vi.fn(async () => {}),
    getUserById: vi.fn(async () => null),
    getUserByPaddleCustomerId: vi.fn(async () => null),
  };
});

// Mock email service
vi.mock("./emailService", () => ({
  sendSubscriptionEmail: vi.fn(async () => {}),
  sendAdminNewSubscriberNotification: vi.fn(async () => {}),
}));

function createAuthContext(userId = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    paddleCustomerId: null,
    paddleSubscriptionId: null,
    subscriptionStatus: "active",
    subscriptionPlanId: null,
    subscriptionCurrentPeriodEnd: null,
    onboardingCompleted: false,
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
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
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// ===== Newsletter Tests =====
describe("newsletter.subscribe", () => {
  it("subscribes a new email successfully", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.newsletter.subscribe({ email: "new@example.com" });
    expect(result.success).toBe(true);
  });

  it("returns alreadySubscribed for duplicate email", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    // First subscription
    await caller.newsletter.subscribe({ email: "dup@example.com" });
    // Second subscription
    const result = await caller.newsletter.subscribe({ email: "dup@example.com" });
    expect(result.success).toBe(true);
    expect(result.alreadySubscribed).toBe(true);
  });

  it("works for authenticated users too", async () => {
    const ctx = createAuthContext(5);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.newsletter.subscribe({ email: "auth-user@example.com" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email format", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.newsletter.subscribe({ email: "not-an-email" })
    ).rejects.toThrow();
  });

  it("rejects empty email", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.newsletter.subscribe({ email: "" })
    ).rejects.toThrow();
  });
});

// ===== Onboarding Tests =====
describe("onboarding.complete", () => {
  it("marks onboarding as completed for authenticated user", async () => {
    const ctx = createAuthContext(10);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.onboarding.complete();
    expect(result).toEqual({ success: true });
  });

  it("requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.onboarding.complete()).rejects.toThrow();
  });
});
