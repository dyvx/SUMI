import { cacheGet, cacheKey, cacheSet } from "./cache";
import { anilist } from "./providers/anilist";
import { mangadex } from "./providers/mangadex";
import { openlibrary } from "./providers/openlibrary";
import { gutenberg } from "./providers/gutenberg";
import { wikisource } from "./providers/wikisource";
import { mangaupdates } from "./providers/mangaupdates";
import { webtoon } from "./providers/webtoon";
import type { ProviderAdapter } from "./providers/base";
import { CATEGORIES, categoryFamily, mediaKind, normalizeTitle } from "./types";
import type { Category, MediaItem, Provider } from "./types";

/**
 * Order matters: reading sources first, metadata spines next, prose sources last.
 * Every provider here speaks the same five categories.
 */
export const PROVIDERS: ProviderAdapter[] = [
  mangadex,
  webtoon,
  mangaupdates,
  anilist,
  gutenberg,
  wikisource,
  openlibrary,
];

/** Per-provider health, updated on every live call. */
export interface Health {
  provider: Provider;
  ok: boolean;
  latencyMs: number;
  lastChecked: string;
  lastError: string | null;
  consecutiveFailures: number;
}
const health = new Map<Provider, Health>();

export function getHealth(): Health[] {
  return PROVIDERS.map(
    (p) =>
      health.get(p.id) ?? {
        provider: p.id,
        ok: true,
        latencyMs: 0,
        lastChecked: "never",
        lastError: null,
        consecutiveFailures: 0,
      }
  );
}

async function guarded<T>(provider: Provider, fn: () => Promise<T>): Promise<T> {
  const started = Date.now();
  try {
    const result = await fn();
    health.set(provider, {
      provider,
      ok: true,
      latencyMs: Date.now() - started,
      lastChecked: new Date().toISOString(),
      lastError: null,
      consecutiveFailures: 0,
    });
    return result;
  } catch (err) {
    const prev = health.get(provider);
    health.set(provider, {
      provider,
      ok: false,
      latencyMs: Date.now() - started,
      lastChecked: new Date().toISOString(),
      lastError: err instanceof Error ? err.message : "Unknown error",
      consecutiveFailures: (prev?.consecutiveFailures ?? 0) + 1,
    });
    throw err;
  }
}

/** Providers that can serve a given category, in priority order. */
export function providersFor(category?: Category): ProviderAdapter[] {
  if (!category) return PROVIDERS;
  return PROVIDERS.filter((p) => p.categories.includes(category));
}

function scoreRelevance(item: MediaItem, q: string): number {
  const n = normalizeTitle(item.title);
  const target = normalizeTitle(q);
  let s = 0;
  if (n === target) s += 100;
  else if (n.startsWith(target)) s += 60;
  else if (n.includes(target)) s += 40;
  if (item.altTitles.some((a) => normalizeTitle(a) === target)) s += 30;
  if (item.author && normalizeTitle(item.author).includes(target)) s += 15;
  return s;
}

/**
 * Merge results from multiple providers. Duplicates are only merged when the
 * provider IDs differ but the normalized title is identical AND the category
 * kind matches. We never merge on fuzzy name similarity alone.
 */
export function mergeResults(groups: MediaItem[][], query: string): MediaItem[] {
  const byKey = new Map<string, MediaItem & { altProviders: string[] }>();
  for (const group of groups) {
    for (const item of group) {
      const key = `${mediaKind(item.category)}:${normalizeTitle(item.title)}`;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, { ...item, altProviders: [] });
        continue;
      }
      // Keep the richer record; record the alternate source.
      existing.altProviders.push(item.provider);
      const richness = (m: MediaItem) =>
        (m.readable ? 6 : 0) +
        (m.description ? 1 : 0) +
        (m.cover ? 1 : 0) +
        (m.author ? 1 : 0) +
        m.genres.length / 10;
      if (richness(item) > richness(existing)) {
        byKey.set(key, { ...item, altProviders: existing.altProviders });
      } else {
        existing.description ??= item.description;
        existing.cover ??= item.cover;
        existing.author ??= item.author;
        if (item.readable) existing.readable = true;
      }
    }
  }
  return [...byKey.values()]
    .map((m) => ({ ...m, meta: { altProviders: m.altProviders } }))
    .sort((a, b) => scoreRelevance(b, query) - scoreRelevance(a, query) || (b.popularity ?? 0) - (a.popularity ?? 0));
}

export async function searchAll(
  query: string,
  category?: Category,
  limit = 24
): Promise<{ results: MediaItem[]; failedProviders: Provider[] }> {
  const key = cacheKey("search", normalizeTitle(query), category, limit);
  const cached = cacheGet<{ results: MediaItem[]; failedProviders: Provider[] }>(key);
  if (cached) return cached;

  const targets = providersFor(category);
  const settled = await Promise.allSettled(
    targets.map((p) => guarded(p.id, () => p.search(query, limit)))
  );

  const groups: MediaItem[][] = [];
  const failedProviders: Provider[] = [];
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") groups.push(r.value);
    else failedProviders.push(targets[i].id);
  });

  const results = mergeResults(groups, query).slice(0, limit);
  const payload = { results, failedProviders };
  if (results.length) cacheSet(key, payload, 5 * 60 * 1000);
  return payload;
}

export async function getById(id: string): Promise<MediaItem | null> {
  const [provider, ...rest] = id.split(":");
  const providerId = rest.join(":");
  const adapter = PROVIDERS.find((p) => p.id === provider);
  if (!adapter?.byId) return null;
  const key = cacheKey("item", id);
  const cached = cacheGet<MediaItem>(key);
  if (cached) return cached;
  try {
    const item = await guarded(adapter.id, () => adapter.byId!(providerId));
    if (item) cacheSet(key, item, 30 * 60 * 1000);
    return item;
  } catch {
    return null;
  }
}

export interface Row {
  id: string;
  title: string;
  subtitle: string;
  items: MediaItem[];
}

const HIDDEN_GEM_GENRES = ["Mystery", "Psychological", "Slice of Life", "Josei", "Seinen"];

export async function buildHomeRows(): Promise<{ rows: Row[]; degraded: Provider[] }> {
  const key = cacheKey("home", "v1");
  const cached = cacheGet<{ rows: Row[]; degraded: Provider[] }>(key);
  if (cached) return cached;

  const degraded: Provider[] = [];
  const safe = async <T,>(p: Provider, fn: () => Promise<T[]>): Promise<T[]> => {
    try {
      return await guarded(p, fn);
    } catch {
      degraded.push(p);
      return [];
    }
  };

  const [aniTrending, mdTrending, wtTrending, books, publicDomain, wiki] = await Promise.all([
    safe("anilist", () => anilist.trending!(14)),
    safe("mangadex", () => mangadex.trending!(14)),
    safe("webtoon", () => webtoon.trending!(14)),
    safe("openlibrary", () => openlibrary.search("light novel", 10)),
    safe("gutenberg", () => gutenberg.trending!(14)),
    safe("wikisource", () => wikisource.search("literature", 10)),
  ]);

  const pool = [...aniTrending, ...mdTrending, ...wtTrending, ...books].filter((m) => m.cover);
  const byCat = (c: Category) => pool.filter((m) => m.category === c).slice(0, 12);

  const rows: Row[] = [
    {
      id: "readable-now",
      title: "Readable right now",
      subtitle: "Titles with pages we can actually open",
      items: [...mdTrending, ...wtTrending].filter((m) => m.cover && m.readable).slice(0, 14),
    },
    {
      id: "public-domain",
      title: "Light novels — read in full",
      subtitle: "Complete public-domain books with real text",
      items: publicDomain,
    },
    { id: "trending", title: "Trending manga", subtitle: "What the world is reading", items: byCat("manga") },
    { id: "popular-manhwa", title: "Manhwa", subtitle: "Korean webcomics and vertical scroll", items: byCat("manhwa") },
    { id: "popular-manhua", title: "Manhua", subtitle: "Chinese comics and cultivation epics", items: byCat("manhua") },
    { id: "official-webtoons", title: "Official webtoons", subtitle: "Free episodes on WEBTOON", items: byCat("webtoon") },
    { id: "light-novels", title: "Light novels", subtitle: "Prose from Open Library", items: books.slice(0, 12) },
    { id: "mangadex-trending", title: "Latest updates", subtitle: "Freshly followed on MangaDex", items: mdTrending.slice(0, 12) },
    { id: "wikisource", title: "From Wikisource", subtitle: "Public-domain works across languages", items: wiki },
    {
      id: "hidden-gems",
      title: "Hidden gems",
      subtitle: "Under-discovered picks",
      items: pool.filter((m) => m.genres.some((g) => HIDDEN_GEM_GENRES.includes(g))).slice(0, 12),
    },
    {
      id: "top-rated",
      title: "Top rated",
      subtitle: "Highest scores across providers",
      items: [...pool].filter((m) => m.score).sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 12),
    },
  ].filter((r) => r.items.length > 0);

  const payload = { rows, degraded };
  if (rows.length) cacheSet(key, payload, 10 * 60 * 1000);
  return payload;
}

export async function exploreCategory(
  category: Category,
  sort: "popularity" | "rating" | "title" = "popularity"
): Promise<MediaItem[]> {
  const key = cacheKey("explore", category, sort, "v3");
  const cached = cacheGet<MediaItem[]>(key);
  if (cached) return cached;

  const targets = providersFor(category);
  const family = new Set(categoryFamily(category));
  const groups: MediaItem[][] = [];

  await Promise.all(
    targets.map(async (p) => {
      try {
        // Real popularity ordering only. Random-letter seeding used to surface
        // obscure entries with unusable covers; this pulls genuinely notable work.
        if (p.browse) {
          const items = await guarded(p.id, () => p.browse!(category, 30, sort));
          groups.push(items.filter((i) => family.has(i.category)));
        } else if (p.trending) {
          const items = await guarded(p.id, () => p.trending!(30));
          groups.push(items.filter((i) => family.has(i.category)));
        }
      } catch {
        /* a single provider failing should not empty the page */
      }
    })
  );

  const flat = mergeResults(groups, "");
  const sorted =
    sort === "rating"
      ? [...flat].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      : sort === "title"
        ? [...flat].sort((a, b) => a.title.localeCompare(b.title))
        : flat;

  cacheSet(key, sorted, 15 * 60 * 1000);
  return sorted;
}

export function categoryCounts(items: MediaItem[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of CATEGORIES) out[c.id] = 0;
  for (const i of items) out[i.category] = (out[i.category] ?? 0) + 1;
  return out;
}
