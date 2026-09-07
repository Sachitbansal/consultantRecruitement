import type { ReactNode } from "react";

interface FormSectionProps {
  id: string;
  /** 1-based position. The form genuinely is a sequence — you work down it in
   *  order and the contents rail tracks where you are — so the number carries
   *  information rather than decorating the heading. */
  index: number;
  title: string;
  description?: string;
  children: ReactNode;
}

/**
 * One section of the application, set like a page in a bound document: a rule
 * across the full column, the section number in the left margin, the heading
 * on the rule, and the fields indented under it.
 *
 * Deliberately NOT a floating card — the form is one continuous record, and
 * chopping it into eight identical shadowed panels would imply eight
 * unrelated things. Borders in this form appear only where they mean
 * something (see CaseStudyBlock, where each border encloses one record).
 */
export function FormSection({ id, index, title, description, children }: FormSectionProps) {
  return (
    <section id={id} className="scroll-mt-24 lg:scroll-mt-10">
      <div className="flex items-baseline gap-4 border-t-2 border-navy pt-5 sm:gap-5">
        <span
          aria-hidden
          className="w-4 shrink-0 text-sm font-medium tabular-nums text-navy sm:w-5"
        >
          {index}
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-[1.375rem] leading-tight text-ink sm:text-2xl">
            {title}
          </h2>
          {description && (
            <p className="mt-2 max-w-[64ch] text-[15px] leading-relaxed text-muted">
              {description}
            </p>
          )}
        </div>
      </div>
      {/* Indented to line up with the heading, past the number gutter. */}
      <div className="mt-7 flex flex-col gap-7 sm:pl-9 lg:pl-9">{children}</div>
    </section>
  );
}

/** Label for a control group that has no single focusable target (chip rows,
 *  radio card groups) — a <label> would have nothing to point at. */
export function GroupLabel({
  children,
  optional,
  hint,
}: {
  children: ReactNode;
  optional?: boolean;
  hint?: string;
}) {
  return (
    <div className="mb-2.5">
      <p className="flex items-baseline gap-1.5 text-sm font-medium leading-snug text-ink">
        {children}
        {optional && <span className="text-xs font-normal text-muted">(optional)</span>}
      </p>
      {hint && <p className="mt-1 max-w-[64ch] text-xs leading-snug text-muted">{hint}</p>}
    </div>
  );
}

export function GroupError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-2 text-sm leading-snug text-red-700">
      {message}
    </p>
  );
}
