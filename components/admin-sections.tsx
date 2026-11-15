"use client";

import { useState } from "react";

export function AdminSections({
  sections,
  active,
}: {
  sections: string[][];
  active: string[];
}) {
  const [order, setOrder] = useState(active);
  const [saved, setSaved] = useState(false);

  const toggle = (id: string) => {
    setOrder((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));
    setSaved(false);
  };
  const move = (id: string, dir: -1 | 1) => {
    setOrder((o) => {
      const i = o.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= o.length) return o;
      const next = [...o];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setSaved(false);
  };

  const save = async () => {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ homepageSections: order }),
    });
    setSaved(true);
  };

  const label = (id: string) => sections.find((s) => s[0] === id)?.[1] ?? id;

  return (
    <section className="glass-panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-white/45">Homepage sections</h2>
        <button onClick={save} className="btn btn-primary !px-3.5 !py-1.5 text-[12.5px]">
          {saved ? "Saved ✓" : "Save"}
        </button>
      </div>

      <div className="space-y-1.5">
        {order.map((id, i) => (
          <div key={id} className="flex items-center gap-2 rounded-xl bg-white/[0.05] px-3 py-2">
            <span className="w-4 text-[11px] text-white/25">{i + 1}</span>
            <span className="flex-1 text-[13px]">{label(id)}</span>
            <button onClick={() => move(id, -1)} disabled={i === 0} className="px-1.5 text-white/40 disabled:opacity-20">
              ↑
            </button>
            <button onClick={() => move(id, 1)} disabled={i === order.length - 1} className="px-1.5 text-white/40 disabled:opacity-20">
              ↓
            </button>
            <button onClick={() => toggle(id)} className="px-1.5 text-[12px] text-rose-300/70">
              hide
            </button>
          </div>
        ))}
      </div>

      <p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wider text-white/40">Hidden</p>
      <div className="flex flex-wrap gap-1.5">
        {sections
          .filter((s) => !order.includes(s[0]))
          .map(([id, name]) => (
            <button key={id} onClick={() => toggle(id)} className="pill hover:border-violet-400/50">
              + {name}
            </button>
          ))}
        {sections.every((s) => order.includes(s[0])) && (
          <span className="text-[12px] text-white/30">All sections are visible.</span>
        )}
      </div>
    </section>
  );
}
