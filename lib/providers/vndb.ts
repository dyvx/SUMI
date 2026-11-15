import { blank, fetchJson, type ProviderAdapter } from "./base";
import type { MediaItem } from "../types";

const API = "https://api.vndb.org/kana";

interface VnResult {
  id: string;
  title: string;
  alttitle: string | null;
  released: string | null;
  description: string | null;
  image: { url: string; sexual: number } | null;
  rating: number | null;
  votecount: number | null;
  length_minutes: number | null;
  tags: { name: string; rating: number }[] | null;
  developers: { name: string }[] | null;
}

function toItem(v: VnResult): MediaItem {
  return blank({
    id: `vndb:${v.id}`,
    provider: "vndb",
    providerId: v.id,
    title: v.title,
    altTitles: v.alttitle ? [v.alttitle] : [],
    category: "visual-novel",
    description: v.description,
    cover: v.image?.url ?? null,
    author: v.developers?.[0]?.name ?? null,
    publisher: v.developers?.[0]?.name ?? null,
    releaseYear: v.released ? Number(v.released.slice(0, 4)) : null,
    genres: (v.tags ?? []).slice(0, 10).map((t) => t.name),
    score: v.rating ? Math.round(v.rating / 10) : null,
    popularity: v.votecount,
    sourceUrl: `https://vndb.org/${v.id}`,
    attribution: "Metadata from VNDB (vndb.org)",
  });
}

const FIELDS = "id,title,alttitle,released,description,image.url,rating,votecount,length_minutes,tags.name,tags.rating,developers.name";

async function vndbQuery(body: Record<string, unknown>): Promise<VnResult[]> {
  const res = await fetchJson<{ results: VnResult[] }>(`${API}/vn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: FIELDS, ...body }),
  });
  return res.results ?? [];
}

export const vndb: ProviderAdapter = {
  id: "vndb",
  label: "VNDB",
  attribution: "Metadata from VNDB — The Visual Novel Database (vndb.org)",
  categories: ["visual-novel"],

  async search(query, limit = 20) {
    return (await vndbQuery({ filters: ["search", "=", query], results: Math.min(limit, 25) })).map(toItem);
  },

  async trending(limit = 12) {
    return (await vndbQuery({ filters: ["rating", ">=", "60"], sort: "rating", reverse: true, results: limit })).map(toItem);
  },

  async byId(providerId) {
    const id = providerId.startsWith("v") ? providerId : `v${providerId}`;
    const results = await vndbQuery({ filters: ["id", "=", id] });
    return results[0] ? toItem(results[0]) : null;
  },
};
