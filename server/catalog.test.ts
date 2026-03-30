import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

// Mock the db module for catalog and admin grant tests
vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");

  // In-memory grant store
  let grants: Array<{
    id: number;
    itemId: string;
    name: string;
    organization: string | null;
    description: string | null;
    category: string;
    type: string;
    country: string;
    eligibility: string | null;
    website: string | null;
    phone: string | null;
    email: string | null;
    amount: string | null;
    status: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }> = [
    {
      id: 1, itemId: "item_0001", name: "Test Grant Alpha", organization: "Org A",
      description: "Alpha description", category: "Medical & Treatment", type: "grant",
      country: "US", eligibility: "Ages 0-18", website: "https://example.com",
      phone: "555-0001", email: "alpha@example.com", amount: "$5,000", status: "Open",
      isActive: true, createdAt: new Date(), updatedAt: new Date(),
    },
    {
      id: 2, itemId: "item_0002", name: "Test Resource Beta", organization: "Org B",
      description: "Beta description", category: "Financial Assistance", type: "resource",
      country: "International", eligibility: null, website: null,
      phone: null, email: null, amount: null, status: null,
      isActive: true, createdAt: new Date(), updatedAt: new Date(),
    },
    {
      id: 3, itemId: "item_0003", name: "Test Grant Gamma", organization: "Org A",
      description: "Gamma description", category: "Medical & Treatment", type: "grant",
      country: "US", eligibility: "Ages 0-100", website: null,
      phone: null, email: null, amount: "$10,000", status: "Open",
      isActive: true, createdAt: new Date(), updatedAt: new Date(),
    },
    {
      id: 4, itemId: "item_0004", name: "Inactive Grant", organization: "Org C",
      description: "Inactive", category: "Other", type: "grant",
      country: "US", eligibility: null, website: null,
      phone: null, email: null, amount: null, status: null,
      isActive: false, createdAt: new Date(), updatedAt: new Date(),
    },
  ];

  let translations: Record<string, Record<string, { name?: string; description?: string; eligibility?: string }>> = {
    item_0001: {
      ka: { name: "ტესტ გრანტი ალფა", description: "ალფა აღწერა" },
      fr: { name: "Subvention Alpha", description: "Description Alpha" },
    },
  };

  let nextId = 5;
  let nextItemNum = 5;

  return {
    ...actual,
    // Catalog queries
    listGrants: vi.fn(async (opts: any) => {
      let filtered = [...grants];
      if (opts.activeOnly) filtered = filtered.filter(g => g.isActive);
      if (opts.search) {
        const s = opts.search.toLowerCase();
        filtered = filtered.filter(g => g.name.toLowerCase().includes(s) || (g.organization || "").toLowerCase().includes(s));
      }
      if (opts.category) filtered = filtered.filter(g => g.category === opts.category);
      if (opts.country) filtered = filtered.filter(g => g.country === opts.country);
      if (opts.type) filtered = filtered.filter(g => g.type === opts.type);
      // Sort
      if (opts.sortBy === "name_asc") filtered.sort((a, b) => a.name.localeCompare(b.name));
      else if (opts.sortBy === "name_desc") filtered.sort((a, b) => b.name.localeCompare(a.name));
      const total = filtered.length;
      const offset = opts.offset || 0;
      const limit = opts.limit || 20;
      return { grants: filtered.slice(offset, offset + limit), total };
    }),

    getGrantByItemId: vi.fn(async (itemId: string) => {
      return grants.find(g => g.itemId === itemId) || null;
    }),

    getGrantTranslations: vi.fn(async (itemId: string) => {
      return translations[itemId] || {};
    }),

    getBulkGrantTranslations: vi.fn(async (itemIds: string[]) => {
      const result: Record<string, any> = {};
      for (const id of itemIds) {
        if (translations[id]) result[id] = translations[id];
      }
      return result;
    }),

    getRelatedGrants: vi.fn(async (itemId: string, category: string, limit: number) => {
      return grants.filter(g => g.category === category && g.itemId !== itemId && g.isActive).slice(0, limit);
    }),

    getGrantStats: vi.fn(async () => {
      const active = grants.filter(g => g.isActive);
      return {
        total: grants.length,
        active: active.length,
        grants: active.filter(g => g.type === "grant").length,
        resources: active.filter(g => g.type === "resource").length,
      };
    }),

    // Admin CRUD
    createGrant: vi.fn(async (data: any) => {
      const itemId = `item_${String(nextItemNum++).padStart(4, "0")}`;
      const newGrant = {
        id: nextId++,
        itemId,
        ...data,
        organization: data.organization || null,
        description: data.description || null,
        eligibility: data.eligibility || null,
        website: data.website || null,
        phone: data.phone || null,
        email: data.email || null,
        amount: data.amount || null,
        status: data.status || null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      grants.push(newGrant);
      return { itemId };
    }),

    updateGrant: vi.fn(async (itemId: string, data: any) => {
      const idx = grants.findIndex(g => g.itemId === itemId);
      if (idx >= 0) {
        grants[idx] = { ...grants[idx], ...data, updatedAt: new Date() };
      }
    }),

    deleteGrant: vi.fn(async (itemId: string) => {
      const idx = grants.findIndex(g => g.itemId === itemId);
      if (idx >= 0) grants[idx].isActive = false;
    }),

    hardDeleteGrant: vi.fn(async (itemId: string) => {
      grants = grants.filter(g => g.itemId !== itemId);
    }),

    upsertGrantTranslations: vi.fn(async (itemId: string, trans: any) => {
      translations[itemId] = { ...translations[itemId], ...trans };
    }),

    // Keep existing mocks for other features
    getSavedGrantIds: vi.fn(async () => []),
    toggleSavedGrant: vi.fn(async () => ({ saved: true })),
    subscribeNewsletter: vi.fn(async () => ({ success: true, alreadySubscribed: false })),
    completeOnboarding: vi.fn(async () => {}),
    updateUserSubscription: vi.fn(async () => {}),
    listAllUsers: vi.fn(async () => ({ users: [], total: 0 })),
    updateUserRole: vi.fn(async () => {}),
    getSubscriptionStats: vi.fn(async () => ({
      totalUsers: 10, activeSubscriptions: 5, cancelledSubscriptions: 2,
      neverSubscribed: 3, revenue: 45,
    })),
    getUserById: vi.fn(async () => null),
  };
});

vi.mock("./emailService", () => ({
  sendSubscriptionEmail: vi.fn(async () => {}),
  sendAdminNewSubscriberNotification: vi.fn(async () => {}),
}));

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user-1",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
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
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user-2",
    email: "user@example.com",
    name: "Regular User",
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
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ===== CATALOG TESTS =====

describe("catalog.list", () => {
  it("returns grants list with pagination info", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.catalog.list({ page: 1, pageSize: 10 });
    expect(result.grants).toBeDefined();
    expect(result.total).toBeGreaterThan(0);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
    expect(result.totalPages).toBeGreaterThanOrEqual(1);
  });

  it("only returns active grants for public queries", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.catalog.list({ page: 1, pageSize: 100 });
    // item_0004 is inactive, should not appear
    const ids = result.grants.map(g => g.id);
    expect(ids).not.toContain("item_0004");
  });

  it("supports search filtering", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.catalog.list({ search: "Alpha", page: 1, pageSize: 10 });
    expect(result.grants.length).toBeGreaterThan(0);
    expect(result.grants[0].name).toContain("Alpha");
  });

  it("supports search by organization name", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.catalog.list({ search: "Org A", page: 1, pageSize: 10 });
    expect(result.grants.length).toBeGreaterThan(0);
    result.grants.forEach(g => expect(g.organization).toContain("Org A"));
  });

  it("supports search with language parameter for multilingual search", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.catalog.list({ search: "Alpha", language: "ka", page: 1, pageSize: 10 });
    expect(result.grants.length).toBeGreaterThan(0);
  });

  it("returns empty results for non-matching search", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.catalog.list({ search: "xyznonexistent", page: 1, pageSize: 10 });
    expect(result.grants.length).toBe(0);
    expect(result.total).toBe(0);
  });

  it("supports newest sort option", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.catalog.list({ sortBy: "newest", page: 1, pageSize: 10 });
    expect(result.grants).toBeDefined();
    expect(result.total).toBeGreaterThan(0);
  });

  it("supports combined search and category filter", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.catalog.list({ search: "Alpha", category: "Medical & Treatment", page: 1, pageSize: 10 });
    expect(result.grants.length).toBeGreaterThan(0);
    result.grants.forEach(g => {
      expect(g.category).toBe("Medical & Treatment");
    });
  });

  it("supports category filtering", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.catalog.list({ category: "Financial Assistance", page: 1, pageSize: 10 });
    expect(result.grants.length).toBeGreaterThan(0);
    result.grants.forEach(g => expect(g.category).toBe("Financial Assistance"));
  });

  it("supports country filtering", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.catalog.list({ country: "International", page: 1, pageSize: 10 });
    expect(result.grants.length).toBeGreaterThan(0);
    result.grants.forEach(g => expect(g.country).toBe("International"));
  });

  it("includes translations in response", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.catalog.list({ page: 1, pageSize: 10 });
    // item_0001 has translations
    const alpha = result.grants.find(g => g.id === "item_0001");
    expect(alpha).toBeDefined();
    expect(alpha!.translations).toBeDefined();
  });

  it("works without any input parameters", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.catalog.list();
    expect(result.grants).toBeDefined();
    expect(result.total).toBeGreaterThan(0);
  });
});

describe("catalog.detail", () => {
  it("returns grant details with translations and related grants", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.catalog.detail({ itemId: "item_0001" });
    expect(result).not.toBeNull();
    expect(result!.grant.name).toBe("Test Grant Alpha");
    expect(result!.grant.organization).toBe("Org A");
    expect(result!.translations).toBeDefined();
    expect(result!.related).toBeDefined();
  });

  it("returns null for non-existent grant", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.catalog.detail({ itemId: "item_9999" });
    expect(result).toBeNull();
  });

  it("includes related grants from same category", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.catalog.detail({ itemId: "item_0001" });
    expect(result).not.toBeNull();
    // item_0003 is also Medical & Treatment
    const relatedIds = result!.related.map(r => r.id);
    expect(relatedIds).toContain("item_0003");
  });
});

describe("catalog.count", () => {
  it("returns total count of active grants", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.catalog.count();
    expect(result.total).toBeGreaterThan(0);
    expect(result.grants).toBeDefined();
    expect(result.resources).toBeDefined();
  });
});

// ===== ADMIN GRANT MANAGEMENT TESTS =====

describe("admin.grantStats", () => {
  it("returns grant statistics for admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.grantStats();
    expect(result.total).toBeGreaterThan(0);
    expect(result.active).toBeDefined();
    expect(result.grants).toBeDefined();
    expect(result.resources).toBeDefined();
  });

  it("rejects non-admin users", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.admin.grantStats()).rejects.toThrow();
  });
});

describe("admin.grants", () => {
  it("returns all grants including inactive for admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.grants({ page: 1, pageSize: 100 });
    expect(result.grants).toBeDefined();
    expect(result.total).toBeGreaterThan(0);
    // Admin should see inactive grants too
    const itemIds = result.grants.map(g => g.itemId);
    expect(itemIds).toContain("item_0004"); // inactive grant
  });

  it("rejects non-admin users", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.admin.grants()).rejects.toThrow();
  });
});

describe("admin.grantDetail", () => {
  it("returns full grant details with translations for admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.grantDetail({ itemId: "item_0001" });
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Test Grant Alpha");
    expect(result!.translations).toBeDefined();
  });

  it("returns null for non-existent grant", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.grantDetail({ itemId: "item_9999" });
    expect(result).toBeNull();
  });
});

describe("admin.createGrant", () => {
  it("creates a new grant and returns itemId", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.createGrant({
      name: "New Test Grant",
      category: "Scholarships",
      type: "grant",
      country: "US",
      description: "A new test grant",
    });
    expect(result.success).toBe(true);
    expect(result.itemId).toBeDefined();
    expect(result.itemId).toMatch(/^item_/);
  });

  it("rejects non-admin users", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.admin.createGrant({
        name: "Unauthorized Grant",
        category: "Other",
        type: "grant",
        country: "US",
      })
    ).rejects.toThrow();
  });

  it("requires name field", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.admin.createGrant({
        name: "",
        category: "Other",
        type: "grant",
        country: "US",
      })
    ).rejects.toThrow();
  });
});

describe("admin.updateGrant", () => {
  it("updates grant fields", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.updateGrant({
      itemId: "item_0001",
      name: "Updated Alpha Grant",
      description: "Updated description",
    });
    expect(result.success).toBe(true);
  });

  it("can deactivate a grant", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.updateGrant({
      itemId: "item_0002",
      isActive: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-admin users", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.admin.updateGrant({ itemId: "item_0001", name: "Hacked" })
    ).rejects.toThrow();
  });
});

describe("admin.updateGrantTranslations", () => {
  it("updates translations for a grant", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.updateGrantTranslations({
      itemId: "item_0002",
      translations: {
        ka: { name: "ტესტ რესურსი ბეტა", description: "ბეტა აღწერა" },
        es: { name: "Recurso Beta", description: "Descripcion Beta" },
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-admin users", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.admin.updateGrantTranslations({
        itemId: "item_0001",
        translations: { ka: { name: "ჰაკი" } },
      })
    ).rejects.toThrow();
  });
});

describe("admin.deleteGrant", () => {
  it("soft deletes a grant", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.deleteGrant({ itemId: "item_0003" });
    expect(result.success).toBe(true);
  });

  it("rejects non-admin users", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.admin.deleteGrant({ itemId: "item_0001" })
    ).rejects.toThrow();
  });
});

describe("admin.hardDeleteGrant", () => {
  it("permanently deletes a grant", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.hardDeleteGrant({ itemId: "item_0004" });
    expect(result.success).toBe(true);
  });

  it("rejects non-admin users", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.admin.hardDeleteGrant({ itemId: "item_0001" })
    ).rejects.toThrow();
  });
});
