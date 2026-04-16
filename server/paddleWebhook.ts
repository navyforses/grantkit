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
import type { Express, Request, Response } from "express";
import { ENV } from "./_core/env";
import { getUserByPaddleCustomerId, updateUserSubscription } from "./db";
import { sendSubscriptionEmail, sendAdminNewSubscriberNotification, type SubscriptionEmailType } from "./emailService";

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

// ===== Event Processing =====

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

  const customerId = data.customer_id;
  if (!customerId) {
    return { handled: false, message: "No customer_id in event data" };
  }

  // Find user by Paddle customer ID
  const user = await getUserByPaddleCustomerId(customerId);
  if (!user) {
    console.warn(`[Paddle Webhook] No user found for customer_id: ${customerId}`);
    return { handled: false, message: `No user found for customer: ${customerId}` };
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

  // Update user subscription in database
  await updateUserSubscription(user.id, {
    paddleSubscriptionId: data.id,
    subscriptionStatus: internalStatus,
    subscriptionCurrentPeriodEnd: periodEnd,
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
  // We need the raw body for signature verification, so use a separate raw body parser
  app.post(
    "/api/paddle/webhook",
    // Express raw body middleware for this route only
    (req: Request, res: Response) => {
      let rawBody = "";

      // If body is already parsed by express.json(), reconstruct it
      if (req.body && typeof req.body === "object") {
        rawBody = JSON.stringify(req.body);
      }

      handleWebhook(req, res, rawBody);
    }
  );
}

async function handleWebhook(
  req: Request,
  res: Response,
  rawBody: string
): Promise<void> {
  try {
    const signature = req.headers["paddle-signature"] as string | undefined;

    // Verify signature if webhook secret is configured
    if (ENV.paddleWebhookSecret) {
      if (!signature) {
        res.status(401).json({ error: "Missing Paddle-Signature header" });
        return;
      }

      const isValid = verifyPaddleSignature(rawBody, signature, ENV.paddleWebhookSecret);
      if (!isValid) {
        console.warn("[Paddle Webhook] Invalid signature");
        res.status(401).json({ error: "Invalid signature" });
        return;
      }
    }

    const event: PaddleWebhookEvent = req.body;

    if (!event || !event.event_type) {
      res.status(400).json({ error: "Invalid event payload" });
      return;
    }

    console.log(`[Paddle Webhook] Received: ${event.event_type} (${event.event_id})`);

    const result = await processWebhookEvent(event);

    // Always return 200 to Paddle to acknowledge receipt
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[Paddle Webhook] Error processing webhook:", error);
    // Still return 200 to prevent Paddle from retrying
    res.status(200).json({ success: false, error: "Internal processing error" });
  }
}
