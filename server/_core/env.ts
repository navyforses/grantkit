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
  appUrl: process.env.APP_URL ?? "https://grantkit-production-06f7up.railway.app",
};
