/**
 * Paddle Webhook Handler
 *
 * Receives Paddle webhook events and updates user subscription status in the database.
 * Paddle sends events like subscription.activated, subscription.canceled, etc.
 *
 * Webhook signature verification uses HMAC-SHA256 with the webhook secret.
 * Docs: https://developer.paddle.com/webhooks/signature-verification
 */

import { createHmac, timingSafeEqual } from "crypto";
import express from "express";
import type { Express, Request, Response } from "express";
import { ENV } from "./_core/env";
import { getUserById, getUserByPaddleCustomerId, tryRecordProcessedEvent, updateUserSubscription } from "./db";
import { sendSubscriptionEmail, sendAdminNewSubscriberNotification, type SubscriptionEmailType } from "./emailService";

// Reject signed events whose ts header is older than this many seconds —
// Paddle's documented tolerance, also wide enough for reasonable clock
// skew between Paddle and our server.
const SIGNATURE_FRESHNESS_SECONDS = 5 * 60;

// ===== Types =====

interface PaddleWebhookEvent {
  event_id: string;
  event_type: string;
  occurred_at: string;
  data: {
    id: string; // subscription ID
    status: string;
    customer_id: string;
    current_billing_period?: {
      starts_at: string;
      ends_at: string;
    } | null;
    items?: Array<{
      price: {
        id: string;
      };
    }>;
    custom_data?: Record<string, unknown>;
    [key: string]: unknown;
  };
  notification_id?: string;
}

// ===== Signature Verification =====

/**
 * Verify Paddle webhook signature (Paddle Billing / v2 webhooks)
 * Uses ts;tsv1;h1 format: timestamp;timestamp_version;hmac_hash
 */
export function verifyPaddleSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret) return false;

  try {
    // Paddle signature format: ts=<timestamp>;h1=<hash>
    const parts: Record<string, string> = {};
    for (const part of signature.split(";")) {
      const [key, ...valueParts] = part.split("=");
      if (key && valueParts.length > 0) {
        parts[key] = valueParts.join("=");
      }
    }

    const ts = parts["ts"];
    const h1 = parts["h1"];

    if (!ts || !h1) return false;

    // Build the signed payload: timestamp:rawBody
    const signedPayload = `${ts}:${rawBody}`;

    // Compute HMAC-SHA256
    const expectedSignature = createHmac("sha256", secret)
      .update(signedPayload)
      .digest("hex");

    // Timing-safe comparison
    const sigBuffer = Buffer.from(h1, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (sigBuffer.length !== expectedBuffer.length) return false;

    return timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * Check that the `ts=` field of a Paddle signature header is within the
 * freshness window. Replay protection — separate from signature verify so
 * the two can be reasoned about independently.
 */
export function isFreshSignatureTimestamp(
  signature: string,
  toleranceSeconds: number = SIGNATURE_FRESHNESS_SECONDS,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): boolean {
  if (!signature) return false;
  for (const part of signature.split(";")) {
    const [key, ...valueParts] = part.split("=");
    if (key === "ts" && valueParts.length > 0) {
      const ts = parseInt(valueParts.join("="), 10);
      if (!Number.isFinite(ts)) return false;
      return Math.abs(nowSeconds - ts) <= toleranceSeconds;
    }
  }
  return false;
}

// ===== Event Processing =====

/**
 * Extract our internal numeric userId from Paddle's custom_data echo.
 * Paddle preserves the original JSON value, but if a checkout was triggered
 * by an old client without customData this will be missing — return null
 * so the caller can fall back to paddleCustomerId lookup.
 */
function parseUserIdFromCustomData(
  customData: Record<string, unknown> | undefined
): number | null {
  if (!customData) return null;
  const raw = customData["userId"];
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return Math.floor(raw);
  }
  if (typeof raw === "string") {
    const parsed = parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

/** Map Paddle subscription status to our internal status */
function mapPaddleStatus(
  paddleStatus: string
): "active" | "cancelled" | "past_due" | "paused" | "none" {
  switch (paddleStatus) {
    case "active":
    case "trialing":
      return "active";
    case "canceled":
      return "cancelled";
    case "past_due":
      return "past_due";
    case "paused":
      return "paused";
    default:
      return "none";
  }
}

/** Process a single Paddle webhook event */
export async function processWebhookEvent(event: PaddleWebhookEvent): Promise<{
  handled: boolean;
  message: string;
}> {
  const { event_type, data } = event;

  // Only handle subscription-related events
  const subscriptionEvents = [
    "subscription.activated",
    "subscription.canceled",
    "subscription.created",
    "subscription.past_due",
    "subscription.paused",
    "subscription.resumed",
    "subscription.updated",
  ];

  if (!subscriptionEvents.includes(event_type)) {
    return { handled: false, message: `Ignored event type: ${event_type}` };
  }

  // Idempotency: dedupe by event_id. Paddle retries non-2xx responses and
  // also redelivers on its own retry schedule, so the same event_id can
  // arrive multiple times. Without this we send duplicate emails and
  // double-fire admin notifications.
  if (event.event_id) {
    const { inserted } = await tryRecordProcessedEvent(event.event_id, event_type);
    if (!inserted) {
      return {
        handled: false,
        message: `Already processed event_id=${event.event_id}`,
      };
    }
  }

  const customerId = data.customer_id;

  // Find the user. Preferred path: custom_data.userId set by openPaddleCheckout
  // — Paddle echoes it back unchanged in every subscription.* event for the
  // life of the subscription. Fallback path: paddleCustomerId lookup, used
  // when a webhook arrives for a user already linked from a previous event.
  let user = null as Awaited<ReturnType<typeof getUserById>> | null;
  const customDataUserId = parseUserIdFromCustomData(data.custom_data);
  if (customDataUserId !== null) {
    user = await getUserById(customDataUserId);
  }
  if (!user && customerId) {
    user = await getUserByPaddleCustomerId(customerId);
  }
  if (!user) {
    console.warn(
      `[Paddle Webhook] No user found (custom_data.userId=${customDataUserId ?? "none"}, customer_id=${customerId ?? "none"})`
    );
    return {
      handled: false,
      message: `No user found for event ${event.event_id}`,
    };
  }

  // Map Paddle status to our internal status
  const internalStatus = mapPaddleStatus(data.status);

  // Extract billing period end date
  let periodEnd: Date | null = null;
  if (data.current_billing_period?.ends_at) {
    periodEnd = new Date(data.current_billing_period.ends_at);
  }

  // Extract price/plan ID
  let planId: string | undefined;
  if (data.items && data.items.length > 0) {
    planId = data.items[0].price.id;
  }

  // Update user subscription in database. Always write paddleCustomerId so
  // the fallback lookup works on later webhooks for this subscription.
  await updateUserSubscription(user.id, {
    paddleSubscriptionId: data.id,
    subscriptionStatus: internalStatus,
    subscriptionCurrentPeriodEnd: periodEnd,
    ...(customerId ? { paddleCustomerId: customerId } : {}),
    ...(planId ? { subscriptionPlanId: planId } : {}),
  });

  console.log(
    `[Paddle Webhook] Updated user ${user.id} (${user.email}): ${event_type} → status=${internalStatus}`
  );

  // Send email notification to user (fire-and-forget, don't block webhook response)
  const emailTypeMap: Record<string, SubscriptionEmailType> = {
    "subscription.activated": "activated",
    "subscription.canceled": "cancelled",
    "subscription.paused": "paused",
    "subscription.past_due": "past_due",
    "subscription.resumed": "resumed",
  };

  const emailType = emailTypeMap[event_type];
  if (emailType && user.email) {
    sendSubscriptionEmail(
      { email: user.email, name: user.name },
      emailType
    ).catch((err) => {
      console.error(`[Paddle Webhook] Failed to send ${emailType} email:`, err);
    });

    // Notify admin on new subscriber activation
    if (emailType === "activated") {
      sendAdminNewSubscriberNotification(
        { email: user.email, name: user.name }
      ).catch((err) => {
        console.error("[Paddle Webhook] Failed to send admin notification:", err);
      });
    }
  }

  return {
    handled: true,
    message: `Processed ${event_type} for user ${user.id}`,
  };
}

// ===== Express Route Registration =====

export function registerPaddleWebhookRoute(app: Express): void {
  // express.raw() captures the request body as a Buffer. The signed payload
  // is `${ts}:${rawBody}` — JSON.stringify(req.body) wouldn't reproduce
  // Paddle's exact bytes (property order, escaping, whitespace), so the
  // raw stream is the only source of truth.
  app.post(
    "/api/paddle/webhook",
    express.raw({ type: "application/json", limit: "1mb" }),
    (req: Request, res: Response) => {
      const rawBuffer = Buffer.isBuffer(req.body) ? (req.body as Buffer) : null;
      const rawBody = rawBuffer ? rawBuffer.toString("utf8") : "";
      handleWebhook(req, res, rawBody).catch((err) => {
        // Defensive — handleWebhook handles its own errors, but if a sync
        // throw escapes the promise we still want to respond.
        console.error("[Paddle Webhook] Unhandled error:", err);
        if (!res.headersSent) {
          res.status(503).json({ error: "Internal processing error" });
        }
      });
    }
  );
}

async function handleWebhook(
  req: Request,
  res: Response,
  rawBody: string
): Promise<void> {
  // Fail-closed in production: a missing secret means the deployment is
  // misconfigured and webhooks would be unsigned. A 503 prompts Paddle to
  // retry once we set the secret, instead of silently accepting forged
  // events.
  if (!ENV.paddleWebhookSecret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[Paddle Webhook] PADDLE_WEBHOOK_SECRET not set in production — refusing");
      res.status(503).json({ error: "Webhook secret not configured" });
      return;
    }
    console.warn("[Paddle Webhook] No secret set — skipping signature verification (DEV ONLY)");
  }

  const signature = req.headers["paddle-signature"] as string | undefined;

  if (ENV.paddleWebhookSecret) {
    if (!signature) {
      res.status(401).json({ error: "Missing Paddle-Signature header" });
      return;
    }
    if (!isFreshSignatureTimestamp(signature)) {
      console.warn("[Paddle Webhook] Stale or missing timestamp");
      res.status(401).json({ error: "Stale signature timestamp" });
      return;
    }
    if (!verifyPaddleSignature(rawBody, signature, ENV.paddleWebhookSecret)) {
      console.warn("[Paddle Webhook] Invalid signature");
      res.status(401).json({ error: "Invalid signature" });
      return;
    }
  }

  let event: PaddleWebhookEvent;
  try {
    event = JSON.parse(rawBody) as PaddleWebhookEvent;
  } catch (err) {
    console.warn("[Paddle Webhook] Body is not valid JSON:", err);
    res.status(400).json({ error: "Invalid JSON body" });
    return;
  }

  if (!event || !event.event_type) {
    res.status(400).json({ error: "Invalid event payload" });
    return;
  }

  console.log(`[Paddle Webhook] Received: ${event.event_type} (${event.event_id})`);

  try {
    const result = await processWebhookEvent(event);
    // 200 acknowledges receipt — handled-or-ignored is documented in the
    // body but doesn't change Paddle's retry behavior.
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    // Transient errors (DB connection drop, Railway restart mid-request)
    // get a 5xx so Paddle retries the webhook later — silent state drift
    // is worse than a brief retry storm.
    console.error("[Paddle Webhook] Error processing webhook:", error);
    res.status(503).json({ success: false, error: "Internal processing error" });
  }
}
