"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CommandPalette } from "./command-palette";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/library", label: "Library" },
  { href: "/admin", label: "Admin" },
];

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-40 px-3 pt-3 sm:px-6 backdrop-blur-sm"
      style={{ paddingTop: "calc(0.75rem + var(--safe-t))" }}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <Link href="/" className="group flex items-center gap-2 pl-1 pr-2">
          <span className="relative grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-rose-600 text-sm font-black shadow-lg shadow-violet-900/40 transition group-active:scale-95">
            A
            <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/25" />
          </span>
          <span className="hidden text-[15px] font-bold tracking-tight sm:block">Animus</span>
        </Link>

        <nav className="nav-float hidden items-center gap-0.5 px-1.5 py-1.5 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="nav-link"
              data-active={l.href === "/" ? pathname === "/" : pathname.startsWith(l.href)}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-2">
          <CommandPalette />
          <button
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
            className="btn btn-glass h-10 w-10 !p-0 md:hidden"
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <path d={open ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16"} />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="glass-strong mx-auto mt-2 max-w-7xl rounded-3xl p-3 md:hidden">
          <div className="grid grid-cols-2 gap-2">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-2xl bg-white/5 px-4 py-3 text-sm font-semibold transition active:scale-[0.98]"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

export function TabBar() {
  const pathname = usePathname();
  // Readers are full-screen experiences; the tab bar would overlap their toolbar.
  if (pathname.startsWith("/reader")) return null;
  const items = [
    { href: "/", label: "Home", icon: "M3 11l9-8 9 8v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
    { href: "/explore", label: "Explore", icon: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm3.5 5.5-2 5-5 2 2-5z" },
    { href: "/search", label: "Search", icon: "M11 4a7 7 0 1 0 4.9 11.9L21 21" },
    { href: "/library", label: "Library", icon: "M4 5h4v14H4zM10 5h4v14h-4zM17 6l3.5 13" },
  ];
  return (
    <nav className="tabbar md:hidden">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className="tab"
          data-active={i.href === "/" ? pathname === "/" : pathname.startsWith(i.href)}
        >
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={i.icon} />
          </svg>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
