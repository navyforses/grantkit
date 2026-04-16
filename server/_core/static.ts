import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    console.error(`[static] Build directory not found: ${distPath}`);
    console.error(`[static] cwd: ${process.cwd()}`);
    try {
      console.error(`[static] cwd contents: ${fs.readdirSync(process.cwd()).join(", ")}`);
    } catch {}
  } else {
    console.log(`[static] Serving frontend from: ${distPath}`);
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (req, res, next) => {
    const url = req.originalUrl;
    if (url.startsWith("/api/") || url === "/sitemap.xml" || url === "/robots.txt") {
      return res.status(404).json({ error: "Not found" });
    }
    const indexPath = path.resolve(distPath, "index.html");
    if (!fs.existsSync(indexPath)) {
      return res.status(503).json({ error: "Frontend not built", distPath });
    }
    res.sendFile(indexPath);
  });
}
