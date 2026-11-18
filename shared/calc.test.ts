import { test } from "node:test";
import assert from "node:assert/strict";
import { progress, round1, totals } from "./calc";

const rice = { kcal: 205, protein: 4.3, carbs: 44.5, fat: 0.4 };
const egg = { kcal: 72, protein: 6.3, carbs: 0.4, fat: 4.8 };

test("totals sums scaled servings", () => {
  const t = totals([
    { servings: 1.5, food: rice },
    { servings: 2, food: egg },
  ]);
  const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
  near(t.kcal, 451.5); // 307.5 + 144
  near(t.protein, 19.05); // 6.45 + 12.6
  near(t.carbs, 67.55); // 66.75 + 0.8
  near(t.fat, 10.2); // 0.6 + 9.6
  assert.equal(round1(12.34), 12.3);
});

test("totals of an empty day is zero", () => {
  assert.deepEqual(totals([]), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
});

test("progress under, at and over goal", () => {
  assert.deepEqual(progress(500, 2000), { pct: 0.25, remaining: 1500, over: false });
  assert.deepEqual(progress(2000, 2000), { pct: 1, remaining: 0, over: false });
  assert.deepEqual(progress(2500, 2000), { pct: 1, remaining: 0, over: true });
});

test("progress with no goal set", () => {
  assert.deepEqual(progress(100, 0), { pct: 0, remaining: 0, over: false });
});
