"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaItem } from "@/lib/types";

interface Hit {
  id: string;
  title: string;
  category: string;
  cover: string | null;
  provider: string;
  author: string | null;
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      setRecent(JSON.parse(localStorage.getItem("animus:recent-search") ?? "[]"));
    } catch {}
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 40);
    else {
      setQ("");
      setHits([]);
      setSel(0);
    }
  }, [open]);

  const search = useCallback(async (term: string) => {
    if (term.trim().length < 2) {
      setHits([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
      const d = await res.json();
      setHits(
        (d.results ?? []).slice(0, 6).map((r: MediaItem) => ({
          id: r.id,
          title: r.title,
          category: r.category,
          cover: r.cover,
          provider: r.provider,
          author: r.author,
        }))
      );
      setSel(0);
    } catch {
      setHits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => search(q), 280);
    return () => clearTimeout(id);
  }, [q, search]);

  const commit = useCallback(
    (term: string) => {
      if (!term.trim()) return;
      const next = [term, ...recent.filter((r) => r !== term)].slice(0, 6);
      try {
        localStorage.setItem("animus:recent-search", JSON.stringify(next));
      } catch {}
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(term)}`);
    },
    [recent, router]
  );

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="group flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-[12px] text-white/50 backdrop-blur-xl transition hover:border-white/25 hover:text-white/80"
        aria-label="Open search"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden rounded border border-white/15 px-1 py-px text-[9.5px] text-white/40 sm:inline">⌘K</kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-3 pt-[12vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setOpen(false)} />
      <div className="glass-strong relative w-full max-w-xl overflow-hidden rounded-3xl">
        <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-white/40">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, hits.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
              if (e.key === "Enter") {
                if (hits[sel]) { setOpen(false); router.push(`/title/${encodeURIComponent(hits[sel].id)}`); }
                else commit(q);
              }
            }}
            placeholder="Search manga, manhwa, novels, visual novels…"
            className="w-full bg-transparent text-[15px] text-white outline-none placeholder:text-white/30"
          />
          {loading && <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-violet-400" />}
          <kbd className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-white/35">esc</kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-2">
          {hits.length > 0 &&
            hits.map((h, n) => (
              <Link
                key={h.id}
                href={`/title/${encodeURIComponent(h.id)}`}
                onClick={() => setOpen(false)}
                onMouseEnter={() => setSel(n)}
                className={`flex items-center gap-3 rounded-2xl px-2.5 py-2 transition ${n === sel ? "bg-white/10" : ""}`}
              >
                <div className="h-11 w-8 shrink-0 overflow-hidden rounded-md bg-white/10">
                  {h.cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={h.cover} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-white/90">{h.title}</p>
                  <p className="truncate text-[11px] text-white/35">
                    {h.category} · {h.provider}
                    {h.author ? ` · ${h.author}` : ""}
                  </p>
                </div>
                <span className="text-[11px] text-white/25">↵</span>
              </Link>
            ))}

          {!q && recent.length > 0 && (
            <div className="p-1">
              <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-white/30">Recent</p>
              <div className="flex flex-wrap gap-1.5 px-2">
                {recent.map((r) => (
                  <button key={r} onClick={() => commit(r)} className="pill hover:border-violet-400/50">
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!q && recent.length === 0 && (
            <div className="p-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/30">Try</p>
              <div className="flex flex-wrap gap-1.5">
                {["berserk", "solo leveling", "dune", "steins gate", "pride and prejudice", "oni"].map((s) => (
                  <button key={s} onClick={() => setQ(s)} className="pill hover:border-violet-400/50">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {q.length >= 2 && !loading && hits.length === 0 && (
            <p className="px-3 py-6 text-center text-[13px] text-white/40">
              No matches for “{q}”. Press <kbd className="rounded border border-white/15 px-1 text-[10px]">↵</kbd> to search anyway.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
