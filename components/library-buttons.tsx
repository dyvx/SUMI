"use client";

import { useState, useTransition } from "react";
import type { LibraryEntry, MediaItem } from "@/lib/types";

const STATUSES: { id: LibraryEntry["status"]; label: string }[] = [
  { id: "reading", label: "Reading" },
  { id: "plan", label: "Plan to read" },
  { id: "completed", label: "Completed" },
  { id: "on-hold", label: "On hold" },
  { id: "dropped", label: "Dropped" },
  { id: "favorite", label: "Favourite" },
];

export function LibraryButtons({ item, initial }: { item: MediaItem; initial: LibraryEntry["status"] | null }) {
  const [status, setStatus] = useState<LibraryEntry["status"] | null>(initial);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  async function set(next: LibraryEntry["status"] | null) {
    setStatus(next);
    setOpen(false);
    await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ media: item, status: next }),
    });
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="btn btn-glass" disabled={pending}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill={status ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z" />
        </svg>
        {status ? STATUSES.find((s) => s.id === status)?.label : "Add to library"}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="glass-strong absolute left-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl p-1.5">
            {STATUSES.map((s) => (
              <button
                key={s.id}
                onClick={() => set(s.id)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13px] transition hover:bg-white/10"
              >
                {s.label}
                {status === s.id && <span className="text-violet-300">✓</span>}
              </button>
            ))}
            {status && (
              <button
                onClick={() => set(null)}
                className="mt-1 w-full rounded-xl px-3 py-2 text-left text-[13px] text-rose-300/90 transition hover:bg-rose-500/10"
              >
                Remove
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
