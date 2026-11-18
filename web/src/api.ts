import type { Day, Food, Goals, NewFood } from "../../shared/schemas";

async function req<T>(path: string, method = "GET", json?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: json === undefined ? undefined : { "content-type": "application/json" },
    body: json === undefined ? undefined : JSON.stringify(json),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const api = {
  foods: (q: string) => req<Food[]>(`/foods?q=${encodeURIComponent(q)}`),
  addFood: (f: NewFood) => req<Food>("/foods", "POST", f),
  day: (date: string) => req<Day>(`/day/${date}`),
  addEntry: (date: string, foodId: number, servings: number) =>
    req<{ id: number }>("/entries", "POST", { date, foodId, servings }),
  updateEntry: (id: number, servings: number) => req<void>(`/entries/${id}`, "PATCH", { servings }),
  deleteEntry: (id: number) => req<void>(`/entries/${id}`, "DELETE"),
  setWater: (date: string, ml: number) => req<{ ml: number }>(`/water/${date}`, "PUT", { ml }),
  goals: () => req<Goals>("/goals"),
  setGoals: (g: Goals) => req<Goals>("/goals", "PUT", g),
};

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
