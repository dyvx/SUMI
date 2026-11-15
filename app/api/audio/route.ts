import { NextResponse } from "next/server";
import { findAudiobook, getAudiobook } from "@/lib/providers/librivox";
import { cacheGet, cacheKey, cacheSet } from "@/lib/cache";

export const dynamic = "force-dynamic";

/**
 * GET /api/audio?id=<librivoxId>   → full track list
 * GET /api/audio?title=<title>     → best matching recording for a book title
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const title = url.searchParams.get("title");
  if (!id && !title) return NextResponse.json({ error: "id or title required" }, { status: 400 });

  const key = cacheKey("audio", id ?? title ?? "");
  const cached = cacheGet<unknown>(key);
  if (cached) return NextResponse.json(cached);

  try {
    const book = id ? await getAudiobook(id) : await findAudiobook(title!);
    const payload = book ? { available: true, book } : { available: false, book: null };
    cacheSet(key, payload, 30 * 60 * 1000);
    return NextResponse.json(payload);
  } catch (err) {
    return NextResponse.json(
      { available: false, error: err instanceof Error ? err.message : "Audiobook lookup failed" },
      { status: 502 }
    );
  }
}
