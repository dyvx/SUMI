# Animus

A private, single-owner reading platform for manga, manhwa, manhua, webtoons, light novels,
web novels, visual novels, doujinshi, comics, graphic novels, wuxia/xianxia and one-shots.

Built with Next.js 14 (App Router), TypeScript, Tailwind CSS. No paid services are required
to run it.

---

## Live deployment

- **URL:** https://sumi-ruby.vercel.app
- **GitHub:** https://github.com/dyvx/SUMI
- **Vercel project:** `sumi` (`prj_rFFvgvCTGQ44YyWv6SslY5LGEksE`), Hobby plan, region `iad1`
- **v2 deployment:** `dpl_3ApGRCaYdWabApHhcVJGcJGJstsj` — READY, promoted to production.
- **Verified in production (v2):** all 10 routes return 200, including `/reader/vn/[id]`;
  `/api/novel?id=1342&chapter=0` serves 4,744 characters of real *Pride and Prejudice* text
  in 0.54 s; search ranks the readable Gutenberg copy above the metadata-only duplicate.
- **Verified in production (v1):** home / explore / search / detail / both readers all return 200;
  `GET /api/search?q=dune` returns 24 merged results; all four providers report healthy
  (AniList 114 ms, MangaDex 248 ms, VNDB 421 ms, Open Library 295 ms).

`sumi-zynx4.vercel.app` is protected by Vercel Deployment Protection (302 to SSO). Use the
`sumi-ruby` alias, or disable protection in project settings.

### Persistence on Vercel — read this

Vercel's filesystem is read-only. `lib/store.ts` therefore falls back to an in-memory store
instead of throwing 500s. Library and progress writes **succeed and read back on a warm
instance**, but are lost on a cold start. Browsing, search, metadata and both readers are
unaffected. Durable persistence requires Supabase — apply `db/schema.sql`.

---

## v3 — reading sources, properly resolved

The dead-end you hit (`/reader/comic/anilist:63327` → "Reader unavailable") was a real
architectural gap: AniList and MangaDex do not share IDs, so metadata-only titles had no
source attached. Fixed with a cross-provider resolver.

**`lib/resolve.ts` + `GET /api/resolve`** find the MangaDex edition that genuinely matches a
metadata title. Matching is deliberately strict:

- Candidate **primary title only** — alt-titles are ignored, because spinoffs list the parent
  series there (that is how *Jujutsu Kaisen Modulo* would otherwise pose as *Jujutsu Kaisen*).
- Same-story edition qualifiers (`(Official Colored)`, `[Deluxe]`) are stripped; different-work
  markers (`(Oneshot)`, `(Fan Colored)`, `:re`, `Modulo`) are refused.
- Chapters are only counted when they contain **page images**; MangaDex keeps rows with
  `pages: 0` for removed chapters, which would promise a reader that loads nothing.
- Romanised titles fold together (`Toukyou Ghoul` ↔ `Tokyo Ghoul`, `Na Honjaman Level-Up` ↔
  `Solo Leveling`) so real matches still succeed.

Verified against live data:

| Title | Result |
|---|---|
| Chainsaw Man | ✅ 93 chapters with images, 53-page chapter loads from CDN |
| One Piece | ✅ 7 chapters (the plain entry; most of it is removed) |
| Jujutsu Kaisen | ✅ Official Colored edition, 4 chapters |
| Tokyo Ghoul | ⛔ honestly none — `(Oneshot)` and `:re` are correctly refused |
| Solo Leveling / Berserk | ⛔ none — entries exist but no English pages remain |

**Reader UX rebuilt:** a resolving state, a real "no readable source" screen with alternatives
and next actions, source-attribution in the toolbar, and page zoom. The tab bar no longer
overlays readers.

---

## v2 — what changed

- **Real book reading.** A new Project Gutenberg adapter serves genuine public-domain
  text: 34 curated works, fetched live, split into real chapters (heading-aware, with
  CJK support for 第…回). *Pride and Prejudice* yields 79 chapters; *三國志演義* yields 114
  with correct Chinese chapter titles. Every book ID was verified by reading its actual
  title out of the source file — none were assumed.
- **Visual novel reader.** A scene player with typewriter text, auto-advance, tap/keyboard
  advance and adjustable size, driven by real VNDB synopsis text. It is explicitly a
  *reading presentation*, not a game-engine runtime.
- **Readable-content priority.** When a public-domain book and a metadata-only record share
  a title, the readable copy now wins the merge (`readable` flag + weight). Two tests lock
  this in.
- **⌘K command palette** with debounced live search, keyboard nav and recent searches.
- **Hero carousel** with crossfade, scroll parallax and auto-advance.
- **Scroll-reveal animations** via IntersectionObserver, disabled under reduced-motion.
- **Explore rebuilt:** grid/list views, genre chips, shareable URL filter state.
- **Comic reader:** touch swipe (direction-aware), next-page preloading.
- **Novel reader rebuilt:** real chapters, TOC with sizes, persisted preferences
  (size/leading/font/theme), bookmarks, keyboard chapter nav, skeleton + error states.

---

## 1. What actually works (verified, not claimed)

Every provider below was called live from this build. Results are from real requests.

| Provider | Endpoint | Auth | Verified | Supplies |
|---|---|---|---|---|
| AniList | `POST https://graphql.anilist.co` | none | ✅ search, detail, trending | metadata + covers |
| MangaDex | `https://api.mangadex.org` | none | ✅ search, feed, `at-home` page URLs | metadata + authorized reading pages |
| VNDB | `POST https://api.vndb.org/kana/vn` | none | ✅ search, filter | visual-novel metadata |
| Open Library | `https://openlibrary.org/search.json` | none | ✅ search, works | book metadata + covers |
| Project Gutenberg | `gutenberg.org/cache/epub/<id>/pg<id>.txt` | none | ✅ 34 books, full text + covers | **real readable text** |
| Gutendex | `gutendex.com/books` | none | ❌ unreachable (timeout) | not used |
| Google Books | `googleapis.com/books/v1` | none | ⚠️ quota-exhausted on shared IPs | metadata (disabled) |
| Comic Vine | `comicvine.gamespot.com/api` | **API key required** | ❌ not enabled | comic metadata |
| Jikan (MAL mirror) | `api.jikan.moe/v4` | none | ❌ no response during testing | metadata (not used) |

Live proof captured during the build:

- `GET /api/search?q=berserk` → 24 real results merged from AniList + Open Library.
- MangaDex title `dc07afaa-…` → 14 English chapters, chapter 1 → 17 page images from the
  official `@home` CDN.
- Berserk and Solo Leveling return **0 chapters** — they have been removed from MangaDex.
  The UI states this instead of pretending otherwise.

Attribution for every provider is shown on each detail page.

---

## 2. Running it

```bash
cd animus
npm install
npm run dev          # http://localhost:3000
```

Other scripts:

```bash
npm run verify       # typecheck + production build + test suite
npm test             # 8 unit tests (dedupe, ranking, timeouts, fallback)
npm run build        # production build
```

---

## 3. Architecture

```
app/
  page.tsx                  Homepage: featured hero, dynamic rows, category grid, health strip
  explore/page.tsx          Category browsing with URL-persisted filters
  search/page.tsx           Unified search across every provider
  title/[id]/page.tsx       Detail page (layout adapts per media kind)
  reader/comic/[id]         Comic reader: webtoon / single / double, LTR+RTL
  reader/novel/[id]         Prose reader: typography, themes, TOC, progress
  library/page.tsx          Shelves, stats, history
  admin/page.tsx            API health, homepage CMS, data export, limitations
  api/                      search · chapter · library · progress · settings · health · export
lib/
  types.ts                  Unified content model + 12 categories
  catalog.ts                Provider registry, merge/dedupe, ranking, fallbacks, health
  providers/                One adapter per provider, all behind ProviderAdapter
  store.ts                  Persistence adapter (JSON file, atomic writes)
db/schema.sql               Postgres/Supabase schema + RLS
```

### The unified model

Every provider normalises into one `MediaItem`. Categories are not cosmetic — they carry a
`kind` (`comic` / `prose` / `vn`) that decides which reader and which detail layout is used.

### Deduplication rules

Results merge only when the normalised title **and** the media kind match. A manga called
*Berserk* and a novel called *Berserk* stay separate. Fuzzy similarity is never enough to
merge. Tests in `tests/catalog.test.ts` enforce this.

### Failure handling

- 9-second timeout per provider; a slow provider cannot hang a page.
- `Promise.allSettled` everywhere — one dead provider degrades the row, not the page.
- Failures increment a counter shown in Admin and in the `GET /api/health` JSON.
- Search results, detail items and homepage rows are cached in-process (5–30 min TTL).

---

## 4. Free-tier deployment

**Local / self-hosted** — works today with zero services. Data lives in `.data/store.json`.

**Vercel (Hobby)** — `vercel deploy`. Note: Vercel's filesystem is read-only, so the JSON
store will not persist there. Swap `lib/store.ts` for Supabase before relying on Vercel.
Hobby permits non-commercial personal use, and no card is required.

**Supabase (Free)** — apply `db/schema.sql`. Free tier includes auth, Postgres and RLS.
Projects pause after ~1 week of inactivity; the data is retained.

**Cloudflare R2** — optional, only needed if you upload your own authorized files.
10 GB storage free; no card required.

No payment integration exists. Nothing in the app requires a paid tier.

---

## 5. Documented limitations

These are real and deliberate, not hidden:

1. **No copyrighted prose is bundled.** Novels either read in full (public-domain
   Gutenberg entries) or show an honest "metadata only" state. There are no placeholder
   chapters any more.
2. **MangaDex coverage is incomplete** — popular titles are frequently DMCA-removed. The UI
   reports missing chapters honestly.
3. **Manual CMS entry is partial.** Homepage section reordering, settings and export are
   implemented. Full metadata/file editing needs the Postgres schema wired to a form set.
4. **No authentication in this build.** The platform is single-user and local. `db/schema.sql`
   includes the profiles table, single-owner trigger and RLS policies for Supabase Auth.
5. **Search reorderings are heuristic** (exact → prefix → substring → author). There is no
   full-text index over the local store.
6. **Comic Vine and Google Books are disabled** — one needs a key, the other is quota-blocked.
7. **Image hotlinking** — covers and comic pages load from provider CDNs. If a provider
   blocks hotlinking, images will not render; metadata still will.
8. **Webtoon rendering** uses the vertical mode of the comic reader rather than a separate
   infinite-scroll engine. Behaviour is equivalent; the code path is shared.
9. **The Gutenberg catalogue is curated (34 titles), not exhaustive.** Gutendex was
   unreachable from this environment, so books are listed explicitly. Adding a title is a
   one-line addition to `GUTENBERG_BOOKS`.
10. **The VN reader does not run game engines.** It presents a title's real synopsis in a
    VN-styled scene. Ren'Py/KiriKiri compatibility is not implemented and not claimed.
