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
      const chapters = await mangadexChapters(mangaId, url.searchParams.get("lang") ?? "en");
      return NextResponse.json({ chapters });
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
