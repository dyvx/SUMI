export type Category =
  | "manga"
  | "manhwa"
  | "manhua"
  | "webtoon"
  | "light-novel"
  | "web-novel"
  | "visual-novel"
  | "doujinshi"
  | "comic"
  | "graphic-novel"
  | "wuxia"
  | "one-shot";

export const CATEGORIES: { id: Category; label: string; kind: "comic" | "prose" | "vn" }[] = [
  { id: "manga", label: "Manga", kind: "comic" },
  { id: "manhwa", label: "Manhwa", kind: "comic" },
  { id: "manhua", label: "Manhua", kind: "comic" },
  { id: "webtoon", label: "Webtoons", kind: "comic" },
  { id: "light-novel", label: "Light Novels", kind: "prose" },
  { id: "web-novel", label: "Web Novels", kind: "prose" },
  { id: "visual-novel", label: "Visual Novels", kind: "vn" },
  { id: "doujinshi", label: "Doujinshi", kind: "comic" },
  { id: "comic", label: "Comics", kind: "comic" },
  { id: "graphic-novel", label: "Graphic Novels", kind: "comic" },
  { id: "wuxia", label: "Wuxia / Xianxia", kind: "prose" },
  { id: "one-shot", label: "One-shots", kind: "comic" },
];

export type Provider = "anilist" | "mangadex" | "openlibrary" | "vndb" | "gutenberg" | "manual";

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

export function mediaKind(c: Category): "comic" | "prose" | "vn" {
  return CATEGORIES.find((x) => x.id === c)?.kind ?? "comic";
}

export function normalizeTitle(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\u3000-\u9fff\uac00-\ud7af]/g, "")
    .trim();
}
