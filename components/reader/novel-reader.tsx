"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MediaItem } from "@/lib/types";
import { AudioDock, type Track } from "./audio-player";

interface ChapterMeta {
  index: number;
  title: string;
  length: number;
}

const FONTS = [
  { id: "serif", label: "Serif", css: '"New York", "Iowan Old Style", Georgia, serif' },
  { id: "sans", label: "Sans", css: '"SF Pro Display", -apple-system, Inter, system-ui, sans-serif' },
  { id: "mono", label: "Mono", css: 'ui-monospace, "SF Mono", Menlo, monospace' },
];

const THEMES = {
  dark: { bg: "#08080b", fg: "#e9e9ef", dim: "rgba(233,233,239,.45)" },
  sepia: { bg: "#221b12", fg: "#f2e3c8", dim: "rgba(242,227,200,.45)" },
  light: { bg: "#f8f7f4", fg: "#14141a", dim: "rgba(20,20,26,.45)" },
} as const;
type ThemeId = keyof typeof THEMES;

export function NovelReader({
  item,
  startChapter,
  startPercent,
  hasRealText,
}: {
  item: MediaItem;
  startChapter: number;
  startPercent: number;
  hasRealText: boolean;
}) {
  const [index, setIndex] = useState<ChapterMeta[]>([]);
  const [ch, setCh] = useState(startChapter);
  const [body, setBody] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");
  const [loading, setLoading] = useState(hasRealText);
  const [error, setError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(19);
  const [lineHeight, setLineHeight] = useState(1.9);
  const [font, setFont] = useState(FONTS[0].css);
  const [theme, setTheme] = useState<ThemeId>("dark");
  const [settings, setSettings] = useState(false);
  const [toc, setToc] = useState(false);
  const [percent, setPercent] = useState(startPercent);
  const [bookmarked, setBookmarked] = useState(false);
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const articleRef = useRef<HTMLElement>(null);
  const t = THEMES[theme];

  // Persisted reading preferences
  useEffect(() => {
    try {
      const raw = localStorage.getItem("animus:novel-prefs");
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p.fontSize === "number") setFontSize(p.fontSize);
        if (typeof p.lineHeight === "number") setLineHeight(p.lineHeight);
        if (typeof p.font === "string") setFont(font === FONTS[0].css ? p.font : font);
        if (p.theme && THEMES[p.theme as ThemeId]) setTheme(p.theme);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "animus:novel-prefs",
        JSON.stringify({ fontSize, lineHeight, font, theme })
      );
    } catch {}
  }, [fontSize, lineHeight, font, theme]);

  // Chapter index
  useEffect(() => {
    if (!hasRealText) return;
    let alive = true;
    fetch(`/api/text?id=${encodeURIComponent(item.id)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d.error) throw new Error(d.error);
        setIndex(d.chapters ?? []);
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [item.id, hasRealText]);

  // Chapter body
  useEffect(() => {
    if (!hasRealText) return;
    let alive = true;
    setLoading(true);
    setError(null);
    fetch(`/api/text?id=${encodeURIComponent(item.id)}&chapter=${ch}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d.error) throw new Error(d.error);
        setBody(d.chapter.body);
        setTitle(d.chapter.title);
        window.scrollTo({ top: 0 });
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [item.id, ch, hasRealText]);

  const save = useCallback(
    (pct: number) => {
      fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaId: item.id,
          chapter: ch + 1,
          page: Math.round((pct / 100) * 100),
          totalPages: 100,
          percent: pct,
        }),
      }).catch(() => {});
    },
    [item.id, ch]
  );

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setPercent(max > 0 ? Math.min(100, (el.scrollTop / max) * 100) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [ch, body]);

  useEffect(() => {
    const id = setTimeout(() => save(percent), 1200);
    return () => clearTimeout(id);
  }, [percent, save]);

  // Keyboard: arrows change chapters, f fullscreen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.key === "ArrowRight" && ch < index.length - 1) setCh((c) => c + 1);
      if (e.key === "ArrowLeft" && ch > 0) setCh((c) => c - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ch, index.length]);

  const progress = useMemo(() => {
    if (!index.length) return `${Math.round(percent)}%`;
    return `${ch + 1}/${index.length} · ${Math.round(percent)}%`;
  }, [ch, index.length, percent]);

  if (!hasRealText) {
    return <NoTextState item={item} />;
  }

  return (
    <div className="min-h-screen transition-colors duration-500" style={{ background: t.bg, color: t.fg }}>
      {/* progress hairline */}
      <div className="fixed inset-x-0 top-0 z-50 h-[2px]" style={{ background: t.dim, opacity: 0.25 }}>
        <div className="h-full bg-gradient-to-r from-violet-500 to-crimson-500 transition-[width] duration-150" style={{ width: `${percent}%` }} />
      </div>

      <header className="fixed inset-x-0 top-0 z-40">
        <div className="mx-auto flex max-w-3xl items-center gap-1.5 px-3 py-2">
          <Link
            href={`/title/${encodeURIComponent(item.id)}`}
            className="grid h-9 w-9 place-items-center rounded-full border backdrop-blur-xl transition active:scale-95"
            style={{ borderColor: t.dim, background: theme === "light" ? "rgba(0,0,0,.05)" : "rgba(0,0,0,.35)", color: t.fg }}
            aria-label="Back to details"
          >
            ←
          </Link>
          <div className="min-w-0 flex-1 px-1">
            <p className="truncate text-[12.5px] font-semibold" style={{ color: t.fg }}>{item.title}</p>
            <p className="truncate text-[10.5px]" style={{ color: t.dim }}>{title || "Loading…"}</p>
          </div>
          <button
            onClick={() => { setBookmarked((v) => !v); if (!bookmarked) save(percent); }}
            className="grid h-9 w-9 place-items-center rounded-full border backdrop-blur-xl transition active:scale-95"
            style={{ borderColor: t.dim, background: theme === "light" ? "rgba(0,0,0,.05)" : "rgba(0,0,0,.35)", color: t.fg }}
            aria-label="Bookmark"
            title="Bookmark this position"
          >
            {bookmarked ? "★" : "☆"}
          </button>
          <button
            onClick={() => setToc(true)}
            className="rounded-full border px-3 py-1.5 text-[11.5px] font-semibold backdrop-blur-xl"
            style={{ borderColor: t.dim, background: theme === "light" ? "rgba(0,0,0,.05)" : "rgba(0,0,0,.35)", color: t.fg }}
          >
            Contents
          </button>
          <button
            onClick={async () => {
              if (tracks) { setAudioOpen((v) => !v); return; }
              setAudioLoading(true);
              try {
                const r = await fetch(`/api/audio?title=${encodeURIComponent(item.title)}`);
                const d = await r.json();
                if (d.available && d.book?.tracks?.length) {
                  setTracks(d.book.tracks);
                  setAudioOpen(true);
                } else {
                  setTracks([]);
                  setAudioOpen(true);
                }
              } catch {
                setTracks([]);
                setAudioOpen(true);
              } finally {
                setAudioLoading(false);
              }
            }}
            className="rounded-full border px-3 py-1.5 text-[11.5px] font-semibold backdrop-blur-xl"
            style={{ borderColor: t.dim, background: theme === "light" ? "rgba(0,0,0,.05)" : "rgba(0,0,0,.35)", color: t.fg }}
            title="Listen (LibriVox audiobook)"
          >
            {audioLoading ? "…" : "🎧"}
          </button>
          <button
            onClick={() => setSettings((v) => !v)}
            className="rounded-full border px-3 py-1.5 text-[11.5px] font-semibold backdrop-blur-xl"
            style={{ borderColor: t.dim, background: theme === "light" ? "rgba(0,0,0,.05)" : "rgba(0,0,0,.35)", color: t.fg }}
          >
            Aa
          </button>
        </div>
      </header>

      {/* TOC */}
      {toc && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setToc(false)} />
          <div
            className="relative h-full w-[88%] max-w-sm overflow-y-auto p-4 pt-16 shadow-2xl"
            style={{ background: t.bg, color: t.fg }}
          >
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: t.dim }}>
              Contents · {index.length} chapters
            </p>
            <p className="mb-3 text-[12px]" style={{ color: t.dim }}>{item.author}</p>
            <div className="space-y-0.5">
              {index.map((c) => (
                <button
                  key={c.index}
                  onClick={() => { setCh(c.index); setToc(false); }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-[13px] transition"
                  style={{
                    background: c.index === ch ? "rgba(139,92,246,.22)" : "transparent",
                    color: t.fg,
                  }}
                >
                  <span className="line-clamp-1">{c.title}</span>
                  <span className="text-[10px]" style={{ color: t.dim }}>
                    {Math.round(c.length / 1000)}k chars
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Settings */}
      {settings && (
        <div
          className="fixed inset-x-3 top-16 z-50 mx-auto max-w-sm rounded-3xl border p-4 shadow-2xl backdrop-blur-2xl"
          style={{ background: theme === "light" ? "rgba(255,255,255,.92)" : "rgba(18,18,26,.95)", borderColor: t.dim, color: t.fg }}
        >
          <div className="space-y-3">
            <Row label="Size" value={`${fontSize}px`} theme={theme}>
              <input type="range" min={15} max={30} value={fontSize} onChange={(e) => setFontSize(+e.target.value)} className="w-full accent-violet-500" />
            </Row>
            <Row label="Leading" value={lineHeight.toFixed(2)} theme={theme}>
              <input type="range" min={1.4} max={2.5} step={0.05} value={lineHeight} onChange={(e) => setLineHeight(+e.target.value)} className="w-full accent-violet-500" />
            </Row>
            <div>
              <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider" style={{ color: t.dim }}>Typeface</p>
              <div className="flex gap-1.5">
                {FONTS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFont(f.css)}
                    className="flex-1 rounded-xl py-1.5 text-[12px] transition"
                    style={{ background: font === f.css ? "rgba(139,92,246,.35)" : t.dim, fontFamily: f.css, color: t.fg }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider" style={{ color: t.dim }}>Theme</p>
              <div className="flex gap-1.5">
                {(Object.keys(THEMES) as ThemeId[]).map((id) => (
                  <button
                    key={id}
                    onClick={() => setTheme(id)}
                    className="flex-1 rounded-xl border py-1.5 text-[12px] capitalize transition"
                    style={{
                      background: THEMES[id].bg,
                      color: THEMES[id].fg,
                      borderColor: theme === id ? "#8b5cf6" : "transparent",
                    }}
                  >
                    {id}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => setSettings(false)} className="w-full rounded-xl py-2 text-[13px] font-semibold" style={{ background: t.dim, color: t.fg }}>
              Done
            </button>
          </div>
        </div>
      )}

      <article ref={articleRef} className="mx-auto max-w-[38rem] px-5 pb-28 pt-24">
        {loading && (
          <div className="space-y-3">
            <div className="skeleton h-7 w-2/3 rounded-lg" />
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-4/5 rounded" />
          </div>
        )}

        {error && (
          <div className="rounded-2xl border p-4" style={{ borderColor: t.dim }}>
            <p className="text-[14px] font-semibold">Couldn’t load this chapter</p>
            <p className="mt-1 text-[12.5px]" style={{ color: t.dim }}>{error}</p>
            <button onClick={() => setCh((c) => c)} className="mt-3 rounded-full px-4 py-2 text-[12.5px] font-semibold" style={{ background: t.dim, color: t.fg }}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && body && (
          <>
            <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.22em]" style={{ color: t.dim }}>
              {item.author ?? "Public domain"} · Project Gutenberg
            </p>
            <h1 className="mb-7 text-[1.6rem] font-bold leading-tight tracking-tight" style={{ fontFamily: font }}>
              {title}
            </h1>
            <div style={{ fontFamily: font, fontSize, lineHeight }}>
              {body.split(/\n\s*\n/).map((p, i) => (
                <p key={i} style={{ marginBottom: "1.15em", textIndent: p.length > 120 ? "1.4em" : 0 }}>
                  {p.trim()}
                </p>
              ))}
            </div>
          </>
        )}

        <nav className="mt-12 flex items-center justify-between gap-3 border-t pt-6" style={{ borderColor: t.dim }}>
          <button
            disabled={ch === 0}
            onClick={() => setCh((c) => Math.max(0, c - 1))}
            className="rounded-full border px-4 py-2 text-[13px] disabled:opacity-25"
            style={{ borderColor: t.dim, color: t.fg }}
          >
            ← Previous
          </button>
          <span className="text-[11px]" style={{ color: t.dim }}>{progress}</span>
          <button
            disabled={ch >= index.length - 1}
            onClick={() => setCh((c) => Math.min(index.length - 1, c + 1))}
            className="rounded-full border px-4 py-2 text-[13px] disabled:opacity-25"
            style={{ borderColor: t.dim, color: t.fg }}
          >
            Next →
          </button>
        </nav>

        {audioOpen && tracks && tracks.length > 0 && (
          <AudioDock tracks={tracks} bookTitle={item.title} onClose={() => setAudioOpen(false)} />
        )}
        {audioOpen && tracks && tracks.length === 0 && (
          <div className="glass-strong fixed inset-x-3 bottom-4 z-50 mx-auto max-w-sm rounded-2xl p-3 text-center text-[12.5px] text-white/70">
            No LibriVox recording found for this title.
            <button onClick={() => setAudioOpen(false)} className="ml-2 text-violet-300">Dismiss</button>
          </div>
        )}
      </article>
    </div>
  );
}

function Row({ label, value, theme, children }: { label: string; value: string; theme: ThemeId; children: React.ReactNode }) {
  const dim = THEMES[theme].dim;
  const fg = THEMES[theme].fg;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[10.5px] font-bold uppercase tracking-wider" style={{ color: dim }}>{label}</p>
        <p className="text-[10.5px]" style={{ color: fg }}>{value}</p>
      </div>
      {children}
    </div>
  );
}

function NoTextState({ item }: { item: MediaItem }) {
  return (
    <div className="mx-auto grid min-h-[70vh] max-w-xl place-items-center px-5 text-center">
      <div>
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/5 text-2xl">📖</div>
        <h1 className="text-xl font-bold tracking-tight">No readable text for this title</h1>
        <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-white/50">
          <span className="font-semibold text-white/70">{item.title}</span> comes from a metadata-only
          provider ({item.provider}), which supplies covers and details but not text. Animus does not
          bundle copyrighted prose.
        </p>
        <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-white/40">
          Books that actually open and read are in the <span className="text-violet-300">Public Domain</span>{" "}
          collection — real text from Project Gutenberg.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href="/explore?category=web-novel" className="btn btn-primary">Browse readable books</Link>
          <Link href={`/title/${encodeURIComponent(item.id)}`} className="btn btn-glass">Back to details</Link>
        </div>
      </div>
    </div>
  );
}
