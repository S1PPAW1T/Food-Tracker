export type Nutrients = { kcal: number; protein: number; carbs: number; fat: number };

export const scale = (n: Nutrients, servings: number): Nutrients => ({
  kcal: n.kcal * servings,
  protein: n.protein * servings,
  carbs: n.carbs * servings,
  fat: n.fat * servings,
});

export function totals(entries: { servings: number; food: Nutrients }[]): Nutrients {
  const sum: Nutrients = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const e of entries) {
    const n = scale(e.food, e.servings);
    sum.kcal += n.kcal;
    sum.protein += n.protein;
    sum.carbs += n.carbs;
    sum.fat += n.fat;
  }
  return sum;
}

/** pct is clamped to 0..1 for drawing; over/remaining tell the real story. */
export function progress(value: number, goal: number) {
  if (goal <= 0) return { pct: 0, remaining: 0, over: false };
  return { pct: Math.min(value / goal, 1), remaining: Math.max(goal - value, 0), over: value > goal };
}

export const round1 = (n: number) => Math.round(n * 10) / 10;
