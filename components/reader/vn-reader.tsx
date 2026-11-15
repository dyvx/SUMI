"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { MediaItem } from "@/lib/types";
import { imgUrl } from "@/lib/types";

/**
 * Visual-novel presentation layer.
 *
 * Honest scope: this is a VN-*styled* scene player for a title's real synopsis
 * and metadata — it does not execute proprietary game engines (Ren'Py, KiriKiri,
 * etc.) and does not claim to. Every line here is text VNDB actually publishes.
 */
export function VnReader({ item }: { item: MediaItem }) {
  const lines = useMemo(() => {
    const raw = (item.description ?? "")
      .split(/\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (!raw.length) return ["No synopsis is published for this title."];
    // split long paragraphs into readable beats
    const beats: string[] = [];
    for (const p of raw) {
      if (p.length <= 260) {
        beats.push(p);
      } else {
        const sentences = p.match(/[^.!?]+[.!?]+/g) ?? [p];
        let buf = "";
        for (const s of sentences) {
          if ((buf + s).length > 240 && buf) {
            beats.push(buf.trim());
            buf = "";
          }
          buf += s;
        }
        if (buf.trim()) beats.push(buf.trim());
      }
    }
    return beats;
  }, [item.description]);

  const [i, setI] = useState(0);
  const [typed, setTyped] = useState("");
  const [done, setDone] = useState(false);
  const [auto, setAuto] = useState(false);
  const [textSize, setTextSize] = useState(19);

  const current = lines[Math.min(i, lines.length - 1)] ?? "";

  // Typewriter effect
  useEffect(() => {
    setTyped("");
    setDone(false);
    let idx = 0;
    const speed = 14;
    const id = setInterval(() => {
      idx += 2;
      if (idx >= current.length) {
        setTyped(current);
        setDone(true);
        clearInterval(id);
      } else {
        setTyped(current.slice(0, idx));
      }
    }, speed);
    return () => clearInterval(id);
  }, [current]);

  const advance = useCallback(() => {
    if (!done) {
      setTyped(current);
      setDone(true);
      return;
    }
    if (i < lines.length - 1) setI((v) => v + 1);
  }, [done, current, i, lines.length]);

  useEffect(() => {
    if (!auto || !done) return;
    const id = setTimeout(() => {
      if (i < lines.length - 1) setI((v) => v + 1);
      else setAuto(false);
    }, 2400);
    return () => clearTimeout(id);
  }, [auto, done, i, lines.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ([" ", "Enter", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        advance();
      }
      if (e.key === "ArrowLeft") setI((v) => Math.max(0, v - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance]);

  const bg = item.banner || item.cover;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" style={{ background: "#05050a" }}>
      {/* Scene background */}
      {bg && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgUrl(bg) || ""} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45 blur-[2px] scale-105" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/85" />
          <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_40%,transparent,rgba(0,0,0,.85))]" />
        </>
      )}

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 px-3 py-2" style={{ paddingTop: "calc(.5rem + var(--safe-t))" }}>
        <Link href={`/title/${encodeURIComponent(item.id)}`} className="grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-xl">
          ←
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-semibold text-white/90">{item.title}</p>
          <p className="text-[10px] uppercase tracking-wider text-white/40">Visual novel · synopsis scene</p>
        </div>
        <button
          onClick={() => setAuto((v) => !v)}
          className={`rounded-full border px-3 py-1.5 text-[11px] font-bold backdrop-blur-xl ${auto ? "border-violet-400/60 bg-violet-500/30 text-white" : "border-white/20 bg-black/40 text-white/70"}`}
        >
          AUTO
        </button>
      </div>

      {/* Scene */}
      <div className="absolute inset-0 cursor-pointer" onClick={advance}>
        <div className="absolute inset-x-0 bottom-0 px-3 pb-4" style={{ paddingBottom: "calc(1rem + var(--safe-b))" }}>
          <div className="glass-strong mx-auto max-w-2xl rounded-3xl p-5 sm:p-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="pill pill-accent">Scene {i + 1} of {lines.length}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); setTextSize((s) => Math.max(15, s - 2)); }}
                  className="h-7 w-7 rounded-full bg-white/10 text-[13px] text-white"
                >
                  −
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setTextSize((s) => Math.min(28, s + 2)); }}
                  className="h-7 w-7 rounded-full bg-white/10 text-[13px] text-white"
                >
                  +
                </button>
              </div>
            </div>

            <p
              className="min-h-[5.5rem] font-serif leading-relaxed text-white/90"
              style={{ fontSize: textSize, lineHeight: 1.7 }}
            >
              {typed}
              {!done && <span className="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-violet-300 align-middle" />}
            </p>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex gap-1">
                {lines.map((_, n) => (
                  <span
                    key={n}
                    className={`h-1 rounded-full transition-all ${n === i ? "w-5 bg-violet-400" : "w-1.5 bg-white/20"}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setI((v) => Math.max(0, v - 1)); }}
                  disabled={i === 0}
                  className="rounded-full border border-white/20 px-3 py-1.5 text-[12px] text-white/80 disabled:opacity-25"
                >
                  ←
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); advance(); }}
                  className="btn btn-primary !px-4 !py-1.5 text-[12.5px]"
                >
                  {done ? (i < lines.length - 1 ? "Next →" : "Finish") : "Skip typing"}
                </button>
              </div>
            </div>
          </div>

          <p className="mx-auto mt-2 max-w-2xl text-center text-[10px] text-white/25">
            Synopsis text from VNDB. This is a reading presentation, not a game-engine runtime.
          </p>
        </div>
      </div>
    </div>
  );
}
