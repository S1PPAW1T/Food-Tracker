import { useState, type FormEvent } from "react";
import { LogIn, Salad } from "lucide-react";
import { api, errMsg } from "./api";
import { Button, Field } from "./ui";

export function Login({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.login(password);
      onDone();
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-on-primary">
            <Salad size={22} aria-hidden />
          </span>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wide">Food Tracker</h1>
        </div>
        {/* Hidden username so password managers save this login properly. */}
        <input type="text" name="username" autoComplete="username" value="food-tracker" readOnly hidden />
        <Field
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          autoFocus
          required
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(undefined);
          }}
          error={error}
        />
        <Button type="submit" className="w-full" disabled={busy || !password}>
          <LogIn size={18} aria-hidden /> {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </main>
  );
}
