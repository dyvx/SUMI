import { notFound } from "next/navigation";
import { getById } from "@/lib/catalog";
import { readData } from "@/lib/store";
import { ComicReader } from "@/components/reader/comic-reader";

export const dynamic = "force-dynamic";

export default async function ComicReaderPage({
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

  return (
    <ComicReader
      item={item}
      initialChapter={searchParams.chapter}
      startPercent={progress?.percent ?? 0}
    />
  );
}
