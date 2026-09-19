import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  // tsconfig has jsx: "preserve" (Vite handles it); vitest needs the runtime.
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    // Client component tests opt into jsdom with `// @vitest-environment jsdom`.
    include: ["server/**/*.test.ts", "server/**/*.spec.ts", "client/src/**/*.test.{ts,tsx}"],
  },
});
