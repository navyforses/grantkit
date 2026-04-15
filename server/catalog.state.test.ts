import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

// Mock data with state and city fields
const grants = [
  {
    id: 1, itemId: "item_0001", name: "California Grant A", organization: "Org A",
    description: "Desc A", category: "Medical & Treatment", type: "grant",
    country: "US", state: "California", city: "Los Angeles",
    eligibility: null, website: null, phone: null, email: null,
    amount: "$5,000", status: "Open", isActive: true,
    createdAt: new Date(), updatedAt: new Date(),
  },
  {
    id: 2, itemId: "item_0002", name: "California Grant B", organization: "Org B",
    description: "Desc B", category: "Financial Assistance", type: "grant",
    country: "US", state: "California", city: "San Francisco",
    eligibility: null, website: null, phone: null, email: null,
    amount: "$10,000", status: "Open", isActive: true,
    createdAt: new Date(), updatedAt: new Date(),
  },
  {
    id: 3, itemId: "item_0003", name: "California Grant C", organization: "Org C",
    description: "Desc C", category: "Medical & Treatment", type: "grant",
    country: "US", state: "California", city: "Los Angeles",
    eligibility: null, website: null, phone: null, email: null,
    amount: "$3,000", status: "Open", isActive: true,
    createdAt: new Date(), updatedAt: new Date(),
  },
  {
    id: 4, itemId: "item_0004", name: "Nationwide Grant", organization: "Org D",
    description: "Desc D", category: "Education", type: "grant",
    country: "US", state: "Nationwide", city: null,
    eligibility: null, website: null, phone: null, email: null,
    amount: "$1,000", status: "Open", isActive: true,
    createdAt: new Date(), updatedAt: new Date(),
  },
  {
    id: 5, itemId: "item_0005", name: "Texas Grant", organization: "Org E",
    description: "Desc E", category: "Financial Assistance", type: "grant",
    country: "US", state: "Texas", city: "Houston",
    eligibility: null, website: null, phone: null, email: null,
    amount: "$2,000", status: "Open", isActive: true,
    createdAt: new Date(), updatedAt: new Date(),
  },
  {
    id: 6, itemId: "item_0006", name: "Inactive Grant", organization: "Org F",
    description: "Inactive", category: "Other", type: "grant",
    country: "US", state: "California", city: "San Diego",
    eligibility: null, website: null, phone: null, email: null,
    amount: null, status: null, isActive: false,
    createdAt: new Date(), updatedAt: new Date(),
  },
];

vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
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
      if (opts.state) filtered = filtered.filter(g => g.state === opts.state);
      if (opts.city) filtered = filtered.filter(g => g.city === opts.city);
      if (opts.sortBy === "state") filtered.sort((a, b) => (a.state || "").localeCompare(b.state || ""));
      if (opts.sortBy === "name_asc") filtered.sort((a, b) => a.name.localeCompare(b.name));
      const total = filtered.length;
      const offset = opts.offset || 0;
      const limit = opts.limit || 20;
      return { grants: filtered.slice(offset, offset + limit), total };
    }),
    getDistinctStates: vi.fn(async () => {
      const active = grants.filter(g => g.isActive && g.state);
      const counts: Record<string, number> = {};
      for (const g of active) {
        counts[g.state!] = (counts[g.state!] || 0) + 1;
      }
      return Object.entries(counts)
        .map(([state, count]) => ({ state, count }))
        .sort((a, b) => b.count - a.count);
    }),
    getDistinctCities: vi.fn(async (stateName: string) => {
      const active = grants.filter(g => g.isActive && g.state === stateName && g.city);
      const counts: Record<string, number> = {};
      for (const g of active) {
        counts[g.city!] = (counts[g.city!] || 0) + 1;
      }
      return Object.entries(counts)
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => a.city.localeCompare(b.city));
    }),
    getGrantByItemId: vi.fn(async (itemId: string) => {
      return grants.find(g => g.itemId === itemId) || null;
    }),
    getGrantTranslations: vi.fn(async () => ({})),
    getBulkGrantTranslations: vi.fn(async () => ({})),
    getRelatedGrants: vi.fn(async () => []),
    getGrantStats: vi.fn(async () => ({ total: 6, active: 5, grants: 5, resources: 0 })),
    countActiveGrants: vi.fn(async () => 5),
    getDistinctCategories: vi.fn(async () => []),
    getDistinctCountries: vi.fn(async () => []),
    getDistinctTypes: vi.fn(async () => []),
  };
});

// Must import AFTER vi.mock
const { appRouter } = await import("./routers");

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("catalog.states", () => {
  it("returns an array of states with count", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const states = await caller.catalog.states();

    expect(Array.isArray(states)).toBe(true);
    expect(states.length).toBeGreaterThan(0);

    for (const entry of states) {
      expect(typeof entry.state).toBe("string");
      expect(entry.state.length).toBeGreaterThan(0);
      expect(typeof entry.count).toBe("number");
      expect(entry.count).toBeGreaterThan(0);
    }
  });

  it("states are sorted by count descending", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const states = await caller.catalog.states();

    for (let i = 1; i < states.length; i++) {
      expect(states[i - 1].count).toBeGreaterThanOrEqual(states[i].count);
    }
  });

  it("includes known states like California and Nationwide", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const states = await caller.catalog.states();
    const stateNames = states.map(s => s.state);

    expect(stateNames).toContain("California");
    expect(stateNames).toContain("Nationwide");
  });
});

describe("catalog.list sort by state", () => {
  it("sorts grants alphabetically by state when sortBy=state", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.catalog.list({
      sortBy: "state",
      page: 1,
      pageSize: 50,
    });

    expect(result.grants.length).toBeGreaterThan(0);

    const states = result.grants.map(g => g.state || "");
    const nonEmptyStates = states.filter(s => s.length > 0);
    for (let i = 1; i < nonEmptyStates.length; i++) {
      expect(nonEmptyStates[i - 1].localeCompare(nonEmptyStates[i])).toBeLessThanOrEqual(0);
    }
  });
});

describe("catalog.list with state filter", () => {
  it("returns grants filtered by a specific state", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.catalog.list({
      state: "California",
      page: 1,
      pageSize: 50,
    });

    expect(result.grants.length).toBeGreaterThan(0);

    for (const grant of result.grants) {
      expect(grant.state).toBe("California");
    }
  });

  it("returns grants filtered by Nationwide", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.catalog.list({
      state: "Nationwide",
      page: 1,
      pageSize: 50,
    });

    expect(result.grants.length).toBeGreaterThan(0);

    for (const grant of result.grants) {
      expect(grant.state).toBe("Nationwide");
    }
  });

  it("returns all grants when state is not provided", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const withoutState = await caller.catalog.list({
      page: 1,
      pageSize: 20,
    });

    const withState = await caller.catalog.list({
      state: "California",
      page: 1,
      pageSize: 20,
    });

    expect(withoutState.total).toBeGreaterThanOrEqual(withState.total);
  });

  it("grants include state and city fields in response", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.catalog.list({
      page: 1,
      pageSize: 5,
    });

    expect(result.grants.length).toBeGreaterThan(0);

    for (const grant of result.grants) {
      expect(grant).toHaveProperty("state");
      expect(grant).toHaveProperty("city");
    }
  });
});

describe("catalog.cities", () => {
  it("returns cities for California with counts", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const cities = await caller.catalog.cities({ state: "California" });

    expect(Array.isArray(cities)).toBe(true);
    expect(cities.length).toBeGreaterThan(0);

    for (const entry of cities) {
      expect(typeof entry.city).toBe("string");
      expect(entry.city.length).toBeGreaterThan(0);
      expect(typeof entry.count).toBe("number");
      expect(entry.count).toBeGreaterThan(0);
    }
  });

  it("cities are sorted alphabetically", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const cities = await caller.catalog.cities({ state: "California" });

    for (let i = 1; i < cities.length; i++) {
      expect(cities[i - 1].city.localeCompare(cities[i].city)).toBeLessThanOrEqual(0);
    }
  });

  it("returns empty array for a state with no cities", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const cities = await caller.catalog.cities({ state: "NonExistentState" });

    expect(Array.isArray(cities)).toBe(true);
    expect(cities.length).toBe(0);
  });
});

describe("catalog.list with city filter", () => {
  it("returns grants filtered by state and city", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const cities = await caller.catalog.cities({ state: "California" });
    expect(cities.length).toBeGreaterThan(0);
    const testCity = cities[0].city;

    const result = await caller.catalog.list({
      state: "California",
      city: testCity,
      page: 1,
      pageSize: 50,
    });

    expect(result.grants.length).toBeGreaterThan(0);

    for (const grant of result.grants) {
      expect(grant.state).toBe("California");
      expect(grant.city).toBe(testCity);
    }
  });

  it("city filter narrows results within a state", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const cities = await caller.catalog.cities({ state: "California" });
    expect(cities.length).toBeGreaterThan(0);
    const testCity = cities[0].city;

    const stateOnly = await caller.catalog.list({
      state: "California",
      page: 1,
      pageSize: 50,
    });

    const stateAndCity = await caller.catalog.list({
      state: "California",
      city: testCity,
      page: 1,
      pageSize: 50,
    });

    expect(stateOnly.total).toBeGreaterThanOrEqual(stateAndCity.total);
  });
});
