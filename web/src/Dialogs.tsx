import { useEffect, useState, type FormEvent } from "react";
import { Goals, NewFood, type Food } from "../../shared/schemas";
import { api, errMsg } from "./api";
import { Button, Field, Modal, fieldErrors, toNum } from "./ui";

const GOAL_FIELDS: [keyof Goals, string][] = [
  ["kcal", "Calories (kcal)"],
  ["protein", "Protein (g)"],
  ["carbs", "Carbs (g)"],
  ["fat", "Fat (g)"],
  ["waterMl", "Water (ml)"],
];

export function GoalsDialog({
  open,
  goals,
  onClose,
  onSaved,
}: {
  open: boolean;
  goals: Goals | null;
  onClose: () => void;
  onSaved: (g: Goals) => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && goals) {
      setForm(Object.fromEntries(GOAL_FIELDS.map(([k]) => [k, String(goals[k])])));
      setErrors({});
    }
  }, [open, goals]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = Goals.safeParse(Object.fromEntries(GOAL_FIELDS.map(([k]) => [k, toNum(form[k] ?? "")])));
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setBusy(true);
    try {
      onSaved(await api.setGoals(parsed.data));
      onClose();
    } catch (err) {
      setErrors({ form: errMsg(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Daily goals">
      <form onSubmit={submit} noValidate className="grid grid-cols-2 gap-4">
        {GOAL_FIELDS.map(([k, label]) => (
          <Field
            key={k}
            label={label}
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={form[k] ?? ""}
            error={errors[k]}
            onChange={(e) => setForm({ ...form, [k]: e.target.value })}
          />
        ))}
        {errors.form && <p className="col-span-2 text-sm text-danger" role="alert">{errors.form}</p>}
        <Button type="submit" disabled={busy} className="col-span-2">
          {busy ? "Saving…" : "Save goals"}
        </Button>
      </form>
    </Modal>
  );
}

const FOOD_FIELDS: [keyof NewFood, string, "text" | "number", string][] = [
  ["name", "Food name", "text", "e.g. Mom's chicken soup"],
  ["servingName", "Serving name", "text", "e.g. 1 bowl"],
  ["servingG", "Serving weight (g)", "number", "250"],
  ["kcal", "Calories (kcal)", "number", "0"],
  ["protein", "Protein (g)", "number", "0"],
  ["carbs", "Carbs (g)", "number", "0"],
  ["fat", "Fat (g)", "number", "0"],
];

export function CustomFoodDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (f: Food) => void }) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({});
      setErrors({});
    }
  }, [open]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const raw = Object.fromEntries(FOOD_FIELDS.map(([k, , type]) => [k, type === "number" ? toNum(form[k] ?? "") : form[k] ?? ""]));
    const parsed = NewFood.safeParse(raw);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setBusy(true);
    try {
      onCreated(await api.addFood(parsed.data));
      onClose();
    } catch (err) {
      setErrors({ form: errMsg(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Custom food">
      <form onSubmit={submit} noValidate className="grid grid-cols-2 gap-4">
        <p className="col-span-2 -mt-2 text-sm text-muted-fg">Enter nutrition for one serving.</p>
        {FOOD_FIELDS.map(([k, label, type, placeholder], i) => (
          <div key={k} className={i < 2 ? "col-span-2 sm:col-span-1" : ""}>
            <Field
              label={label}
              type={type}
              inputMode={type === "number" ? "decimal" : undefined}
              min={type === "number" ? 0 : undefined}
              step={type === "number" ? "any" : undefined}
              placeholder={placeholder}
              value={form[k] ?? ""}
              error={errors[k]}
              onChange={(e) => setForm({ ...form, [k]: e.target.value })}
            />
          </div>
        ))}
        {errors.form && <p className="col-span-2 text-sm text-danger" role="alert">{errors.form}</p>}
        <Button type="submit" disabled={busy} className="col-span-2">
          {busy ? "Saving…" : "Save and select"}
        </Button>
      </form>
    </Modal>
  );
}
