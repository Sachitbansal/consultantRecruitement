interface RadioCardGroupProps<T extends string> {
  options: T[];
  labels: Record<T, string>;
  subLabels?: Record<T, string>;
  value: T | null;
  onChange: (value: T) => void;
  name: string;
  /**
   * "cards" (default) lays the options out on a grid — right for 3-5 options
   * with real labels. "inline" wraps compact pills — right for Yes/No, where
   * a grid would stretch two words across the full column width.
   */
  variant?: "cards" | "inline";
  /** Grid template for the "cards" variant. Overridden per section so a
   *  3-option group and a 5-option group each fill the row properly. */
  gridClassName?: string;
}

/** Single-select group rendered as radio cards (label + optional sub-label). */
export function RadioCardGroup<T extends string>({
  options,
  labels,
  subLabels,
  value,
  onChange,
  name,
  variant = "cards",
  gridClassName = "grid-cols-1 sm:grid-cols-2",
}: RadioCardGroupProps<T>) {
  const inline = variant === "inline";

  return (
    <div
      className={inline ? "flex flex-wrap gap-2" : `grid gap-2.5 ${gridClassName}`}
      role="radiogroup"
      aria-label={name}
    >
      {options.map((opt) => {
        const checked = value === opt;
        const id = `${name}-${opt}`;
        return (
          <label
            key={opt}
            htmlFor={id}
            className={`cursor-pointer select-none rounded-lg border text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-navy ${
              inline ? "min-w-[5.5rem] px-4 py-2 text-center" : "px-4 py-3"
            } ${
              checked
                ? "border-navy bg-navy text-white"
                : "border-hairline bg-white text-ink hover:border-navy/50 hover:bg-navy/[0.03]"
            }`}
          >
            <input
              type="radio"
              id={id}
              name={name}
              checked={checked}
              onChange={() => onChange(opt)}
              className="sr-only"
            />
            {inline ? (
              <span className="font-medium">{labels[opt]}</span>
            ) : (
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-medium leading-snug">{labels[opt]}</span>
                {subLabels && (
                  <span
                    className={`shrink-0 text-xs ${checked ? "text-white/75" : "text-muted"}`}
                  >
                    {subLabels[opt]}
                  </span>
                )}
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}
