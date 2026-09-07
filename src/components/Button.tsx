import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

// One place that decides button height, padding, radius and focus ring, so
// every button in the form lines up on the same grid instead of each call
// site inventing its own px-/py- pair.
const BASE =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-colors " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy " +
  "disabled:cursor-not-allowed disabled:opacity-45";

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-7 text-[15px]",
};

const VARIANTS: Record<Variant, string> = {
  primary: "bg-navy text-white hover:bg-navy-deep",
  // disabled:hover:* resets are needed because the hover state inverts the
  // colours entirely — without them a disabled secondary button still flips
  // to solid navy under the cursor.
  secondary:
    "border border-navy bg-white text-navy hover:bg-navy hover:text-white " +
    "disabled:hover:bg-white disabled:hover:text-navy",
  ghost: "border border-hairline bg-white text-ink hover:border-navy/50 hover:text-navy",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
