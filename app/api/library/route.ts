import { NextResponse } from "next/server";
import { readData, setLibraryStatus } from "@/lib/store";
import type { LibraryEntry, MediaItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await readData();
  return NextResponse.json(data.library);
}

export async function POST(req: Request) {
  const body = (await req.json()) as { media: MediaItem; status: LibraryEntry["status"] | null };
  if (!body?.media?.id) return NextResponse.json({ error: "media is required" }, { status: 400 });
  const data = await setLibraryStatus(body.media, body.status);
  return NextResponse.json({ ok: true, library: data.library });
}
