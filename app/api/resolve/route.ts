import { NextResponse } from "next/server";
import { getById } from "@/lib/catalog";
import { resolveReadingSource } from "@/lib/resolve";
import { mangadexChapters } from "@/lib/providers/mangadex";

export const dynamic = "force-dynamic";

/**
 * GET /api/resolve?id=<internal id>[&chapters=1]
 * Finds the MangaDex reading source for a metadata-only title, and optionally
 * returns its chapter list in one round trip.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const item = await getById(id);
  if (!item) return NextResponse.json({ error: "unknown title" }, { status: 404 });

  const resolution = await resolveReadingSource(item);

  if (url.searchParams.get("chapters") && resolution.best) {
    try {
      const all = await mangadexChapters(resolution.best.mangadexId, "en");
      const chapters = all.filter((c) => c.pages > 0);
      return NextResponse.json({ ...resolution, chapters });
    } catch {
      /* fall through without chapters */
    }
  }

  return NextResponse.json(resolution);
}
