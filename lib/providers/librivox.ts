import { fetchJson } from "./base";

/**
 * LibriVox — volunteer-recorded public-domain audiobooks.
 * We surface real MP3 track URLs from the LibriVox API and stream them from
 * archive.org. Nothing is downloaded or rehosted.
 */

const API = "https://librivox.org/api/feed/audiobooks";

interface LvSection {
  id: string;
  title: string;
  listen_url: string;
  playtime?: string;
}
interface LvBook {
  id: string;
  title: string;
  description?: string;
  totaltime?: string;
  language?: string;
  authors?: { first_name?: string; last_name?: string }[];
  sections?: LvSection[];
}
interface LvResponse {
  books?: LvBook[];
}

export interface AudioTrack {
  index: number;
  title: string;
  url: string;
  duration: string | null;
}
export interface Audiobook {
  id: string;
  title: string;
  author: string | null;
  totalTime: string | null;
  tracks: AudioTrack[];
  sourceUrl: string;
}

function clean(s: string | undefined): string {
  return (s ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function mapBook(b: LvBook): Audiobook {
  return {
    id: b.id,
    title: clean(b.title),
    author:
      b.authors?.map((a) => clean(`${a.first_name ?? ""} ${a.last_name ?? ""}`)).filter(Boolean).join(", ") ||
      null,
    totalTime: b.totaltime ?? null,
    sourceUrl: `https://librivox.org/book/${b.id}/`,
    tracks: (b.sections ?? []).map((s, i) => ({
      index: i,
      title: clean(s.title) || `Track ${i + 1}`,
      url: s.listen_url,
      duration: s.playtime ?? null,
    })),
  };
}

/** Full track list for one LibriVox book. */
export async function getAudiobook(id: string): Promise<Audiobook | null> {
  const url = `${API}/?id=${encodeURIComponent(id)}&extended=1&format=json`;
  const data = await fetchJson<LvResponse>(url, { timeout: 15000 });
  const book = data.books?.[0];
  if (!book) return null;
  const mapped = mapBook(book);
  return mapped.tracks.length ? mapped : null;
}

/** Find a recording whose title closely matches a book title. */
export async function findAudiobook(title: string): Promise<Audiobook | null> {
  const q = title.replace(/[^\w\s]/g, " ").trim().split(/\s+/).slice(0, 4).join(" ");
  if (!q) return null;
  const url = `${API}/?title=%5E${encodeURIComponent(q)}&limit=5&extended=1&format=json`;
  try {
    const data = await fetchJson<LvResponse>(url, { timeout: 12000 });
    const books = data.books ?? [];
    if (!books.length) return null;
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const target = norm(title);
    const best = books.find((b) => norm(b.title) === target) ?? books.find((b) => norm(b.title).startsWith(target));
    return best ? mapBook(best) : null;
  } catch {
    return null;
  }
}
