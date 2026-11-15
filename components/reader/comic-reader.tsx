"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MediaItem } from "@/lib/types";
import { imgUrl } from "@/lib/types";

interface Chapter {
  id: string;
  chapter: string | null;
  title: string | null;
  pages: number;
}
interface Page {
  url: string;
  page: number;
  fallback?: string;
}
type SourceKind = "mangadex" | "webtoon";
interface Cand {
  provider?: SourceKind;
  mangadexId: string;
  title: string;
  chapters: number;
  score: number;
}
interface Resolution {
  found: boolean;
  best: Cand | null;
  candidates: Cand[];
  reason?: string;
}

type Mode = "vertical" | "single" | "double";
type Phase = "resolving" | "loading" | "ready" | "empty" | "error";

export function ComicReader({
  item,
  initialChapter,
  startPercent,
}: {
  item: MediaItem;
  initialChapter?: string;
  startPercent: number;
}) {
  const [phase, setPhase] = useState<Phase>("resolving");
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const isNative = item.provider === "mangadex" || item.provider === "webtoon";
  // Which reading source the pages will come from. Native titles start on their
  // own provider; metadata-only titles get whatever resolve() finds.
  const [kind, setKind] = useState<SourceKind>(
    item.provider === "webtoon" ? "webtoon" : "mangadex"
  );
  const [sourceId, setSourceId] = useState<string | null>(isNative ? item.providerId : null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chapterId, setChapterId] = useState<string | null>(initialChapter ?? null);
  const [pages, setPages] = useState<Page[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("vertical");
  const [direction, setDirection] = useState<"ltr" | "rtl">("rtl");
  const [index, setIndex] = useState(0);
  const [showUI, setShowUI] = useState(true);
  const [percent, setPercent] = useState(startPercent);
  const [zoom, setZoom] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  // How many pages either side of the current one stay mounted.
  const WINDOW = 7;
  const [baseWidth, setBaseWidth] = useState(0);
  // Most long-strip series use a consistent slice size, so one measurement is a
  // good estimate for the pages that are not mounted yet.
  const [ratio, setRatio] = useState(1.6);

  /* ---------- 1. resolve a reading source when the provider has none ---------- */
  useEffect(() => {
    let alive = true;

    if (isNative) {
      setPhase("loading");
      return;
    }

    fetch(`/api/resolve?id=${encodeURIComponent(item.id)}`)
      .then((r) => r.json())
      .then((d: Resolution) => {
        if (!alive) return;
        setResolution(d);
        if (d.best?.provider) setKind(d.best.provider);
        if (d.found && d.best) {
          setSourceId(d.best.mangadexId);
          setPhase("loading");
        } else {
          setPhase("empty");
        }
      })
      .catch(() => alive && setPhase("empty"));

    return () => {
      alive = false;
    };
  }, [item.id, item.provider, isNative]);

  /* ---------- 2. load chapter list ---------- */
  useEffect(() => {
    if (!sourceId) return;
    let alive = true;
    const listUrl =
      kind === "webtoon"
        ? `/api/chapter?webtoonId=${encodeURIComponent(sourceId)}`
        : `/api/chapter?mangaId=${encodeURIComponent(sourceId)}`;
    fetch(listUrl)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const list: Chapter[] = d.chapters ?? [];
        setChapters(list);
        setChapterId((prev) => (prev && list.some((c) => c.id === prev) ? prev : list[0]?.id ?? null));
        if (!list.length) {
          setPhase("empty");
          setError("This source has no readable English chapters.");
        }
      })
      .catch(() => alive && alive && setPhase("error"))
      .finally(() => alive && undefined);
    return () => {
      alive = false;
    };
  }, [sourceId, kind]);

  /* ---------- 3. load pages ---------- */
  useEffect(() => {
    if (!chapterId) return;
    let alive = true;
    setPhase("loading");
    setError(null);
    const pagesUrl =
      kind === "webtoon"
        ? `/api/chapter?webtoonUrl=${encodeURIComponent(chapterId)}`
        : `/api/chapter?chapterId=${encodeURIComponent(chapterId)}`;
    fetch(pagesUrl)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d.error) throw new Error(d.error);
        setPages(d.pages ?? []);
        setIndex(0);
        setPhase("ready");
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Could not load pages.");
        setPhase("error");
      });
    return () => {
      alive = false;
    };
  }, [chapterId, kind]);

  /*
   * Prefetch: when a chapter is on screen, quietly ask for the next chapter's
   * page list so tapping "Next" does not wait on the source. Best effort — a
   * failure here is invisible and costs nothing.
   */
  useEffect(() => {
    if (phase !== "ready" || !chapters.length || !chapterId) return;
    const i = chapters.findIndex((c) => c.id === chapterId);
    const next = chapters[i + 1];
    if (!next) return;
    const url =
      kind === "webtoon"
        ? `/api/chapter?webtoonUrl=${encodeURIComponent(next.id)}`
        : `/api/chapter?chapterId=${encodeURIComponent(next.id)}`;
    const t = setTimeout(() => {
      fetch(url).catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, [phase, chapters, chapterId, kind]);

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

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    setBaseWidth(el.clientWidth);
  }, [phase]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    setPercent(max > 0 ? Math.min(100, (el.scrollTop / max) * 100) : 0);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (pages.length) save(index + 1, percent);
    }, 900);
    return () => clearTimeout(t);
  }, [percent, index, pages.length, save]);

  // Track the visible page in vertical mode.
  useEffect(() => {
    if (mode !== "vertical" || phase !== "ready") return;
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
    return () => io.disconnect();
  }, [mode, pages, phase]);

  // Preload the next pages so turns feel instant.
  useEffect(() => {
    if (mode === "vertical" || !pages.length) return;
    for (let n = index; n < Math.min(pages.length, index + 4); n++) {
      const img = new Image();
      img.src = pages[n].url;
    }
  }, [index, mode, pages]);

  // Keyboard navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (mode === "vertical") return;
      const step = mode === "double" ? 2 : 1;
      const fwd = direction === "ltr" ? "ArrowRight" : "ArrowLeft";
      const back = direction === "ltr" ? "ArrowLeft" : "ArrowRight";
      if (e.key === fwd) setIndex((i) => Math.min(pages.length - 1, i + step));
      if (e.key === back) setIndex((i) => Math.max(0, i - step));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, direction, pages.length]);

  // Touch swipe.
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
    const forward = direction === "ltr" ? dx < 0 : dx > 0;
    setIndex((i) => (forward ? Math.min(pages.length - 1, i + step) : Math.max(0, i - step)));
  };

  const currentIdx = chapters.findIndex((c) => c.id === chapterId);
  const prevChapter = currentIdx > 0 ? chapters[currentIdx - 1] : null;
  const nextChapter = currentIdx >= 0 && currentIdx < chapters.length - 1 ? chapters[currentIdx + 1] : null;
  const visible = mode === "double" ? pages.slice(index, index + 2) : pages.slice(index, index + 1);

  /* ------------------------------- non-reading phases ------------------------------- */
  if (phase === "resolving") {
    return <ReaderShell item={item}><ResolvingState /></ReaderShell>;
  }

  if (phase === "empty" || (phase === "error" && !pages.length)) {
    return (
      <ReaderShell item={item} subtitle="No reading source available">
        <NoSourceState item={item} resolution={resolution} message={error} />
      </ReaderShell>
    );
  }

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
          <p className="truncate text-[11px] text-white/40">
            {chapterNumber ? `Chapter ${chapterNumber}` : "Oneshot"} · {pages.length} pages
            {resolution?.found && <span className="text-emerald-300/70"> · via MangaDex</span>}
          </p>
        </div>
        <select
          value={chapterId ?? ""}
          onChange={(e) => setChapterId(e.target.value)}
          className="max-w-[120px] rounded-xl border border-white/15 bg-white/10 px-2 py-1.5 text-[12px] text-white outline-none backdrop-blur"
          aria-label="Chapter"
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
        {phase === "loading" && (
          <div className="grid h-full place-items-center">
            <div className="w-[min(92vw,620px)] space-y-2">
              <div className="skeleton h-[62vh] rounded-2xl" />
              <p className="text-center text-[11.5px] text-white/35">Loading pages…</p>
            </div>
          </div>
        )}

        {phase === "ready" && mode === "vertical" && (
          <div className="mx-auto flex max-w-[820px] flex-col gap-1 py-1">
            {pages.map((p) => {
              /*
               * Long-strip chapters can be hundreds of images (a WEBTOON episode
               * is often 600+). Mounting them all at once exhausts memory on a
               * phone and makes scrolling stutter, so only the pages near the
               * viewport keep a real <img>; the rest are sized placeholders.
               */
              const near = Math.abs(p.page - 1 - index) <= WINDOW;
              return (
                <div key={p.page} data-page={p.page} className="relative">
                  {near ? (
                    <PageImage
                      src={imgUrl(p.url) ?? ""}
                      fallback={p.fallback ? imgUrl(p.fallback) ?? undefined : undefined}
                      page={p.page}
                      eager={p.page <= 3}
                      zoom={zoom}
                      onRatio={setRatio}
                    />
                  ) : (
                    <div
                      aria-hidden
                      className="w-full rounded-md bg-white/[0.04]"
                      style={{ height: Math.max(120, Math.round((baseWidth || 720) * ratio * zoom)) }}
                    />
                  )}
                </div>
              );
            })}
            <div className="flex items-center justify-between gap-2 p-5">
              <button
                disabled={!prevChapter}
                onClick={() => setChapterId(prevChapter!.id)}
                className="btn btn-glass disabled:opacity-30"
              >
                ← Previous
              </button>
              <span className="text-[12px] text-white/35">End of chapter</span>
              <button
                disabled={!nextChapter}
                onClick={() => setChapterId(nextChapter!.id)}
                className="btn btn-primary disabled:opacity-30"
              >
                Next chapter →
              </button>
            </div>
          </div>
        )}

        {phase === "ready" && mode !== "vertical" && (
          <div
            className={`flex h-full w-full items-center justify-center gap-1 p-2 ${
              direction === "rtl" ? "flex-row-reverse" : ""
            }`}
          >
            {visible.map((p) => (
              <PageImage
                key={p.page}
                src={imgUrl(p.url) ?? ""}
                fallback={p.fallback ? imgUrl(p.fallback) ?? undefined : undefined}
                page={p.page}
                eager
                contained
                width={mode === "double" ? "49%" : "100%"}
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
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-rose-500 transition-[width] duration-200"
              style={{ width: `${percent}%` }}
            />
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
          className="rounded-xl border border-white/15 bg-white/10 px-2 py-1.5 text-[11px] text-white sm:hidden"
          aria-label="Reading mode"
        >
          <option value="vertical" className="bg-[#12121a]">Webtoon</option>
          <option value="single" className="bg-[#12121a]">Single</option>
          <option value="double" className="bg-[#12121a]">Double</option>
        </select>
        <button
          onClick={() => setZoom((z) => (z >= 1.6 ? 1 : +(z + 0.3).toFixed(1)))}
          className="btn btn-glass !px-2.5 !py-1.5 text-[11px] font-bold"
          title="Zoom"
        >
          {zoom}×
        </button>
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

/* ------------------------------ presentational ------------------------------ */

/** A page image with a real fallback instead of a broken-image glyph. */
function PageImage({
  src,
  fallback,
  page,
  eager,
  zoom = 1,
  contained = false,
  width = "100%",
  onRatio,
}: {
  src: string;
  /** Lower-bandwidth twin of the same page, tried automatically before failing. */
  fallback?: string;
  page: number;
  eager?: boolean;
  zoom?: number;
  contained?: boolean;
  width?: string;
  /** Reports height/width of the real image so offscreen placeholders match. */
  onRatio?: (ratio: number) => void;
}) {
  const [current, setCurrent] = useState(src);
  const [failed, setFailed] = useState(false);
  const [tried, setTried] = useState(false);

  // A new page (or a retry) must reset the fallback state.
  useEffect(() => {
    setCurrent(src);
    setFailed(false);
    setTried(false);
  }, [src]);

  if (failed) {
    return (
      <div
        className="grid min-h-[45vh] w-full place-items-center bg-white/[0.03] px-6 text-center"
        style={{ maxWidth: width }}
      >
        <div>
          <p className="text-[13px] font-semibold text-white/70">Page {page} couldn’t load</p>
          <p className="mt-1 text-[11.5px] text-white/35">
            The source CDN refused this image. Try the next page or reload.
          </p>
          <button
            onClick={() => {
              setCurrent(src);
              setFailed(false);
              setTried(false);
            }}
            className="mt-3 rounded-full border border-white/20 px-3 py-1.5 text-[11.5px] text-white/70"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt=""
      aria-label={`Page ${page}`}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onLoad={(e) => {
        const img = e.currentTarget;
        if (img.naturalWidth > 0 && onRatio) onRatio(img.naturalHeight / img.naturalWidth);
      }}
      onError={() => {
        // First refusal: drop to the compressed twin of the same page. Only if
        // that also fails do we admit the page is unavailable.
        if (!tried && fallback) {
          setTried(true);
          setCurrent(fallback);
          return;
        }
        setFailed(true);
      }}
      className={contained ? "max-h-full min-h-0 object-contain" : "w-full select-none"}
      style={{
        maxWidth: width,
        transform: !contained && zoom !== 1 ? `scale(${zoom})` : undefined,
        transformOrigin: "top center",
      }}
    />
  );
}

function ReaderShell({
  item,
  subtitle = "Locating a reading source…",
  children,
}: {
  item: MediaItem;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#050507]">
      <div
        className="glass-strong absolute inset-x-0 top-0 z-30 flex items-center gap-2 px-3 py-2"
        style={{ paddingTop: "calc(0.5rem + var(--safe-t))" }}
      >
        <Link href={`/title/${encodeURIComponent(item.id)}`} className="btn btn-glass h-9 w-9 !p-0" aria-label="Back">
          ←
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold">{item.title}</p>
          <p className="truncate text-[11px] text-white/40">{subtitle}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

function ResolvingState() {
  return (
    <div className="mx-auto max-w-md px-6 pt-28">
      <div className="flex flex-col items-center text-center">
        <span className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-violet-400" />
        <p className="text-[15px] font-semibold">Finding a reading source</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-white/45">
          This title came from a metadata provider. Checking MangaDex for a matching edition…
        </p>
      </div>
      <div className="mt-8 space-y-2">
        <div className="skeleton h-3 w-2/3 rounded" />
        <div className="skeleton h-3 w-full rounded" />
        <div className="skeleton h-3 w-5/6 rounded" />
      </div>
    </div>
  );
}

function NoSourceState({
  item,
  resolution,
  message,
}: {
  item: MediaItem;
  resolution: Resolution | null;
  message: string | null;
}) {
  const alt = (resolution?.candidates ?? []).filter((c) => c.chapters > 0);
  return (
    <div className="mx-auto max-w-lg px-5 pt-24 pb-16">
      <div className="glass-panel p-5 text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5 text-xl">
          🔍
        </div>
        <h1 className="text-[17px] font-bold tracking-tight">No readable chapters found</h1>
        <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-white/50">
          {message ?? resolution?.reason ?? "No matching reading source was found for this title."}
        </p>
        <p className="mx-auto mt-2 max-w-sm text-[12px] leading-relaxed text-white/35">
          This is a source limitation, not a bug: the series exists, but no lawful source we query
          publishes pages for it. Animus shows metadata for every title and never fabricates pages.
        </p>
        {item.sourceUrl && (
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-3 inline-block rounded-full border border-white/15 px-3.5 py-1.5 text-[11.5px] text-white/60"
          >
            Open source page ↗
          </a>
        )}
      </div>

      {alt.length > 0 && (
        <div className="glass-panel mt-3 p-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-white/40">
            Other editions with chapters
          </p>
          <div className="space-y-1.5">
            {alt.map((c) => (
              <div key={c.mangadexId} className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.05] px-3 py-2">
                <span className="truncate text-[12.5px]">{c.title}</span>
                <span className="shrink-0 text-[11px] text-white/35">{c.chapters} ch</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link href="/explore?category=light-novel" className="btn btn-primary">
          Readable books
        </Link>
        <Link href={`/title/${encodeURIComponent(item.id)}`} className="btn btn-glass">
          Back to details
        </Link>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Link href="/explore?category=manga" className="btn btn-glass">
          Browse manga
        </Link>
        <Link
          href={`/search?q=${encodeURIComponent(item.title)}`}
          className="btn btn-glass"
        >
          Search this title
        </Link>
      </div>
    </div>
  );
}
