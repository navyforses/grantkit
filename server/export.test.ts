import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db module
vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
    exportAllGrants: vi.fn(),
  };
});

import { exportAllGrants } from "./db";

const mockExportAllGrants = vi.mocked(exportAllGrants);

// Helper to create admin context
function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-001",
      name: "Admin",
      email: "admin@test.com",
      loginMethod: "oauth",
      role: "admin",
      paddleCustomerId: null,
      paddleSubscriptionId: null,
      subscriptionStatus: "none",
      subscriptionPlanId: null,
      subscriptionCurrentPeriodEnd: null,
      onboardingCompleted: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as any,
    res: {} as any,
  };
}

function createUserContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "user-001",
      name: "Regular User",
      email: "user@test.com",
      loginMethod: "oauth",
      role: "user",
      paddleCustomerId: null,
      paddleSubscriptionId: null,
      subscriptionStatus: "none",
      subscriptionPlanId: null,
      subscriptionCurrentPeriodEnd: null,
      onboardingCompleted: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as any,
    res: {} as any,
  };
}

const caller = appRouter.createCaller;

describe("admin.exportGrants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return all grants with translations for admin", async () => {
    const mockData = [
      {
        id: 1,
        itemId: "item_0001",
        name: "Test Grant",
        organization: "Test Org",
        description: "A test grant",
        category: "medical_treatment",
        type: "grant" as const,
        country: "US",
        eligibility: "Open to all",
        website: "https://test.com",
        phone: "123-456",
        email: "test@test.com",
        amount: "$5,000",
        status: "Active",
        isActive: true,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
        translations: {
          en: { name: "Test Grant EN", description: "English desc", eligibility: "Open" },
          ka: { name: "ტესტ გრანტი", description: "ქართული აღწერა", eligibility: "ყველასთვის" },
        },
      },
    ];

    mockExportAllGrants.mockResolvedValue(mockData);

    const result = await caller(createAdminContext()).admin.exportGrants({});

    expect(result).toHaveLength(1);
    expect(result[0].itemId).toBe("item_0001");
    expect(result[0].name).toBe("Test Grant");
    expect(result[0].organization).toBe("Test Org");
    expect(result[0].translations).toBeDefined();
    expect(result[0].translations.en?.name).toBe("Test Grant EN");
    expect(result[0].translations.ka?.name).toBe("ტესტ გრანტი");
  });

  it("should pass filter options to exportAllGrants", async () => {
    mockExportAllGrants.mockResolvedValue([]);

    await caller(createAdminContext()).admin.exportGrants({
      category: "medical_treatment",
      country: "US",
      type: "grant",
      includeInactive: true,
    });

    expect(mockExportAllGrants).toHaveBeenCalledWith({
      category: "medical_treatment",
      country: "US",
      type: "grant",
      activeOnly: false,
    });
  });

  it("should default to activeOnly=true when includeInactive is not set", async () => {
    mockExportAllGrants.mockResolvedValue([]);

    await caller(createAdminContext()).admin.exportGrants({});

    expect(mockExportAllGrants).toHaveBeenCalledWith({
      category: undefined,
      country: undefined,
      type: undefined,
      activeOnly: true,
    });
  });

  it("should return empty array when no grants exist", async () => {
    mockExportAllGrants.mockResolvedValue([]);

    const result = await caller(createAdminContext()).admin.exportGrants({});

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it("should handle grants with missing optional fields", async () => {
    const mockData = [
      {
        id: 2,
        itemId: "item_0002",
        name: "Minimal Grant",
        organization: null,
        description: null,
        category: "other",
        type: "resource" as const,
        country: "UK",
        eligibility: null,
        website: null,
        phone: null,
        email: null,
        amount: null,
        status: null,
        isActive: true,
        createdAt: new Date("2025-06-01"),
        updatedAt: new Date("2025-06-01"),
        translations: {},
      },
    ];

    mockExportAllGrants.mockResolvedValue(mockData);

    const result = await caller(createAdminContext()).admin.exportGrants({});

    expect(result).toHaveLength(1);
    expect(result[0].organization).toBe("");
    expect(result[0].description).toBe("");
    expect(result[0].website).toBe("");
    expect(result[0].phone).toBe("");
    expect(result[0].email).toBe("");
    expect(result[0].amount).toBe("");
    expect(result[0].status).toBe("");
  });

  it("should reject non-admin users", async () => {
    await expect(
      caller(createUserContext()).admin.exportGrants({})
    ).rejects.toThrow();
  });

  it("should reject unauthenticated users", async () => {
    const unauthCtx: TrpcContext = {
      user: null,
      req: {} as any,
      res: {} as any,
    };

    await expect(
      caller(unauthCtx).admin.exportGrants({})
    ).rejects.toThrow();
  });

  it("should handle multiple grants with varied translations", async () => {
    const mockData = [
      {
        id: 1,
        itemId: "item_0001",
        name: "Grant A",
        organization: "Org A",
        description: "Desc A",
        category: "medical_treatment",
        type: "grant" as const,
        country: "US",
        eligibility: "All",
        website: "https://a.com",
        phone: null,
        email: null,
        amount: "$1,000",
        status: "Active",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        translations: {
          en: { name: "Grant A EN", description: "Desc EN", eligibility: "All" },
        },
      },
      {
        id: 2,
        itemId: "item_0002",
        name: "Grant B",
        organization: "Org B",
        description: "Desc B",
        category: "scholarships",
        type: "grant" as const,
        country: "UK",
        eligibility: "Students",
        website: null,
        phone: "555-1234",
        email: "b@test.com",
        amount: "£2,000",
        status: "Open",
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        translations: {
          en: { name: "Grant B EN", description: "Desc EN", eligibility: "Students" },
          fr: { name: "Bourse B", description: "Desc FR", eligibility: "Étudiants" },
          ka: { name: "გრანტი B", description: "აღწერა", eligibility: "სტუდენტები" },
        },
      },
    ];

    mockExportAllGrants.mockResolvedValue(mockData);

    const result = await caller(createAdminContext()).admin.exportGrants({
      includeInactive: true,
    });

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Grant A");
    expect(result[1].name).toBe("Grant B");
    expect(result[1].isActive).toBe(false);
    expect(Object.keys(result[1].translations)).toHaveLength(3);
  });
});
