// Vercel serverless entry: vercel.json rewrites every path here; Fastify routes it (web app, API, MCP).
import type { IncomingMessage, ServerResponse } from "node:http";
import { app } from "../server/app.js";
import { initDb } from "../server/db.js";

let ready: Promise<unknown> | undefined;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // Once per cold start; forget a failed attempt so the next request retries.
  ready ??= initDb().then(() => app.ready()).catch((err) => { ready = undefined; throw err; });
  await ready;
  app.server.emit("request", req, res);
}
