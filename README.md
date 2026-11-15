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
- **Verified in production:** home / explore / search / detail / both readers all return 200;
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

## 1. What actually works (verified, not claimed)

Every provider below was called live from this build. Results are from real requests.

| Provider | Endpoint | Auth | Verified | Supplies |
|---|---|---|---|---|
| AniList | `POST https://graphql.anilist.co` | none | ✅ search, detail, trending | metadata + covers |
| MangaDex | `https://api.mangadex.org` | none | ✅ search, feed, `at-home` page URLs | metadata + authorized reading pages |
| VNDB | `POST https://api.vndb.org/kana/vn` | none | ✅ search, filter | visual-novel metadata |
| Open Library | `https://openlibrary.org/search.json` | none | ✅ search, works | book metadata + covers |
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

1. **No copyrighted prose is bundled.** Novel/light-novel entries open in a clearly-labelled
   placeholder reader. Typography, TOC, themes and progress tracking all work; attach your
   own authorized text to read real content.
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
