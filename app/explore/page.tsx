import Link from "next/link";
import { exploreCategory } from "@/lib/catalog";
import { EmptyState, Grid } from "@/components/media";
import { CATEGORIES } from "@/lib/types";
import type { Category } from "@/lib/types";

export const dynamic = "force-dynamic";

const SORTS = [
  { id: "popularity", label: "Popularity" },
  { id: "rating", label: "Rating" },
  { id: "title", label: "A–Z" },
] as const;

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: { category?: string; sort?: string };
}) {
  const category = (CATEGORIES.find((c) => c.id === searchParams.category)?.id ?? "manga") as Category;
  const sort = (SORTS.find((s) => s.id === searchParams.sort)?.id ?? "popularity") as
    | "popularity"
    | "rating"
    | "title";

  const items = await exploreCategory(category, sort);
  const label = CATEGORIES.find((c) => c.id === category)!.label;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Explore</h1>
        <p className="mt-1 text-[13px] text-white/45">
          Live metadata across every category. Filters persist in the URL.
        </p>
      </div>

      <div className="scroll-x -mx-1 px-1">
        {CATEGORIES.map((c) => (
          <Link
            key={c.id}
            href={`/explore?category=${c.id}&sort=${sort}`}
            className="nav-link shrink-0"
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
            href={`/explore?category=${category}&sort=${s.id}`}
            className="pill"
            style={s.id === sort ? { background: "rgba(139,92,246,.28)", borderColor: "rgba(139,92,246,.45)", color: "#e9d5ff" } : undefined}
          >
            {s.label}
          </Link>
        ))}
        <span className="ml-auto text-[12px] text-white/35">{items.length} titles in {label}</span>
      </div>

      {items.length ? (
        <Grid items={items} />
      ) : (
        <EmptyState
          title={`Nothing loaded for ${label}`}
          hint="The providers that serve this category were unavailable. Try again, or add a title manually in Admin."
        />
      )}
    </div>
  );
}
