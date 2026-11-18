import Fastify, { type FastifyError } from "fastify";
import fastifyStatic from "@fastify/static";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createHash, timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { z, ZodError } from "zod";
import { initDb, sql } from "./db";
import { createMcpServer } from "../mcp/tools";
import { DateStr, EntryUpdate, Goals, NewEntry, NewFood, Water, type Day, type Food } from "../shared/schemas";

const HOST = process.env.HOST ?? "127.0.0.1";
const PASSWORD = process.env.APP_PASSWORD ?? "";
const MCP_SECRET = process.env.MCP_SECRET ?? "";
const isLocal = HOST === "127.0.0.1" || HOST === "localhost";

// There is no user system: anything reachable from the network must be behind the password.
if (!isLocal && PASSWORD.length < 12) {
  console.error("APP_PASSWORD (12+ characters) is required when HOST is not localhost.");
  process.exit(1);
}
if (MCP_SECRET && !/^[A-Za-z0-9_-]{32,}$/.test(MCP_SECRET)) {
  console.error("MCP_SECRET must be 32+ URL-safe characters (letters, digits, - or _).");
  process.exit(1);
}

const sameSecret = (a: string, b: string) =>
  timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
const AUTH_HEADER = `Basic ${Buffer.from(`app:${PASSWORD}`).toString("base64")}`;

const app = Fastify({ trustProxy: !isLocal });

// HTTP Basic auth on everything except the health check and the MCP route (which checks its own secret).
app.addHook("onRequest", async (req, reply) => {
  if (!PASSWORD || req.url === "/healthz" || req.url.startsWith("/mcp/")) return;
  const given = req.headers.authorization ?? "";
  const pass = given.startsWith("Basic ") ? Buffer.from(given.slice(6), "base64").toString().split(":").slice(1).join(":") : "";
  if (!sameSecret(pass, PASSWORD)) {
    return reply.code(401).header("www-authenticate", 'Basic realm="Food Tracker", charset="UTF-8"').send({ error: "Login required" });
  }
});

app.get("/healthz", async () => ({ ok: true }));

app.setErrorHandler((err: FastifyError | ZodError, _req, reply) => {
  if (err instanceof ZodError) return reply.code(400).send({ error: "Invalid input", issues: err.issues });
  const code = err.statusCode ?? 500;
  if (code >= 500) console.error(err);
  return reply.code(code).send({ error: code >= 500 ? "Server error" : err.message });
});

const notFound = (what: string) => Object.assign(new Error(`${what} not found`), { statusCode: 404 });

const foodCols = (t: string) =>
  sql.unsafe(`${t}.id, ${t}.name, ${t}.serving_name AS "servingName", ${t}.serving_g AS "servingG",
    ${t}.kcal, ${t}.protein, ${t}.carbs, ${t}.fat, ${t}.custom`);

const IdParam = z.object({ id: z.coerce.number().int().positive() });
const DateParam = z.object({ date: DateStr });

app.get("/api/foods", async (req) => {
  const { q } = z.object({ q: z.string().trim().max(80).default("") }).parse(req.query);
  const like = `%${q.replace(/[\\%_]/g, (m) => "\\" + m)}%`;
  return sql<Food[]>`
    SELECT ${foodCols("f")} FROM foods f WHERE f.name ILIKE ${like}
    ORDER BY strpos(lower(f.name), lower(${q})), f.custom DESC, f.name LIMIT 50`;
});

app.get("/api/foods/:id", async (req) => {
  const { id } = IdParam.parse(req.params);
  const [food] = await sql<Food[]>`SELECT ${foodCols("f")} FROM foods f WHERE f.id = ${id}`;
  if (!food) throw notFound("Food");
  return food;
});

app.post("/api/foods", async (req, reply) => {
  const f = NewFood.parse(req.body);
  const [food] = await sql<Food[]>`
    INSERT INTO foods (name, serving_name, serving_g, kcal, protein, carbs, fat, custom)
    VALUES (${f.name}, ${f.servingName}, ${f.servingG}, ${f.kcal}, ${f.protein}, ${f.carbs}, ${f.fat}, TRUE)
    RETURNING ${foodCols("foods")}`;
  return reply.code(201).send(food);
});

app.get("/api/day/:date", async (req): Promise<Day> => {
  const { date } = DateParam.parse(req.params);
  const [rows, water] = await Promise.all([
    sql<(Food & { entryId: number; entryServings: number })[]>`
      SELECT e.id AS "entryId", e.servings AS "entryServings", ${foodCols("f")}
      FROM entries e JOIN foods f ON f.id = e.food_id WHERE e.date = ${date} ORDER BY e.id`,
    sql<{ ml: number }[]>`SELECT ml FROM water WHERE date = ${date}`,
  ]);
  return {
    date,
    entries: rows.map(({ entryId, entryServings, ...food }) => ({ id: entryId, servings: entryServings, food })),
    waterMl: water[0]?.ml ?? 0,
  };
});

app.post("/api/entries", async (req, reply) => {
  const e = NewEntry.parse(req.body);
  const [food] = await sql`SELECT 1 FROM foods WHERE id = ${e.foodId}`;
  if (!food) throw notFound("Food");
  const [row] = await sql<{ id: number }[]>`
    INSERT INTO entries (date, food_id, servings) VALUES (${e.date}, ${e.foodId}, ${e.servings}) RETURNING id`;
  return reply.code(201).send(row);
});

app.patch("/api/entries/:id", async (req, reply) => {
  const { id } = IdParam.parse(req.params);
  const { servings } = EntryUpdate.parse(req.body);
  if ((await sql`UPDATE entries SET servings = ${servings} WHERE id = ${id}`).count === 0) throw notFound("Entry");
  return reply.code(204).send();
});

app.delete("/api/entries/:id", async (req, reply) => {
  const { id } = IdParam.parse(req.params);
  if ((await sql`DELETE FROM entries WHERE id = ${id}`).count === 0) throw notFound("Entry");
  return reply.code(204).send();
});

app.put("/api/water/:date", async (req) => {
  const { date } = DateParam.parse(req.params);
  const { ml } = Water.parse(req.body);
  await sql`INSERT INTO water (date, ml) VALUES (${date}, ${ml}) ON CONFLICT (date) DO UPDATE SET ml = EXCLUDED.ml`;
  return { date, ml };
});

const getGoals = async () => {
  const [g] = await sql<Goals[]>`SELECT kcal, protein, carbs, fat, water_ml AS "waterMl" FROM goals WHERE id = 1`;
  return g;
};

app.get("/api/goals", getGoals);

app.put("/api/goals", async (req) => {
  const g = Goals.parse(req.body);
  await sql`UPDATE goals SET kcal = ${g.kcal}, protein = ${g.protein}, carbs = ${g.carbs}, fat = ${g.fat}, water_ml = ${g.waterMl} WHERE id = 1`;
  return getGoals();
});

// MCP over HTTP for claude.ai / Claude mobile (custom connector). Stateless: one server per request.
// The connector cannot send headers, so the long random secret in the URL is the credential.
if (MCP_SECRET) {
  app.post("/mcp/:secret", async (req, reply) => {
    if (!sameSecret((req.params as { secret: string }).secret, MCP_SECRET)) return reply.code(404).send({ error: "Not found" });
    const server = createMcpServer(async (path, method, json) => {
      const res = await app.inject({ method: method as "GET", url: `/api${path}`, payload: json as object, headers: { authorization: AUTH_HEADER } });
      return { status: res.statusCode, body: res.body };
    });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    reply.hijack();
    reply.raw.on("close", () => {
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req.raw, reply.raw, req.body);
  });
  const noStream = async (_req: unknown, reply: { code: (n: number) => { send: (b: unknown) => unknown } }) =>
    reply.code(405).send({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed." }, id: null });
  app.get("/mcp/:secret", noStream);
  app.delete("/mcp/:secret", noStream);
}

// Production: serve the built web app (npm run build) from the same server.
const dist = resolve("dist");
if (existsSync(dist)) {
  app.register(fastifyStatic, { root: dist });
  app.setNotFoundHandler((req, reply) =>
    req.method === "GET" && !req.url.startsWith("/api/") ? reply.sendFile("index.html") : reply.code(404).send({ error: "Not found" }),
  );
}

const port = Number(process.env.PORT ?? 3001);
initDb()
  .then(() => app.listen({ host: HOST, port }))
  .then(() => console.log(`API ready on http://${HOST}:${port}${MCP_SECRET ? " (MCP on /mcp/<secret>)" : ""}`))
  .catch((err) => {
    console.error("Could not start API:", err.message);
    process.exit(1);
  });
