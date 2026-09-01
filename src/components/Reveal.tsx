"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Fades its children in once they enter the viewport.
 *
 * Starts visible and only hides itself after mount, so the content is still
 * there with JavaScript disabled or before hydration.
 */
export default function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  as?: "div" | "section" | "li";
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [armed, setArmed] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setShown(true);
      return;
    }

    setArmed(true);
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const classes = [armed ? "reveal" : "", shown ? "in" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag
      // One ref type per tag would need a generic; the cast keeps the call
      // sites simple and the element is only ever read for observation.
      ref={ref as React.Ref<never>}
      className={classes || undefined}
      style={shown && delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
