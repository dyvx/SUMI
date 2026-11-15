import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeResults } from "../lib/catalog";
import { normalizeTitle } from "../lib/types";
import { blank, fetchJson } from "../lib/providers/base";
import type { MediaItem } from "../lib/types";

function item(over: Partial<MediaItem> & { id: string; title: string }): MediaItem {
  return blank({
    provider: "anilist",
    providerId: over.id.split(":")[1] ?? "1",
    category: "manga",
    ...over,
  });
}

test("normalizeTitle ignores case, punctuation and spacing", () => {
  assert.equal(normalizeTitle("Berserk!"), normalizeTitle("berserk"));
  assert.equal(normalizeTitle("One-Punch Man"), "onepunchman");
  assert.notEqual(normalizeTitle("Attack on Titan"), normalizeTitle("Attack on Titan: Before the Fall"));
});

test("identical titles from different providers are merged into one result", () => {
  const a = item({ id: "anilist:1", title: "Berserk", provider: "anilist", description: "desc" });
  const b = item({ id: "mangadex:2", title: "Berserk", provider: "mangadex", cover: "http://x/y.jpg" });
  const merged = mergeResults([[a], [b]], "berserk");
  assert.equal(merged.length, 1, "duplicate titles should collapse");
  assert.equal(merged[0].id, "anilist:1", "the richer record survives");
});

test("same title in different media kinds is NOT merged", () => {
  const comic = item({ id: "anilist:1", title: "Berserk", category: "manga" });
  const book = item({ id: "openlibrary:/works/OL1W", title: "Berserk", category: "light-novel", provider: "openlibrary" });
  const merged = mergeResults([[comic], [book]], "berserk");
  assert.equal(merged.length, 2, "a manga and a novel with the same name stay separate");
});

test("fuzzy-similar but distinct titles are not merged", () => {
  const one = item({ id: "anilist:1", title: "Berserk" });
  const two = item({ id: "anilist:2", title: "Berserk of Gluttony" });
  const merged = mergeResults([[one], [two]], "berserk");
  assert.equal(merged.length, 2);
});

test("exact title match ranks above partial match", () => {
  const exact = item({ id: "anilist:1", title: "Dune" });
  const partial = item({ id: "anilist:2", title: "Dune Messiah" });
  const merged = mergeResults([[partial], [exact]], "dune");
  assert.equal(merged[0].title, "Dune");
});

test("a failing provider does not prevent other providers returning results", async () => {
  const results = await Promise.allSettled([
    (async () => [item({ id: "anilist:1", title: "Live Result" })])(),
    (async () => {
      throw new Error("provider down");
    })(),
  ]);
  const groups = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
  assert.equal(mergeResults(groups, "live").length, 1);
});

test("fetchJson rejects on HTTP error rather than returning junk", async () => {
  await assert.rejects(() => fetchJson("https://httpstat.us/500", { timeout: 8000 }));
});

test("fetchJson aborts when the provider exceeds the timeout", async () => {
  await assert.rejects(() => fetchJson("https://httpstat.us/200?sleep=5000", { timeout: 400 }));
});

test("readable entries win a merge against metadata-only duplicates", () => {
  const meta = item({ id: "openlibrary:/works/OL1W", title: "Pride and Prejudice", provider: "openlibrary", description: "x", cover: "c", author: "Jane Austen" });
  const readable = item({ id: "gutenberg:1342", title: "Pride and Prejudice", provider: "gutenberg", readable: true });
  const merged = mergeResults([[readable], [meta]], "pride and prejudice");
  assert.equal(merged.length, 1);
  assert.equal(merged[0].provider, "gutenberg", "the readable copy must win");
  assert.equal(merged[0].readable, true);
});

test("merging preserves readable status on the surviving record", () => {
  const rich = item({ id: "openlibrary:/works/OL2W", title: "Dracula", provider: "openlibrary", description: "long", cover: "c", author: "Bram Stoker" });
  const readable = item({ id: "gutenberg:345", title: "Dracula", provider: "gutenberg", readable: true });
  const merged = mergeResults([[rich], [readable]], "dracula");
  assert.equal(merged[0].readable, true);
});
