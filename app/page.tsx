import Link from "next/link";
import { buildHomeRows, getHealth } from "@/lib/catalog";
import { readData } from "@/lib/store";
import { Row, EmptyState } from "@/components/media";
import { HeroCarousel } from "@/components/hero-carousel";
import { Reveal } from "@/components/reveal";
import { CATEGORIES } from "@/lib/types";
import type { MediaItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [{ rows, degraded }, data] = await Promise.all([buildHomeRows(), readData()]);
  const health = getHealth();

  const allItems: MediaItem[] = rows.flatMap((r) => r.items);
  const heroItems = (rows.find((r) => r.id === "trending") ?? rows[0])?.items ?? [];
  const order = data.settings.homepageSections;
  const rowById = new Map(rows.map((r) => [r.id, r]));
  const orderedRows = order
    .map((id) => rowById.get(id))
    .filter((r): r is NonNullable<typeof r> => !!r);

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
          {degraded.join(", ")} {degraded.length === 1 ? "is" : "are"} unreachable right now — showing
          results from the remaining providers.
        </div>
      )}

      {heroItems.length ? (
        <HeroCarousel items={heroItems} />
      ) : (
        <EmptyState
          title="No data could be loaded"
          hint="Every metadata provider failed. Check your network, or add content manually in Admin."
        />
      )}

      {continueItems.length > 0 && (
        <Reveal>
          <Row title="Continue reading" subtitle="Pick up where you left off" items={continueItems} />
        </Reveal>
      )}
      {recentItems.length > 0 && (
        <Reveal>
          <Row title="Recently viewed" items={recentItems} />
        </Reveal>
      )}

      {orderedRows.map((r, n) => (
        <Reveal key={r.id} delay={Math.min(n * 40, 160)}>
          <Row title={r.title} subtitle={r.subtitle} items={r.items} />
        </Reveal>
      ))}

      <Reveal>
        <section>
          <h2 className="section-title mb-3 px-1">Browse by category</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {CATEGORIES.map((c) => {
              const count = allItems.filter((i) => i.category === c.id).length;
              return (
                <Link
                  key={c.id}
                  href={`/explore?category=${c.id}`}
                  className="glass-panel sheen group flex items-center justify-between px-4 py-3.5 transition hover:border-white/25 hover:bg-white/[0.08]"
                >
                  <span className="text-[13.5px] font-semibold">{c.label}</span>
                  <span className="text-[11px] text-white/35">
                    {count ? `${count} live` : "→"}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="glass-panel p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-white/50">
              Provider health
            </h2>
            <Link href="/admin" className="text-[12px] text-violet-300/80">
              Details
            </Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
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
      </Reveal>

      <p className="px-1 text-center text-[11px] leading-relaxed text-white/25">
        Metadata from AniList, MangaDex, VNDB and Open Library. Public-domain texts from Project
        Gutenberg. Animus does not host or distribute copyrighted reading material.
      </p>
    </div>
  );
}
