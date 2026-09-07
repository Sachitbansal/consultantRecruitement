import type { ReactNode } from "react";

interface FieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  optional?: boolean;
  hint?: string;
  children: ReactNode;
}

/**
 * Wraps a form control with a label, optional hint, and an inline error
 * message. Error text is linked to the control via aria-describedby by the
 * caller (pass the same id used here as `${htmlFor}-error`).
 *
 * Layout note: the control sits in an `mt-auto` wrapper inside a full-height
 * column. Grid rows stretch their cells by default, so when two Fields sit
 * side by side and one has a two-line label (or a hint) and the other does
 * not, `mt-auto` still pushes both inputs down to the same baseline instead
 * of leaving them staggered. This is what fixes the ragged inputs in the
 * Level & Tenure row.
 */
export function Field({
  label,
  htmlFor,
  error,
  optional,
  hint,
  children,
}: FieldProps) {
  return (
    <div className="flex h-full flex-col">
      <label
        htmlFor={htmlFor}
        className="flex items-baseline gap-1.5 text-sm font-medium leading-snug text-ink"
      >
        {label}
        {optional && (
          <span className="text-xs font-normal text-muted">(optional)</span>
        )}
      </label>
      {hint && <p className="mt-1 text-xs leading-snug text-muted">{hint}</p>}
      <div className="mt-auto pt-2">{children}</div>
      {error && (
        <p
          id={htmlFor ? `${htmlFor}-error` : undefined}
          role="alert"
          className="mt-1.5 text-sm leading-snug text-red-700"
        >
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Remaining-character readout for length-capped free-text fields. Goes amber
 * as the cap approaches so the limit is visible before it silently truncates
 * typing (maxLength just stops accepting keystrokes with no explanation).
 */
export function CharCounter({ value, limit }: { value: string; limit: number }) {
  const left = limit - value.length;
  const tight = left <= Math.max(15, Math.round(limit * 0.1));
  return (
    <p
      className={`mt-1.5 text-right text-xs tabular-nums ${
        tight ? "text-amber-700" : "text-muted"
      }`}
    >
      {left} left
    </p>
  );
}
