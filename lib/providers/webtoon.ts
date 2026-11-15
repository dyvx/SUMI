import { blank, type ProviderAdapter } from "./base";
import type { Category, MediaItem } from "../types";

/**
 * WEBTOON (official, Naver/Wattpad) — a second real reading source.
 *
 * MangaDex is the only large page-level manga API and it has no usable English
 * pages for a large share of titles. WEBTOON publishes episodes legally and
 * free, with a stable page-image pipeline, so vertical-scroll series get an
 * actual source instead of an apology.
 *
 * There is no public JSON API for the catalogue, so we read the same
 * server-rendered HTML the site serves to a browser. Nothing is bypassed: no
 * paywall, no fast-pass, no login — only episodes the site shows to anyone.
 */

const BASE = "https://www.webtoons.com";
/** The JSON episode API only answers on the mobile host. */
const MOBILE = "https://m.webtoons.com";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/** providerId = `${genre}/${slug}~${titleNo}` so lists and readers can rebuild URLs. */
export function encodeWebtoonId(titleNo: string, path: string): string {
  return `${path.replace(/^\/+|\/+$/g, "")}~${titleNo}`;
}
export function decodeWebtoonId(id: string): { titleNo: string; path: string } | null {
  const at = id.lastIndexOf("~");
  if (at < 1) return null;
  const path = id.slice(0, at);
  const titleNo = id.slice(at + 1);
  if (!/^\d+$/.test(titleNo) || !path.includes("/")) return null;
  return { titleNo, path };
}

async function getHtml(url: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml", "Accept-Language": "en-US,en;q=0.9" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'" };
function unesc(s: string): string {
  return s.replace(/&(#?\w+);/g, (m, e) => ENTITIES[e] ?? m).trim();
}

function genreOf(path: string): string {
  return path.split("/")[0]?.replace(/-/g, " ") ?? "";
}

interface Card {
  titleNo: string;
  path: string;
  title: string;
  cover: string | null;
}

/** Cards look the same on search, genre and originals pages. */
function parseCards(html: string, limit: number): Card[] {
  const out: Card[] = [];
  const seen = new Set<string>();
  const re = /<a[^>]+href="(?:https:\/\/www\.webtoons\.com)?\/en\/([a-z-]+)\/([a-z0-9-]+)\/list\?title_no=(\d+)"[^>]*>([\s\S]{0,900}?)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && out.length < limit * 2) {
    const [, genre, slug, titleNo, body] = m;
    if (seen.has(titleNo)) continue;
    const title = unesc(body.match(/<strong class="title">([\s\S]*?)<\/strong>/)?.[1] ?? body.match(/class="subj"[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? "");
    if (!title) continue;
    const cover = body.match(/<img[^>]+src="(https:\/\/webtoon-phinf\.pstatic\.net[^"]+)"/)?.[1] ?? null;
    seen.add(titleNo);
    out.push({ titleNo, path: `${genre}/${slug}`, title, cover });
  }
  return out;
}

function toItem(c: Card): MediaItem {
  const genre = genreOf(c.path);
  const category: Category = "webtoon";
  return blank({
    id: `webtoon:${encodeWebtoonId(c.titleNo, c.path)}`,
    provider: "webtoon",
    providerId: encodeWebtoonId(c.titleNo, c.path),
    title: c.title,
    category,
    cover: c.cover,
    genres: genre ? [genre.replace(/\b\w/g, (x) => x.toUpperCase())] : [],
    themes: ["Vertical scroll"],
    status: "releasing",
    countryOfOrigin: "KR",
    sourceUrl: `${BASE}/en/${c.path}/list?title_no=${c.titleNo}`,
    attribution: "Official WEBTOON series — free episodes",
    readable: true,
  });
}

export const webtoon: ProviderAdapter = {
  id: "webtoon",
  label: "WEBTOON",
  attribution: "Official WEBTOON series, free episodes",
  categories: ["webtoon", "manhwa"],

  async search(query, limit = 12) {
    const html = await getHtml(`${BASE}/en/search?keyword=${encodeURIComponent(query)}`);
    const cards = parseCards(html, limit);
    // Keep only genuine title matches first so search stays relevant.
    const q = query.toLowerCase();
    cards.sort((a, b) => Number(b.title.toLowerCase().includes(q)) - Number(a.title.toLowerCase().includes(q)));
    return cards.slice(0, limit).map(toItem);
  },

  async browse(category, limit = 24) {
    const html = await getHtml(`${BASE}/en/originals`);
    const cards = parseCards(html, Math.max(limit * 3, 48));
    return cards.slice(0, limit).map((c) => ({ ...toItem(c), category: category === "manhwa" ? "manhwa" : "webtoon" }));
  },

  async trending(limit = 24) {
    const html = await getHtml(`${BASE}/en/originals`);
    return parseCards(html, limit).map(toItem);
  },

  async byId(providerId) {
    const dec = decodeWebtoonId(providerId);
    if (!dec) return null;
    try {
      const html = await getHtml(`${BASE}/en/${dec.path}/list?title_no=${dec.titleNo}`);
      const title = unesc(html.match(/<meta property="og:title" content="([^"]*)"/)?.[1] ?? "");
      if (!title) return null;
      const cover = html.match(/<meta property="og:image" content="([^"]*)"/)?.[1] ?? null;
      const description = unesc(html.match(/<meta property="og:description" content="([^"]*)"/)?.[1] ?? "");
      const author = html.match(/<p class="author"[^>]*>([\s\S]*?)<\/p>/)?.[1]?.replace(/<[^>]+>/g, "").trim() ?? null;
      return blank({
        id: `webtoon:${providerId}`,
        provider: "webtoon",
        providerId,
        title,
        category: "webtoon",
        description: description || null,
        cover,
        author,
        genres: [genreOf(dec.path).replace(/\b\w/g, (x) => x.toUpperCase())],
        themes: ["Vertical scroll"],
        status: "releasing",
        countryOfOrigin: "KR",
        sourceUrl: `${BASE}/en/${dec.path}/list?title_no=${dec.titleNo}`,
        attribution: "Official WEBTOON series — free episodes",
        readable: true,
      });
    } catch {
      return null;
    }
  },
};

export interface WebtoonEpisode {
  id: string;
  chapter: string;
  title: string;
  pages: number;
  lang: string;
  url: string;
}

function parseEpisodes(html: string): WebtoonEpisode[] {
  const eps: WebtoonEpisode[] = [];
  const re = /<li[^>]+id="episode_(\d+)"[^>]*>([\s\S]*?)<\/li>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const [, no, body] = m;
    const href = body.match(/href="([^"]+)"/)?.[1];
    if (!href) continue;
    const label = unesc(body.match(/class="subj"[^>]*>([\s\S]*?)<\/span>/)?.[1]?.replace(/<[^>]+>/g, "") ?? "");
    eps.push({
      id: href, // absolute viewer URL — the only thing needed to read it
      chapter: no,
      title: label || `Episode ${no}`,
      pages: 0, // filled in when the episode is opened
      lang: "en",
      url: href,
    });
  }
  return eps;
}

/**
 * Episode list in reading order.
 *
 * WEBTOON publishes a cursor-paginated JSON endpoint for its own app; it starts
 * at episode 1 and walks forward, which is exactly reading order. The public
 * HTML list is newest-first and 10 per page, so scraping it made a 650-episode
 * series look like it began at chapter 645. The HTML stays as a fallback.
 */
export async function webtoonEpisodes(providerId: string): Promise<WebtoonEpisode[]> {
  const dec = decodeWebtoonId(providerId);
  if (!dec) return [];

  interface ApiEpisode {
    episodeNo: number;
    episodeTitle: string;
    viewerLink: string;
  }

  const eps: WebtoonEpisode[] = [];
  {
    let cursor: string | null = null;
    for (let page = 0; page < 8; page++) {
      const url = `${MOBILE}/api/v1/webtoon/${dec.titleNo}/episodes?pageSize=200${
        cursor ? `&cursor=${cursor}` : ""
      }`;
      type ApiPage = { result?: { episodeList?: ApiEpisode[]; nextCursor?: string | null } };
      let json: ApiPage | null = null;
      // One slow or throttled page must not discard the pages we already have.
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": UA, Referer: "https://m.webtoons.com/", Accept: "application/json" },
          cache: "no-store",
          signal: AbortSignal.timeout(12000),
        });
        if (res.ok) json = (await res.json()) as ApiPage;
      } catch {
        break;
      }
      const list = json?.result?.episodeList ?? [];
      if (!list.length) break;
      for (const e of list) {
        const viewer = e.viewerLink.startsWith("http") ? e.viewerLink : `${BASE}${e.viewerLink}`;
        eps.push({
          id: viewer,
          chapter: String(e.episodeNo),
          title: e.episodeTitle || `Episode ${e.episodeNo}`,
          pages: 0,
          lang: "en",
          url: viewer,
        });
      }
      const next = json?.result?.nextCursor;
      if (!next) break;
      cursor = String(next);
    }
  }

  if (eps.length) {
    eps.sort((a, b) => Number(a.chapter) - Number(b.chapter));
    return eps;
  }

  // Fallback: HTML list. Newest-first and paginated; page 1 plus the clamped
  // last page is enough to describe a series honestly.
  const listUrl = (page: number) =>
    `${BASE}/en/${dec.path}/list?title_no=${dec.titleNo}${page > 1 ? `&page=${page}` : ""}`;
  const first = await getHtml(listUrl(1));
  const newest = parseEpisodes(first);
  let oldest: WebtoonEpisode[] = [];
  try {
    oldest = parseEpisodes(await getHtml(listUrl(99999)));
  } catch {
    /* ignore */
  }
  const byId = new Map<string, WebtoonEpisode>();
  for (const e of [...oldest, ...newest]) byId.set(e.id, e);
  return [...byId.values()].sort((a, b) => Number(a.chapter) - Number(b.chapter));
}

/** Page images for one episode, in order. */
export function parseEpisodeImages(html: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const re = /data-url="(https:\/\/webtoon-phinf\.pstatic\.net[^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const url = unesc(m[1]);
    if (!seen.has(url)) {
      seen.add(url);
      out.push(url);
    }
  }
  return out;
}

export async function webtoonPages(viewerUrl: string): Promise<{ url: string; page: number }[]> {
  if (!/^https:\/\/www\.webtoons\.com\/en\//.test(viewerUrl)) return [];
  const html = await getHtml(viewerUrl);
  return parseEpisodeImages(html).map((url, i) => ({ url, page: i + 1 }));
}
