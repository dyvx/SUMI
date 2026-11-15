import { NextResponse } from "next/server";
import { readData, updateSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await readData();
  return NextResponse.json(data.settings);
}

export async function POST(req: Request) {
  const patch = await req.json();
  const allowed = ["homepageSections", "readerDirection", "novelFontSize", "novelTheme"] as const;
  const clean: Record<string, unknown> = {};
  for (const k of allowed) if (k in patch) clean[k] = patch[k];
  const data = await updateSettings(clean);
  return NextResponse.json({ ok: true, settings: data.settings });
}
