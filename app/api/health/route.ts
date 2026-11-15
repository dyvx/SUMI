import { NextResponse } from "next/server";
import { getHealth } from "@/lib/catalog";
import { PROVIDERS } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  const health = getHealth();
  return NextResponse.json({
    providers: PROVIDERS.map((p) => ({
      id: p.id,
      label: p.label,
      attribution: p.attribution,
      categories: p.categories,
    })),
    health,
    checkedAt: new Date().toISOString(),
  });
}
