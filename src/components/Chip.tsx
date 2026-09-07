interface ChipProps {
  id: string;
  name: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  type?: "checkbox" | "radio";
}

/**
 * A single toggle rendered as a card-style chip, backed by a real
 * checkbox/radio input for accessibility and keyboard support. The input is
 * visually hidden but still focusable and screen-reader-visible; the focus
 * ring is drawn on the label via `has-[:focus-visible]` so the whole chip
 * lights up rather than an invisible box inside it.
 */
export function Chip({ id, name, label, checked, onChange, type = "checkbox" }: ChipProps) {
  return (
    <label
      htmlFor={id}
      className={`inline-flex cursor-pointer select-none items-center rounded-full border px-3.5 py-1.5 text-sm leading-6 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-navy ${
        checked
          ? "border-navy bg-navy text-white"
          : "border-hairline bg-white text-ink hover:border-navy/50 hover:bg-navy/[0.03]"
      }`}
    >
      <input
        type={type}
        id={id}
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      {label}
    </label>
  );
}

interface ChipGroupProps<T extends string> {
  options: T[];
  labels: Record<T, string>;
  selected: T[];
  onToggle: (value: T) => void;
  name: string;
}

/** Multi-select group of chips backed by checkboxes. */
export function ChipGroup<T extends string>({
  options,
  labels,
  selected,
  onToggle,
  name,
}: ChipGroupProps<T>) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={name}>
      {options.map((opt) => (
        <Chip
          key={opt}
          id={`${name}-${opt}`}
          name={name}
          label={labels[opt]}
          checked={selected.includes(opt)}
          onChange={() => onToggle(opt)}
        />
      ))}
    </div>
  );
}
