import type { Category, MediaItem, Provider } from "../types";

export const PROVIDER_TIMEOUT = 9000;

export async function fetchJson<T>(
  url: string,
  init?: RequestInit & { timeout?: number }
): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), init?.timeout ?? PROVIDER_TIMEOUT);
  try {
    const res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: {
        Accept: "application/json",
        ...(init?.headers || {}),
      },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

export interface ProviderAdapter {
  id: Provider;
  label: string;
  attribution: string;
  /** Which unified categories this provider can serve. */
  categories: Category[];
  search(query: string, limit?: number): Promise<MediaItem[]>;
  trending?(limit?: number): Promise<MediaItem[]>;
  byId?(providerId: string): Promise<MediaItem | null>;
}

export function blank(partial: Partial<MediaItem> & { id: string; provider: Provider; providerId: string; title: string; category: Category }): MediaItem {
  return {
    altTitles: [],
    description: null,
    cover: null,
    banner: null,
    author: null,
    artist: null,
    publisher: null,
    releaseYear: null,
    status: "unknown",
    genres: [],
    themes: [],
    demographics: [],
    contentRating: null,
    volumes: null,
    chapters: null,
    score: null,
    popularity: null,
    countryOfOrigin: null,
    originalLanguage: null,
    sourceUrl: "",
    attribution: "",
    readable: false,
    updatedAt: new Date().toISOString(),
    ...partial,
  };
}
