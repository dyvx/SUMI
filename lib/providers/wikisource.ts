import { blank, fetchJson, type ProviderAdapter } from "./base";
import type { Category, MediaItem } from "../types";

/**
 * Wikisource — public-domain texts across many languages, with real chapter
 * subpages. Text is fetched live from the Wikisource API and never rehosted.
 */

const LANGS = ["en", "zh"] as const;
type Lang = (typeof LANGS)[number];

interface SearchHit {
  title: string;
  snippet: string;
  pageid: number;
  wordcount?: number;
}
interface SearchResponse {
  query?: { search: SearchHit[] };
}
interface PagesResponse {
  query?: { pages?: Record<string, { title: string; lastrevid?: number }> };
}
interface ParseResponse {
  parse?: { text?: { "*": string }; title?: string };
}

function api(lang: Lang) {
  return `https://${lang}.wikisource.org/w/api.php`;
}

function stripHtml(html: string): string {
  let t = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<sup[\s\S]*?<\/sup>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ");
  t = t
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–");
  t = t.replace(/[ \t\u00a0]+/g, " ");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

function guessCategory(lang: Lang, title: string): Category {
  if (lang === "zh") return "light-novel";
  if (/poem|essay|speech|treaty|constitution|declaration/i.test(title)) return "light-novel";
  return "light-novel";
}

function toItem(lang: Lang, hit: SearchHit): MediaItem {
  const clean = stripHtml(hit.snippet).replace(/\s+/g, " ").trim();
  return blank({
    id: `wikisource:${lang}:${hit.title}`,
    provider: "wikisource",
    providerId: `${lang}:${hit.title}`,
    title: hit.title,
    category: guessCategory(lang, hit.title),
    description: clean || null,
    originalLanguage: lang,
    genres: lang === "zh" ? ["Classics", "Wuxia", "Historical"] : ["Classics", "Public Domain"],
    sourceUrl: `https://${lang}.wikisource.org/wiki/${encodeURIComponent(hit.title.replace(/ /g, "_"))}`,
    attribution: `Public-domain text from ${lang}.wikisource.org`,
    readable: true,
  });
}

export const wikisource: ProviderAdapter = {
  id: "wikisource",
  label: "Wikisource",
  attribution: "Public-domain texts from Wikisource",
  categories: ["light-novel"],

  async search(query, limit = 20) {
    const out: MediaItem[] = [];
    await Promise.all(
      LANGS.map(async (lang) => {
        try {
          const url = `${api(lang)}?action=query&list=search&srsearch=${encodeURIComponent(
            query
          )}&srlimit=${Math.min(limit, 10)}&srnamespace=0&format=json&origin=*`;
          const data = await fetchJson<SearchResponse>(url, { timeout: 8000 });
          for (const hit of data.query?.search ?? []) out.push(toItem(lang, hit));
        } catch {
          /* one language failing must not kill the other */
        }
      })
    );
    return out.slice(0, limit);
  },

  async byId(providerId) {
    const sep = providerId.indexOf(":");
    const lang = providerId.slice(0, sep) as Lang;
    const title = providerId.slice(sep + 1);
    if (!LANGS.includes(lang) || !title) return null;
    const url = `${api(lang)}?action=query&titles=${encodeURIComponent(title)}&prop=info&format=json`;
    try {
      const data = await fetchJson<PagesResponse>(url);
      const pages = data.query?.pages ?? {};
      const page = Object.values(pages)[0];
      if (!page) return null;
      return toItem(lang, { title: page.title, snippet: "", pageid: 0 });
    } catch {
      return null;
    }
  },
};

export interface WikiChapter {
  index: number;
  title: string;
  page: string;
}

/** Natural sort: "Chapter 2" before "Chapter 10". */
function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

/** List a work's chapter subpages; falls back to the page itself. */
export async function wikisourceChapters(providerId: string): Promise<WikiChapter[]> {
  const sep = providerId.indexOf(":");
  const lang = providerId.slice(0, sep) as Lang;
  const title = providerId.slice(sep + 1);
  if (!LANGS.includes(lang)) throw new Error("Unsupported language");

  const url = `${api(lang)}?action=query&generator=allpages&gapprefix=${encodeURIComponent(
    title
  )}/&gaplimit=500&gapnamespace=0&prop=info&format=json`;
  try {
    const data = await fetchJson<PagesResponse>(url, { timeout: 10000 });
    const pages = Object.values(data.query?.pages ?? {})
      .map((p) => p.title)
      .sort(naturalCompare);
    if (pages.length) {
      return pages.map((p, i) => ({
        index: i,
        title: p.replace(`${title}/`, ""),
        page: p,
      }));
    }
  } catch {
    /* fall through to single page */
  }
  return [{ index: 0, title, page: title }];
}

const textCache = new Map<string, string>();

export async function wikisourceText(lang: Lang, page: string): Promise<string> {
  const key = `${lang}:${page}`;
  const cached = textCache.get(key);
  if (cached) return cached;

  const url = `${api(lang)}?action=parse&page=${encodeURIComponent(
    page
  )}&prop=text&format=json&redirects=1&disableeditsection=1`;
  const data = await fetchJson<ParseResponse>(url, { timeout: 15000 });
  const html = data.parse?.text?.["*"];
  if (!html) throw new Error("No text returned for this page");

  let text = stripHtml(html);

  // Wikisource puts a prev/next navigation bar above the body. Cut past it.
  const arrow = text.indexOf("\u2192");
  if (arrow > 0 && arrow < 1200) text = text.slice(arrow + 1);

  // Remove interface furniture that survives HTML stripping.
  text = text
    .replace(/Listen to this text[^\n]*/gi, "")
    .replace(/\bsp sister projects\b[:\s]*[^\n]*/gi, "")
    .replace(/^\s*\n+/, "")
    .trim();

  // Drop lingering one-word nav fragments at the very top (e.g. "←", "Chapter 2").
  const lines = text.split("\n");
  let start = 0;
  while (start < Math.min(lines.length, 6)) {
    const l = lines[start].trim();
    if (l === "" || l === "\u2190" || l === "\u2192" || /^Chapter \d+$/.test(l)) start++;
    else break;
  }
  text = lines.slice(start).join("\n").trim();
  if (text.length < 40) throw new Error("This page has no readable body text.");
  textCache.set(key, text);
  return text;
}

export function parseWikiId(providerId: string): { lang: Lang; title: string } {
  const sep = providerId.indexOf(":");
  return { lang: providerId.slice(0, sep) as Lang, title: providerId.slice(sep + 1) };
}
