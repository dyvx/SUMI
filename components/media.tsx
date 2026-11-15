import Link from "next/link";
import type { MediaItem } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";

const FALLBACK_GRADIENT = "linear-gradient(160deg,#2a1b4d,#4c1030 60%,#150a1e)";

export function Cover({ item, className = "", priority = false }: { item: MediaItem; className?: string; priority?: boolean }) {
  return (
    <div className={`relative overflow-hidden bg-white/5 ${className}`} style={{ background: item.cover ? undefined : FALLBACK_GRADIENT }}>
      {item.cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.cover}
          alt={item.title}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="grid h-full w-full place-items-center px-2 text-center text-[11px] font-semibold uppercase tracking-wider text-white/40">
          {item.title.slice(0, 40)}
        </div>
      )}
    </div>
  );
}

export function MediaCard({ item, width = 148 }: { item: MediaItem; width?: number }) {
  const alt = (item as MediaItem & { meta?: { altProviders?: string[] } }).meta?.altProviders ?? [];
  return (
    <Link href={`/title/${encodeURIComponent(item.id)}`} className="card group block" style={{ width }}>
      <div className="relative aspect-[2/3]">
        <Cover item={item} className="h-full w-full" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
        {item.score ? (
          <span className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold backdrop-blur">
            {item.score}
          </span>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 p-2.5">
          <p className="card-title text-white">{item.title}</p>
          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-white/55">
            <span className="truncate">{CATEGORIES.find((c) => c.id === item.category)?.label}</span>
            {alt.length > 0 && <span className="shrink-0 rounded bg-white/10 px-1 text-[9px] uppercase">+{alt.length}</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function Row({ title, subtitle, items }: { title: string; subtitle?: string; items: MediaItem[] }) {
  if (!items.length) return null;
  return (
    <section className="reveal">
      <div className="mb-3 flex items-end justify-between px-1">
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[12.5px] text-white/45">{subtitle}</p>}
        </div>
        <Link href="/explore" className="shrink-0 text-[12px] font-semibold text-violet-300/80 hover:text-violet-200">
          See all
        </Link>
      </div>
      <div className="scroll-x -mx-1 px-1">
        {items.map((i) => (
          <MediaCard key={i.id + title} item={i} />
        ))}
      </div>
    </section>
  );
}

export function Grid({ items }: { items: MediaItem[] }) {
  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {items.map((i) => (
        <div key={i.id} className="w-full">
          <Link href={`/title/${encodeURIComponent(i.id)}`} className="card group block">
            <div className="relative aspect-[2/3]">
              <Cover item={i} className="h-full w-full" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-2">
                <p className="card-title text-white">{i.title}</p>
              </div>
            </div>
          </Link>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="glass-panel grid place-items-center px-6 py-16 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-white/5 text-xl">✦</div>
      <p className="text-[15px] font-semibold">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-[13px] text-white/45">{hint}</p>}
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex gap-3">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="skeleton h-[222px] w-[148px] shrink-0 rounded-[18px]" />
      ))}
    </div>
  );
}
