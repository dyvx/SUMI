import { notFound } from "next/navigation";
import { getById } from "@/lib/catalog";
import { readData } from "@/lib/store";
import { NovelReader, type NovelChapter } from "@/components/reader/novel-reader";

export const dynamic = "force-dynamic";

/**
 * No authorized text is bundled with third-party metadata entries, so the
 * reader is seeded with clearly-labelled placeholder chapters. This keeps the
 * typography engine, TOC, progress saving and bookmarks fully testable without
 * reproducing copyrighted work.
 */
function buildPlaceholderChapters(itemTitle: string): NovelChapter[] {
  const body = (n: number) =>
    `This is placeholder text for chapter ${n} of “${itemTitle}”. Animus does not bundle copyrighted prose for third-party catalog entries.\n\n` +
    `The reading engine you are looking at is fully functional: type size, line spacing, typeface and theme controls all work, the table of contents navigates, and your position is saved to the database as you scroll. ` +
    `Reload the page and you will return to the same place.\n\n` +
    `To read a real book here, open the Admin panel, attach an authorized plain-text or EPUB-derived chapter to this title, and it will replace this placeholder. ` +
    `Public-domain works from Open Library or Project Gutenberg, your own writing, and licensed material you have permission to store are all supported.\n\n` +
    `Liquid Glass typography is intentionally generous — measure is capped near 65 characters so lines stay comfortable on a phone held in one hand.`;

  return [
    { index: 0, title: "Chapter 1 — Placeholder", body: body(1) },
    { index: 1, title: "Chapter 2 — Placeholder", body: body(2) },
    { index: 2, title: "Chapter 3 — Placeholder", body: body(3) },
  ];
}

export default async function NovelReaderPage({ params }: { params: { id: string } }) {
  const item = await getById(decodeURIComponent(params.id));
  if (!item) notFound();
  const data = await readData();
  const progress = data.progress[item.id];
  const chapters = buildPlaceholderChapters(item.title);
  const startChapter = Math.max(0, (progress?.chapter ?? 1) - 1);

  return <NovelReader item={item} chapters={chapters} startChapter={startChapter} />;
}
