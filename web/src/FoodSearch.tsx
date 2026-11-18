import { useEffect, useState } from "react";
import { Plus, Search, UtensilsCrossed } from "lucide-react";
import { round1, scale } from "../../shared/calc";
import type { Food } from "../../shared/schemas";
import { api, errMsg } from "./api";
import { CustomFoodDialog } from "./Dialogs";
import { Button, Card, inputCls } from "./ui";

const macroLine = (n: { protein: number; carbs: number; fat: number }) =>
  `P ${round1(n.protein)} · C ${round1(n.carbs)} · F ${round1(n.fat)} g`;

export function FoodSearch({ onAdd }: { onAdd: (food: Food, servings: number) => Promise<boolean> }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Food | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      api
        .foods(q)
        .then((r) => live && (setResults(r), setError(null)))
        .catch((e) => live && setError(errMsg(e)));
    }, 200);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q, refresh]);

  return (
    <Card
      title="Add food"
      icon={<UtensilsCrossed size={20} className="text-primary" aria-hidden />}
      aside={
        <Button variant="ghost" onClick={() => setCustomOpen(true)}>
          <Plus size={18} aria-hidden /> Custom food
        </Button>
      }
    >
      {selected ? (
        <AddPanel
          food={selected}
          onCancel={() => setSelected(null)}
          onAdd={async (servings) => {
            if (await onAdd(selected, servings)) {
              setSelected(null);
              setQ("");
            }
          }}
        />
      ) : (
        <>
          <label htmlFor="food-search" className="sr-only">
            Search foods
          </label>
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-fg" aria-hidden />
            <input
              id="food-search"
              type="search"
              placeholder="Search foods, e.g. chicken, rice, banana"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className={`${inputCls} pl-10`}
              autoComplete="off"
            />
          </div>
          {error && <p className="mt-3 text-sm text-danger" role="alert">{error}</p>}
          <ul className="mt-3 max-h-96 divide-y divide-border overflow-y-auto rounded-xl border border-border" aria-label="Food results">
            {results.length === 0 && !error && (
              <li className="px-4 py-6 text-center text-sm text-muted-fg">
                No foods match “{q}”. Add it as a custom food.
              </li>
            )}
            {results.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => setSelected(f)}
                  className="flex min-h-14 w-full cursor-pointer items-center gap-3 px-4 py-2 text-left transition-colors duration-150 hover:bg-muted focus-visible:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {f.name}
                      {f.custom && <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-fg">custom</span>}
                    </span>
                    <span className="block text-xs text-muted-fg">
                      {f.servingName} ({f.servingG} g) · {macroLine(f)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="font-display text-lg font-semibold tabular-nums">{Math.round(f.kcal)}</span>
                    <span className="ml-1 text-xs text-muted-fg">kcal</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <CustomFoodDialog
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        onCreated={(f) => {
          setRefresh((n) => n + 1);
          setSelected(f);
        }}
      />
    </Card>
  );
}

function AddPanel({ food, onCancel, onAdd }: { food: Food; onCancel: () => void; onAdd: (servings: number) => Promise<void> }) {
  const [unit, setUnit] = useState<"serving" | "g">("serving");
  const [qty, setQty] = useState("1");
  const [busy, setBusy] = useState(false);
  const n = Number(qty);
  const servings = unit === "serving" ? n : n / food.servingG;
  const valid = qty.trim() !== "" && Number.isFinite(n) && n > 0 && servings <= 100;
  const preview = scale(food, valid ? servings : 0);

  const switchUnit = (u: "serving" | "g") => {
    setUnit(u);
    setQty(u === "serving" ? "1" : String(food.servingG));
  };

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid) return;
        setBusy(true);
        await onAdd(servings);
        setBusy(false);
      }}
    >
      <p className="font-display text-2xl font-semibold">{food.name}</p>
      <p className="text-sm text-muted-fg">
        1 serving = {food.servingName} ({food.servingG} g)
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="w-32">
          <label htmlFor="qty" className="mb-1 block text-sm font-medium">
            Amount
          </label>
          <input
            id="qty"
            type="number"
            inputMode="decimal"
            step="any"
            min={0}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            aria-invalid={!valid}
            aria-describedby="qty-err"
            className={`${inputCls} ${valid ? "" : "border-danger"}`}
            autoFocus
          />
        </div>
        <div role="group" aria-label="Unit" className="flex rounded-xl bg-muted p-1">
          {(["serving", "g"] as const).map((u) => (
            <button
              key={u}
              type="button"
              aria-pressed={unit === u}
              onClick={() => switchUnit(u)}
              className={`min-h-9 cursor-pointer rounded-lg px-3 text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-primary ${
                unit === u ? "bg-card text-fg shadow-sm" : "text-muted-fg hover:text-fg"
              }`}
            >
              {u === "serving" ? "Servings" : "Grams"}
            </button>
          ))}
        </div>
      </div>
      <p id="qty-err" className="mt-1 min-h-5 text-sm text-danger">
        {valid ? "" : "Enter an amount above 0 (max 100 servings)."}
      </p>

      <dl className="mt-2 grid grid-cols-4 gap-2 text-center">
        {(
          [
            ["kcal", preview.kcal, "", "text-kcal"],
            ["Protein", preview.protein, "g", "text-protein"],
            ["Carbs", preview.carbs, "g", "text-carbs"],
            ["Fat", preview.fat, "g", "text-fat"],
          ] as const
        ).map(([label, v, unit, color]) => (
          <div key={label} className="rounded-xl bg-muted px-2 py-3">
            <dt className={`text-xs font-semibold uppercase tracking-wide ${color}`}>{label}</dt>
            <dd className="font-display text-2xl font-semibold tabular-nums">
              {label === "kcal" ? Math.round(v) : round1(v)}
              <span className="text-sm text-muted-fg">{unit}</span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 flex gap-2">
        <Button type="submit" disabled={!valid || busy} className="flex-1">
          <Plus size={18} aria-hidden /> {busy ? "Adding…" : "Add to log"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
