"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import mark from "@/public/gop-mark.png";
import { nav, site } from "@/lib/gop-content";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The drawer covers the page on mobile, so the body must not scroll behind it.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="site-header" data-stuck={stuck}>
      <nav className="nav" aria-label="Primary">
        <a className="nav-brand" href="#top" aria-label={`${site.name} home`}>
          <Image src={mark} alt={site.name} height={30} priority />
        </a>

        <button
          type="button"
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="primary-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>

        <div className="nav-links" id="primary-nav" data-open={open}>
          {nav.links.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ))}
          <a
            className="btn btn-primary drawer-cta"
            href={nav.cta.href}
            onClick={() => setOpen(false)}
          >
            {nav.cta.label}
          </a>
        </div>

        <div className="nav-cta">
          <a className="btn btn-primary" href={nav.cta.href}>
            {nav.cta.label}
          </a>
        </div>
      </nav>
    </header>
  );
}
