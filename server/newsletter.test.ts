import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock Resend before importing the module
const mockSend = vi.fn();
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: mockSend,
    },
  })),
}));

// Mock ENV
vi.mock("./_core/env", () => ({
  ENV: {
    resendApiKey: "re_test_key_123",
  },
}));

import {
  buildNewGrantsSubject,
  buildNewGrantsEmailHtml,
  sendNewGrantNotification,
  sendBatchNewGrantNotifications,
  type GrantEmailData,
} from "./emailService";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ===== Sample Data =====

const sampleGrant: GrantEmailData = {
  itemId: "item_test_001",
  name: "Test Medical Research Grant",
  organization: "Test Foundation",
  category: "Medical & Health",
  country: "US",
  description: "A test grant for medical research funding opportunities for individuals and families.",
  amount: "$5,000 - $25,000",
};

const sampleGrant2: GrantEmailData = {
  itemId: "item_test_002",
  name: "International Education Scholarship",
  organization: "Global Education Fund",
  category: "Education & Training",
  country: "International",
  description: "Scholarship for international students pursuing higher education.",
};

// ===== Context Helpers =====

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): { ctx: TrpcContext } {
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
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };

  return { ctx };
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
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };

  return { ctx };
}

function createUnauthContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };

  return { ctx };
}

// ===== Tests =====

describe("Newsletter Email Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildNewGrantsSubject", () => {
    it("returns singular subject for 1 grant", () => {
      const subject = buildNewGrantsSubject(1);
      expect(subject).toBe("A new grant has been added to GrantKit!");
    });

    it("returns plural subject for multiple grants", () => {
      const subject = buildNewGrantsSubject(3);
      expect(subject).toBe("3 new grants just added to GrantKit!");
    });

    it("returns plural subject for 2 grants", () => {
      const subject = buildNewGrantsSubject(2);
      expect(subject).toBe("2 new grants just added to GrantKit!");
    });
  });

  describe("buildNewGrantsEmailHtml", () => {
    it("includes grant name and organization in HTML", () => {
      const html = buildNewGrantsEmailHtml([sampleGrant], "https://example.com/unsub?token=abc");
      expect(html).toContain("Test Medical Research Grant");
      expect(html).toContain("Test Foundation");
    });

    it("includes grant category and country", () => {
      const html = buildNewGrantsEmailHtml([sampleGrant], "https://example.com/unsub?token=abc");
      expect(html).toContain("Medical & Health");
      expect(html).toContain("US");
    });

    it("includes grant amount when provided", () => {
      const html = buildNewGrantsEmailHtml([sampleGrant], "https://example.com/unsub?token=abc");
      expect(html).toContain("$5,000 - $25,000");
    });

    it("includes unsubscribe link", () => {
      const html = buildNewGrantsEmailHtml([sampleGrant], "https://example.com/unsub?token=abc");
      expect(html).toContain("https://example.com/unsub?token=abc");
      expect(html).toContain("Unsubscribe");
    });

    it("includes multiple grant cards", () => {
      const html = buildNewGrantsEmailHtml([sampleGrant, sampleGrant2], "https://example.com/unsub");
      expect(html).toContain("Test Medical Research Grant");
      expect(html).toContain("International Education Scholarship");
      expect(html).toContain("2 new grants");
    });

    it("includes link to grant detail page", () => {
      const html = buildNewGrantsEmailHtml([sampleGrant], "https://example.com/unsub");
      expect(html).toContain("/grant/item_test_001");
      expect(html).toContain("View Details");
    });

    it("truncates long descriptions", () => {
      const longGrant = {
        ...sampleGrant,
        description: "A".repeat(200),
      };
      const html = buildNewGrantsEmailHtml([longGrant], "https://example.com/unsub");
      expect(html).toContain("...");
    });

    it("includes Browse All Grants CTA button", () => {
      const html = buildNewGrantsEmailHtml([sampleGrant], "https://example.com/unsub");
      expect(html).toContain("Browse All Grants");
      expect(html).toContain("/catalog");
    });
  });

  describe("sendNewGrantNotification", () => {
    it("sends email with correct recipient and subject", async () => {
      mockSend.mockResolvedValue({ data: { id: "msg_grant_1" }, error: null });

      const result = await sendNewGrantNotification(
        "subscriber@example.com",
        [sampleGrant],
        "unsub_token_123"
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("msg_grant_1");
      expect(mockSend).toHaveBeenCalledOnce();

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.to).toEqual(["subscriber@example.com"]);
      expect(callArgs.subject).toContain("new grant");
      expect(callArgs.html).toContain("Test Medical Research Grant");
    });

    it("includes unsubscribe token in the email", async () => {
      mockSend.mockResolvedValue({ data: { id: "msg_grant_2" }, error: null });

      await sendNewGrantNotification(
        "subscriber@example.com",
        [sampleGrant],
        "my_unsub_token"
      );

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain("my_unsub_token");
    });

    it("handles Resend API error gracefully", async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: { name: "validation_error", message: "Invalid recipient" },
      });

      const result = await sendNewGrantNotification(
        "bad@email",
        [sampleGrant],
        "token"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid recipient");
    });

    it("handles network exception gracefully", async () => {
      mockSend.mockRejectedValue(new Error("Connection refused"));

      const result = await sendNewGrantNotification(
        "subscriber@example.com",
        [sampleGrant],
        "token"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Connection refused");
    });

    it("sends multiple grants in a single email", async () => {
      mockSend.mockResolvedValue({ data: { id: "msg_multi" }, error: null });

      const result = await sendNewGrantNotification(
        "subscriber@example.com",
        [sampleGrant, sampleGrant2],
        "token"
      );

      expect(result.success).toBe(true);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain("Test Medical Research Grant");
      expect(callArgs.html).toContain("International Education Scholarship");
      expect(callArgs.subject).toContain("2 new grants");
    });
  });

  describe("sendBatchNewGrantNotifications", () => {
    it("sends to all subscribers and returns correct counts", async () => {
      mockSend.mockResolvedValue({ data: { id: "msg_batch" }, error: null });

      const subscribers = [
        { email: "sub1@example.com", unsubscribeToken: "token1" },
        { email: "sub2@example.com", unsubscribeToken: "token2" },
        { email: "sub3@example.com", unsubscribeToken: "token3" },
      ];

      const result = await sendBatchNewGrantNotifications(subscribers, [sampleGrant]);

      expect(result.totalRecipients).toBe(3);
      expect(result.successCount).toBe(3);
      expect(result.failCount).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockSend).toHaveBeenCalledTimes(3);
    });

    it("handles partial failures in batch", async () => {
      mockSend
        .mockResolvedValueOnce({ data: { id: "msg_ok" }, error: null })
        .mockResolvedValueOnce({ data: null, error: { name: "error", message: "Failed" } })
        .mockResolvedValueOnce({ data: { id: "msg_ok2" }, error: null });

      const subscribers = [
        { email: "sub1@example.com", unsubscribeToken: "token1" },
        { email: "sub2@example.com", unsubscribeToken: "token2" },
        { email: "sub3@example.com", unsubscribeToken: "token3" },
      ];

      const result = await sendBatchNewGrantNotifications(subscribers, [sampleGrant]);

      expect(result.totalRecipients).toBe(3);
      expect(result.successCount).toBe(2);
      expect(result.failCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBe("Failed");
    });

    it("returns empty result for empty subscriber list", async () => {
      const result = await sendBatchNewGrantNotifications([], [sampleGrant]);

      expect(result.totalRecipients).toBe(0);
      expect(result.successCount).toBe(0);
      expect(result.failCount).toBe(0);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("calls onProgress callback during batch sending", async () => {
      mockSend.mockResolvedValue({ data: { id: "msg_prog" }, error: null });

      const subscribers = Array.from({ length: 7 }, (_, i) => ({
        email: `sub${i}@example.com`,
        unsubscribeToken: `token${i}`,
      }));

      const progressCalls: Array<[number, number]> = [];
      const onProgress = (sent: number, total: number) => {
        progressCalls.push([sent, total]);
      };

      await sendBatchNewGrantNotifications(subscribers, [sampleGrant], onProgress);

      // With batch size 5, should have 2 progress calls
      expect(progressCalls.length).toBe(2);
      expect(progressCalls[0][1]).toBe(7); // total is always 7
      expect(progressCalls[1][0]).toBe(7); // final call shows all sent
    });

    it("handles thrown exceptions in batch", async () => {
      mockSend
        .mockResolvedValueOnce({ data: { id: "msg_ok" }, error: null })
        .mockRejectedValueOnce(new Error("Timeout"));

      const subscribers = [
        { email: "sub1@example.com", unsubscribeToken: "token1" },
        { email: "sub2@example.com", unsubscribeToken: "token2" },
      ];

      const result = await sendBatchNewGrantNotifications(subscribers, [sampleGrant]);

      expect(result.successCount).toBe(1);
      expect(result.failCount).toBe(1);
    });
  });
});

describe("Newsletter Admin Endpoints - Permissions", () => {
  describe("admin.newsletterStats", () => {
    it("rejects unauthenticated users", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.admin.newsletterStats()).rejects.toThrow();
    });

    it("rejects non-admin users", async () => {
      const { ctx } = createRegularUserContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.admin.newsletterStats()).rejects.toThrow();
    });
  });

  describe("admin.notificationHistory", () => {
    it("rejects unauthenticated users", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.admin.notificationHistory({ limit: 10 })).rejects.toThrow();
    });

    it("rejects non-admin users", async () => {
      const { ctx } = createRegularUserContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.admin.notificationHistory({ limit: 10 })).rejects.toThrow();
    });
  });

  describe("admin.sendNewGrantNotification", () => {
    it("rejects unauthenticated users", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.admin.sendNewGrantNotification({ grantItemIds: ["item_001"] })
      ).rejects.toThrow();
    });

    it("rejects non-admin users", async () => {
      const { ctx } = createRegularUserContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.admin.sendNewGrantNotification({ grantItemIds: ["item_001"] })
      ).rejects.toThrow();
    });
  });
});
