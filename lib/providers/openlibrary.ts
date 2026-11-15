import { blank, fetchJson, type ProviderAdapter } from "./base";
import type { MediaItem } from "../types";

const API = "https://openlibrary.org";

interface OlDoc {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  subject?: string[];
  language?: string[];
  edition_count?: number;
  publisher?: string[];
  alt_title?: string[];
}

interface OlSearch {
  docs: OlDoc[];
}

function toItem(d: OlDoc): MediaItem {
  const subjects = (d.subject ?? []).slice(0, 12);
  return blank({
    id: `openlibrary:${d.key}`,
    provider: "openlibrary",
    providerId: d.key,
    title: d.title,
    altTitles: d.alt_title ?? [],
    category: "web-novel",
    description: subjects.length ? `Subjects: ${subjects.join(", ")}` : null,
    cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : null,
    author: d.author_name?.[0] ?? null,
    publisher: d.publisher?.[0] ?? null,
    releaseYear: d.first_publish_year ?? null,
    genres: subjects.slice(0, 8),
    originalLanguage: d.language?.[0] ?? null,
    sourceUrl: `https://openlibrary.org${d.key}`,
    attribution: "Metadata from Open Library (openlibrary.org)",
  });
}

export const openlibrary: ProviderAdapter = {
  id: "openlibrary",
  label: "Open Library",
  attribution: "Metadata from Open Library, an initiative of the Internet Archive",
  categories: ["web-novel", "light-novel", "wuxia"],

  async search(query, limit = 20) {
    const url = `${API}/search.json?q=${encodeURIComponent(query)}&limit=${Math.min(limit, 25)}&fields=key,title,author_name,first_publish_year,cover_i,subject,language,publisher,alt_title`;
    const data = await fetchJson<OlSearch>(url);
    return (data.docs ?? []).map(toItem);
  },

  async byId(providerId) {
    const key = providerId.startsWith("/") ? providerId : `/${providerId}`;
    const work = await fetchJson<{
      title: string;
      description?: string | { value: string };
      subjects?: string[];
      first_publish_date?: string;
      covers?: number[];
    }>(`${API}${key}.json`);
    if (!work?.title) return null;
    const desc =
      typeof work.description === "string" ? work.description : work.description?.value ?? null;
    return blank({
      id: `openlibrary:${key}`,
      provider: "openlibrary",
      providerId: key,
      title: work.title,
      category: "web-novel",
      description: desc,
      cover: work.covers?.[0] ? `https://covers.openlibrary.org/b/id/${work.covers[0]}-L.jpg` : null,
      genres: (work.subjects ?? []).slice(0, 10),
      sourceUrl: `https://openlibrary.org${key}`,
      attribution: "Metadata from Open Library (openlibrary.org)",
    });
  },
};
