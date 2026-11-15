import { notFound } from "next/navigation";
import { getById } from "@/lib/catalog";
import { readData } from "@/lib/store";
import { NovelReader } from "@/components/reader/novel-reader";

export const dynamic = "force-dynamic";

const READABLE_PROVIDERS = ["gutenberg", "wikisource"];

export default async function NovelReaderPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { chapter?: string };
}) {
  const item = await getById(decodeURIComponent(params.id));
  if (!item) notFound();

  const data = await readData();
  const progress = data.progress[item.id];
  const hasRealText = item.readable === true && READABLE_PROVIDERS.includes(item.provider);

  // ?chapter= wins over stored progress so TOC links land exactly where tapped.
  const fromQuery = searchParams.chapter !== undefined ? Number(searchParams.chapter) : null;
  const startChapter =
    fromQuery !== null && Number.isFinite(fromQuery)
      ? Math.max(0, fromQuery)
      : Math.max(0, (progress?.chapter ?? 1) - 1);

  return (
    <NovelReader
      item={item}
      startChapter={startChapter}
      startPercent={fromQuery !== null ? 0 : progress?.percent ?? 0}
      hasRealText={hasRealText}
    />
  );
}
