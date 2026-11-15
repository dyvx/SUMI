import { blank, fetchJson, type ProviderAdapter } from "./base";
import type { Category, MediaItem } from "../types";

/**
 * MangaUpdates — the best metadata spine for this library.
 *
 * Why: it is the only large database that classifies a work as Manga, Manhwa,
 * Manhua *or* Light Novel, and it has the non-Japanese long tail (Korean and
 * Chinese series, light novels) that AniList covers thinly. It carries a
 * Bayesian rating, genres, year, publisher and associated titles, which is
 * exactly the metadata the shelves were missing.
 *
 * It has no browse endpoint — the API is search-only, and seeding it with
 * random letters is what produced the junk shelves before. So this provider is
 * used for *finding and enriching* titles, never for filling a carousel.
 */

const API = "https://api.mangaupdates.com/v1";

interface MuRecord {
  series_id: number;
  title: string;
  url: string;
  description?: string;
  image?: { url?: { original?: string; thumb?: string } };
  type?: string;
  year?: number | null;
  bayesian_rating?: number | null;
  rating_votes?: number;
  genres?: { genre: string }[];
  associated?: { title: string }[];
  status?: string;
  licensed?: boolean;
  publisher?: { publisher_name?: string }[];
  authors?: { name: string; type: string }[];
}

function categoryFor(type: string | undefined, title: string): Category {
  const t = (type ?? "").toLowerCase();
  if (t.includes("manhwa")) return "manhwa";
  if (t.includes("manhua")) return "manhua";
  if (t.includes("light novel")) return "light-novel";
  if (t.includes("novel")) return "light-novel";
  // Some records have no type; fall back to the title itself.
  if (/webtoon/i.test(title)) return "webtoon";
  return "manga";
}

function statusFor(s: string | undefined): MediaItem["status"] {
  const t = (s ?? "").toLowerCase();
  if (t.includes("complete")) return "finished";
  if (t.includes("ongoing")) return "releasing";
  if (t.includes("hiatus")) return "hiatus";
  if (t.includes("cancel")) return "cancelled";
  return "unknown";
}

function toItem(r: MuRecord): MediaItem {
  const cover = r.image?.url?.thumb ?? r.image?.url?.original ?? null;
  const genres = (r.genres ?? []).map((g) => g.genre).filter(Boolean);
  const authors = (r.authors ?? []).filter((a) => /author|story/i.test(a.type)).map((a) => a.name);
  const artists = (r.authors ?? []).filter((a) => /art/i.test(a.type)).map((a) => a.name);

  return blank({
    id: `mangaupdates:${r.series_id}`,
    provider: "mangaupdates",
    providerId: String(r.series_id),
    title: r.title,
    altTitles: (r.associated ?? []).map((a) => a.title).filter((t) => t && t !== r.title).slice(0, 8),
    category: categoryFor(r.type, r.title),
    description: r.description?.replace(/<[^>]+>/g, "").trim() || null,
    cover,
    author: authors[0] ?? null,
    artist: artists[0] ?? null,
    publisher: r.publisher?.[0]?.publisher_name ?? null,
    releaseYear: r.year ?? null,
    status: statusFor(r.status),
    genres,
    themes: [],
    demographics: genres.filter((g) => /shounen|shoujo|seinen|josei|kodomo/i.test(g)),
    // MangaUpdates rates out of 10 already.
    score: r.bayesian_rating ? Math.round(r.bayesian_rating * 10) : null,
    popularity: r.rating_votes ?? null,
    countryOfOrigin: /manhwa/i.test(r.type ?? "") ? "KR" : /manhua/i.test(r.type ?? "") ? "CN" : "JP",
    sourceUrl: r.url,
    attribution: "Metadata from MangaUpdates",
    readable: false,
  });
}

async function searchSeries(body: Record<string, unknown>): Promise<MuRecord[]> {
  const data = await fetchJson<{ results?: { record: MuRecord }[] }>(`${API}/series/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    timeout: 12000,
  });
  return (data?.results ?? []).map((r) => r.record).filter(Boolean);
}

export const mangaupdates: ProviderAdapter = {
  id: "mangaupdates",
  label: "MangaUpdates",
  attribution: "Metadata from MangaUpdates",
  categories: ["manga", "manhwa", "manhua", "webtoon", "light-novel"],

  async search(query, limit = 12) {
    const rows = await searchSeries({ search: query, perpage: Math.min(limit * 2, 25), stype: "title" });
    return rows.slice(0, limit).map(toItem);
  },

  async byId(providerId) {
    const data = await fetchJson<MuRecord>(`${API}/series/${encodeURIComponent(providerId)}`, { timeout: 12000 });
    return data?.series_id ? toItem(data) : null;
  },
};

/** Detail lookup used to enrich a title page with fields search omits. */
export async function mangaupdatesDetail(id: string): Promise<MediaItem | null> {
  try {
    return (await mangaupdates.byId!(id)) ?? null;
  } catch {
    return null;
  }
}
