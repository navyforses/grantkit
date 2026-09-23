/**
 * organizations.list — Phase 1 item 1.4: domain / language / accessibility
 * filters (mapping only, no schema change). First organizations router test.
 *
 * Two layers, no live DB:
 *  1. `buildOrgConditions` → rendered MySQL WHERE clause (pure, via MySqlDialect)
 *  2. router → `listOrganizations` pass-through (db module mocked like catalog.test.ts)
 */
import { describe, expect, it, vi } from "vitest";
import { and } from "drizzle-orm";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import type { TrpcContext } from "./_core/context";

const listOrganizationsMock = vi.fn(async () => ({ organizations: [], total: 0 }));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, listOrganizations: listOrganizationsMock };
});

const { buildOrgConditions } = await import("./db");
const { appRouter } = await import("./routers");

function render(conditions: any[]): { sql: string; params: unknown[] } {
  const q = new MySqlDialect().sqlToQuery(and(...conditions)!);
  return { sql: q.sql, params: q.params };
}

function publicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as any,
    res: { cookie: vi.fn(), clearCookie: vi.fn() } as any,
  } as unknown as TrpcContext;
}

describe("buildOrgConditions — domain=health&language=ka&serviceCost=free&country=FR", () => {
  const { sql, params } = render(buildOrgConditions({
    domain: "health", language: "ka", serviceCost: "free", country: "FR",
  }));

  it("keeps the isActive guard and country equality", () => {
    expect(sql).toContain("`organizations`.`isActive` = ?");
    expect(sql).toContain("`organizations`.`country` = ?");
    expect(params).toContain("FR");
  });

  it("expands domain=health into mainCategory IN (...) OR categories token matches", () => {
    expect(sql).toContain("`organizations`.`mainCategory` in (");
    expect(params).toEqual(expect.arrayContaining(["health", "sante", "medical_treatment", "assistive_technology"]));
    // token-boundary LIKE for each legacy category that maps to health
    expect(params).toEqual(expect.arrayContaining(["medical_treatment,%", "%,medical_treatment", "%,medical_treatment,%"]));
    expect(params).toEqual(expect.arrayContaining(["assistive_technology,%", "%,assistive_technology"]));
    // and nothing from another domain leaks in
    expect(params).not.toContain("housing");
    expect(params).not.toContain("financial_assistance,%");
  });

  it("matches language as a CSV token of orgLanguages (not a substring)", () => {
    expect(sql).toContain("`organizations`.`orgLanguages` = ?");
    expect(sql).toContain("`organizations`.`orgLanguages` like ?");
    expect(params).toEqual(expect.arrayContaining(["ka", "ka,%", "%,ka", "%,ka,%"]));
    expect(params).not.toContain("%ka%");
  });

  it("applies serviceCost as equality", () => {
    expect(sql).toContain("`organizations`.`serviceCost` = ?");
    expect(params).toContain("free");
  });

  it("does not touch acceptsUndocumented / acceptsUninsured / appointmentPolicy when absent", () => {
    expect(sql).not.toContain("acceptsUndocumented");
    expect(sql).not.toContain("acceptsUninsured");
    expect(sql).not.toContain("appointmentPolicy");
  });
});

describe("buildOrgConditions — other accessibility filters", () => {
  it("adds equality for each of the three enum filters", () => {
    const { sql, params } = render(buildOrgConditions({
      acceptsUndocumented: "yes", acceptsUninsured: "yes", appointmentPolicy: "walk_in",
    }));
    expect(sql).toContain("`organizations`.`acceptsUndocumented` = ?");
    expect(sql).toContain("`organizations`.`acceptsUninsured` = ?");
    expect(sql).toContain("`organizations`.`appointmentPolicy` = ?");
    expect(params).toEqual([true, "yes", "yes", "walk_in"]);
  });

  it("no filters → only the isActive guard (existing behaviour preserved)", () => {
    const { sql, params } = render(buildOrgConditions({}));
    expect(sql).toBe("`organizations`.`isActive` = ?");
    expect(params).toEqual([true]);
  });

  it("legacy category filter still uses token-boundary matching", () => {
    const { params } = render(buildOrgConditions({ category: "housing" }));
    expect(params).toEqual(expect.arrayContaining(["housing", "housing,%", "%,housing", "%,housing,%"]));
  });
});

describe("organizations.list router → listOrganizations pass-through", () => {
  const caller = appRouter.createCaller(publicCtx());

  it("forwards domain/language/serviceCost/country and paginates", async () => {
    listOrganizationsMock.mockClear();
    const res = await caller.organizations.list({
      domain: "health", language: "ka", serviceCost: "free", country: "FR", page: 2, pageSize: 10,
    });
    expect(listOrganizationsMock).toHaveBeenCalledTimes(1);
    expect(listOrganizationsMock.mock.calls[0]![0]).toMatchObject({
      domain: "health", language: "ka", serviceCost: "free", country: "FR", limit: 10, offset: 10,
    });
    expect(res).toMatchObject({ organizations: [], total: 0, page: 2, pageSize: 10, totalPages: 0 });
  });

  it("callers that pass nothing get the old defaults (no new filters set)", async () => {
    listOrganizationsMock.mockClear();
    await caller.organizations.list();
    const opts = listOrganizationsMock.mock.calls[0]![0] as Record<string, unknown>;
    for (const k of ["domain", "language", "serviceCost", "acceptsUndocumented", "acceptsUninsured", "appointmentPolicy"]) {
      expect(opts[k]).toBeUndefined();
    }
    expect(opts).toMatchObject({ limit: 20, offset: 0 });
  });

  it("rejects an unknown domain or enum value", async () => {
    await expect(caller.organizations.list({ domain: "medical_treatment" as any })).rejects.toThrow();
    await expect(caller.organizations.list({ serviceCost: "unknown" as any })).rejects.toThrow();
  });
});

describe("organizations.count — optional country (Phase 1.2 country-first hero)", () => {
  const caller = appRouter.createCaller(publicCtx());

  it("no input → global count, country undefined", async () => {
    listOrganizationsMock.mockClear();
    await caller.organizations.count();
    expect(listOrganizationsMock.mock.calls[0]![0]).toMatchObject({ limit: 1, offset: 0 });
    expect((listOrganizationsMock.mock.calls[0]![0] as any).country).toBeUndefined();
  });

  it("country=FR is forwarded", async () => {
    listOrganizationsMock.mockClear();
    const res = await caller.organizations.count({ country: "FR" });
    expect(listOrganizationsMock.mock.calls[0]![0]).toMatchObject({ country: "FR", limit: 1, offset: 0 });
    expect(res).toEqual({ total: 0 });
  });
});
