import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Tests for the state/city feature:
 * 1. catalog.states — returns distinct states with counts
 * 2. catalog.list — filters by state when provided
 */

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
    // We know the DB has enriched data — should have at least some states
    expect(states.length).toBeGreaterThan(0);

    // Each entry should have state (string) and count (number)
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

    // These should exist based on our enrichment data
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

    // Verify alphabetical order (nulls may sort first or last depending on DB)
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

    // Every returned grant should have state = "California"
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

    // Without state filter should return more or equal results
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

    // Each grant should have state and city properties
    for (const grant of result.grants) {
      expect(grant).toHaveProperty("state");
      expect(grant).toHaveProperty("city");
    }
  });
});
