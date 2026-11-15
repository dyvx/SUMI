"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface Track {
  index: number;
  title: string;
  url: string;
  duration: string | null;
}

/**
 * Long-form audio player for LibriVox recordings. Streams MP3s directly from
 * archive.org; nothing is stored locally.
 */
export function AudioDock({
  tracks,
  bookTitle,
  onClose,
}: {
  tracks: Track[];
  bookTitle: string;
  onClose?: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);
  const [rate, setRate] = useState(1);
  const [open, setOpen] = useState(false);
  const track = tracks[i];

  useEffect(() => {
    const a = new Audio();
    audioRef.current = a;
    a.preload = "metadata";
    return () => {
      a.pause();
      a.src = "";
    };
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !track) return;
    a.src = track.url;
    a.playbackRate = rate;
    setPos(0);
    setDur(0);
    if (playing) a.play().catch(() => setPlaying(false));
  }, [track, rate, playing]);

  const fmt = (s: number) => {
    if (!Number.isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      a.pause();
      setPlaying(false);
    }
  }, []);

  const seek = (v: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = v;
    setPos(v);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50">
      {open && (
        <div className="glass-strong mx-auto mb-2 max-h-[46vh] w-[min(94vw,520px)] overflow-y-auto rounded-3xl p-3">
          <p className="mb-2 px-1 text-[10.5px] font-bold uppercase tracking-wider text-white/40">
            {tracks.length} tracks · LibriVox
          </p>
          {tracks.map((t) => (
            <button
              key={t.index}
              onClick={() => {
                setI(t.index);
                setPlaying(true);
              }}
              className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[12.5px] transition ${
                t.index === i ? "bg-violet-500/25 text-white" : "text-white/65 hover:bg-white/10"
              }`}
            >
              <span className="w-6 shrink-0 text-[10px] text-white/35">{t.index + 1}</span>
              <span className="line-clamp-1 flex-1">{t.title}</span>
              <span className="shrink-0 text-[10px] text-white/30">{t.duration}</span>
            </button>
          ))}
        </div>
      )}

      <div className="glass-strong mx-auto mb-2 w-[min(94vw,520px)] rounded-3xl p-3" style={{ marginBottom: "calc(.5rem + var(--safe-b))" }}>
        <div className="flex items-center gap-2.5">
          <button
            onClick={toggle}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-rose-600 text-white shadow-lg transition active:scale-95"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4l13 8-13 8z" /></svg>
            )}
          </button>

          <div className="min-w-0 flex-1">
            <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-1.5">
              <span className="truncate text-[12px] font-semibold text-white/90">{track?.title ?? "—"}</span>
              <span className="shrink-0 text-[9px] text-white/35">{open ? "▾" : "▸"}</span>
            </button>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-[9.5px] tabular-nums text-white/35">{fmt(pos)}</span>
              <input
                type="range"
                min={0}
                max={dur || 1}
                value={pos}
                onChange={(e) => seek(Number(e.target.value))}
                className="h-1 w-full accent-violet-500"
                aria-label="Seek"
              />
              <span className="text-[9.5px] tabular-nums text-white/35">{fmt(dur)}</span>
            </div>
          </div>

          <button
            onClick={() => setRate((r) => (r === 1 ? 1.5 : r === 1.5 ? 2 : r === 2 ? 0.75 : 1))}
            className="shrink-0 rounded-full border border-white/15 px-2 py-1 text-[10.5px] font-bold text-white/70"
          >
            {rate}×
          </button>
          <button
            onClick={() => { setI((v) => Math.min(tracks.length - 1, v + 1)); setPlaying(true); }}
            disabled={i >= tracks.length - 1}
            className="shrink-0 rounded-full border border-white/15 px-2 py-1 text-[11px] text-white/70 disabled:opacity-25"
            aria-label="Next track"
          >
            ⏭
          </button>
          {onClose && (
            <button onClick={onClose} className="shrink-0 text-white/35" aria-label="Close player">
              ✕
            </button>
          )}
        </div>

        <p className="mt-1.5 truncate px-1 text-[9.5px] text-white/25">
          {bookTitle} · public domain, read by LibriVox volunteers
        </p>

        {audioRef.current && (
          <AudioEvents
            audio={audioRef.current}
            onTime={setPos}
            onDur={setDur}
            onEnd={() => {
              if (i < tracks.length - 1) setI((v) => v + 1);
              else setPlaying(false);
            }}
            onPlayState={setPlaying}
          />
        )}
      </div>
    </div>
  );
}

function AudioEvents({
  audio,
  onTime,
  onDur,
  onEnd,
  onPlayState,
}: {
  audio: HTMLAudioElement;
  onTime: (n: number) => void;
  onDur: (n: number) => void;
  onEnd: () => void;
  onPlayState: (b: boolean) => void;
}) {
  useEffect(() => {
    const t = () => onTime(audio.currentTime);
    const d = () => onDur(audio.duration);
    const e = () => onEnd();
    const p = () => onPlayState(true);
    const s = () => onPlayState(false);
    audio.addEventListener("timeupdate", t);
    audio.addEventListener("loadedmetadata", d);
    audio.addEventListener("ended", e);
    audio.addEventListener("play", p);
    audio.addEventListener("pause", s);
    return () => {
      audio.removeEventListener("timeupdate", t);
      audio.removeEventListener("loadedmetadata", d);
      audio.removeEventListener("ended", e);
      audio.removeEventListener("play", p);
      audio.removeEventListener("pause", s);
    };
  }, [audio, onTime, onDur, onEnd, onPlayState]);
  return null;
}
