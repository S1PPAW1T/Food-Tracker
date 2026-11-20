// Local MCP server over stdio (Claude Code / Claude Desktop on this computer).
// Forwards to the running app's API; start the app with `npm run dev` first.
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./tools.js";

const API = process.env.FOOD_API_URL ?? "http://127.0.0.1:3001/api";

const server = createMcpServer(async (path, method, json) => {
  try {
    const res = await fetch(API + path, {
      method,
      headers: json === undefined ? undefined : { "content-type": "application/json" },
      body: json === undefined ? undefined : JSON.stringify(json),
    });
    return { status: res.status, body: await res.text() };
  } catch {
    throw new Error("Food Tracker app is not running. Start it with `npm run dev` in the project folder.");
  }
});

await server.connect(new StdioServerTransport());
