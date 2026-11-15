import { NextResponse } from "next/server";
import { gutenbergChapters } from "@/lib/providers/gutenberg";
import { wikisourceChapters, wikisourceText, parseWikiId } from "@/lib/providers/wikisource";
import { cacheGet, cacheKey, cacheSet } from "@/lib/cache";

export const dynamic = "force-dynamic";

/**
 * One endpoint for every readable text source.
 *   GET /api/text?id=gutenberg:1342               → { total, chapters[{index,title}] }
 *   GET /api/text?id=gutenberg:1342&chapter=0     → { chapter:{title, body} }
 *   GET /api/text?id=wikisource:en:Some_Work&...  → same shape
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const chapterParam = url.searchParams.get("chapter");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const [provider, ...rest] = id.split(":");
  const providerId = rest.join(":");
  const hasChapter = chapterParam !== null && chapterParam !== undefined;

  const key = cacheKey("text", id, hasChapter ? chapterParam : "toc");
  const cached = cacheGet<unknown>(key);
  if (cached) return NextResponse.json(cached);

  try {
    let payload: unknown;

    if (provider === "gutenberg") {
      const chapters = await gutenbergChapters(providerId);
      if (hasChapter) {
        const i = Math.max(0, Math.min(chapters.length - 1, Number(chapterParam) || 0));
        payload = {
          total: chapters.length,
          chapter: { index: i, title: chapters[i].title, body: chapters[i].body },
        };
      } else {
        payload = {
          total: chapters.length,
          source: "Project Gutenberg",
          chapters: chapters.map((c) => ({ index: c.index, title: c.title, length: c.body.length })),
        };
      }
    } else if (provider === "wikisource") {
      const chapters = await wikisourceChapters(providerId);
      if (hasChapter) {
        const i = Math.max(0, Math.min(chapters.length - 1, Number(chapterParam) || 0));
        const { lang } = parseWikiId(providerId);
        const body = await wikisourceText(lang, chapters[i].page);
        payload = { total: chapters.length, chapter: { index: i, title: chapters[i].title, body } };
      } else {
        payload = {
          total: chapters.length,
          source: "Wikisource",
          chapters: chapters.map((c) => ({ index: c.index, title: c.title, length: 0 })),
        };
      }
    } else {
      return NextResponse.json({ error: `Provider "${provider}" has no text.` }, { status: 400 });
    }

    cacheSet(key, payload, hasChapter ? 60 * 60 * 1000 : 15 * 60 * 1000);
    return NextResponse.json(payload);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not load text" },
      { status: 502 }
    );
  }
}
