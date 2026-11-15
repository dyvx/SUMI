import Link from "next/link";
import { notFound } from "next/navigation";
import { getById } from "@/lib/catalog";
import { enrichItem } from "@/lib/enrich";
import { mangadexChapters } from "@/lib/providers/mangadex";
import { gutenbergChapters } from "@/lib/providers/gutenberg";
import { wikisourceChapters } from "@/lib/providers/wikisource";
import { anilistRelations } from "@/lib/providers/relations";
import { findAudiobook } from "@/lib/providers/librivox";
import { resolveReadingSource } from "@/lib/resolve";
import { readData, trackRecent } from "@/lib/store";
import { CATEGORIES, mediaKind, imgUrl } from "@/lib/types";
import type { MdChapter } from "@/lib/providers/mangadex";
import { LibraryButtons } from "@/components/library-buttons";
import { Cover } from "@/components/media";
import { Reveal } from "@/components/reveal";

export const dynamic = "force-dynamic";

interface TocEntry {
  index: number;
  label: string;
  meta?: string;
  href: string;
}

export default async function TitlePage({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id);
  const found = await getById(id);
  // Merge in what other databases know (score, genres, authors, alt titles).
  const item = found ? (await enrichItem(found)).item : null;
  if (!item) notFound();

  trackRecent(item).catch(() => {});

  const [data, related] = await Promise.all([
    readData(),
    item.provider === "anilist" ? anilistRelations(item.providerId).catch(() => []) : Promise.resolve([]),
  ]);

  const entry = data.library.find((l) => l.media.id === item.id) ?? null;
  const progress = data.progress[item.id] ?? null;
  const kind = mediaKind(item.category);
  const readable = item.readable === true;

  const base =
    kind === "comic"
      ? `/reader/comic/${encodeURIComponent(item.id)}`
      : `/reader/novel/${encodeURIComponent(item.id)}`;

  // Build a real table of contents per source.
  let toc: TocEntry[] = [];
  let tocNote: string | null = null;

  let resolvedFrom: string | null = null;

  if (item.provider === "mangadex") {
    let chapters: MdChapter[] = [];
    try {
      chapters = await mangadexChapters(item.providerId, "en");
    } catch {
      chapters = [];
    }
    toc = chapters.slice(0, 300).map((c) => ({
      index: Number(c.chapter) || 0,
      label: c.chapter ? `Chapter ${c.chapter}` : "Oneshot",
      meta: `${c.pages}p`,
      href: `${base}?chapter=${c.id}`,
    }));
    if (!toc.length) {
      tocNote =
        "No English chapters are indexed for this title — popular series are frequently removed from MangaDex. Metadata is intact; reading pages are not available from this source.";
    }
  } else if (kind === "comic") {
    // Metadata-only comic: try to locate a real reading source.
    const res = await resolveReadingSource(item).catch(() => null);
    if (res?.found && res.best) {
      resolvedFrom = res.best.title;
      try {
        const chapters = await mangadexChapters(res.best.mangadexId, "en");
        toc = chapters.slice(0, 300).map((c) => ({
          index: Number(c.chapter) || 0,
          label: c.chapter ? `Chapter ${c.chapter}` : "Oneshot",
          meta: `${c.pages}p`,
          href: `${base}?chapter=${c.id}`,
        }));
      } catch {
        toc = [];
      }
    }
    if (!toc.length) {
      tocNote =
        res?.reason ??
        "No readable source was found for this title. Animus shows the metadata but will not fabricate pages.";
    }
  } else if (item.provider === "gutenberg") {
    try {
      const ch = await gutenbergChapters(item.providerId);
      toc = ch.map((c) => ({
        index: c.index,
        label: c.title,
        meta: `${Math.round(c.body.length / 1000)}k`,
        href: `${base}?chapter=${c.index}`,
      }));
    } catch {
      tocNote = "The full text for this book could not be fetched right now.";
    }
  } else if (item.provider === "wikisource") {
    try {
      const ch = await wikisourceChapters(item.providerId);
      toc = ch.map((c) => ({ index: c.index, label: c.title, href: `${base}?chapter=${c.index}` }));
    } catch {
      tocNote = "The Wikisource page list could not be loaded right now.";
    }
  } else {
    tocNote = `This provider (${item.provider}) supplies metadata only — no reading text is bundled, and Animus does not host copyrighted material.`;
  }

  // Real audiobook match, only where a recording plausibly exists.
  const audiobook = readable ? await findAudiobook(item.title).catch(() => null) : null;

  return (
    <div className="space-y-6">
      {/* Cinematic backdrop */}
      <div className="relative -mx-3 -mt-4 h-64 overflow-hidden sm:-mx-6 sm:h-80">
        {(item.banner || item.cover) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgUrl(item.banner || item.cover) || ""}
            alt=""
            className="h-full w-full scale-105 object-cover opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#08080b] via-[#08080b]/65 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#08080b]/85 via-transparent to-transparent" />
      </div>

      <div className="-mt-32 flex flex-col gap-5 sm:-mt-40 sm:flex-row sm:items-end">
        <div className="w-32 shrink-0 overflow-hidden rounded-2xl border border-white/15 shadow-2xl sm:w-48">
          <div className="aspect-[2/3]">
            <Cover item={item} className="h-full w-full" priority />
          </div>
        </div>
        <div className="min-w-0 flex-1 pb-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="pill pill-accent">{CATEGORIES.find((c) => c.id === item.category)?.label}</span>
            <span className="pill">{item.status}</span>
            {readable && <span className="pill border-emerald-400/40 bg-emerald-500/15 text-emerald-200">Readable</span>}
            {audiobook && <span className="pill border-sky-400/40 bg-sky-500/15 text-sky-200">Audio</span>}
            {item.contentRating && <span className="pill">{item.contentRating}</span>}
          </div>
          <h1 className="mt-2 text-2xl font-bold leading-[1.08] tracking-tight sm:text-4xl">{item.title}</h1>
          {item.altTitles.length > 0 && (
            <p className="mt-1 line-clamp-1 text-[12.5px] text-white/40">{item.altTitles.join(" · ")}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link href={base} className="btn btn-primary">
              {progress ? `Continue · Ch. ${progress.chapter}` : false ? "Open scene" : "Start reading"}
            </Link>
            <LibraryButtons item={item} initial={entry?.status ?? null} />
            {item.sourceUrl && (
              <a href={item.sourceUrl} target="_blank" rel="noreferrer noopener" className="btn btn-glass">
                Source ↗
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_330px]">
        <div className="space-y-5">
          {item.description && (
            <Reveal>
              <section className="glass-panel p-4">
                <h2 className="mb-2 text-[12px] font-bold uppercase tracking-[0.14em] text-white/40">Synopsis</h2>
                <p className="whitespace-pre-line text-[14.5px] leading-[1.75] text-white/78">{item.description}</p>
              </section>
            </Reveal>
          )}

          {/* Table of contents / chapters */}
          <Reveal>
            <section className="glass-panel p-4">
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/40">
                  {toc.length ? `Contents · ${toc.length}` : "Contents"}
                </h2>
                {toc.length > 0 && (
                  <Link href={base} className="text-[12px] font-semibold text-violet-300/80">
                    Open reader
                  </Link>
                )}
              </div>

              {resolvedFrom && (
                <p className="mb-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-[11.5px] text-emerald-200/80">
                  Matched a reading source: “{resolvedFrom}” on MangaDex.
                </p>
              )}
              {toc.length ? (
                <div className="grid max-h-96 grid-cols-1 gap-1 overflow-y-auto pr-1 sm:grid-cols-2">
                  {toc.map((c) => (
                    <Link
                      key={c.href}
                      href={c.href}
                      className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-[12.5px] transition hover:bg-white/[0.1]"
                    >
                      <span className="truncate">{c.label}</span>
                      {c.meta && <span className="shrink-0 text-[10.5px] text-white/30">{c.meta}</span>}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] leading-relaxed text-white/45">{tocNote}</p>
              )}
            </section>
          </Reveal>

          {audiobook && (
            <Reveal>
              <section className="glass-panel p-4">
                <h2 className="mb-2 text-[12px] font-bold uppercase tracking-[0.14em] text-white/40">
                  Listen · LibriVox
                </h2>
                <p className="text-[13px] leading-relaxed text-white/60">
                  {audiobook.tracks.length} tracks{audiobook.totalTime ? ` · ${audiobook.totalTime}` : ""},{" "}
                  read by volunteers. Public domain.
                </p>
                <Link href={base} className="btn btn-glass mt-3">
                  🎧 Open audio in reader
                </Link>
              </section>
            </Reveal>
          )}

          {related.length > 0 && (
            <Reveal>
              <section className="glass-panel p-4">
                <h2 className="mb-2.5 text-[12px] font-bold uppercase tracking-[0.14em] text-white/40">
                  Related & adaptations
                </h2>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {related.map((r) => (
                    <a
                      key={r.title + r.relation}
                      href={r.url ?? "#"}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="group overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition hover:border-white/25"
                    >
                      <div className="aspect-[2/3] overflow-hidden bg-white/5">
                        {r.cover && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imgUrl(r.cover) || ""} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                        )}
                      </div>
                      <div className="p-1.5">
                        <p className="line-clamp-2 text-[11px] font-semibold leading-tight">{r.title}</p>
                        <p className="mt-0.5 text-[9.5px] uppercase tracking-wide text-violet-300/60">{r.relation}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            </Reveal>
          )}

          {item.genres.length > 0 && (
            <Reveal>
              <section className="glass-panel p-4">
                <h2 className="mb-2 text-[12px] font-bold uppercase tracking-[0.14em] text-white/40">Genres</h2>
                <div className="flex flex-wrap gap-1.5">
                  {item.genres.map((g) => (
                    <Link key={g} href={`/search?q=${encodeURIComponent(g)}`} className="pill">
                      {g}
                    </Link>
                  ))}
                </div>
              </section>
            </Reveal>
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
              <h2 className="mb-2 text-[12px] font-bold uppercase tracking-[0.14em] text-white/40">Your progress</h2>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-rose-500"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <p className="mt-2 text-[12.5px] text-white/50">
                Chapter {progress.chapter} · {Math.round(progress.percent)}%
              </p>
            </section>
          )}

          <section className="glass-panel p-4">
            <h2 className="mb-1.5 text-[12px] font-bold uppercase tracking-[0.14em] text-white/40">Attribution</h2>
            <p className="text-[12px] leading-relaxed text-white/45">{item.attribution}</p>
            <p className="mt-2 text-[10.5px] text-white/25">Provider ID: {item.providerId}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
