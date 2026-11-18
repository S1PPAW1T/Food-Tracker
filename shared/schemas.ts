import { z } from "zod";

const amount = (max: number) => z.number().finite().nonnegative().max(max);

export const DateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const NewFood = z.object({
  name: z.string().trim().min(1, "Required").max(80),
  servingName: z.string().trim().min(1, "Required").max(40),
  servingG: z.number().finite().positive("Must be more than 0").max(5000),
  kcal: amount(5000),
  protein: amount(500),
  carbs: amount(1000),
  fat: amount(500),
});
export type NewFood = z.infer<typeof NewFood>;
export type Food = NewFood & { id: number; custom: boolean };

export const NewEntry = z.object({
  date: DateStr,
  foodId: z.number().int().positive(),
  servings: z.number().finite().positive().max(100),
});
export const EntryUpdate = NewEntry.pick({ servings: true });

export const Goals = z.object({
  kcal: amount(20000),
  protein: amount(1000),
  carbs: amount(2000),
  fat: amount(1000),
  waterMl: amount(20000),
});
export type Goals = z.infer<typeof Goals>;

export const Water = z.object({ ml: amount(20000) });

export type Entry = { id: number; servings: number; food: Food };
export type Day = { date: string; entries: Entry[]; waterMl: number };
