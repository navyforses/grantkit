// Development entry point — invoked by `pnpm dev` via tsx watch.
// Mounts Vite middleware so the React client is served with HMR.
// This file is NEVER bundled by the production esbuild step.
import { startServer } from "./bootstrap";
import { setupVite } from "./vite";

startServer(async (app, server) => {
  await setupVite(app, server);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
