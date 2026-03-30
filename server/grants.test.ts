import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

// Mock the db module
vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  // In-memory store for saved grants
  let savedGrants: Map<string, string[]> = new Map();

  return {
    ...actual,
    getSavedGrantIds: vi.fn(async (userId: number) => {
      return savedGrants.get(String(userId)) || [];
    }),
    toggleSavedGrant: vi.fn(async (userId: number, grantId: string) => {
      const key = String(userId);
      const current = savedGrants.get(key) || [];
      if (current.includes(grantId)) {
        savedGrants.set(key, current.filter((id) => id !== grantId));
        return { saved: false };
      } else {
        savedGrants.set(key, [...current, grantId]);
        return { saved: true };
      }
    }),
  };
});

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

describe("grants.savedList", () => {
  it("returns empty list for user with no saved grants", async () => {
    const ctx = createAuthContext(99);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.grants.savedList();
    expect(result).toEqual({ grantIds: [] });
  });

  it("requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.grants.savedList()).rejects.toThrow();
  });
});

describe("grants.toggleSave", () => {
  it("saves a grant and returns saved: true", async () => {
    const ctx = createAuthContext(2);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.grants.toggleSave({ grantId: "item_0001" });
    expect(result).toEqual({ saved: true });
  });

  it("unsaves a previously saved grant", async () => {
    const ctx = createAuthContext(3);
    const caller = appRouter.createCaller(ctx);
    // Save first
    await caller.grants.toggleSave({ grantId: "item_0002" });
    // Toggle again to unsave
    const result = await caller.grants.toggleSave({ grantId: "item_0002" });
    expect(result).toEqual({ saved: false });
  });

  it("returns saved grant IDs after saving", async () => {
    const ctx = createAuthContext(4);
    const caller = appRouter.createCaller(ctx);
    await caller.grants.toggleSave({ grantId: "item_0010" });
    await caller.grants.toggleSave({ grantId: "item_0020" });
    const list = await caller.grants.savedList();
    expect(list.grantIds).toContain("item_0010");
    expect(list.grantIds).toContain("item_0020");
  });

  it("requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.grants.toggleSave({ grantId: "item_0001" })).rejects.toThrow();
  });
});
