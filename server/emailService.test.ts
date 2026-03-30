import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

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

import { sendSubscriptionEmail, sendAdminNewSubscriberNotification } from "./emailService";

describe("Email Notification Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendSubscriptionEmail", () => {
    it("sends activation email with correct subject and recipient", async () => {
      mockSend.mockResolvedValue({ data: { id: "msg_123" }, error: null });

      const result = await sendSubscriptionEmail(
        { email: "user@example.com", name: "John" },
        "activated"
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("msg_123");
      expect(mockSend).toHaveBeenCalledOnce();

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.to).toEqual(["user@example.com"]);
      expect(callArgs.subject).toContain("active");
      expect(callArgs.html).toContain("John");
      expect(callArgs.html).toContain("Welcome");
    });

    it("sends cancellation email with correct content", async () => {
      mockSend.mockResolvedValue({ data: { id: "msg_456" }, error: null });

      const result = await sendSubscriptionEmail(
        { email: "user@example.com", name: "Jane" },
        "cancelled"
      );

      expect(result.success).toBe(true);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.subject).toContain("cancelled");
      expect(callArgs.html).toContain("Jane");
    });

    it("sends paused email", async () => {
      mockSend.mockResolvedValue({ data: { id: "msg_789" }, error: null });

      const result = await sendSubscriptionEmail(
        { email: "user@example.com", name: "Test" },
        "paused"
      );

      expect(result.success).toBe(true);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.subject).toContain("paused");
    });

    it("sends past_due email", async () => {
      mockSend.mockResolvedValue({ data: { id: "msg_101" }, error: null });

      const result = await sendSubscriptionEmail(
        { email: "user@example.com", name: "Test" },
        "past_due"
      );

      expect(result.success).toBe(true);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.subject).toContain("payment failed");
    });

    it("sends resumed email", async () => {
      mockSend.mockResolvedValue({ data: { id: "msg_202" }, error: null });

      const result = await sendSubscriptionEmail(
        { email: "user@example.com", name: "Test" },
        "resumed"
      );

      expect(result.success).toBe(true);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.subject).toContain("active again");
    });

    it("returns error when recipient has no email", async () => {
      const result = await sendSubscriptionEmail(
        { email: "", name: "NoEmail" },
        "activated"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("No email address");
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("handles Resend API error gracefully", async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: { name: "validation_error", message: "Invalid email" },
      });

      const result = await sendSubscriptionEmail(
        { email: "bad@email", name: "Test" },
        "activated"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid email");
    });

    it("handles network/exception errors gracefully", async () => {
      mockSend.mockRejectedValue(new Error("Network timeout"));

      const result = await sendSubscriptionEmail(
        { email: "user@example.com", name: "Test" },
        "activated"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network timeout");
    });

    it("uses 'there' as fallback name when name is null", async () => {
      mockSend.mockResolvedValue({ data: { id: "msg_303" }, error: null });

      await sendSubscriptionEmail(
        { email: "user@example.com", name: null },
        "activated"
      );

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain("there");
    });
  });

  describe("sendAdminNewSubscriberNotification", () => {
    it("sends admin notification with subscriber info", async () => {
      mockSend.mockResolvedValue({ data: { id: "msg_admin_1" }, error: null });

      const result = await sendAdminNewSubscriberNotification({
        email: "newuser@example.com",
        name: "New User",
      });

      expect(result.success).toBe(true);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.subject).toContain("New GrantKit Pro subscriber");
      expect(callArgs.html).toContain("New User");
      expect(callArgs.html).toContain("newuser@example.com");
    });

    it("handles API error gracefully", async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: { name: "server_error", message: "Internal error" },
      });

      const result = await sendAdminNewSubscriberNotification({
        email: "user@example.com",
        name: "Test",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Internal error");
    });
  });
});
