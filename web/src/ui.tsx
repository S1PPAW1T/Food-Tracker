import { useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { X } from "lucide-react";
import type { ZodError } from "zod";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export const inputCls = `w-full min-h-11 rounded-xl border border-border bg-card px-3 text-base text-fg placeholder:text-muted-fg ${focus}`;

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "icon" }) {
  const look = {
    primary: "bg-primary text-on-primary hover:opacity-90 px-4",
    ghost: "bg-muted text-fg hover:bg-border px-4",
    icon: "text-muted-fg hover:bg-muted hover:text-fg min-w-11",
  }[variant];
  return (
    <button
      type="button"
      className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${focus} ${look} ${className}`}
      {...props}
    />
  );
}

export function Card({ title, icon, aside, children }: { title: string; icon?: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <header className="mb-4 flex items-center gap-2">
        {icon}
        <h2 className="font-display text-xl font-semibold tracking-wide">{title}</h2>
        {aside && <div className="ml-auto">{aside}</div>}
      </header>
      {children}
    </section>
  );
}

export function Field({ label, error, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined}
        className={`${inputCls} ${error ? "border-danger" : ""}`}
        {...props}
      />
      {error && (
        <p id={`${id}-err`} className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (open && d && !d.open) d.showModal();
    if (!open && d?.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={titleId}
      className="m-auto w-[min(100%-2rem,30rem)] rounded-2xl border border-border bg-card p-0 text-fg"
    >
      <div className="p-5">
        <div className="mb-4 flex items-center">
          <h2 id={titleId} className="font-display text-2xl font-semibold">
            {title}
          </h2>
          <Button variant="icon" className="ml-auto" aria-label="Close" onClick={onClose}>
            <X size={20} aria-hidden />
          </Button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

/** "" must fail validation instead of becoming 0. */
export const toNum = (v: string) => (v.trim() === "" ? NaN : Number(v));

export function fieldErrors(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) out[String(i.path[0])] ??= i.code === "invalid_type" ? "Enter a number" : i.message;
  return out;
}
