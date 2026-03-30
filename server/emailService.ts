/**
 * Email Notification Service
 *
 * Sends transactional emails to users via Resend API.
 * Handles subscription status change notifications with branded HTML templates.
 */

import { Resend } from "resend";
import { ENV } from "./_core/env";

// ===== Types =====

export type SubscriptionEmailType =
  | "activated"
  | "cancelled"
  | "paused"
  | "past_due"
  | "resumed";

interface EmailRecipient {
  email: string;
  name?: string | null;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ===== Resend Client =====

let _resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (!ENV.resendApiKey) {
    console.warn("[Email] RESEND_API_KEY not configured, emails disabled");
    return null;
  }
  if (!_resend) {
    _resend = new Resend(ENV.resendApiKey);
  }
  return _resend;
}

// ===== Email Templates =====

const BRAND_COLOR = "#6C3AED"; // Purple
const BRAND_NAME = "GrantKit";
const FROM_EMAIL = "onboarding@resend.dev"; // Resend default sender for testing
const SUPPORT_EMAIL = "support@grantkit.io";

function baseTemplate(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color:${BRAND_COLOR};padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">${BRAND_NAME}</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#fafafa;border-top:1px solid #e4e4e7;">
              <p style="margin:0;color:#71717a;font-size:13px;text-align:center;">
                &copy; ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.<br/>
                <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND_COLOR};text-decoration:none;">Contact Support</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function getEmailContent(type: SubscriptionEmailType, recipientName: string): {
  subject: string;
  html: string;
} {
  const name = recipientName || "there";

  switch (type) {
    case "activated":
      return {
        subject: "Welcome to GrantKit Pro! Your subscription is active",
        html: baseTemplate("Subscription Activated", `
          <h2 style="margin:0 0 16px;color:#18181b;font-size:22px;font-weight:600;">Welcome aboard, ${name}!</h2>
          <p style="margin:0 0 16px;color:#3f3f46;font-size:15px;line-height:1.6;">
            Your GrantKit Pro subscription is now <strong style="color:#16a34a;">active</strong>. You now have full access to our curated database of 643+ grants and resources worldwide.
          </p>
          <div style="background-color:#f0fdf4;border-left:4px solid #16a34a;padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0;">
            <p style="margin:0;color:#166534;font-size:14px;font-weight:600;">What you can do now:</p>
            <ul style="margin:8px 0 0;padding-left:20px;color:#166534;font-size:14px;line-height:1.8;">
              <li>Browse the full grants catalog with detailed information</li>
              <li>Filter by category, country, and grant type</li>
              <li>Access direct application links</li>
              <li>Get monthly updates with new opportunities</li>
            </ul>
          </div>
          <div style="text-align:center;margin:32px 0 16px;">
            <a href="https://grantkit-ne96tb4y.manus.space/catalog" style="display:inline-block;background-color:${BRAND_COLOR};color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">Explore Grants Now</a>
          </div>
        `),
      };

    case "cancelled":
      return {
        subject: "Your GrantKit Pro subscription has been cancelled",
        html: baseTemplate("Subscription Cancelled", `
          <h2 style="margin:0 0 16px;color:#18181b;font-size:22px;font-weight:600;">We're sorry to see you go, ${name}</h2>
          <p style="margin:0 0 16px;color:#3f3f46;font-size:15px;line-height:1.6;">
            Your GrantKit Pro subscription has been <strong style="color:#dc2626;">cancelled</strong>. You'll continue to have access until the end of your current billing period.
          </p>
          <div style="background-color:#fef2f2;border-left:4px solid #dc2626;padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0;">
            <p style="margin:0;color:#991b1b;font-size:14px;">
              After your billing period ends, you'll lose access to the full grants catalog. You can resubscribe at any time to regain access.
            </p>
          </div>
          <p style="margin:16px 0;color:#3f3f46;font-size:15px;line-height:1.6;">
            Changed your mind? You can resubscribe anytime from your profile page.
          </p>
          <div style="text-align:center;margin:32px 0 16px;">
            <a href="https://grantkit-ne96tb4y.manus.space/profile" style="display:inline-block;background-color:${BRAND_COLOR};color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">Resubscribe</a>
          </div>
        `),
      };

    case "paused":
      return {
        subject: "Your GrantKit Pro subscription has been paused",
        html: baseTemplate("Subscription Paused", `
          <h2 style="margin:0 0 16px;color:#18181b;font-size:22px;font-weight:600;">Subscription paused, ${name}</h2>
          <p style="margin:0 0 16px;color:#3f3f46;font-size:15px;line-height:1.6;">
            Your GrantKit Pro subscription has been <strong style="color:#ca8a04;">paused</strong>. Your access to the grants catalog is temporarily suspended.
          </p>
          <div style="background-color:#fefce8;border-left:4px solid #ca8a04;padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0;">
            <p style="margin:0;color:#854d0e;font-size:14px;">
              While paused, you won't be charged. Your subscription can be resumed at any time from your profile page.
            </p>
          </div>
          <div style="text-align:center;margin:32px 0 16px;">
            <a href="https://grantkit-ne96tb4y.manus.space/profile" style="display:inline-block;background-color:${BRAND_COLOR};color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">Resume Subscription</a>
          </div>
        `),
      };

    case "past_due":
      return {
        subject: "Action required: Your GrantKit Pro payment failed",
        html: baseTemplate("Payment Failed", `
          <h2 style="margin:0 0 16px;color:#18181b;font-size:22px;font-weight:600;">Payment issue, ${name}</h2>
          <p style="margin:0 0 16px;color:#3f3f46;font-size:15px;line-height:1.6;">
            We were unable to process your latest payment for GrantKit Pro. Your subscription is now <strong style="color:#ea580c;">past due</strong>.
          </p>
          <div style="background-color:#fff7ed;border-left:4px solid #ea580c;padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0;">
            <p style="margin:0;color:#9a3412;font-size:14px;">
              Please update your payment method to avoid losing access to the grants catalog. Paddle will automatically retry the payment.
            </p>
          </div>
          <p style="margin:16px 0;color:#3f3f46;font-size:15px;line-height:1.6;">
            If you believe this is an error, please contact our support team.
          </p>
          <div style="text-align:center;margin:32px 0 16px;">
            <a href="mailto:${SUPPORT_EMAIL}" style="display:inline-block;background-color:${BRAND_COLOR};color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">Contact Support</a>
          </div>
        `),
      };

    case "resumed":
      return {
        subject: "Welcome back! Your GrantKit Pro subscription is active again",
        html: baseTemplate("Subscription Resumed", `
          <h2 style="margin:0 0 16px;color:#18181b;font-size:22px;font-weight:600;">Welcome back, ${name}!</h2>
          <p style="margin:0 0 16px;color:#3f3f46;font-size:15px;line-height:1.6;">
            Great news! Your GrantKit Pro subscription has been <strong style="color:#16a34a;">resumed</strong>. You once again have full access to our grants catalog.
          </p>
          <div style="background-color:#f0fdf4;border-left:4px solid #16a34a;padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0;">
            <p style="margin:0;color:#166534;font-size:14px;">
              Your access to all 643+ grants and resources has been restored. Continue exploring opportunities!
            </p>
          </div>
          <div style="text-align:center;margin:32px 0 16px;">
            <a href="https://grantkit-ne96tb4y.manus.space/catalog" style="display:inline-block;background-color:${BRAND_COLOR};color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">Explore Grants</a>
          </div>
        `),
      };
  }
}

// ===== Public API =====

/**
 * Send a subscription status change email to a user
 */
export async function sendSubscriptionEmail(
  recipient: EmailRecipient,
  type: SubscriptionEmailType
): Promise<SendEmailResult> {
  const resend = getResendClient();
  if (!resend) {
    return { success: false, error: "Email service not configured" };
  }

  if (!recipient.email) {
    console.warn("[Email] Cannot send email: recipient has no email address");
    return { success: false, error: "No email address" };
  }

  try {
    const { subject, html } = getEmailContent(type, recipient.name || "");

    const { data, error } = await resend.emails.send({
      from: `${BRAND_NAME} <${FROM_EMAIL}>`,
      to: [recipient.email],
      subject,
      html,
    });

    if (error) {
      console.error(`[Email] Failed to send ${type} email to ${recipient.email}:`, error);
      return { success: false, error: error.message };
    }

    console.log(`[Email] Sent ${type} email to ${recipient.email} (id: ${data?.id})`);
    return { success: true, messageId: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[Email] Error sending ${type} email:`, message);
    return { success: false, error: message };
  }
}

/**
 * Send a notification to the admin/owner about a new subscriber
 */
export async function sendAdminNewSubscriberNotification(
  subscriber: EmailRecipient
): Promise<SendEmailResult> {
  const resend = getResendClient();
  if (!resend) {
    return { success: false, error: "Email service not configured" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${BRAND_NAME} <${FROM_EMAIL}>`,
      to: [FROM_EMAIL], // Send to the default sender (admin)
      subject: `New GrantKit Pro subscriber: ${subscriber.name || subscriber.email}`,
      html: baseTemplate("New Subscriber", `
        <h2 style="margin:0 0 16px;color:#18181b;font-size:22px;font-weight:600;">New subscriber!</h2>
        <p style="margin:0 0 16px;color:#3f3f46;font-size:15px;line-height:1.6;">
          A new user has subscribed to GrantKit Pro:
        </p>
        <div style="background-color:#f0fdf4;border-left:4px solid #16a34a;padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0;">
          <p style="margin:0;color:#166534;font-size:14px;">
            <strong>Name:</strong> ${subscriber.name || "N/A"}<br/>
            <strong>Email:</strong> ${subscriber.email}
          </p>
        </div>
      `),
    });

    if (error) {
      console.error("[Email] Failed to send admin notification:", error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Email] Error sending admin notification:", message);
    return { success: false, error: message };
  }
}
