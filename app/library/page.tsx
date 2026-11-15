import Link from "next/link";
import { readData } from "@/lib/store";
import { Grid, EmptyState } from "@/components/media";
import type { LibraryEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

const TABS: { id: LibraryEntry["status"] | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "reading", label: "Reading" },
  { id: "plan", label: "Plan to read" },
  { id: "completed", label: "Completed" },
  { id: "on-hold", label: "On hold" },
  { id: "dropped", label: "Dropped" },
  { id: "favorite", label: "Favourites" },
];

export default async function LibraryPage({ searchParams }: { searchParams: { tab?: string } }) {
  const data = await readData();
  const tab = (TABS.find((t) => t.id === searchParams.tab)?.id ?? "all") as LibraryEntry["status"] | "all";
  const entries = tab === "all" ? data.library : data.library.filter((e) => e.status === tab);
  const progressValues = Object.values(data.progress);
  const avg = progressValues.length
    ? Math.round(progressValues.reduce((a, p) => a + p.percent, 0) / progressValues.length)
    : 0;
  const totalChapters = progressValues.reduce((a, p) => a + p.chapter, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Your library</h1>
        <p className="mt-1 text-[13px] text-white/45">Private to this device. Everything persists across sessions.</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["In library", data.library.length],
          ["In progress", progressValues.length],
          ["Chapters read", totalChapters],
          ["Average progress", `${avg}%`],
        ].map(([label, value]) => (
          <div key={label as string} className="glass-panel sheen px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">{label}</p>
            <p className="mt-1 text-xl font-bold tracking-tight">{value}</p>
          </div>
        ))}
      </div>

      <div className="scroll-x -mx-1 px-1">
        {TABS.map((t) => {
          const count = t.id === "all" ? data.library.length : data.library.filter((e) => e.status === t.id).length;
          return (
            <Link key={t.id} href={`/library?tab=${t.id}`} className="nav-link shrink-0" data-active={t.id === tab}>
              {t.label} {count > 0 && <span className="ml-1 text-[11px] opacity-60">{count}</span>}
            </Link>
          );
        })}
      </div>

      {entries.length ? (
        <Grid items={entries.map((e) => e.media)} />
      ) : (
        <EmptyState
          title="Nothing here yet"
          hint="Open any title and use “Add to library” to shelve it. Your shelves are private and stored locally."
        />
      )}

      {data.recent.length > 0 && (
        <section>
          <h2 className="section-title mb-2 px-1">Reading history</h2>
          <div className="glass-panel divide-y divide-white/[0.07]">
            {data.recent.slice(0, 12).map((r) => (
              <Link
                key={r.mediaId + r.at}
                href={`/title/${encodeURIComponent(r.mediaId)}`}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px] transition hover:bg-white/[0.05]"
              >
                <span className="truncate">{r.media.title}</span>
                <span className="shrink-0 text-[11px] text-white/30">
                  {new Date(r.at).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
