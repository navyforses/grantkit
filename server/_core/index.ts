// Production entry point — bundled by esbuild into dist/index.js.
// Imports only the prod static-file middleware; vite/* never enters the graph.
import { startServer } from "./bootstrap";
import { serveStatic } from "./static";

startServer((app) => {
  serveStatic(app);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
