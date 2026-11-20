import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, LogOut, Salad, Target, X } from "lucide-react";
import { totals } from "../../shared/calc";
import type { Day, Goals } from "../../shared/schemas";
import { api, errMsg } from "./api";
import { GoalsDialog } from "./Dialogs";
import { FoodSearch } from "./FoodSearch";
import { Log } from "./Log";
import { SummaryCard, WaterCard } from "./Summary";
import { Button } from "./ui";

const toISO = (d: Date) => d.toLocaleDateString("en-CA"); // local YYYY-MM-DD
const today = () => toISO(new Date());
const shift = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toISO(d);
};
const dayLabel = (date: string) =>
  date === today()
    ? "Today"
    : date === shift(today(), -1)
      ? "Yesterday"
      : new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

const NO_GOALS: Goals = { kcal: 0, protein: 0, carbs: 0, fat: 0, waterMl: 0 };

export default function App() {
  const [date, setDate] = useState(today);
  const [day, setDay] = useState<Day | null>(null);
  const [goals, setGoals] = useState<Goals | null>(null);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [goalsOpen, setGoalsOpen] = useState(false);

  useEffect(() => {
    let live = true;
    api
      .day(date)
      .then((d) => live && setDay(d))
      .catch((e) => live && setError(errMsg(e)));
    return () => {
      live = false;
    };
  }, [date, version]);

  useEffect(() => {
    api.goals().then(setGoals).catch((e) => setError(errMsg(e)));
  }, []);

  /** Run a write, then reload the day. Returns false on failure. */
  const mutate = async (p: Promise<unknown>) => {
    try {
      await p;
      setError(null);
      return true;
    } catch (e) {
      setError(errMsg(e));
      return false;
    } finally {
      setVersion((v) => v + 1);
    }
  };

  const shown = day?.date === date ? day : null;
  const g = goals ?? NO_GOALS;
  const isToday = date >= today();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-on-primary">
            <Salad size={22} aria-hidden />
          </span>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wide">Food Tracker</h1>
          <Button variant="ghost" className="ml-auto" onClick={() => setGoalsOpen(true)} disabled={!goals}>
            <Target size={18} aria-hidden /> Goals
          </Button>
          <Button variant="icon" aria-label="Sign out" title="Sign out" onClick={() => api.logout().finally(() => location.reload())}>
            <LogOut size={18} aria-hidden />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <nav aria-label="Choose day" className="flex items-center gap-2 rounded-2xl border border-border bg-card p-2">
          <Button variant="icon" aria-label="Previous day" onClick={() => setDate(shift(date, -1))}>
            <ChevronLeft size={22} aria-hidden />
          </Button>
          <div className="flex-1 text-center">
            <p className="font-display text-2xl font-semibold">{dayLabel(date)}</p>
            <label htmlFor="date-pick" className="sr-only">
              Pick a date
            </label>
            <input
              id="date-pick"
              type="date"
              value={date}
              max={today()}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="cursor-pointer rounded-md bg-transparent px-1 text-sm text-muted-fg focus-visible:outline-2 focus-visible:outline-primary"
            />
          </div>
          {!isToday && (
            <Button variant="ghost" onClick={() => setDate(today())}>
              Today
            </Button>
          )}
          <Button variant="icon" aria-label="Next day" disabled={isToday} onClick={() => setDate(shift(date, 1))}>
            <ChevronRight size={22} aria-hidden />
          </Button>
        </nav>

        {error && (
          <div role="alert" className="flex items-center gap-3 rounded-xl border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">
            <span className="flex-1">{error}</span>
            <Button variant="icon" aria-label="Dismiss error" onClick={() => setError(null)}>
              <X size={18} aria-hidden />
            </Button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="space-y-6">
            <SummaryCard total={totals(shown?.entries ?? [])} goals={g} />
            <WaterCard ml={shown?.waterMl ?? 0} goal={g.waterMl} onSet={(ml) => mutate(api.setWater(date, ml))} />
          </div>
          <div className="space-y-6">
            <FoodSearch onAdd={(food, servings) => mutate(api.addEntry(date, food.id, servings))} />
            <Log
              entries={shown?.entries ?? []}
              onUpdate={(id, s) => mutate(api.updateEntry(id, s))}
              onDelete={(id) => mutate(api.deleteEntry(id))}
            />
          </div>
        </div>
      </main>

      <GoalsDialog open={goalsOpen} goals={goals} onClose={() => setGoalsOpen(false)} onSaved={setGoals} />
    </div>
  );
}
