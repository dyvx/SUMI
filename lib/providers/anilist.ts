import { blank, fetchJson, type ProviderAdapter } from "./base";
import type { Category, MediaItem } from "../types";

const ENDPOINT = "https://graphql.anilist.co";

const QUERY = `
query ($search: String, $page: Int, $perPage: Int, $country: CountryCode, $format: MediaFormat) {
  Page(page: $page, perPage: $perPage) {
    media(search: $search, type: MANGA, countryOfOrigin: $country, format: $format, sort: SEARCH_MATCH) {
      id
      title { romaji english native }
      description(asHtml: false)
      format
      countryOfOrigin
      status
      chapters
      volumes
      genres
      averageScore
      popularity
      startDate { year }
      coverImage { extraLarge large }
      bannerImage
      siteUrl
      staff(perPage: 4) { edges { role node { name { full } } } }
    }
  }
}`;

interface AniStaffEdge {
  role: string;
  node: { name: { full: string } };
}
interface AniMedia {
  id: number;
  title: { romaji: string | null; english: string | null; native: string | null };
  description: string | null;
  format: string | null;
  countryOfOrigin: string | null;
  status: string | null;
  chapters: number | null;
  volumes: number | null;
  genres: string[];
  averageScore: number | null;
  popularity: number | null;
  startDate: { year: number | null } | null;
  coverImage: { extraLarge: string | null; large: string | null } | null;
  bannerImage: string | null;
  siteUrl: string;
  staff?: { edges: AniStaffEdge[] };
}

const FORMAT_MAP: Record<string, Category> = {
  MANGA: "manga",
  ONE_SHOT: "manga",
  NOVEL: "light-novel",
};

function countryToCategory(country: string | null, format: string | null): Category {
  // One-shots live under Manga; Korean/Chinese novels are light novels here.
  if (format === "ONE_SHOT") return "manga";
  if (format === "NOVEL") return "light-novel";
  if (country === "KR") return "manhwa";
  if (country === "CN" || country === "TW") return "manhua";
  return FORMAT_MAP[format ?? ""] ?? "manga";
}

function statusMap(s: string | null): MediaItem["status"] {
  switch (s) {
    case "RELEASING":
      return "releasing";
    case "FINISHED":
      return "finished";
    case "HIATUS":
      return "hiatus";
    case "CANCELLED":
      return "cancelled";
    default:
      return "unknown";
  }
}

function stripHtml(s: string | null): string | null {
  if (!s) return null;
  return s.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim();
}

function toItem(m: AniMedia): MediaItem {
  // Include romaji even when it is not the display title — MangaDex indexes
  // many works only under their romanised name (e.g. "Na Honjaman Level-Up").
  const display = m.title.english ?? m.title.romaji ?? m.title.native ?? "Untitled";
  const alt = [m.title.romaji, m.title.english, m.title.native].filter(
    (x): x is string => !!x && x !== display
  );
  const staffRole = (role: string) =>
    m.staff?.edges.find((e) => e.role.toLowerCase().includes(role))?.node.name.full ?? null;

  return blank({
    id: `anilist:${m.id}`,
    provider: "anilist",
    providerId: String(m.id),
    title: m.title.english ?? m.title.romaji ?? m.title.native ?? "Untitled",
    altTitles: alt,
    category: countryToCategory(m.countryOfOrigin, m.format),
    description: stripHtml(m.description),
    cover: m.coverImage?.extraLarge ?? m.coverImage?.large ?? null,
    banner: m.bannerImage,
    author: staffRole("story"),
    artist: staffRole("art"),
    releaseYear: m.startDate?.year ?? null,
    status: statusMap(m.status),
    genres: m.genres ?? [],
    themes: [],
    chapters: m.chapters,
    volumes: m.volumes,
    score: m.averageScore,
    popularity: m.popularity,
    countryOfOrigin: m.countryOfOrigin,
    originalLanguage: m.countryOfOrigin === "JP" ? "ja" : m.countryOfOrigin === "KR" ? "ko" : m.countryOfOrigin === "CN" ? "zh" : null,
    sourceUrl: m.siteUrl,
    attribution: "Metadata from AniList",
  });
}

async function run(variables: Record<string, unknown>): Promise<AniMedia[]> {
  const data = await fetchJson<{ data: { Page: { media: AniMedia[] } } }>(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: QUERY, variables }),
  });
  return data?.data?.Page?.media ?? [];
}

export const anilist: ProviderAdapter = {
  id: "anilist",
  label: "AniList",
  attribution: "Metadata from AniList (anilist.co)",
  categories: ["manga", "manhwa", "manhua", "webtoon", "light-novel"],

  async search(query, limit = 20) {
    const media = await run({ search: query, page: 1, perPage: Math.min(limit, 25) });
    return media.map(toItem);
  },

  async trending(limit = 12) {
    const data = await fetchJson<{ data: { Page: { media: AniMedia[] } } }>(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query($perPage:Int){Page(page:1,perPage:$perPage){media(type:MANGA,sort:TRENDING_DESC){id title{romaji english native} description(asHtml:false) format countryOfOrigin status chapters volumes genres averageScore popularity startDate{year} coverImage{extraLarge large} bannerImage siteUrl}}}`,
        variables: { perPage: limit },
      }),
    });
    return (data?.data?.Page?.media ?? []).map(toItem);
  },

  async browse(category, limit = 30, sort = "popularity") {
    const order = sort === "rating" ? "SCORE_DESC" : "POPULARITY_DESC";
    const country =
      category === "manhwa" || category === "webtoon"
        ? "KR"
        : category === "manhua"
          ? "CN"
          : category === "manga"
            ? "JP"
            : undefined;
    const format = category === "light-novel" ? "NOVEL" : undefined;

    const data = await fetchJson<{ data: { Page: { media: AniMedia[] } } }>(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query($perPage:Int,$sort:[MediaSort],$country:CountryCode,$format:MediaFormat){
          Page(page:1,perPage:$perPage){
            media(type:MANGA,sort:$sort,countryOfOrigin:$country,format:$format){
              id title{romaji english native} description(asHtml:false) format countryOfOrigin status
              chapters volumes genres averageScore popularity startDate{year}
              coverImage{extraLarge large} bannerImage siteUrl
            }
          }
        }`,
        variables: {
          perPage: Math.min(limit, 50),
          sort: [order],
          country,
          format,
        },
      }),
    });
    return (data?.data?.Page?.media ?? []).map(toItem);
  },

  async byId(providerId) {
    const data = await fetchJson<{ data: { Media: AniMedia | null } }>(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query($id:Int){Media(id:$id,type:MANGA){id title{romaji english native} description(asHtml:false) format countryOfOrigin status chapters volumes genres averageScore popularity startDate{year} coverImage{extraLarge large} bannerImage siteUrl staff(perPage:4){edges{role node{name{full}}}}}}`,
        variables: { id: Number(providerId) },
      }),
    });
    return data?.data?.Media ? toItem(data.data.Media) : null;
  },
};
