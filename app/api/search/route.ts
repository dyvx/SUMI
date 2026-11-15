import { NextResponse } from "next/server";
import { searchAll } from "@/lib/catalog";
import type { Category } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const cat = url.searchParams.get("category");
  const category = CATEGORIES.some((c) => c.id === cat) ? (cat as Category) : undefined;
  if (!q) return NextResponse.json({ results: [], failedProviders: [] });
  const { results, failedProviders } = await searchAll(q, category, 24);
  return NextResponse.json({ count: results.length, results, failedProviders });
}
