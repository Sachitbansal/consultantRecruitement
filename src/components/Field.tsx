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
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-ink flex items-baseline gap-1.5"
      >
        {label}
        {optional && (
          <span className="text-xs font-normal text-muted">(optional)</span>
        )}
      </label>
      {hint && <p className="text-xs text-muted -mt-0.5">{hint}</p>}
      {children}
      {error && (
        <p
          id={htmlFor ? `${htmlFor}-error` : undefined}
          role="alert"
          className="text-sm text-red-700"
        >
          {error}
        </p>
      )}
    </div>
  );
}
