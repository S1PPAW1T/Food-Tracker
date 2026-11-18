// MCP tools for the Food Tracker. They only talk to the app's /api routes, through `send`,
// so the same tools run locally over stdio (mcp/server.ts) and in the cloud over HTTP (server/index.ts).
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { progress, round1, scale, totals } from "../shared/calc";
import type { Day, Food, Goals } from "../shared/schemas";

/** Sends one request to /api<path> and returns the status and raw body. */
export type Send = (path: string, method: string, json?: unknown) => Promise<{ status: number; body: string }>;

// Server-local date; set TZ (e.g. Asia/Bangkok) in the cloud so "today" matches the user's day.
const today = () => new Date().toLocaleDateString("en-CA");
const dateArg = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .describe("Day in YYYY-MM-DD (local time). Omit for today.");

export function createMcpServer(send: Send) {
  async function call<T>(path: string, method = "GET", json?: unknown): Promise<T> {
    const res = await send(path, method, json);
    if (res.status >= 400) {
      let b: { error?: string; issues?: { message: string }[] } = {};
      try {
        b = JSON.parse(res.body);
      } catch {}
      throw new Error([b.error ?? `HTTP ${res.status}`, ...(b.issues ?? []).map((i) => i.message)].join(": "));
    }
    return res.status === 204 ? (undefined as T) : (JSON.parse(res.body) as T);
  }

  const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
  const safe =
    <A>(fn: (a: A) => Promise<string>) =>
    async (a: A) => {
      try {
        return text(await fn(a));
      } catch (e) {
        return { ...text(e instanceof Error ? e.message : String(e)), isError: true };
      }
    };

  const foodLine = (f: Food) =>
    `#${f.id} ${f.name} — 1 serving = ${f.servingName} (${f.servingG} g): ${f.kcal} kcal, P ${f.protein} g, C ${f.carbs} g, F ${f.fat} g`;

  async function daySummary(date: string) {
    const [day, goals] = await Promise.all([call<Day>(`/day/${date}`), call<Goals>("/goals")]);
    const t = totals(day.entries);
    const row = (label: string, v: number, goal: number, unit: string) => {
      const p = progress(v, goal);
      return `${label}: ${round1(v)} / ${goal} ${unit} (${p.over ? `${round1(v - goal)} over` : `${round1(p.remaining)} left`})`;
    };
    return [
      `Day ${date}`,
      row("Calories", t.kcal, goals.kcal, "kcal"),
      row("Protein", t.protein, goals.protein, "g"),
      row("Carbs", t.carbs, goals.carbs, "g"),
      row("Fat", t.fat, goals.fat, "g"),
      row("Water", day.waterMl, goals.waterMl, "ml"),
      "",
      day.entries.length ? "Entries:" : "No food logged.",
      ...day.entries.map((e) => {
        const n = scale(e.food, e.servings);
        return `  entry #${e.id}: ${e.food.name} × ${round1(e.servings)} serving(s) — ${Math.round(n.kcal)} kcal, P ${round1(n.protein)}, C ${round1(n.carbs)}, F ${round1(n.fat)}`;
      }),
    ].join("\n");
  }

  const server = new McpServer({ name: "food-tracker", version: "1.0.0" });

  server.registerTool(
    "search_foods",
    {
      title: "Search foods",
      description:
        "Search the Food Tracker food database by name (English names, e.g. 'chicken', 'rice', 'kra pao'). Returns food ids and nutrition per serving. Use this before log_food.",
      inputSchema: { query: z.string().max(80).describe("Part of the food name") },
    },
    safe(async ({ query }) => {
      const foods = await call<Food[]>(`/foods?q=${encodeURIComponent(query)}`);
      return foods.length ? foods.slice(0, 15).map(foodLine).join("\n") : `No foods match "${query}". Consider add_custom_food.`;
    }),
  );

  server.registerTool(
    "log_food",
    {
      title: "Log food",
      description:
        "Add a food the user ate to their daily log. Give either servings or grams. Get food_id from search_foods first.",
      inputSchema: {
        food_id: z.number().int().positive(),
        servings: z.number().positive().max(100).optional().describe("Number of servings"),
        grams: z.number().positive().max(10000).optional().describe("Amount in grams (alternative to servings)"),
        date: dateArg,
      },
    },
    safe(async ({ food_id, servings, grams, date = today() }) => {
      if ((servings === undefined) === (grams === undefined)) throw new Error("Give exactly one of servings or grams.");
      const food = await call<Food>(`/foods/${food_id}`);
      const s = servings ?? grams! / food.servingG;
      await call("/entries", "POST", { date, foodId: food_id, servings: s });
      return `Logged ${food.name} × ${round1(s)} serving(s).\n\n${await daySummary(date)}`;
    }),
  );

  server.registerTool(
    "add_water",
    {
      title: "Add water",
      description: "Add (or with a negative number, remove) water the user drank, in ml.",
      inputSchema: { ml: z.number().min(-5000).max(5000), date: dateArg },
    },
    safe(async ({ ml, date = today() }) => {
      const day = await call<Day>(`/day/${date}`);
      const next = Math.min(20000, Math.max(0, day.waterMl + ml));
      await call(`/water/${date}`, "PUT", { ml: next });
      return `Water for ${date}: ${next} ml.`;
    }),
  );

  server.registerTool(
    "get_day_summary",
    {
      title: "Day summary",
      description: "Show calories, macros and water eaten on a day versus the user's goals, plus every logged entry with its entry id.",
      inputSchema: { date: dateArg },
    },
    safe(async ({ date = today() }) => daySummary(date)),
  );

  server.registerTool(
    "update_entry",
    {
      title: "Change entry amount",
      description: "Change how many servings a logged entry has. Get entry_id from get_day_summary.",
      inputSchema: { entry_id: z.number().int().positive(), servings: z.number().positive().max(100) },
    },
    safe(async ({ entry_id, servings }) => {
      await call(`/entries/${entry_id}`, "PATCH", { servings });
      return `Entry #${entry_id} set to ${servings} serving(s).`;
    }),
  );

  server.registerTool(
    "delete_entry",
    {
      title: "Delete entry",
      description: "Remove a logged food entry. Get entry_id from get_day_summary.",
      inputSchema: { entry_id: z.number().int().positive() },
    },
    safe(async ({ entry_id }) => {
      await call(`/entries/${entry_id}`, "DELETE");
      return `Entry #${entry_id} deleted.`;
    }),
  );

  server.registerTool(
    "add_custom_food",
    {
      title: "Add custom food",
      description: "Create a new food in the database when search_foods finds nothing suitable. Nutrition is per one serving.",
      inputSchema: {
        name: z.string().min(1).max(80),
        serving_name: z.string().min(1).max(40).describe("e.g. '1 plate', '1 bowl', '100 g'"),
        serving_g: z.number().positive().max(5000),
        kcal: z.number().nonnegative().max(5000),
        protein: z.number().nonnegative().max(500),
        carbs: z.number().nonnegative().max(1000),
        fat: z.number().nonnegative().max(500),
      },
    },
    safe(async (f) => {
      const food = await call<Food>("/foods", "POST", {
        name: f.name, servingName: f.serving_name, servingG: f.serving_g,
        kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat,
      });
      return `Created ${foodLine(food)}`;
    }),
  );

  server.registerTool(
    "set_goals",
    {
      title: "Set daily goals",
      description: "Change the user's daily targets. Only the fields given are changed.",
      inputSchema: {
        kcal: z.number().nonnegative().max(20000).optional(),
        protein: z.number().nonnegative().max(1000).optional(),
        carbs: z.number().nonnegative().max(2000).optional(),
        fat: z.number().nonnegative().max(1000).optional(),
        water_ml: z.number().nonnegative().max(20000).optional(),
      },
    },
    safe(async ({ water_ml, ...rest }) => {
      const current = await call<Goals>("/goals");
      const next = { ...current, ...Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)) };
      if (water_ml !== undefined) next.waterMl = water_ml;
      const g = await call<Goals>("/goals", "PUT", next);
      return `Goals: ${g.kcal} kcal, P ${g.protein} g, C ${g.carbs} g, F ${g.fat} g, water ${g.waterMl} ml.`;
    }),
  );

  return server;
}
