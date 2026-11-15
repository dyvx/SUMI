/**
 * SUMI is a manga-family library: these five are the whole taxonomy. Anything
 * else (visual novels, western comics, one-shots) was deliberately removed so
 * every provider, filter and reader speaks the same five languages.
 */
export type Category = "manga" | "manhwa" | "manhua" | "webtoon" | "light-novel";

export const CATEGORIES: { id: Category; label: string; kind: "comic" | "prose"; short: string }[] = [
  { id: "manga", label: "Manga", kind: "comic", short: "Japanese" },
  { id: "manhwa", label: "Manhwa", kind: "comic", short: "Korean" },
  { id: "manhua", label: "Manhua", kind: "comic", short: "Chinese" },
  { id: "webtoon", label: "Webtoons", kind: "comic", short: "Vertical scroll" },
  { id: "light-novel", label: "Light Novels", kind: "prose", short: "Prose" },
];

export type Provider =
  | "anilist"
  | "mangadex"
  | "mangaupdates"
  | "webtoon"
  | "openlibrary"
  | "gutenberg"
  | "wikisource"
  | "manual";

export interface MediaItem {
  /** Stable internal id: `${provider}:${providerId}` */
  id: string;
  provider: Provider;
  providerId: string;
  title: string;
  altTitles: string[];
  category: Category;
  description: string | null;
  cover: string | null;
  banner: string | null;
  author: string | null;
  artist: string | null;
  publisher: string | null;
  releaseYear: number | null;
  status: "releasing" | "finished" | "hiatus" | "cancelled" | "unknown";
  genres: string[];
  themes: string[];
  demographics: string[];
  contentRating: string | null;
  volumes: number | null;
  chapters: number | null;
  score: number | null;
  popularity: number | null;
  countryOfOrigin: string | null;
  originalLanguage: string | null;
  sourceUrl: string;
  attribution: string;
  /** True when this entry has full readable text (not just metadata). */
  readable?: boolean;
  /** Related titles/adaptations from the provider (real relations, never invented). */
  related?: { title: string; relation: string; cover: string | null; url: string | null }[];
  updatedAt: string;
}

export interface LibraryEntry {
  id: string;
  status: "reading" | "completed" | "plan" | "on-hold" | "dropped" | "favorite";
  addedAt: string;
  media: MediaItem;
}

export interface Progress {
  mediaId: string;
  chapter: number;
  page: number;
  totalPages: number;
  percent: number;
  updatedAt: string;
}

export interface AppData {
  library: LibraryEntry[];
  progress: Record<string, Progress>;
  recent: { mediaId: string; at: string; media: MediaItem }[];
  settings: {
    homepageSections: string[];
    readerDirection: "ltr" | "rtl";
    novelFontSize: number;
    novelTheme: "dark" | "sepia" | "light";
  };
}

export function mediaKind(c: Category): "comic" | "prose" {
  return CATEGORIES.find((x) => x.id === c)?.kind ?? "comic";
}

export function normalizeTitle(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\u3000-\u9fff\uac00-\ud7af]/g, "")
    .trim();
}

/**
 * Wraps an external image URL in our own proxy. Provider CDNs frequently reject
 * browser requests from foreign origins, which renders as broken-image icons.
 */
export function imgUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/")) return url;
  if (!/^https:\/\//.test(url)) return null;
  return `/api/img?u=${encodeURIComponent(url)}`;
}

/**
 * Browsing families. MangaDex tags Korean long-strip comics as `webtoon`, and
 * readers reasonably expect those under Manhwa too. This affects display and
 * filtering only — de-duplication still requires an exact title match.
 */
const FAMILY: Record<Category, Category[]> = {
  manga: ["manga"],
  manhwa: ["manhwa", "webtoon"],
  manhua: ["manhua"],
  webtoon: ["webtoon", "manhwa"],
  "light-novel": ["light-novel"],
};

export function categoryFamily(c: Category): Category[] {
  return FAMILY[c] ?? [c];
}
