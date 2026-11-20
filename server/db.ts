import postgres from "postgres";
import { SEED_FOODS } from "./seed";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env and paste your Supabase connection string.");
  process.exit(1);
}

// prepare: false so the Supabase Transaction pooler (needed for serverless) works too.
export const sql = postgres(url, { ssl: "require", max: 5, prepare: false });

export async function initDb() {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS foods (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      serving_name TEXT NOT NULL,
      serving_g DOUBLE PRECISION NOT NULL,
      kcal DOUBLE PRECISION NOT NULL,
      protein DOUBLE PRECISION NOT NULL,
      carbs DOUBLE PRECISION NOT NULL,
      fat DOUBLE PRECISION NOT NULL,
      custom BOOLEAN NOT NULL DEFAULT FALSE
    );
    CREATE TABLE IF NOT EXISTS entries (
      id SERIAL PRIMARY KEY,
      date TEXT NOT NULL,
      food_id INTEGER NOT NULL REFERENCES foods(id),
      servings DOUBLE PRECISION NOT NULL
    );
    CREATE INDEX IF NOT EXISTS entries_date ON entries(date);
    CREATE TABLE IF NOT EXISTS water (date TEXT PRIMARY KEY, ml DOUBLE PRECISION NOT NULL);
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      kcal DOUBLE PRECISION NOT NULL, protein DOUBLE PRECISION NOT NULL, carbs DOUBLE PRECISION NOT NULL,
      fat DOUBLE PRECISION NOT NULL, water_ml DOUBLE PRECISION NOT NULL
    );
    INSERT INTO goals VALUES (1, 2000, 150, 200, 65, 2500) ON CONFLICT (id) DO NOTHING;
    -- Supabase exposes the public schema through its Data API; RLS with no policies blocks that.
    -- This server connects as the postgres role, which bypasses RLS.
    ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
    ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
    ALTER TABLE water ENABLE ROW LEVEL SECURITY;
    ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
  `);

  const [{ n }] = await sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM foods`;
  if (n === 0) {
    const rows = SEED_FOODS.map(([name, serving_name, serving_g, kcal, protein, carbs, fat]) => ({
      name, serving_name, serving_g, kcal, protein, carbs, fat,
    }));
    await sql`INSERT INTO foods ${sql(rows)}`;
  }
}
