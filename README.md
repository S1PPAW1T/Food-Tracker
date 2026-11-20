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

## Deploy (Vercel, free Hobby plan)

One serverless function (`api/index.ts`) serves the web app, the API and the MCP endpoint (`vercel.json`).

1. Push this repo to GitHub.
2. On https://vercel.com: **Add New → Project**, import the repo. Leave the build settings as they are (`vercel.json` sets them).
3. Before deploying, add these Environment Variables:
   - `DATABASE_URL`: your Supabase **Transaction pooler** string (port **6543**), not the Session pooler
   - `APP_PASSWORD`: 12+ characters; the browser asks for it (any username)
   - `MCP_SECRET`: generate with `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`
   - `APP_TZ`: `Asia/Bangkok` (so "today" in Claude matches your day)
4. Open `https://<your-project>.vercel.app`.
5. Claude (web + mobile): **Settings → Connectors → Add custom connector**, URL
   `https://<your-project>.vercel.app/mcp/<MCP_SECRET>`. Treat that URL like a password.

The first request after a quiet period takes a second or two while the function starts.
`npm start` still runs the app as a normal server on any other host.

## Notes

- Seed nutrition values are approximate averages. The Thai dishes are rough per-plate estimates — add your own as custom foods for better accuracy.
- Water over goal shows "Goal reached"; carbs, fat and calories over goal show a warning; protein over goal counts as reached.
