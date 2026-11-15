import { NextResponse } from "next/server";
import { readData, saveProgress } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await readData();
  return NextResponse.json(data.progress);
}

export async function POST(req: Request) {
  const body = await req.json();
  const mediaId = body?.mediaId;
  if (!mediaId) return NextResponse.json({ error: "mediaId is required" }, { status: 400 });
  const data = await saveProgress({
    mediaId,
    chapter: Number(body.chapter) || 0,
    page: Number(body.page) || 0,
    totalPages: Number(body.totalPages) || 0,
    percent: Math.max(0, Math.min(100, Number(body.percent) || 0)),
  });
  return NextResponse.json({ ok: true, progress: data.progress[mediaId] });
}
