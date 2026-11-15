import { NextResponse } from "next/server";
import { readData } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await readData();
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="animus-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
