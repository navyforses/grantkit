import { describe, expect, it } from "vitest";
import { verifyPaddleSignature, processWebhookEvent } from "./paddleWebhook";
import { createHmac } from "crypto";

// ===== Signature Verification Tests =====

describe("verifyPaddleSignature", () => {
  const secret = "pdl_ntfset_test_secret_abc123";

  function createValidSignature(body: string, ts: string): string {
    const signedPayload = `${ts}:${body}`;
    const hash = createHmac("sha256", secret).update(signedPayload).digest("hex");
    return `ts=${ts};h1=${hash}`;
  }

  it("returns true for a valid signature", () => {
    const body = '{"event_type":"subscription.activated"}';
    const ts = "1711800000";
    const signature = createValidSignature(body, ts);

    expect(verifyPaddleSignature(body, signature, secret)).toBe(true);
  });

  it("returns false for an invalid signature", () => {
    const body = '{"event_type":"subscription.activated"}';
    const signature = "ts=1711800000;h1=invalidsignaturehex";

    expect(verifyPaddleSignature(body, signature, secret)).toBe(false);
  });

  it("returns false for a tampered body", () => {
    const originalBody = '{"event_type":"subscription.activated"}';
    const ts = "1711800000";
    const signature = createValidSignature(originalBody, ts);
    const tamperedBody = '{"event_type":"subscription.canceled"}';

    expect(verifyPaddleSignature(tamperedBody, signature, secret)).toBe(false);
  });

  it("returns false when signature is empty", () => {
    expect(verifyPaddleSignature("body", "", secret)).toBe(false);
  });

  it("returns false when secret is empty", () => {
    expect(verifyPaddleSignature("body", "ts=123;h1=abc", "")).toBe(false);
  });

  it("returns false for malformed signature format", () => {
    expect(verifyPaddleSignature("body", "not-a-valid-format", secret)).toBe(false);
  });

  it("returns false when ts is missing from signature", () => {
    expect(verifyPaddleSignature("body", "h1=abc123", secret)).toBe(false);
  });

  it("returns false when h1 is missing from signature", () => {
    expect(verifyPaddleSignature("body", "ts=123456", secret)).toBe(false);
  });
});

// ===== Event Processing Tests =====

describe("processWebhookEvent", () => {
  it("handles subscription.activated event", async () => {
    // Note: This will try to find user by customer_id in DB, which won't exist in test
    // But we can verify it processes the event type correctly
    const event = {
      event_id: "evt_123",
      event_type: "subscription.activated",
      occurred_at: "2026-03-30T00:00:00Z",
      data: {
        id: "sub_123",
        status: "active",
        customer_id: "ctm_nonexistent",
        current_billing_period: {
          starts_at: "2026-03-30T00:00:00Z",
          ends_at: "2026-04-30T00:00:00Z",
        },
        items: [{ price: { id: "pri_01kmygcd8stckbs3d7vt3xenq6" } }],
      },
    };

    const result = await processWebhookEvent(event);
    // User won't be found in test DB, so handled should be false
    expect(result.handled).toBe(false);
    expect(result.message).toContain("No user found");
  });

  it("handles subscription.canceled event", async () => {
    const event = {
      event_id: "evt_456",
      event_type: "subscription.canceled",
      occurred_at: "2026-03-30T00:00:00Z",
      data: {
        id: "sub_456",
        status: "canceled",
        customer_id: "ctm_nonexistent",
      },
    };

    const result = await processWebhookEvent(event);
    expect(result.handled).toBe(false);
    expect(result.message).toContain("No user found");
  });

  it("ignores non-subscription events", async () => {
    const event = {
      event_id: "evt_789",
      event_type: "transaction.completed",
      occurred_at: "2026-03-30T00:00:00Z",
      data: {
        id: "txn_789",
        status: "completed",
        customer_id: "ctm_123",
      },
    };

    const result = await processWebhookEvent(event);
    expect(result.handled).toBe(false);
    expect(result.message).toContain("Ignored event type");
  });

  it("handles missing customer_id", async () => {
    const event = {
      event_id: "evt_999",
      event_type: "subscription.activated",
      occurred_at: "2026-03-30T00:00:00Z",
      data: {
        id: "sub_999",
        status: "active",
        customer_id: "",
      },
    };

    const result = await processWebhookEvent(event);
    expect(result.handled).toBe(false);
    expect(result.message).toContain("No customer_id");
  });

  it("handles subscription.past_due event", async () => {
    const event = {
      event_id: "evt_pd",
      event_type: "subscription.past_due",
      occurred_at: "2026-03-30T00:00:00Z",
      data: {
        id: "sub_pd",
        status: "past_due",
        customer_id: "ctm_nonexistent",
      },
    };

    const result = await processWebhookEvent(event);
    expect(result.handled).toBe(false);
    expect(result.message).toContain("No user found");
  });

  it("handles subscription.paused event", async () => {
    const event = {
      event_id: "evt_pause",
      event_type: "subscription.paused",
      occurred_at: "2026-03-30T00:00:00Z",
      data: {
        id: "sub_pause",
        status: "paused",
        customer_id: "ctm_nonexistent",
      },
    };

    const result = await processWebhookEvent(event);
    expect(result.handled).toBe(false);
    expect(result.message).toContain("No user found");
  });

  it("handles subscription.updated event", async () => {
    const event = {
      event_id: "evt_upd",
      event_type: "subscription.updated",
      occurred_at: "2026-03-30T00:00:00Z",
      data: {
        id: "sub_upd",
        status: "active",
        customer_id: "ctm_nonexistent",
        current_billing_period: {
          starts_at: "2026-04-01T00:00:00Z",
          ends_at: "2026-05-01T00:00:00Z",
        },
      },
    };

    const result = await processWebhookEvent(event);
    expect(result.handled).toBe(false);
    expect(result.message).toContain("No user found");
  });

  it("handles subscription.resumed event", async () => {
    const event = {
      event_id: "evt_resume",
      event_type: "subscription.resumed",
      occurred_at: "2026-03-30T00:00:00Z",
      data: {
        id: "sub_resume",
        status: "active",
        customer_id: "ctm_nonexistent",
      },
    };

    const result = await processWebhookEvent(event);
    expect(result.handled).toBe(false);
    expect(result.message).toContain("No user found");
  });
});
