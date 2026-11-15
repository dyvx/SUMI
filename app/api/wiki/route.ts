import { NextResponse } from "next/server";
import { wikisourceChapters, wikisourceText, parseWikiId } from "@/lib/providers/wikisource";

export const dynamic = "force-dynamic";

/**
 * GET /api/wiki?id=<lang>:<title>            → chapter list
 * GET /api/wiki?id=<lang>:<title>&chapter=3  → that chapter's real text
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const chapter = url.searchParams.get("chapter");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  try {
    const chapters = await wikisourceChapters(id);
    if (chapter !== null && chapter !== undefined) {
      const idx = Math.max(0, Math.min(chapters.length - 1, Number(chapter) || 0));
      const c = chapters[idx];
      const { lang } = parseWikiId(id);
      const body = await wikisourceText(lang, c.page);
      return NextResponse.json({
        total: chapters.length,
        chapter: { index: idx, title: c.title, body },
      });
    }
    return NextResponse.json({
      total: chapters.length,
      source: "Wikisource (public domain)",
      chapters: chapters.map((c) => ({ index: c.index, title: c.title, length: 0 })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not load this work" },
      { status: 502 }
    );
  }
}
