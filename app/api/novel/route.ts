import { NextResponse } from "next/server";
import { gutenbergChapters } from "@/lib/providers/gutenberg";

export const dynamic = "force-dynamic";

/**
 * GET /api/novel?id=<gutenbergId>            → chapter index (titles + sizes)
 * GET /api/novel?id=<gutenbergId>&chapter=3  → one chapter's text
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const chapter = url.searchParams.get("chapter");

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  try {
    const chapters = await gutenbergChapters(id);

    if (chapter !== null && chapter !== undefined) {
      const idx = Math.max(0, Math.min(chapters.length - 1, Number(chapter) || 0));
      const c = chapters[idx];
      return NextResponse.json({
        total: chapters.length,
        chapter: { index: c.index, title: c.title, body: c.body },
      });
    }

    return NextResponse.json({
      total: chapters.length,
      source: "Project Gutenberg (public domain)",
      chapters: chapters.map((c) => ({ index: c.index, title: c.title, length: c.body.length })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not load this book" },
      { status: 502 }
    );
  }
}
