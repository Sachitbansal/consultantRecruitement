"use client";

interface NavSection {
  id: string;
  label: string;
}

/**
 * Table of contents for the application. A long structured document has one;
 * this is that, not a progress stepper — every section stays reachable at any
 * time, and the rule marks where you currently are.
 */
export function FormContents({
  sections,
  activeIndex,
}: {
  sections: readonly NavSection[];
  activeIndex: number;
}) {
  return (
    <nav aria-label="Application sections">
      <p className="text-[13px] font-medium text-ink">Contents</p>
      <ol className="mt-3 border-t border-hairline">
        {sections.map((s, i) => {
          const active = i === activeIndex;
          return (
            <li key={s.id} className="border-b border-hairline">
              <a
                href={`#${s.id}`}
                aria-current={active ? "true" : undefined}
                className={`flex items-baseline gap-3 border-l-2 py-2.5 pl-3 text-[13.5px] leading-snug transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy ${
                  active
                    ? "border-navy font-medium text-navy"
                    : "border-transparent text-muted hover:border-hairline hover:text-ink"
                }`}
              >
                <span className="w-3 shrink-0 tabular-nums text-xs text-muted/80">{i + 1}</span>
                <span>{s.label}</span>
              </a>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 max-w-[28ch] text-xs leading-relaxed text-muted">
        Nothing is saved until you submit, so finish in one sitting.
      </p>
    </nav>
  );
}

/**
 * Mobile stand-in for the contents rail. A horizontally scrolling pill strip
 * was the previous treatment; it hid half its own items behind a scrollbar,
 * so this shows where you are and how far is left, in the space available.
 */
export function FormProgressBar({
  sections,
  activeIndex,
}: {
  sections: readonly NavSection[];
  activeIndex: number;
}) {
  const pct = ((activeIndex + 1) / sections.length) * 100;
  return (
    <div className="sticky top-0 z-30 -mx-5 mb-8 border-b border-hairline bg-background/95 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8 lg:hidden">
      <div className="flex items-baseline justify-between gap-4">
        <p className="truncate text-sm font-medium text-ink">{sections[activeIndex]?.label}</p>
        <p className="shrink-0 text-xs tabular-nums text-muted">
          {activeIndex + 1} of {sections.length}
        </p>
      </div>
      <div className="mt-2.5 h-0.5 w-full bg-hairline">
        <div
          className="h-full bg-navy transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
