import { useEffect, useState } from "react";
import { ListChecks, Trash2 } from "lucide-react";
import { round1, scale } from "../../shared/calc";
import type { Entry } from "../../shared/schemas";
import { Button, Card, inputCls } from "./ui";

export function Log({
  entries,
  onUpdate,
  onDelete,
}: {
  entries: Entry[];
  onUpdate: (id: number, servings: number) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <Card
      title="Food log"
      icon={<ListChecks size={20} className="text-primary" aria-hidden />}
      aside={<span className="text-sm text-muted-fg">{entries.length} items</span>}
    >
      {entries.length === 0 ? (
        <p className="rounded-xl bg-muted px-4 py-8 text-center text-muted-fg">
          Nothing logged for this day yet. Search for a food above to add it.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {entries.map((e) => (
            <EntryRow key={e.id} entry={e} onUpdate={onUpdate} onDelete={onDelete} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function EntryRow({ entry, onUpdate, onDelete }: { entry: Entry; onUpdate: (id: number, s: number) => void; onDelete: (id: number) => void }) {
  const [val, setVal] = useState(String(entry.servings));
  useEffect(() => setVal(String(round1(entry.servings))), [entry.servings]);
  const n = scale(entry.food, entry.servings);
  const id = `servings-${entry.id}`;

  const commit = () => {
    const s = Number(val);
    if (val.trim() === "" || !(s > 0 && s <= 100)) return setVal(String(round1(entry.servings)));
    if (s !== round1(entry.servings)) onUpdate(entry.id, s);
  };

  return (
    <li className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{entry.food.name}</p>
        <p className="text-xs text-muted-fg">
          <span className="font-semibold text-kcal">{Math.round(n.kcal)} kcal</span> · P {round1(n.protein)} · C {round1(n.carbs)} · F{" "}
          {round1(n.fat)} g
        </p>
        <p className="text-xs text-muted-fg">
          {entry.food.servingName} ({round1(entry.food.servingG * entry.servings)} g total)
        </p>
      </div>
      <label htmlFor={id} className="sr-only">
        Servings of {entry.food.name}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step="0.25"
        min={0}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className={`${inputCls} w-20 text-center`}
      />
      <span className="hidden text-xs text-muted-fg sm:inline">srv</span>
      <Button variant="icon" aria-label={`Remove ${entry.food.name}`} onClick={() => onDelete(entry.id)} className="hover:text-danger">
        <Trash2 size={18} aria-hidden />
      </Button>
    </li>
  );
}
