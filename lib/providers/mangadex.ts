import { blank, fetchJson, type ProviderAdapter } from "./base";
import type { Category, MediaItem } from "../types";

const API = "https://api.mangadex.org";

interface MdRelationship {
  id: string;
  type: string;
  attributes?: { fileName?: string; name?: string };
}
interface MdManga {
  id: string;
  attributes: {
    title: Record<string, string>;
    altTitles: Record<string, string>[];
    description: Record<string, string>;
    originalLanguage: string;
    status: string;
    year: number | null;
    contentRating: string;
    tags: { attributes: { name: Record<string, string>; group: string } }[];
  };
  relationships: MdRelationship[];
}

function pickLang(map: Record<string, string> | undefined): string | null {
  if (!map) return null;
  return map.en ?? map["ja-ro"] ?? map.ja ?? Object.values(map)[0] ?? null;
}

function categoryFor(m: MdManga): Category {
  const lang = m.attributes.originalLanguage;
  const tags = m.attributes.tags.map((t) => t.attributes.name.en?.toLowerCase() ?? "");
  if (tags.some((t) => t.includes("doujinshi"))) return "doujinshi";
  if (lang === "ko") return tags.some((t) => t === "long strip") ? "webtoon" : "manhwa";
  if (lang === "zh") return "manhua";
  return "manga";
}

function statusMap(s: string): MediaItem["status"] {
  if (s === "ongoing") return "releasing";
  if (s === "completed") return "finished";
  if (s === "hiatus") return "hiatus";
  if (s === "cancelled") return "cancelled";
  return "unknown";
}

function toItem(m: MdManga): MediaItem {
  const coverRel = m.relationships.find((r) => r.type === "cover_art");
  const authorRel = m.relationships.find((r) => r.type === "author");
  const artistRel = m.relationships.find((r) => r.type === "artist");
  const cover = coverRel?.attributes?.fileName
    ? `${API.replace("api.", "uploads.")}/covers/${m.id}/${coverRel.attributes.fileName}.256.jpg`
    : null;

  const tags = m.attributes.tags;
  const genres = tags
    .filter((t) => t.attributes.group === "genre")
    .map((t) => pickLang(t.attributes.name) ?? "")
    .filter(Boolean);
  const themes = tags
    .filter((t) => t.attributes.group === "theme")
    .map((t) => pickLang(t.attributes.name) ?? "")
    .filter(Boolean);

  return blank({
    id: `mangadex:${m.id}`,
    provider: "mangadex",
    providerId: m.id,
    title: pickLang(m.attributes.title) ?? "Untitled",
    altTitles: m.attributes.altTitles.map((a) => pickLang(a) ?? "").filter(Boolean).slice(0, 6),
    category: categoryFor(m),
    description: pickLang(m.attributes.description),
    cover,
    author: authorRel?.attributes?.name ?? null,
    artist: artistRel?.attributes?.name ?? null,
    releaseYear: m.attributes.year,
    status: statusMap(m.attributes.status),
    genres,
    themes,
    contentRating: m.attributes.contentRating,
    originalLanguage: m.attributes.originalLanguage,
    countryOfOrigin:
      m.attributes.originalLanguage === "ja" ? "JP" : m.attributes.originalLanguage === "ko" ? "KR" : m.attributes.originalLanguage === "zh" ? "CN" : null,
    sourceUrl: `https://mangadex.org/title/${m.id}`,
    attribution: "Metadata from MangaDex",
  });
}

const FIELDS =
  "title,altTitle,description,originalLanguage,status,year,contentRating,tags,lastChapter,lastVolume";

export const mangadex: ProviderAdapter = {
  id: "mangadex",
  label: "MangaDex",
  attribution: "Metadata from MangaDex (mangadex.org)",
  categories: ["manga", "manhwa", "manhua", "webtoon", "doujinshi", "one-shot"],

  async search(query, limit = 20) {
    const url = `${API}/manga?limit=${Math.min(limit, 25)}&title=${encodeURIComponent(
      query
    )}&includes[]=cover_art&includes[]=author&includes[]=artist&contentRating[]=safe&contentRating[]=suggestive&order[relevance]=desc`;
    const data = await fetchJson<{ data: MdManga[] }>(url);
    return (data.data ?? []).map(toItem);
  },

  async trending(limit = 12) {
    const url = `${API}/manga?limit=${limit}&includes[]=cover_art&includes[]=author&includes[]=artist&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive`;
    const data = await fetchJson<{ data: MdManga[] }>(url);
    return (data.data ?? []).map(toItem);
  },

  async browse(category, limit = 30, sort = "popularity") {
    const order =
      sort === "rating" ? "rating" : sort === "title" ? "title" : "followedCount";
    let url =
      `${API}/manga?limit=${Math.min(limit, 40)}&includes[]=cover_art&includes[]=author&includes[]=artist` +
      `&order[${order}]=desc&contentRating[]=safe&contentRating[]=suggestive&hasAvailableChapters=true`;
    // Narrow by the origin language that matches the requested category.
    if (category === "manhwa" || category === "webtoon") url += "&originalLanguage[]=ko";
    else if (category === "manhua") url += "&originalLanguage[]=zh";
    else if (category === "manga") url += "&originalLanguage[]=ja";
    const data = await fetchJson<{ data: MdManga[] }>(url);
    return (data.data ?? []).map(toItem);
  },

  async byId(providerId) {
    const url = `${API}/manga/${providerId}?includes[]=cover_art&includes[]=author&includes[]=artist`;
    const data = await fetchJson<{ data: MdManga }>(url);
    return data?.data ? toItem(data.data) : null;
  },
};

export interface MdChapter {
  id: string;
  chapter: string | null;
  title: string | null;
  pages: number;
  lang: string;
}

export async function mangadexChapters(mangaId: string, lang = "en"): Promise<MdChapter[]> {
  const url = `${API}/manga/${mangaId}/feed?limit=500&translatedLanguage[]=${lang}&order[chapter]=asc&contentRating[]=safe&contentRating[]=suggestive`;
  const data = await fetchJson<{
    data: {
      id: string;
      attributes: { chapter: string | null; title: string | null; pages: number; translatedLanguage: string };
    }[];
  }>(url);
  return (data.data ?? []).map((c) => ({
    id: c.id,
    chapter: c.attributes.chapter,
    title: c.attributes.title,
    pages: c.attributes.pages,
    lang: c.attributes.translatedLanguage,
  }));
}

export interface MdPage {
  url: string;
  page: number;
  /** Lower-bandwidth twin of the same page; used when the original stalls. */
  fallback?: string;
}

export async function mangadexPageUrls(chapterId: string): Promise<MdPage[]> {
  const data = await fetchJson<{
    baseUrl: string;
    chapter: { hash: string; data: string[]; dataSaver?: string[] };
  }>(`${API}/at-home/server/${chapterId}`);
  const { baseUrl, chapter } = data;
  return chapter.data.map((f, i) => {
    const saver = chapter.dataSaver?.[i];
    return {
      url: `${baseUrl}/data/${chapter.hash}/${f}`,
      page: i + 1,
      ...(saver ? { fallback: `${baseUrl}/data-saver/${chapter.hash}/${saver}` } : {}),
    };
  });
}
