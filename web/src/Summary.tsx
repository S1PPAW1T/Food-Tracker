import { useState } from "react";
import { Droplet, Flame } from "lucide-react";
import { progress, round1, type Nutrients } from "../../shared/calc";
import type { Goals } from "../../shared/schemas";
import { Button, Card, inputCls } from "./ui";

function Bar({
  label,
  value,
  goal,
  unit,
  color,
  dot,
  overIsBad = true,
}: {
  label: string;
  value: number;
  goal: number;
  unit: string;
  color: string;
  dot: string;
  overIsBad?: boolean;
}) {
  const p = progress(value, goal);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 font-semibold">
          <span className={`inline-block size-2.5 rounded-full ${dot}`} aria-hidden />
          {label}
        </span>
        <span className="tabular-nums text-muted-fg">
          <b className="text-base text-fg">{round1(value)}</b> / {goal} {unit}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={round1(value)}
        className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-border"
      >
        <div
          className={`h-full w-full origin-left rounded-full transition-transform duration-500 ease-out ${p.over && overIsBad ? "bg-danger" : color}`}
          style={{ transform: `scaleX(${p.pct})` }}
        />
      </div>
      <p className="mt-1 text-xs text-muted-fg">
        {p.over && overIsBad ? (
          <span className="font-medium text-danger">
            {round1(value - goal)} {unit} over goal
          </span>
        ) : p.over || (goal > 0 && p.remaining === 0) ? (
          <span className="font-medium text-primary">Goal reached</span>
        ) : (
          `${round1(p.remaining)} ${unit} left`
        )}
      </p>
    </div>
  );
}

export function SummaryCard({ total, goals }: { total: Nutrients; goals: Goals }) {
  const p = progress(total.kcal, goals.kcal);
  const r = 54;
  const c = 2 * Math.PI * r;
  return (
    <Card title="Daily summary" icon={<Flame size={20} className="text-kcal" aria-hidden />}>
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <div className="relative size-40 shrink-0">
          <svg viewBox="0 0 128 128" className="size-full -rotate-90" aria-hidden>
            <circle cx="64" cy="64" r={r} fill="none" strokeWidth="12" className="stroke-border" />
            <circle
              cx="64"
              cy="64"
              r={r}
              fill="none"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - p.pct)}
              className={`transition-[stroke-dashoffset] duration-700 ease-out ${p.over ? "stroke-danger" : "stroke-kcal"}`}
            />
          </svg>
          <div className="absolute inset-0 grid place-content-center text-center">
            <span className="font-display text-4xl font-bold tabular-nums">{Math.round(total.kcal)}</span>
            <span className="text-sm text-muted-fg">of {goals.kcal} kcal</span>
          </div>
        </div>
        <div className="w-full space-y-4">
          <p className="text-center sm:text-left" aria-live="polite">
            {p.over ? (
              <span className="font-display text-2xl font-semibold text-danger">
                {Math.round(total.kcal - goals.kcal)} kcal over
              </span>
            ) : (
              <span className="font-display text-2xl font-semibold">{Math.round(p.remaining)} kcal left</span>
            )}
          </p>
          <Bar label="Protein" value={total.protein} goal={goals.protein} unit="g" color="bg-protein" dot="bg-protein" overIsBad={false} />
          <Bar label="Carbs" value={total.carbs} goal={goals.carbs} unit="g" color="bg-carbs" dot="bg-carbs" />
          <Bar label="Fat" value={total.fat} goal={goals.fat} unit="g" color="bg-fat" dot="bg-fat" />
        </div>
      </div>
    </Card>
  );
}

export function WaterCard({ ml, goal, onSet }: { ml: number; goal: number; onSet: (ml: number) => void }) {
  const [custom, setCustom] = useState("");
  const add = (delta: number) => onSet(Math.min(20000, Math.max(0, ml + delta)));
  const customMl = Number(custom);
  return (
    <Card title="Water" icon={<Droplet size={20} className="text-water" aria-hidden />}>
      <Bar label="Water" value={ml} goal={goal} unit="ml" color="bg-water" dot="bg-water" overIsBad={false} />
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="ghost" onClick={() => add(250)}>+250 ml</Button>
        <Button variant="ghost" onClick={() => add(500)}>+500 ml</Button>
        <Button variant="ghost" onClick={() => add(-250)} disabled={ml <= 0}>−250 ml</Button>
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (customMl > 0) {
            add(customMl);
            setCustom("");
          }
        }}
      >
        <label htmlFor="water-custom" className="sr-only">
          Custom water amount in ml
        </label>
        <input
          id="water-custom"
          type="number"
          inputMode="numeric"
          min={1}
          max={5000}
          placeholder="Custom amount (ml)"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          className={inputCls}
        />
        <Button type="submit" disabled={!(customMl > 0 && customMl <= 5000)}>Add</Button>
      </form>
    </Card>
  );
}
