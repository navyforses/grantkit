export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  paddleWebhookSecret: process.env.PADDLE_WEBHOOK_SECRET ?? "",
  paddleApiKey: process.env.PADDLE_API_KEY ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  // Sender for all transactional email. Must be on a domain verified in Resend (OPS.md §Resend DNS).
  fromEmail: process.env.FROM_EMAIL ?? "hello@grantkit.co",
  // Owner inbox for admin notifications; empty = notifications disabled (notifyAdmin no-ops).
  adminNotifyEmail: process.env.ADMIN_NOTIFY_EMAIL ?? "",
  appUrl: process.env.APP_URL ?? "https://grantkit-production-06f7up.railway.app",
};
