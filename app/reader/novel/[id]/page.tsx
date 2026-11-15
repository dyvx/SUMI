import { notFound } from "next/navigation";
import { getById } from "@/lib/catalog";
import { readData } from "@/lib/store";
import { NovelReader } from "@/components/reader/novel-reader";

export const dynamic = "force-dynamic";

export default async function NovelReaderPage({ params }: { params: { id: string } }) {
  const item = await getById(decodeURIComponent(params.id));
  if (!item) notFound();

  const data = await readData();
  const progress = data.progress[item.id];

  // Real text only exists for entries that actually ship readable content.
  const hasRealText = item.readable === true && item.provider === "gutenberg";

  return (
    <NovelReader
      item={item}
      startChapter={Math.max(0, (progress?.chapter ?? 1) - 1)}
      startPercent={progress?.percent ?? 0}
      hasRealText={hasRealText}
    />
  );
}
