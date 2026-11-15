import { notFound } from "next/navigation";
import { getById } from "@/lib/catalog";
import { VnReader } from "@/components/reader/vn-reader";

export const dynamic = "force-dynamic";

export default async function VnReaderPage({ params }: { params: { id: string } }) {
  const item = await getById(decodeURIComponent(params.id));
  if (!item) notFound();
  return <VnReader item={item} />;
}
