"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/types";
import type { MediaItem } from "@/lib/types";

export function HeroCarousel({ items }: { items: MediaItem[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [offset, setOffset] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const slides = items.slice(0, 5);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const id = setInterval(() => setI((v) => (v + 1) % slides.length), 7000);
    return () => clearInterval(id);
  }, [paused, slides.length]);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setOffset(Math.min(y * 0.18, 60));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!slides.length) return null;
  const cur = slides[i];

  return (
    <div
      ref={wrap}
      className="relative overflow-hidden rounded-[28px] border border-white/10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Stacked artwork with crossfade + parallax */}
      <div className="absolute inset-0">
        {slides.map((s, n) => (
          <div
            key={s.id}
            className="absolute inset-0 transition-opacity duration-[900ms] ease-out"
            style={{ opacity: n === i ? 1 : 0 }}
          >
            {(s.banner || s.cover) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s.banner || s.cover || ""}
                alt=""
                className="h-full w-full scale-110 object-cover"
                style={{ transform: `translateY(${offset}px) scale(1.12)` }}
              />
            )}
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-[#08080b] via-[#08080b]/72 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#08080b]/95 via-[#08080b]/40 to-transparent" />
      </div>

      <div className="relative flex flex-col gap-5 p-5 pt-24 sm:flex-row sm:items-end sm:p-8 sm:pt-32">
        <Link
          href={`/title/${encodeURIComponent(cur.id)}`}
          className="w-24 shrink-0 overflow-hidden rounded-xl border border-white/15 shadow-2xl transition hover:scale-[1.03] sm:w-36"
        >
          <div className="aspect-[2/3]">
            {cur.cover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cur.cover} alt={cur.title} className="h-full w-full object-cover" />
            )}
          </div>
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="pill pill-accent">Featured</span>
            {cur.score ? <span className="pill">★ {(cur.score / 10).toFixed(1)}</span> : null}
          </div>
          <h1 className="mt-2 line-clamp-2 text-2xl font-bold leading-[1.1] tracking-tight sm:text-4xl">
            {cur.title}
          </h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-white/55">
            <span>{CATEGORIES.find((c) => c.id === cur.category)?.label}</span>
            {cur.releaseYear && <span>· {cur.releaseYear}</span>}
            {cur.author && <span className="truncate">· {cur.author}</span>}
          </p>
          {cur.description && (
            <p className="mt-2.5 line-clamp-2 max-w-2xl text-[13.5px] leading-relaxed text-white/60">
              {cur.description}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link href={`/title/${encodeURIComponent(cur.id)}`} className="btn btn-primary">
              View details
            </Link>
            <Link href="/explore" className="btn btn-glass">
              Explore all
            </Link>
          </div>
        </div>
      </div>

      {/* Slide dots */}
      <div className="absolute bottom-4 right-5 flex items-center gap-1.5">
        {slides.map((_, n) => (
          <button
            key={n}
            onClick={() => setI(n)}
            aria-label={`Slide ${n + 1}`}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: n === i ? 22 : 6,
              background: n === i ? "linear-gradient(90deg,#8b5cf6,#e11d48)" : "rgba(255,255,255,.28)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
