# Food Tracker

Log what you eat, see calories / protein / carbs / fat for the day, track water, and set your own daily goals.

- **Frontend:** React + TypeScript + Vite + Tailwind CSS (`web/`)
- **Backend:** Fastify + TypeScript + PostgreSQL on Supabase via postgres.js (`server/`)
- **Shared:** zod schemas, types and nutrition math used by both (`shared/`)

## Setup

Requires Node.js 22+ and a free [Supabase](https://supabase.com) project.

1. In Supabase: open your project → **Connect** → copy the **Session pooler** connection string.
2. Copy `.env.example` to `.env` and paste it as `DATABASE_URL`, with your database password filled in.
3. Run:

```bash
npm install
npm run dev
```

Open http://localhost:5173. The API runs on http://127.0.0.1:3001 (localhost only — there is no login).

On first start the API creates its tables and seeds ~100 common foods. Row Level Security is switched on
for every table, so the Supabase Data API (anon key) cannot read or change them; only this server can.

## Scripts

| Command             | What it does                          |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Start API + web app with hot reload   |
| `npm test`          | Run the totals / goal-progress tests  |
| `npm run typecheck` | Type-check the whole project          |

## Log food by chatting with Claude (MCP)

`mcp/server.ts` is an MCP server that forwards to the running app's API, so keep `npm run dev` running.
It is registered for Claude Code in `.mcp.json` (approve it the first time Claude Code asks).

Tools: `search_foods`, `log_food` (servings or grams), `add_water`, `get_day_summary`, `update_entry`,
`delete_entry`, `add_custom_food`, `set_goals`.

Example: "I had khao man gai for lunch and 500 ml of water" → Claude searches, logs it, and shows the day's totals.

## Deploy (Render, free)

One web service serves the web app, the API and the MCP endpoint (`render.yaml`).

1. Push this repo to GitHub.
2. On https://render.com: **New → Blueprint**, pick the repo. Render reads `render.yaml`.
3. Fill in the secret env vars when asked:
   - `DATABASE_URL`: your Supabase Session pooler string
   - `APP_PASSWORD`: 12+ characters; the browser asks for it (any username)
   - `MCP_SECRET`: generate with `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`
4. Open `https://<your-service>.onrender.com`.
5. Claude (web + mobile): **Settings → Connectors → Add custom connector**, URL
   `https://<your-service>.onrender.com/mcp/<MCP_SECRET>`. Treat that URL like a password.

The free plan sleeps after ~15 minutes idle; the first request after that takes up to a minute.

## Notes

- Seed nutrition values are approximate averages. The Thai dishes are rough per-plate estimates — add your own as custom foods for better accuracy.
- Water over goal shows "Goal reached"; carbs, fat and calories over goal show a warning; protein over goal counts as reached.
