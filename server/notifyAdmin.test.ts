import { describe, expect, it, vi, beforeEach } from "vitest";

const mockSend = vi.fn();
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({ emails: { send: mockSend } })),
}));

async function loadWithEnv(env: { resendApiKey: string; adminNotifyEmail: string }) {
  vi.resetModules();
  vi.doMock("./_core/env", () => ({ ENV: { ...env, fromEmail: "hello@grantkit.co" } }));
  const mod = await import("./emailService");
  return mod.notifyAdmin;
}

describe("notifyAdmin", () => {
  beforeEach(() => {
    mockSend.mockReset();
    mockSend.mockResolvedValue({ data: { id: "msg_admin" }, error: null });
  });

  it("no-ops without ADMIN_NOTIFY_EMAIL", async () => {
    const notifyAdmin = await loadWithEnv({ resendApiKey: "re_test", adminNotifyEmail: "" });
    const result = await notifyAdmin("Subject", "Body");
    expect(result.success).toBe(false);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("no-ops without RESEND_API_KEY", async () => {
    const notifyAdmin = await loadWithEnv({ resendApiKey: "", adminNotifyEmail: "owner@example.com" });
    const result = await notifyAdmin("Subject", "Body");
    expect(result.success).toBe(false);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("sends plain text from FROM_EMAIL to ADMIN_NOTIFY_EMAIL when both are set", async () => {
    const notifyAdmin = await loadWithEnv({ resendApiKey: "re_test", adminNotifyEmail: "owner@example.com" });
    const result = await notifyAdmin("New signup", "user@example.com registered");
    expect(result).toEqual({ success: true, messageId: "msg_admin" });
    expect(mockSend).toHaveBeenCalledOnce();
    expect(mockSend.mock.calls[0][0]).toMatchObject({
      from: "GrantKit <hello@grantkit.co>",
      to: ["owner@example.com"],
      subject: "[GrantKit] New signup",
      text: "user@example.com registered",
    });
  });
});
