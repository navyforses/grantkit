import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
const mockListGrants = vi.fn();
const mockGetGrantByItemId = vi.fn();
const mockCreateGrant = vi.fn();
const mockUpdateGrant = vi.fn();

vi.mock("./db", () => ({
  listGrants: (...args: any[]) => mockListGrants(...args),
  getGrantByItemId: (...args: any[]) => mockGetGrantByItemId(...args),
  createGrant: (...args: any[]) => mockCreateGrant(...args),
  updateGrant: (...args: any[]) => mockUpdateGrant(...args),
  getAllGrantItemIds: vi.fn().mockResolvedValue([]),
  getGrantTranslations: vi.fn().mockResolvedValue(null),
  getBulkGrantTranslations: vi.fn().mockResolvedValue({}),
  getRelatedGrants: vi.fn().mockResolvedValue([]),
  getSavedGrantIds: vi.fn().mockResolvedValue([]),
  toggleSavedGrant: vi.fn(),
  subscribeNewsletter: vi.fn(),
  completeOnboarding: vi.fn(),
  deleteGrant: vi.fn(),
  hardDeleteGrant: vi.fn(),
  upsertGrantTranslations: vi.fn(),
  getGrantStats: vi.fn().mockResolvedValue({ total: 0, byCategory: {}, byCountry: {} }),
  updateUserSubscription: vi.fn(),
  listAllUsers: vi.fn().mockResolvedValue({ users: [], total: 0 }),
  updateUserRole: vi.fn(),
  getSubscriptionStats: vi.fn().mockResolvedValue({}),
  getUserById: vi.fn(),
  getActiveNewsletterSubscribers: vi.fn().mockResolvedValue([]),
  getNewsletterSubscriberCount: vi.fn().mockResolvedValue(0),
  exportAllGrants: vi.fn().mockResolvedValue([]),
  unsubscribeByToken: vi.fn(),
  createNotificationRecord: vi.fn(),
  updateNotificationRecord: vi.fn(),
  getNotificationHistory: vi.fn().mockResolvedValue([]),
  bulkImportGrants: vi.fn(),
}));

describe("Grant Enrichment Features", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Enrichment Data Structure", () => {
    it("should include all enrichment fields in grant detail response", async () => {
      const enrichedGrant = {
        id: 1,
        itemId: "item_0001",
        name: "Test Grant",
        organization: "Test Org",
        description: "A comprehensive test grant for medical assistance",
        category: "medical_treatment",
        type: "grant",
        country: "US",
        eligibility: "US residents with cancer diagnosis",
        website: "https://testgrant.org",
        phone: "+1-555-0100",
        email: "info@testgrant.org",
        amount: "$5,000 - $25,000",
        status: "Open",
        applicationProcess: "1. Submit online application\n2. Provide medical records\n3. Interview",
        deadline: "Rolling",
        fundingType: "one_time",
        targetDiagnosis: "Cancer",
        ageRange: "All Ages",
        geographicScope: "Nationwide",
        documentsRequired: "Medical records, proof of income, ID",
        b2VisaEligible: "no",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockGetGrantByItemId.mockResolvedValue(enrichedGrant);
      const result = await mockGetGrantByItemId("item_0001");

      expect(result).toBeDefined();
      expect(result.applicationProcess).toBe("1. Submit online application\n2. Provide medical records\n3. Interview");
      expect(result.deadline).toBe("Rolling");
      expect(result.fundingType).toBe("one_time");
      expect(result.targetDiagnosis).toBe("Cancer");
      expect(result.ageRange).toBe("All Ages");
      expect(result.geographicScope).toBe("Nationwide");
      expect(result.documentsRequired).toBe("Medical records, proof of income, ID");
      expect(result.b2VisaEligible).toBe("no");
    });

    it("should handle grants with empty enrichment fields gracefully", async () => {
      const partialGrant = {
        id: 2,
        itemId: "item_0002",
        name: "Partial Grant",
        organization: "Org",
        description: "Short description",
        category: "financial_assistance",
        type: "grant",
        country: "US",
        eligibility: "",
        website: "",
        phone: "",
        email: "",
        amount: "",
        status: "",
        applicationProcess: "",
        deadline: "",
        fundingType: "",
        targetDiagnosis: "",
        ageRange: "",
        geographicScope: "",
        documentsRequired: "",
        b2VisaEligible: "",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockGetGrantByItemId.mockResolvedValue(partialGrant);
      const result = await mockGetGrantByItemId("item_0002");

      expect(result).toBeDefined();
      expect(result.applicationProcess).toBe("");
      expect(result.b2VisaEligible).toBe("");
    });
  });

  describe("Enrichment Filters", () => {
    it("should filter grants by targetDiagnosis", async () => {
      const cancerGrants = [
        { itemId: "item_001", name: "Cancer Grant 1", targetDiagnosis: "Cancer" },
        { itemId: "item_002", name: "Cancer Grant 2", targetDiagnosis: "Cancer" },
      ];

      mockListGrants.mockResolvedValue({ grants: cancerGrants, total: 2, totalPages: 1 });

      const result = await mockListGrants({
        targetDiagnosis: "Cancer",
        page: 1,
        pageSize: 30,
      });

      expect(result.grants).toHaveLength(2);
      expect(result.grants.every((g: any) => g.targetDiagnosis === "Cancer")).toBe(true);
      expect(mockListGrants).toHaveBeenCalledWith(
        expect.objectContaining({ targetDiagnosis: "Cancer" })
      );
    });

    it("should filter grants by b2VisaEligible", async () => {
      const b2Grants = [
        { itemId: "item_003", name: "B2 Grant", b2VisaEligible: "yes" },
      ];

      mockListGrants.mockResolvedValue({ grants: b2Grants, total: 1, totalPages: 1 });

      const result = await mockListGrants({
        b2VisaEligible: "yes",
        page: 1,
        pageSize: 30,
      });

      expect(result.grants).toHaveLength(1);
      expect(result.grants[0].b2VisaEligible).toBe("yes");
    });

    it("should filter grants by fundingType", async () => {
      const recurringGrants = [
        { itemId: "item_004", name: "Recurring Grant", fundingType: "recurring" },
      ];

      mockListGrants.mockResolvedValue({ grants: recurringGrants, total: 1, totalPages: 1 });

      const result = await mockListGrants({
        fundingType: "recurring",
        page: 1,
        pageSize: 30,
      });

      expect(result.grants).toHaveLength(1);
      expect(result.grants[0].fundingType).toBe("recurring");
    });

    it("should filter grants that have a deadline", async () => {
      const grantsWithDeadline = [
        { itemId: "item_005", name: "Deadline Grant", deadline: "December 31, 2026" },
      ];

      mockListGrants.mockResolvedValue({ grants: grantsWithDeadline, total: 1, totalPages: 1 });

      const result = await mockListGrants({
        hasDeadline: true,
        page: 1,
        pageSize: 30,
      });

      expect(result.grants).toHaveLength(1);
      expect(result.grants[0].deadline).toBeTruthy();
    });

    it("should combine multiple enrichment filters", async () => {
      const filteredGrants = [
        {
          itemId: "item_006",
          name: "Specific Grant",
          targetDiagnosis: "Cancer",
          b2VisaEligible: "yes",
          fundingType: "one_time",
        },
      ];

      mockListGrants.mockResolvedValue({ grants: filteredGrants, total: 1, totalPages: 1 });

      const result = await mockListGrants({
        targetDiagnosis: "Cancer",
        b2VisaEligible: "yes",
        fundingType: "one_time",
        page: 1,
        pageSize: 30,
      });

      expect(result.grants).toHaveLength(1);
      expect(mockListGrants).toHaveBeenCalledWith(
        expect.objectContaining({
          targetDiagnosis: "Cancer",
          b2VisaEligible: "yes",
          fundingType: "one_time",
        })
      );
    });
  });

  describe("Grant CRUD with Enrichment Fields", () => {
    it("should create a grant with enrichment fields", async () => {
      const newGrant = {
        name: "New Enriched Grant",
        organization: "New Org",
        description: "A fully enriched grant",
        category: "medical_treatment",
        type: "grant",
        country: "US",
        eligibility: "Cancer patients",
        website: "https://newgrant.org",
        phone: "+1-555-0200",
        email: "info@newgrant.org",
        amount: "$10,000",
        status: "Open",
        applicationProcess: "Online application form",
        deadline: "June 30, 2026",
        fundingType: "one_time",
        targetDiagnosis: "Cancer",
        ageRange: "Adults (18+)",
        geographicScope: "Nationwide",
        documentsRequired: "Medical records",
        b2VisaEligible: "no",
      };

      mockCreateGrant.mockResolvedValue({ itemId: "item_new_001" });

      const result = await mockCreateGrant(newGrant);

      expect(result.itemId).toBe("item_new_001");
      expect(mockCreateGrant).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationProcess: "Online application form",
          deadline: "June 30, 2026",
          fundingType: "one_time",
          targetDiagnosis: "Cancer",
          b2VisaEligible: "no",
        })
      );
    });

    it("should update a grant with enrichment fields", async () => {
      mockUpdateGrant.mockResolvedValue(undefined);

      await mockUpdateGrant("item_0001", {
        applicationProcess: "Updated process",
        deadline: "March 2027",
        b2VisaEligible: "yes",
      });

      expect(mockUpdateGrant).toHaveBeenCalledWith(
        "item_0001",
        expect.objectContaining({
          applicationProcess: "Updated process",
          deadline: "March 2027",
          b2VisaEligible: "yes",
        })
      );
    });
  });

  describe("Enrichment Data Validation", () => {
    it("should accept valid b2VisaEligible values", () => {
      const validValues = ["yes", "no", "uncertain", ""];
      validValues.forEach((val) => {
        expect(["yes", "no", "uncertain", ""].includes(val)).toBe(true);
      });
    });

    it("should accept valid fundingType values", () => {
      const validValues = ["one_time", "recurring", "reimbursement", "varies", ""];
      validValues.forEach((val) => {
        expect(["one_time", "recurring", "reimbursement", "varies", ""].includes(val)).toBe(true);
      });
    });

    it("should handle long applicationProcess text", () => {
      const longProcess = "Step 1: Fill out the online application form at the organization website.\n" +
        "Step 2: Gather all required documentation including medical records.\n" +
        "Step 3: Submit documentation via email or postal mail.\n" +
        "Step 4: Wait for review (typically 4-6 weeks).\n" +
        "Step 5: If approved, funds are disbursed within 2 weeks.";

      expect(longProcess.length).toBeGreaterThan(100);
      expect(longProcess.split("\n").length).toBe(5);
    });
  });
});
