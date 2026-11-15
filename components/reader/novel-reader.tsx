"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MediaItem } from "@/lib/types";

export interface NovelChapter {
  index: number;
  title: string;
  body: string;
}

const FONTS = [
  { id: "serif", label: "Serif", css: '"New York", "Iowan Old Style", Georgia, serif' },
  { id: "sans", label: "Sans", css: '"SF Pro Display", -apple-system, Inter, system-ui, sans-serif' },
  { id: "mono", label: "Mono", css: 'ui-monospace, "SF Mono", Menlo, monospace' },
];

const THEMES = [
  { id: "dark", label: "Dark", bg: "#08080b", fg: "#e8e8ee" },
  { id: "sepia", label: "Sepia", bg: "#241d14", fg: "#f0e0c4" },
  { id: "light", label: "Light", bg: "#f7f6f3", fg: "#1a1a1f" },
] as const;

export function NovelReader({
  item,
  chapters,
  startChapter,
}: {
  item: MediaItem;
  chapters: NovelChapter[];
  startChapter: number;
}) {
  const [ch, setCh] = useState(Math.min(Math.max(startChapter, 0), Math.max(chapters.length - 1, 0)));
  const [fontSize, setFontSize] = useState(19);
  const [lineHeight, setLineHeight] = useState(1.85);
  const [font, setFont] = useState(FONTS[0].css);
  const [theme, setTheme] = useState<(typeof THEMES)[number]["id"]>("dark");
  const [showSettings, setShowSettings] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [percent, setPercent] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const t = THEMES.find((x) => x.id === theme)!;
  const chapter = chapters[ch];

  const save = useCallback(
    (pct: number) => {
      fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaId: item.id,
          chapter: ch + 1,
          page: Math.round((pct / 100) * 10),
          totalPages: 10,
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
      const pct = max > 0 ? Math.min(100, (el.scrollTop / max) * 100) : 0;
      setPercent(pct);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [ch]);

  useEffect(() => {
    const id = setTimeout(() => save(percent), 1000);
    return () => clearTimeout(id);
  }, [percent, save]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [ch]);

  const progressText = useMemo(
    () => `${ch + 1} / ${chapters.length} · ${Math.round(percent)}%`,
    [ch, chapters.length, percent]
  );

  return (
    <div className="min-h-screen" style={{ background: t.bg, color: t.fg }}>
      <div className="fixed inset-x-0 top-0 z-40">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2">
          <Link
            href={`/title/${encodeURIComponent(item.id)}`}
            className="rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-[12px] backdrop-blur"
            style={{ color: "inherit" }}
          >
            ←
          </Link>
          <p className="min-w-0 flex-1 truncate text-[12.5px] opacity-70" style={{ color: "inherit" }}>
            {item.title}
          </p>
          <button onClick={() => setShowToc((v) => !v)} className="rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-[12px] backdrop-blur" style={{ color: "inherit" }}>
            Contents
          </button>
          <button onClick={() => setShowSettings((v) => !v)} className="rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-[12px] backdrop-blur" style={{ color: "inherit" }}>
            Aa
          </button>
        </div>
        <div className="h-0.5 w-full bg-black/10">
          <div className="h-full bg-gradient-to-r from-violet-500 to-crimson-500" style={{ width: `${percent}%` }} />
        </div>
      </div>

      {showToc && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setShowToc(false)}>
          <div className="h-full w-[86%] max-w-sm overflow-y-auto bg-black/80 p-4 pt-16 backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
            <p className="mb-3 text-[13px] font-bold uppercase tracking-wider opacity-60">Table of contents</p>
            {chapters.map((c, i) => (
              <button
                key={c.index}
                onClick={() => {
                  setCh(i);
                  setShowToc(false);
                }}
                className={`block w-full rounded-xl px-3 py-2.5 text-left text-[13.5px] ${i === ch ? "bg-violet-500/25" : "hover:bg-white/10"}`}
                style={{ color: "#f2f2f7" }}
              >
                {c.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-x-3 top-16 z-50 mx-auto max-w-sm rounded-3xl border border-white/15 bg-[#12121a]/95 p-4 text-white shadow-2xl backdrop-blur-xl">
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-white/40">Size</p>
              <input type="range" min={15} max={28} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-full accent-violet-500" />
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-white/40">Line spacing</p>
              <input type="range" min={1.4} max={2.4} step={0.05} value={lineHeight} onChange={(e) => setLineHeight(Number(e.target.value))} className="w-full accent-violet-500" />
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-white/40">Typeface</p>
              <div className="flex gap-1.5">
                {FONTS.map((f) => (
                  <button key={f.id} onClick={() => setFont(f.css)} className={`flex-1 rounded-xl py-1.5 text-[12px] ${font === f.css ? "bg-violet-500/40" : "bg-white/10"}`} style={{ fontFamily: f.css }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-white/40">Theme</p>
              <div className="flex gap-1.5">
                {THEMES.map((th) => (
                  <button key={th.id} onClick={() => setTheme(th.id)} className={`flex-1 rounded-xl border py-1.5 text-[12px] ${theme === th.id ? "border-violet-400" : "border-white/10"}`} style={{ background: th.bg, color: th.fg }}>
                    {th.label}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => setShowSettings(false)} className="w-full rounded-xl bg-white/12 py-2 text-[13px] font-semibold">
              Done
            </button>
          </div>
        </div>
      )}

      <article ref={ref} className="mx-auto max-w-2xl px-5 pb-24 pt-24">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] opacity-40">Chapter {ch + 1}</p>
        <h1 className="mb-6 text-2xl font-bold tracking-tight" style={{ fontFamily: font }}>{chapter?.title}</h1>

        <div style={{ fontFamily: font, fontSize, lineHeight }}>
          {chapter?.body.split("\n\n").map((p, i) => (
            <p key={i} style={{ marginBottom: "1.3em" }}>{p}</p>
          ))}
        </div>

        <div className="mt-10 flex items-center justify-between gap-3 border-t border-current/10 pt-5">
          <button
            disabled={ch === 0}
            onClick={() => setCh((c) => Math.max(0, c - 1))}
            className="rounded-full border border-current/20 px-4 py-2 text-[13px] disabled:opacity-30"
            style={{ color: "inherit" }}
          >
            ← Previous
          </button>
          <span className="text-[11px] opacity-40">{progressText}</span>
          <button
            disabled={ch >= chapters.length - 1}
            onClick={() => setCh((c) => Math.min(chapters.length - 1, c + 1))}
            className="rounded-full border border-current/20 px-4 py-2 text-[13px] disabled:opacity-30"
            style={{ color: "inherit" }}
          >
            Next →
          </button>
        </div>
      </article>
    </div>
  );
}
