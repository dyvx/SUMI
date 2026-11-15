"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MediaItem } from "@/lib/types";

interface Chapter {
  id: string;
  chapter: string | null;
  title: string | null;
  pages: number;
}
interface Page {
  url: string;
  page: number;
}

type Mode = "vertical" | "single" | "double";

export function ComicReader({
  item,
  initialChapter,
  startPercent,
}: {
  item: MediaItem;
  initialChapter?: string;
  startPercent: number;
}) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chapterId, setChapterId] = useState<string | null>(initialChapter ?? null);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("vertical");
  const [direction, setDirection] = useState<"ltr" | "rtl">("rtl");
  const [index, setIndex] = useState(0);
  const [showUI, setShowUI] = useState(true);
  const [percent, setPercent] = useState(startPercent);
  const scrollRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Load chapter list
  useEffect(() => {
    if (item.provider !== "mangadex") {
      setLoading(false);
      setError("This title has no reading source. Attach an authorized source in Admin.");
      return;
    }
    let alive = true;
    fetch(`/api/chapter?mangaId=${encodeURIComponent(item.providerId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const list: Chapter[] = d.chapters ?? [];
        setChapters(list);
        setChapterId((prev) => prev ?? list[0]?.id ?? null);
        if (!list.length) setError("No chapters are indexed for this title.");
      })
      .catch(() => alive && setError("Could not load the chapter list."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [item.provider, item.providerId]);

  // Load pages for the active chapter
  useEffect(() => {
    if (!chapterId) return;
    let alive = true;
    setLoading(true);
    setError(null);
    fetch(`/api/chapter?chapterId=${encodeURIComponent(chapterId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d.error) throw new Error(d.error);
        setPages(d.pages ?? []);
        setIndex(0);
      })
      .catch(() => alive && setError("Could not load pages for this chapter."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [chapterId]);

  const chapterNumber = useMemo(() => {
    const c = chapters.find((x) => x.id === chapterId);
    return c?.chapter ? Number(c.chapter) || 0 : 0;
  }, [chapters, chapterId]);

  const save = useCallback(
    (page: number, pct: number) => {
      fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaId: item.id,
          chapter: chapterNumber,
          page,
          totalPages: pages.length,
          percent: pct,
        }),
      }).catch(() => {});
    },
    [item.id, chapterNumber, pages.length]
  );

  // Vertical scroll progress tracking
  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    const pct = max > 0 ? Math.min(100, (el.scrollTop / max) * 100) : 0;
    setPercent(pct);
  }, []);

  // Debounced progress save
  useEffect(() => {
    const t = setTimeout(() => {
      if (pages.length) save(index + 1, percent);
    }, 900);
    return () => clearTimeout(t);
  }, [percent, index, pages.length, save]);

  // Track which page is visible in vertical mode
  useEffect(() => {
    if (mode !== "vertical") return;
    observerRef.current?.disconnect();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const p = Number((e.target as HTMLElement).dataset.page);
            if (!Number.isNaN(p)) setIndex(p - 1);
          }
        }
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    scrollRef.current?.querySelectorAll("[data-page]").forEach((n) => io.observe(n));
    observerRef.current = io;
    return () => io.disconnect();
  }, [mode, pages]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (mode === "vertical") return;
      const forward = direction === "ltr" ? "ArrowRight" : "ArrowLeft";
      const back = direction === "ltr" ? "ArrowLeft" : "ArrowRight";
      if (e.key === forward) setIndex((i) => Math.min(pages.length - 1, i + (mode === "double" ? 2 : 1)));
      if (e.key === back) setIndex((i) => Math.max(0, i - (mode === "double" ? 2 : 1)));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, direction, pages.length]);

  // Preload the next few pages so page turns feel instant.
  useEffect(() => {
    if (mode === "vertical" || !pages.length) return;
    const ahead = mode === "double" ? 4 : 3;
    for (let n = index; n < Math.min(pages.length, index + ahead); n++) {
      const img = new Image();
      img.src = pages[n].url;
    }
  }, [index, mode, pages]);

  // Touch swipe for paged modes.
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current || mode === "vertical") return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy)) return;
    const step = mode === "double" ? 2 : 1;
    // A left swipe advances in LTR, goes back in RTL.
    const forward = direction === "ltr" ? dx < 0 : dx > 0;
    setIndex((i) => forward ? Math.min(pages.length - 1, i + step) : Math.max(0, i - step));
  };

  const currentIdx = chapters.findIndex((c) => c.id === chapterId);
  const prevChapter = currentIdx > 0 ? chapters[currentIdx - 1] : null;
  const nextChapter = currentIdx >= 0 && currentIdx < chapters.length - 1 ? chapters[currentIdx + 1] : null;
  const visible = mode === "double" ? pages.slice(index, index + 2) : pages.slice(index, index + 1);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#050507]">
      {/* Top bar */}
      <div
        className={`glass-strong absolute inset-x-0 top-0 z-30 flex items-center gap-2 px-3 py-2 transition-transform duration-300 ${
          showUI ? "translate-y-0" : "-translate-y-full"
        }`}
        style={{ paddingTop: "calc(0.5rem + var(--safe-t))" }}
      >
        <Link href={`/title/${encodeURIComponent(item.id)}`} className="btn btn-glass h-9 w-9 !p-0" aria-label="Back">
          ←
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold">{item.title}</p>
          <p className="text-[11px] text-white/40">
            {chapterNumber ? `Chapter ${chapterNumber}` : "Oneshot"} · {pages.length} pages
          </p>
        </div>
        <select
          value={chapterId ?? ""}
          onChange={(e) => setChapterId(e.target.value)}
          className="max-w-[130px] rounded-xl border border-white/15 bg-white/10 px-2 py-1.5 text-[12px] outline-none backdrop-blur"
        >
          {chapters.map((c) => (
            <option key={c.id} value={c.id} className="bg-[#12121a]">
              {c.chapter ? `Ch. ${c.chapter}` : "Oneshot"}
            </option>
          ))}
        </select>
      </div>

      {/* Pages */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={() => setShowUI((v) => !v)}
        className={`flex-1 ${mode === "vertical" ? "overflow-y-auto" : "grid place-items-center overflow-hidden"}`}
      >
        {loading && (
          <div className="grid h-full place-items-center">
            <div className="skeleton h-[70vh] w-[min(92vw,620px)] rounded-2xl" />
          </div>
        )}
        {error && !loading && (
          <div className="mx-auto max-w-md px-6 text-center">
            <p className="text-[15px] font-semibold">Reader unavailable</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/50">{error}</p>
            <Link href={`/title/${encodeURIComponent(item.id)}`} className="btn btn-glass mt-4">
              Back to details
            </Link>
          </div>
        )}

        {!loading && !error && mode === "vertical" && (
          <div className="mx-auto flex max-w-[820px] flex-col gap-1 py-1">
            {pages.map((p) => (
              <div key={p.page} data-page={p.page} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={`Page ${p.page}`}
                  loading={p.page <= 2 ? "eager" : "lazy"}
                  decoding="async"
                  className="w-full select-none"
                />
              </div>
            ))}
            <div className="flex items-center justify-between gap-2 p-5">
              <button disabled={!prevChapter} onClick={() => setChapterId(prevChapter!.id)} className="btn btn-glass disabled:opacity-30">
                ← Previous
              </button>
              <span className="text-[12px] text-white/35">End of chapter</span>
              <button disabled={!nextChapter} onClick={() => setChapterId(nextChapter!.id)} className="btn btn-primary disabled:opacity-30">
                Next chapter →
              </button>
            </div>
          </div>
        )}

        {!loading && !error && mode !== "vertical" && (
          <div className={`flex h-full w-full items-center justify-center gap-1 p-2 ${direction === "rtl" ? "flex-row-reverse" : ""}`}>
            {visible.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.page}
                src={p.url}
                alt={`Page ${p.page}`}
                className="max-h-full min-h-0 object-contain"
                style={{ maxWidth: mode === "double" ? "49%" : "100%" }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom toolbar */}
      <div
        className={`glass-strong absolute inset-x-0 bottom-0 z-30 flex items-center gap-2 px-3 py-2 transition-transform duration-300 ${
          showUI ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "calc(0.5rem + var(--safe-b))" }}
      >
        <button
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={mode === "vertical"}
          className="btn btn-glass h-9 w-9 !p-0 disabled:opacity-30"
          aria-label="Previous page"
        >
          ‹
        </button>
        <div className="flex-1">
          <div className="h-1 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-crimson-500 transition-[width] duration-200" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-1 text-center text-[10.5px] text-white/40">
            {pages.length ? `${Math.min(index + 1, pages.length)} / ${pages.length}` : "—"} · {Math.round(percent)}%
          </p>
        </div>
        <button
          onClick={() => setIndex((i) => Math.min(pages.length - 1, i + 1))}
          disabled={mode === "vertical"}
          className="btn btn-glass h-9 w-9 !p-0 disabled:opacity-30"
          aria-label="Next page"
        >
          ›
        </button>

        <div className="hidden items-center gap-0.5 rounded-full bg-white/8 p-0.5 sm:flex">
          {(["vertical", "single", "double"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
                mode === m ? "bg-white/20 text-white" : "text-white/45"
              }`}
            >
              {m === "vertical" ? "Webtoon" : m}
            </button>
          ))}
        </div>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as Mode)}
          className="rounded-xl border border-white/15 bg-white/10 px-2 py-1.5 text-[11px] sm:hidden"
        >
          <option value="vertical" className="bg-[#12121a]">Webtoon</option>
          <option value="single" className="bg-[#12121a]">Single</option>
          <option value="double" className="bg-[#12121a]">Double</option>
        </select>
        <button
          onClick={() => setDirection((d) => (d === "rtl" ? "ltr" : "rtl"))}
          className="btn btn-glass !px-2.5 !py-1.5 text-[11px] font-bold"
          title="Reading direction"
        >
          {direction.toUpperCase()}
        </button>
      </div>
    </div>
  );
}
