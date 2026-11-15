import Link from "next/link";
import { buildHomeRows, getHealth } from "@/lib/catalog";
import { readData } from "@/lib/store";
import { Grid, MediaCard, Row, EmptyState } from "@/components/media";
import { CATEGORIES } from "@/lib/types";
import type { MediaItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [{ rows, degraded }, data] = await Promise.all([buildHomeRows(), readData()]);
  const health = getHealth();

  const allItems: MediaItem[] = rows.flatMap((r) => r.items);
  const featured = rows[0]?.items[0] ?? null;
  const order = data.settings.homepageSections;
  const rowById = new Map(rows.map((r) => [r.id, r]));
  const orderedRows = order.map((id) => rowById.get(id)).filter((r): r is NonNullable<typeof r> => !!r);

  const continueItems = Object.values(data.progress)
    .map((p) => data.library.find((l) => l.media.id === p.mediaId)?.media)
    .filter((m): m is MediaItem => !!m)
    .slice(0, 10);

  const recentItems = data.recent.slice(0, 12).map((r) => r.media);

  return (
    <div className="space-y-9">
      {degraded.length > 0 && (
        <div className="glass-panel flex items-center gap-2 px-4 py-2.5 text-[12.5px] text-amber-200/80">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
          {degraded.join(", ")} {degraded.length === 1 ? "is" : "are"} unreachable right now — showing results from the remaining providers.
        </div>
      )}

      {featured ? (
        <section className="relative overflow-hidden rounded-[26px] border border-white/10">
          <div className="absolute inset-0">
            {featured.banner || featured.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={featured.banner || featured.cover || ""} alt="" className="h-full w-full object-cover opacity-45" />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-[#08080b] via-[#08080b]/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#08080b]/90 via-transparent to-transparent" />
          </div>
          <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:p-8">
            <div className="w-24 shrink-0 overflow-hidden rounded-xl border border-white/15 shadow-2xl sm:w-36">
              <div className="aspect-[2/3]">
                <img src={featured.cover ?? ""} alt="" className="h-full w-full object-cover" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <span className="pill pill-accent">Featured</span>
              <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight sm:text-4xl">{featured.title}</h1>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-white/55">
                <span>{CATEGORIES.find((c) => c.id === featured.category)?.label}</span>
                {featured.releaseYear && <span>· {featured.releaseYear}</span>}
                {featured.score && <span>· ★ {(featured.score / 10).toFixed(1)}</span>}
                {featured.genres.slice(0, 3).map((g) => (
                  <span key={g} className="rounded bg-white/8 px-1.5 py-0.5">
                    {g}
                  </span>
                ))}
              </p>
              {featured.description && (
                <p className="mt-2.5 line-clamp-2 max-w-2xl text-[13.5px] leading-relaxed text-white/65">
                  {featured.description}
                </p>
              )}
              <div className="mt-4 flex gap-2">
                <Link href={`/title/${encodeURIComponent(featured.id)}`} className="btn btn-primary">
                  View details
                </Link>
                <Link href="/explore" className="btn btn-glass">
                  Explore all
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <EmptyState
          title="No data could be loaded"
          hint="Every metadata provider failed. Check your network, or use the Admin panel to add content manually."
        />
      )}

      {continueItems.length > 0 && <Row title="Continue reading" subtitle="Pick up where you left off" items={continueItems} />}
      {recentItems.length > 0 && <Row title="Recently viewed" items={recentItems} />}

      {orderedRows.map((r) => (
        <Row key={r.id} title={r.title} subtitle={r.subtitle} items={r.items} />
      ))}

      <section className="reveal">
        <h2 className="section-title mb-3 px-1">Browse by category</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {CATEGORIES.map((c) => {
            const count = allItems.filter((i) => i.category === c.id).length;
            return (
              <Link
                key={c.id}
                href={`/explore?category=${c.id}`}
                className="glass-panel sheen group flex items-center justify-between px-4 py-3.5 transition hover:border-white/25"
              >
                <span className="text-[13.5px] font-semibold">{c.label}</span>
                <span className="text-[11px] text-white/35">{count ? `${count} live` : "→"}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="glass-panel p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-white/50">Provider health</h2>
          <Link href="/admin" className="text-[12px] text-violet-300/80">
            Details
          </Link>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {health.map((h) => (
            <div key={h.provider} className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2">
              <span className={`h-2 w-2 rounded-full ${h.ok ? "bg-emerald-400" : "bg-rose-500"}`} />
              <span className="text-[12.5px] font-medium capitalize">{h.provider}</span>
              <span className="ml-auto text-[11px] text-white/35">
                {h.lastChecked === "never" ? "idle" : `${h.latencyMs}ms`}
              </span>
            </div>
          ))}
        </div>
      </section>

      <p className="px-1 text-center text-[11px] leading-relaxed text-white/25">
        Animus displays metadata from AniList, MangaDex, VNDB and Open Library with attribution.
        It does not host or distribute copyrighted reading material.
      </p>
    </div>
  );
}
