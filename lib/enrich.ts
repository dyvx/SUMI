import { cacheGet, cacheKey, cacheSet } from "./cache";
import { anilist } from "./providers/anilist";
import { mangaupdates } from "./providers/mangaupdates";
import { foldTitle, stripEdition } from "./resolve";
import type { MediaItem } from "./types";

/**
 * Metadata enrichment.
 *
 * Every provider knows a different slice of a title: MangaDex has pages but no
 * score, AniList has scores but thin non-Japanese coverage, MangaUpdates knows
 * the Manhwa/Manhua/Light-Novel long tail and its genres. A title page that
 * shows only its origin provider's data looks empty, which is what "we need
 * more metadata" actually means.
 *
 * Rules:
 *  - Only *fill gaps*; never overwrite a value the source provider supplied.
 *  - Only merge when the folded title matches exactly, so two different works
 *    are never blended. Fuzzy merging is worse than a sparse page.
 *  - Genres are a union (harmless), scores/ratings keep the first real value.
 */

const TTL = 24 * 60 * 60 * 1000;

function union(a: string[], b: string[]): string[] {
  const seen = new Set(a.map((x) => x.toLowerCase()));
  const out = [...a];
  for (const v of b) {
    if (v && !seen.has(v.toLowerCase())) {
      seen.add(v.toLowerCase());
      out.push(v);
    }
  }
  return out.slice(0, 14);
}

function titles(item: MediaItem): Set<string> {
  const f = (s: string) => foldTitle(stripEdition(s));
  return new Set([item.title, ...(item.altTitles ?? [])].map(f).filter(Boolean));
}

/**
 * Any title on one side equalling any title on the other counts as the same
 * work. Korean and Chinese series carry romanised primary titles on some
 * providers and the English title on others, so matching on primaries alone
 * would leave those pages permanently sparse.
 */
function sameWork(a: MediaItem, b: MediaItem): boolean {
  const A = titles(a);
  if (!A.size) return false;
  for (const t of titles(b)) if (A.has(t)) return true;
  return false;
}

const NON_LATIN = /[\u3000-\u9fff\uac00-\ud7af]/;
const LATIN_ISH = /^[\x20-\x7e\u00c0-\u024f]+$/;

/**
 * Display-title preference: a readable Latin title beats a Korean/Chinese
 * romanisation. "Na Honjaman Level-Up" is the same book as "Solo Leveling", and
 * readers search and recognise the English name.
 */
function betterTitle(base: MediaItem, extra: MediaItem): { title: string; altTitles: string[] } | null {
  const current = base.title;
  const candidate = extra.title;
  if (!candidate || candidate === current) return null;
  if (!LATIN_ISH.test(candidate)) return null;

  /*
   * Only rename on evidence, never on taste:
   *  - the title is not Latin script at all, or
   *  - the source itself already lists the candidate in its alt titles, i.e.
   *    it considers that an official name for the same work.
   * This is how "Jeonjijeok Dokja Sijeom" becomes "Omniscient Reader's
   * Viewpoint" — the record literally carries that as an alternative title.
   */
  const alts = (base.altTitles ?? []).map((t) => foldTitle(t));
  const trusted = alts.includes(foldTitle(candidate));
  if (!trusted && !NON_LATIN.test(current)) return null;

  return { title: candidate, altTitles: [current, ...(base.altTitles ?? [])].filter(Boolean) };
}

function merge(base: MediaItem, extra: MediaItem): MediaItem {
  if (!sameWork(base, extra)) return base;
  const renamed = betterTitle(base, extra);
  return {
    ...base,
    ...(renamed ? { title: renamed.title, altTitles: renamed.altTitles } : {}),
    description: base.description ?? extra.description,
    author: base.author ?? extra.author,
    artist: base.artist ?? extra.artist,
    publisher: base.publisher ?? extra.publisher,
    releaseYear: base.releaseYear ?? extra.releaseYear,
    status: base.status !== "unknown" ? base.status : extra.status,
    score: base.score ?? extra.score,
    popularity: base.popularity ?? extra.popularity,
    chapters: base.chapters ?? extra.chapters,
    volumes: base.volumes ?? extra.volumes,
    countryOfOrigin: base.countryOfOrigin ?? extra.countryOfOrigin,
    altTitles: union(base.altTitles ?? [], extra.altTitles ?? []).slice(0, 10),
    genres: union(base.genres ?? [], extra.genres ?? []),
    demographics: union(base.demographics ?? [], extra.demographics ?? []),
    cover: base.cover ?? extra.cover,
    // Enrichment never invents readability.
    readable: base.readable,
  };
}

/**
 * Fills in missing metadata for one title. Never throws: enrichment is a bonus,
 * so a slow or dead provider must not break the page.
 */
export async function enrichItem(item: MediaItem): Promise<{ item: MediaItem; enriched: string[] }> {
  const key = cacheKey("enrich", item.id, item.title);
  const cached = cacheGet<{ item: MediaItem; enriched: string[] }>(key);
  if (cached) return cached;

  const enriched: string[] = [];
  let out = item;

  const sparse =
    !out.description || !out.score || !out.author || out.genres.length < 3 || out.status === "unknown";
  if (!sparse) {
    const payload = { item: out, enriched };
    cacheSet(key, payload, TTL);
    return payload;
  }

  // MangaUpdates knows the long tail (and its type field confirms the category).
  if (out.provider !== "mangaupdates") {
    try {
      const hits = await mangaupdates.search(out.title, 5);
      const hit = hits.find((h) => sameWork(out, h));
      if (hit) {
        const before = JSON.stringify(out);
        out = merge(out, hit);
        if (JSON.stringify(out) !== before) enriched.push("mangaupdates");
      }
    } catch {
      /* ignore */
    }
  }

  // AniList adds scores, banners and demographics the others lack.
  if (out.provider !== "anilist" && (!out.score || out.genres.length < 3)) {
    try {
      const hits = await anilist.search(out.title, 5);
      const hit = hits.find((h) => sameWork(out, h));
      if (hit) {
        const before = JSON.stringify(out);
        out = merge(out, hit);
        if (JSON.stringify(out) !== before) enriched.push("anilist");
      }
    } catch {
      /* ignore */
    }
  }

  const payload = { item: out, enriched };
  cacheSet(key, payload, TTL);
  return payload;
}
