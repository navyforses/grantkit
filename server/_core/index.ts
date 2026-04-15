import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerPaddleWebhookRoute } from "../paddleWebhook";
import { registerSeoRoutes } from "../seoRoutes";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./static";

function unsubscribeHtml(success: boolean, message: string): string {
  const color = success ? "#16a34a" : "#dc2626";
  const icon = success ? "&#10003;" : "&#10007;";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Unsubscribe - GrantKit</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;">
  <div style="background:#fff;border-radius:12px;padding:48px;max-width:480px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="width:64px;height:64px;border-radius:50%;background:${color}15;color:${color};font-size:32px;line-height:64px;margin:0 auto 24px;">${icon}</div>
    <h1 style="margin:0 0 16px;color:#18181b;font-size:22px;font-weight:600;">${success ? "Unsubscribed" : "Error"}</h1>
    <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6;">${message}</p>
    <a href="/" style="display:inline-block;background:#6C3AED;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">Go to GrantKit</a>
  </div>
</body>
</html>`;
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Paddle webhook under /api/paddle/webhook
  registerPaddleWebhookRoute(app);
  // SEO routes (sitemap.xml, robots.txt)
  registerSeoRoutes(app);

  // Health check for Railway / load balancers
  app.get("/healthz", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // Newsletter unsubscribe route (GET for email link compatibility)
  app.get("/api/newsletter/unsubscribe", async (req, res) => {
    const token = req.query.token as string;
    if (!token) {
      return res.status(400).send(unsubscribeHtml(false, "Invalid unsubscribe link."));
    }
    try {
      const { unsubscribeByToken } = await import("../db");
      const result = await unsubscribeByToken(token);
      if (result.success) {
        return res.send(unsubscribeHtml(true, `You have been successfully unsubscribed${result.email ? ` (${result.email})` : ""}. You will no longer receive grant notification emails.`));
      } else {
        return res.send(unsubscribeHtml(false, "This unsubscribe link is invalid or has already been used."));
      }
    } catch (err) {
      console.error("[Unsubscribe] Error:", err);
      return res.status(500).send(unsubscribeHtml(false, "An error occurred. Please try again later."));
    }
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    // Dynamic import to avoid bundling vite in production
    const viteModule = await (eval('import("./vite.js")') as Promise<any>);
    await viteModule.setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
