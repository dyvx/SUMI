import { cacheGet, cacheKey, cacheSet } from "../cache";
import { fetchJson } from "./base";

/** Real AniList relations (adaptations, sequels, side stories). Never invented. */
const QUERY = `query($id:Int){
  Media(id:$id, type:MANGA){
    relations{
      edges{
        relationType
        node{
          id type
          title{ romaji english }
          coverImage{ large }
          siteUrl
        }
      }
    }
  }
}`;

interface Edge {
  relationType: string;
  node: {
    id: number;
    type: string;
    title: { romaji: string | null; english: string | null };
    coverImage: { large: string | null } | null;
    siteUrl: string | null;
  };
}

export async function anilistRelations(providerId: string) {
  const key = cacheKey("relations", providerId);
  const cached = cacheGet<ReturnType<typeof map>>(key);
  if (cached) return cached;

  const data = await fetchJson<{ data: { Media: { relations: { edges: Edge[] } } | null } }>(
    "https://graphql.anilist.co",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: QUERY, variables: { id: Number(providerId) } }),
      timeout: 9000,
    }
  );
  const edges = data?.data?.Media?.relations?.edges ?? [];
  const mapped = map(edges);
  if (mapped.length) cacheSet(key, mapped, 60 * 60 * 1000);
  return mapped;
}

function map(edges: Edge[]) {
  return edges
    .map((e) => ({
      title: e.node.title.english ?? e.node.title.romaji ?? "Untitled",
      relation: e.relationType.replace(/_/g, " ").toLowerCase(),
      cover: e.node.coverImage?.large ?? null,
      url: e.node.siteUrl,
    }))
    .slice(0, 8);
}
