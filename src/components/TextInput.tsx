import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export function TextInput({ error, className = "", ...props }: TextInputProps) {
  return (
    <input
      aria-invalid={!!error}
      aria-describedby={error && props.id ? `${props.id}-error` : undefined}
      className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-ink placeholder:text-muted/70 outline-none transition-colors ${
        error ? "border-red-500" : "border-hairline"
      } ${className}`}
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
      className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-ink placeholder:text-muted/70 outline-none transition-colors min-h-[6rem] ${
        error ? "border-red-500" : "border-hairline"
      } ${className}`}
      {...props}
    />
  );
}
