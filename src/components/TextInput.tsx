import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

// Shared control chrome. `outline-none` alone would leave keyboard users with
// no visible focus target at all, so every control replaces it with an
// explicit border + ring on :focus.
const CONTROL_BASE =
  "w-full rounded-md border bg-white px-3 text-sm text-ink placeholder:text-muted/60 " +
  "outline-none transition-[border-color,box-shadow] " +
  "focus:border-navy focus:ring-2 focus:ring-navy/15 " +
  "disabled:cursor-not-allowed disabled:bg-gray-light/60 disabled:text-muted";

const borderFor = (error?: string) =>
  error ? "border-red-400 focus:border-red-500 focus:ring-red-500/15" : "border-hairline";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export function TextInput({ error, className = "", ...props }: TextInputProps) {
  return (
    <input
      aria-invalid={!!error}
      aria-describedby={error && props.id ? `${props.id}-error` : undefined}
      className={`${CONTROL_BASE} h-10 ${borderFor(error)} ${className}`}
      {...props}
    />
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export function TextArea({ error, className = "", ...props }: TextAreaProps) {
  return (
    <textarea
      aria-invalid={!!error}
      aria-describedby={error && props.id ? `${props.id}-error` : undefined}
      className={`${CONTROL_BASE} min-h-[7rem] resize-y py-2.5 leading-relaxed ${borderFor(error)} ${className}`}
      {...props}
    />
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

/** Native select kept native (OS chevron, OS dropdown) — only sized to match
 *  TextInput so a select and an input side by side are the same height. */
export function Select({ error, className = "", children, ...props }: SelectProps) {
  return (
    <select
      aria-invalid={!!error}
      aria-describedby={error && props.id ? `${props.id}-error` : undefined}
      className={`${CONTROL_BASE} h-10 pr-8 ${borderFor(error)} ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}
