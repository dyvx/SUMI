import { cacheGet, cacheKey, cacheSet } from "./cache";
import { fetchJson } from "./providers/base";
import { normalizeTitle } from "./types";
import type { MediaItem } from "./types";

/**
 * Cross-provider reading-source resolution.
 *
 * Metadata providers (AniList) and reading providers (MangaDex) do not share
 * IDs. This finds the MangaDex edition that genuinely corresponds to a title —
 * and refuses weak matches, because merging different works is worse than
 * showing nothing.
 */

const MD = "https://api.mangadex.org";

export interface Candidate {
  mangadexId: string;
  title: string;
  chapters: number;
  score: number;
}

export interface Resolution {
  found: boolean;
  best: Candidate | null;
  candidates: Candidate[];
  reason?: string;
}

/** Folds common romanisation differences so 東京/Toukyou/Tokyo all meet. */
export function foldTitle(raw: string): string {
  return normalizeTitle(
    raw
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ou/g, "o")
      .replace(/uu/g, "u")
      .replace(/oo/g, "o")
      .replace(/aa/g, "a")
      .replace(/ei/g, "e")
  );
}

/**
 * Strict matching: a candidate is only accepted when a folded title is EXACTLY
 * equal to one of the source titles. Prefix matches are rejected on purpose —
 * "Berserk" must never resolve to "Berserk of Gluttony", and "One Piece" must
 * never resolve to "Shokugeki no Sanji".
 */
/**
 * Only qualifiers that describe the SAME story are stripped. "(Official Colored)"
 * is the same book in colour; "(Oneshot)", "(Doujinshi)", "(Fan Colored)" are
 * different works and must never be treated as the series.
 */
const SAFE_QUALIFIERS = [
  /official colou?red/i,
  /full colou?r/i,
  /digital colou?red/i,
  /official/i,
  /colou?red/i,
  /remastered/i,
  /deluxe/i,
  /\braw\b/i,
];

export /** Fan-made or alternate-format markers: these describe a different work. */
const UNSAFE_QUALIFIERS = /fan|doujin|scan|unofficial|oneshot|one[- ]shot|parody|abridged/i;

export function stripEdition(raw: string): string {
  let s = raw;
  let prev = "";
  while (s !== prev) {
    prev = s;
    const m = s.match(/\s*[\(\[]([^\)\]]*)[\)\]]\s*$/);
    if (!m) break;
    const inner = m[1].trim();
    if (UNSAFE_QUALIFIERS.test(inner)) break;
    if (!SAFE_QUALIFIERS.some((re) => re.test(inner))) break;
    s = s.slice(0, m.index).trim();
  }
  return s;
}

/**
 * Only the candidate's PRIMARY title is used. Alt-titles are deliberately
 * ignored: spinoffs routinely list the parent series there, which is how
 * "Jujutsu Kaisen Modulo" would otherwise masquerade as "Jujutsu Kaisen".
 */
export function exactTitleMatch(sourceNames: Set<string>, primaryTitle: string): boolean {
  const direct = foldTitle(primaryTitle);
  if (sourceNames.has(direct)) return true;
  const stripped = foldTitle(stripEdition(primaryTitle));
  return stripped.length > 0 && sourceNames.has(stripped);
}

interface MdItem {
  id: string;
  attributes: {
    title: Record<string, string>;
    altTitles: Record<string, string>[];
    status: string;
  };
  relationships: { type: string; attributes?: { name?: string } }[];
}

function mdTitles(m: MdItem): string[] {
  const out = Object.values(m.attributes.title ?? {});
  for (const alt of m.attributes.altTitles ?? []) out.push(...Object.values(alt));
  return out.filter(Boolean);
}

/**
 * Count chapters that actually contain page images. MangaDex keeps feed rows
 * for chapters whose images were removed (they report pages: 0); counting
 * those would promise a reader that cannot load anything.
 */
async function chapterCount(mangadexId: string): Promise<number> {
  try {
    const d = await fetchJson<{
      total: number;
      data: { attributes: { pages?: number } }[];
    }>(
      `${MD}/manga/${mangadexId}/feed?limit=100&translatedLanguage[]=en&contentRating[]=safe&contentRating[]=suggestive&order[chapter]=asc`,
      { timeout: 12000 }
    );
    const rows = d?.data ?? [];
    const withPages = rows.filter((c) => (c.attributes.pages ?? 0) > 0).length;
    return withPages;
  } catch {
    return 0;
  }
}

/**
 * Resolve a metadata-only title to a MangaDex reading source.
 * Cached for 6 hours because it costs several upstream calls.
 */
export async function resolveReadingSource(item: MediaItem): Promise<Resolution> {
  if (item.provider === "mangadex") {
    const n = await chapterCount(item.providerId);
    return {
      found: n > 0,
      best: n > 0 ? { mangadexId: item.providerId, title: item.title, chapters: n, score: 100 } : null,
      candidates: [],
      reason: n > 0 ? undefined : "This MangaDex entry has no English chapters (often due to takedowns).",
    };
  }

  if (!["anilist", "manual", "openlibrary", "vndb"].includes(item.provider)) {
    return { found: false, best: null, candidates: [], reason: "This provider does not map to a reading source." };
  }

  const key = cacheKey("resolve", item.id);
  const cached = cacheGet<Resolution>(key);
  if (cached) return cached;

  const queries = Array.from(
    new Set(
      [item.title, ...(item.altTitles ?? [])]
        .map((t) => t.trim())
        .filter((t) => t.length > 1)
    )
  ).slice(0, 3);

  const seen = new Map<string, MdItem>();
  for (const q of queries) {
    try {
      const url = `${MD}/manga?title=${encodeURIComponent(
        q
      )}&limit=8&includes[]=author&contentRating[]=safe&contentRating[]=suggestive&order[relevance]=desc`;
      const d = await fetchJson<{ data: MdItem[] }>(url, { timeout: 9000 });
      for (const m of d.data ?? []) seen.set(m.id, m);
    } catch {
      /* one failed query should not void the others */
    }
  }

  if (!seen.size) {
    const miss: Resolution = {
      found: false,
      best: null,
      candidates: [],
      reason: "No matching entry was found on MangaDex.",
    };
    cacheSet(key, miss, 60 * 60 * 1000);
    return miss;
  }

  const sourceNames = new Set(
    [item.title, ...(item.altTitles ?? [])].map((t) => foldTitle(t)).filter(Boolean)
  );

  const scored: Candidate[] = [];
  for (const m of seen.values()) {
    const titles = mdTitles(m);
    const primary = titles[0] ?? "";
    if (!exactTitleMatch(sourceNames, primary)) continue;
    // Prefer the plain release over an edition variant when both are readable.
    const isEdition = stripEdition(primary) !== primary;
    scored.push({
      mangadexId: m.id,
      title: primary || "Untitled",
      chapters: -1,
      score: isEdition ? 90 : 100,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 4);

  for (const c of top) {
    c.chapters = await chapterCount(c.mangadexId);
  }

  const usable = top.filter((c) => c.chapters > 0).sort((a, b) => b.score - a.score || b.chapters - a.chapters);
  const best = usable[0] ?? null;

  const resolution: Resolution = {
    found: !!best,
    best,
    candidates: top,
    reason: best
      ? undefined
      : top.length
        ? "A matching entry exists but has no English chapters (often removed after takedown requests)."
        : "No entry with this exact title was found on MangaDex. Close matches were ignored so a different series is never substituted.",
  };
  cacheSet(key, resolution, 6 * 60 * 60 * 1000);
  return resolution;
}
