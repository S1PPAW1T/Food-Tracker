// Long-running server (local dev, or any host that runs `npm start`). Vercel uses api/index.ts instead.
import { app, HOST, MCP_SECRET } from "./app.js";
import { initDb } from "./db.js";

const port = Number(process.env.PORT ?? 3001);
initDb()
  .then(() => app.listen({ host: HOST, port }))
  .then(() => console.log(`API ready on http://${HOST}:${port}${MCP_SECRET ? " (MCP on /mcp/<secret>)" : ""}`))
  .catch((err) => {
    console.error("Could not start API:", err.message);
    process.exit(1);
  });
