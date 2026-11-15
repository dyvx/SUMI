import Link from "next/link";
import { searchAll } from "@/lib/catalog";
import { EmptyState, Grid } from "@/components/media";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const { results, failedProviders } = q ? await searchAll(q, undefined, 36) : { results: [], failedProviders: [] };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Search</h1>
        <p className="mt-1 text-[13px] text-white/45">
          Exact, partial, alternative-title and author matching across all providers.
        </p>
      </div>

      <form action="/search" className="search-shell">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="shrink-0 opacity-60">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input name="q" defaultValue={q} placeholder="Try “berserk”, “dune”, “steins gate”…" autoFocus />
        <button className="btn btn-primary !px-4 !py-1.5 text-[13px]">Go</button>
      </form>

      {failedProviders.length > 0 && (
        <p className="text-[12.5px] text-amber-200/70">
          {failedProviders.join(", ")} unavailable — results merged from the rest.
        </p>
      )}

      {!q ? (
        <div className="glass-panel px-5 py-10 text-center">
          <p className="text-[14px] font-semibold">Search everything at once</p>
          <p className="mx-auto mt-1 max-w-md text-[13px] text-white/45">
            One query hits AniList (manga, manhwa, manhua, one-shots, novels), MangaDex (comics),
            VNDB (visual novels) and Open Library (books), then merges duplicates.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {["berserk", "solo leveling", "dune", "steins gate", "one piece"].map((s) => (
              <Link key={s} href={`/search?q=${encodeURIComponent(s)}`} className="pill">
                {s}
              </Link>
            ))}
          </div>
        </div>
      ) : results.length ? (
        <>
          <p className="text-[12.5px] text-white/40">
            {results.length} result{results.length === 1 ? "" : "s"} for “{q}”
          </p>
          <Grid items={results} />
        </>
      ) : (
        <EmptyState title={`No results for “${q}”`} hint="Try a shorter query or an alternative title." />
      )}
    </div>
  );
}
