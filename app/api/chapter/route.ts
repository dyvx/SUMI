import { NextResponse } from "next/server";
import { mangadexChapters, mangadexPageUrls } from "@/lib/providers/mangadex";

export const dynamic = "force-dynamic";

/**
 * Chapters for a MangaDex title (?mangaId=...), or page images for one chapter
 * (?chapterId=...). Pages are resolved through MangaDex's official @home
 * endpoint; we never cache or rehost the images.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mangaId = url.searchParams.get("mangaId");
  const chapterId = url.searchParams.get("chapterId");
  try {
    if (mangaId) {
      const all = await mangadexChapters(mangaId, url.searchParams.get("lang") ?? "en");
      // Drop rows with no images — they are dead entries and would break the reader.
      const chapters = all.filter((c) => c.pages > 0);
      return NextResponse.json({ chapters, hidden: all.length - chapters.length });
    }
    if (chapterId) {
      const pages = await mangadexPageUrls(chapterId);
      return NextResponse.json({ pages });
    }
    return NextResponse.json({ error: "mangaId or chapterId required" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Chapter request failed" },
      { status: 502 }
    );
  }
}
