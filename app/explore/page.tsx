import Link from "next/link";
import { exploreCategory } from "@/lib/catalog";
import { EmptyState, Grid, Cover } from "@/components/media";
import { Reveal } from "@/components/reveal";
import { CATEGORIES } from "@/lib/types";
import type { Category, MediaItem } from "@/lib/types";

export const dynamic = "force-dynamic";

const SORTS = [
  { id: "popularity", label: "Popular" },
  { id: "rating", label: "Top rated" },
  { id: "title", label: "A–Z" },
] as const;

function qs(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: { category?: string; sort?: string; genre?: string; view?: string };
}) {
  const category = (CATEGORIES.find((c) => c.id === searchParams.category)?.id ??
    "manga") as Category;
  const sort = (SORTS.find((s) => s.id === searchParams.sort)?.id ?? "popularity") as
    | "popularity"
    | "rating"
    | "title";
  const view = searchParams.view === "list" ? "list" : "grid";
  const genre = searchParams.genre;

  const all = await exploreCategory(category, sort);
  const genres = [...new Set(all.flatMap((i) => i.genres))].sort().slice(0, 14);
  const items = genre ? all.filter((i) => i.genres.includes(genre)) : all;
  const label = CATEGORIES.find((c) => c.id === category)!.label;

  return (
    <div className="space-y-5 pt-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Explore</h1>
          <p className="mt-1 text-[12.5px] leading-snug text-white/45">
            <span className="whitespace-nowrap">{items.length} live titles</span>
            <span className="hidden sm:inline"> in {label} · every filter is shareable via URL</span>
            <span className="sm:hidden"> · {label}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-full border border-white/12 bg-white/[0.05] p-1">
          {(["grid", "list"] as const).map((v) => (
            <Link
              key={v}
              href={`/explore${qs({ category, sort, genre, view: v })}`}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize transition ${
                view === v ? "bg-white/15 text-white" : "text-white/40"
              }`}
            >
              {v}
            </Link>
          ))}
        </div>
      </div>

      {/* All five categories must be visible at once — a scrolling rail hid
          "Webtoons" and "Light Novels" behind the right edge on phones. */}
      <div className="flex flex-wrap gap-x-1.5 gap-y-1.5">
        {CATEGORIES.map((c) => (
          <Link
            key={c.id}
            href={`/explore${qs({ category: c.id, sort, view })}`}
            className="nav-link"
            data-active={c.id === category}
          >
            {c.label}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {SORTS.map((s) => (
          <Link
            key={s.id}
            href={`/explore${qs({ category, sort: s.id, genre, view })}`}
            className="pill"
            style={
              s.id === sort
                ? {
                    background: "rgba(139,92,246,.28)",
                    borderColor: "rgba(139,92,246,.45)",
                    color: "#e9d5ff",
                  }
                : undefined
            }
          >
            {s.label}
          </Link>
        ))}
        {genre && (
          <Link href={`/explore${qs({ category, sort, view })}`} className="pill pill-accent">
            {genre} ✕
          </Link>
        )}
      </div>

      {genres.length > 0 && (
        <div className="scroll-x -mx-1 px-1">
          {genres.map((g) => (
            <Link
              key={g}
              href={`/explore${qs({ category, sort, genre: g, view })}`}
              className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11.5px] text-white/55 transition hover:border-violet-400/40 hover:text-white"
              style={g === genre ? { borderColor: "rgba(139,92,246,.5)", color: "#e9d5ff" } : undefined}
            >
              {g}
            </Link>
          ))}
        </div>
      )}

      {items.length ? (
        view === "grid" ? (
          <Reveal>
            <Grid items={items} />
          </Reveal>
        ) : (
          <div className="space-y-2">
            {items.map((item, n) => (
              <Reveal key={item.id} delay={Math.min(n * 18, 220)}>
                <ListRow item={item} />
              </Reveal>
            ))}
          </div>
        )
      ) : (
        <EmptyState
          title={`Nothing loaded for ${label}`}
          hint="The providers that serve this category were unavailable, or no title matched that genre. Try another filter."
        />
      )}
    </div>
  );
}

function ListRow({ item }: { item: MediaItem }) {
  return (
    <Link
      href={`/title/${encodeURIComponent(item.id)}`}
      className="glass-panel group flex gap-3 p-2.5 transition hover:border-white/25 hover:bg-white/[0.07]"
    >
      <div className="h-24 w-16 shrink-0 overflow-hidden rounded-lg">
        <Cover item={item} className="h-full w-full" />
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-1 text-[14px] font-semibold">{item.title}</p>
          {item.score ? (
            <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10.5px] font-bold">
              {item.score}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-[11.5px] text-white/35">
          {CATEGORIES.find((c) => c.id === item.category)?.label}
          {item.author ? ` · ${item.author}` : ""}
          {item.releaseYear ? ` · ${item.releaseYear}` : ""}
        </p>
        {item.description && (
          <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-white/45">
            {item.description}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap gap-1">
          {item.genres.slice(0, 4).map((g) => (
            <span key={g} className="rounded bg-white/[0.07] px-1.5 py-0.5 text-[10px] text-white/45">
              {g}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
