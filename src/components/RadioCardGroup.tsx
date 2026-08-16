interface RadioCardGroupProps<T extends string> {
  options: T[];
  labels: Record<T, string>;
  subLabels?: Record<T, string>;
  value: T | null;
  onChange: (value: T) => void;
  name: string;
}

/** Single-select group rendered as radio cards (label + optional sub-label). */
export function RadioCardGroup<T extends string>({
  options,
  labels,
  subLabels,
  value,
  onChange,
  name,
}: RadioCardGroupProps<T>) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 gap-2"
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
            className={`cursor-pointer select-none rounded-lg border px-4 py-3 text-sm transition-colors ${
              checked
                ? "border-navy bg-navy text-white"
                : "border-hairline bg-white text-ink hover:border-navy/50"
            }`}
          >
            <input
              type="radio"
              id={id}
              name={name}
              checked={checked}
              onChange={() => onChange(opt)}
              className="sr-only peer"
            />
            <span className="peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-navy rounded flex items-baseline justify-between gap-2">
              <span className="font-medium">{labels[opt]}</span>
              {subLabels && (
                <span
                  className={checked ? "text-white/80 text-xs" : "text-muted text-xs"}
                >
                  {subLabels[opt]}
                </span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}
