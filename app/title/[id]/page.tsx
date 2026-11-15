import Link from "next/link";
import { notFound } from "next/navigation";
import { getById } from "@/lib/catalog";
import { mangadexChapters } from "@/lib/providers/mangadex";
import { readData, trackRecent } from "@/lib/store";
import { CATEGORIES, mediaKind } from "@/lib/types";
import type { MdChapter } from "@/lib/providers/mangadex";
import { LibraryButtons } from "@/components/library-buttons";

export const dynamic = "force-dynamic";

export default async function TitlePage({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id);
  const item = await getById(id);
  if (!item) notFound();

  // Record the visit for "Recently viewed". Never let this break the page.
  trackRecent(item).catch(() => {});

  const data = await readData();
  const entry = data.library.find((l) => l.media.id === item.id) ?? null;
  const progress = data.progress[item.id] ?? null;
  const kind = mediaKind(item.category);

  let chapters: MdChapter[] = [];
  if (item.provider === "mangadex") {
    try {
      chapters = await mangadexChapters(item.providerId, "en");
    } catch {
      chapters = [];
    }
  }

  const readerHref =
    kind === "vn"
      ? `/reader/vn/${encodeURIComponent(item.id)}`
      : kind === "comic"
        ? `/reader/comic/${encodeURIComponent(item.id)}`
        : `/reader/novel/${encodeURIComponent(item.id)}`;

  const readable = item.readable === true;

  return (
    <div className="space-y-7">
      {/* Banner */}
      <div className="relative -mx-3 -mt-4 h-52 overflow-hidden sm:-mx-6 sm:h-72">
        {item.banner || item.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.banner || item.cover || ""} alt="" className="h-full w-full object-cover opacity-40" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-[#08080b] via-[#08080b]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#08080b]/80 to-transparent" />
      </div>

      <div className="-mt-28 flex flex-col gap-5 sm:-mt-36 sm:flex-row sm:items-end">
        <div className="w-32 shrink-0 overflow-hidden rounded-2xl border border-white/15 shadow-2xl sm:w-48">
          <div className="aspect-[2/3] bg-white/5">
            {item.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.cover} alt={item.title} className="h-full w-full object-cover" />
            ) : null}
          </div>
        </div>
        <div className="min-w-0 flex-1 pb-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="pill pill-accent">{CATEGORIES.find((c) => c.id === item.category)?.label}</span>
            <span className="pill">{item.status}</span>
            {item.contentRating && <span className="pill">{item.contentRating}</span>}
          </div>
          <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight sm:text-4xl">{item.title}</h1>
          {item.altTitles.length > 0 && (
            <p className="mt-1 line-clamp-1 text-[12.5px] text-white/40">{item.altTitles.join(" · ")}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link href={readerHref} className="btn btn-primary">
              {progress ? `Continue · Ch. ${progress.chapter}` : kind === "vn" ? "Open scene" : "Start reading"}
            </Link>
            <LibraryButtons item={item} initial={entry?.status ?? null} />
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          {item.description && (
            <section className="glass-panel p-4">
              <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wider text-white/45">Synopsis</h2>
              <p className="whitespace-pre-line text-[14px] leading-relaxed text-white/75">{item.description}</p>
            </section>
          )}

          {item.genres.length > 0 && (
            <section className="glass-panel p-4">
              <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wider text-white/45">Genres</h2>
              <div className="flex flex-wrap gap-1.5">
                {item.genres.map((g) => (
                  <Link key={g} href={`/search?q=${encodeURIComponent(g)}`} className="pill">
                    {g}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {kind === "comic" && (
            <section className="glass-panel p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[13px] font-bold uppercase tracking-wider text-white/45">Chapters</h2>
                <span className="text-[11.5px] text-white/30">
                  {chapters.length ? `${chapters.length} available` : "not listed"}
                </span>
              </div>
              {chapters.length ? (
                <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
                  {chapters.slice(0, 200).map((c) => (
                    <Link
                      key={c.id}
                      href={`/reader/comic/${encodeURIComponent(item.id)}?chapter=${c.id}`}
                      className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2 text-[13px] transition hover:bg-white/[0.09]"
                    >
                      <span className="truncate">
                        {c.chapter ? `Chapter ${c.chapter}` : "Oneshot"}
                        {c.title ? ` — ${c.title}` : ""}
                      </span>
                      <span className="ml-2 shrink-0 text-[11px] text-white/30">{c.pages}p</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] leading-relaxed text-white/45">
                  {item.provider === "mangadex"
                    ? "No English chapters are indexed for this title, so reading pages aren’t available. All metadata is still shown."
                    : "This provider supplies metadata only. Attach an authorized reading source in Admin to enable the reader."}
                </p>
              )}
            </section>
          )}

          {kind !== "comic" && (
            <section className="glass-panel p-4">
              <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wider text-white/45">Reading</h2>
              {readable ? (
                <>
                  <p className="text-[13.5px] leading-relaxed text-white/70">
                    Full text available — public domain, served live from Project Gutenberg. Real chapters,
                    real pagination, remembered position.
                  </p>
                  <Link href={readerHref} className="btn btn-primary mt-3">
                    Read full book
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-[13.5px] leading-relaxed text-white/50">
                    This provider supplies metadata only — no text is bundled, and Animus does not host
                    copyrighted prose. Browse the public-domain collection to read something in full.
                  </p>
                  <Link href="/explore?category=web-novel" className="btn btn-glass mt-3">
                    Browse readable books
                  </Link>
                </>
              )}
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <section className="glass-panel divide-y divide-white/[0.07] text-[13px]">
            {[
              ["Author", item.author],
              ["Artist", item.artist],
              ["Publisher", item.publisher],
              ["Released", item.releaseYear?.toString()],
              ["Volumes", item.volumes?.toString()],
              ["Chapters", item.chapters?.toString()],
              ["Origin", item.countryOfOrigin],
              ["Language", item.originalLanguage],
              ["Score", item.score ? `${item.score}/100` : null],
              ["Source", item.provider],
            ].map(([k, v]) =>
              v ? (
                <div key={k as string} className="flex items-start justify-between gap-3 px-4 py-2.5">
                  <span className="text-white/40">{k}</span>
                  <span className="text-right font-medium text-white/85">{v}</span>
                </div>
              ) : null
            )}
          </section>

          {progress && (
            <section className="glass-panel p-4">
              <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wider text-white/45">Your progress</h2>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-crimson-500" style={{ width: `${progress.percent}%` }} />
              </div>
              <p className="mt-2 text-[12.5px] text-white/50">
                Chapter {progress.chapter} · {Math.round(progress.percent)}%
              </p>
            </section>
          )}

          <section className="glass-panel p-4">
            <h2 className="mb-1.5 text-[13px] font-bold uppercase tracking-wider text-white/45">Attribution</h2>
            <p className="text-[12px] leading-relaxed text-white/45">{item.attribution}</p>
            <a href={item.sourceUrl} target="_blank" rel="noreferrer noopener" className="mt-2 inline-block text-[12px] font-semibold text-violet-300/80">
              Open original ↗
            </a>
            <p className="mt-2 text-[10.5px] text-white/25">Provider ID: {item.providerId}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
