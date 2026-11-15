# Deploying this build

**Status: live.** Commit `0b454e0` is on `dyvx/SUMI` main and deployed to
production (`dpl_FftgXWareCEKAu6NiWTPR95WBVZV`, READY) at
https://sumi-ruby.vercel.app — verified there: 110 proxied covers all 200,
Chainsaw Man chapter 1 serves 51 pages with page images 200, manhwa shelf 114
images, no junk titles.

The notes below are kept for future deploys.

## Option A — push with a fine-grained PAT

```bash
cd animus
git add -A
git -c credential.helper= \
    push "https://x-access-token:$GITHUB_PAT@github.com/dyvx/SUMI.git" HEAD:main
```

Set `GITHUB_PAT` in your shell first. Never commit it and never save it to
`.git/config`; revoke it at https://github.com/settings/tokens when done.

Vercel is connected to `dyvx/SUMI`, so a push to `main` deploys automatically.

## Option B — deploy the folder directly

```bash
cd animus && npx vercel --prod
```

## What is in this build

- `app/api/img/route.ts` — image proxy. Sends a non-browser User-Agent, because
  MangaDex's CDN returns 403 to any `Mozilla/*` UA from a datacentre IP. That
  single header was the cause of every broken cover and blank reader page.
- `lib/types.ts` — `imgUrl()`; every cover/page `src` goes through the proxy.
- `lib/catalog.ts` — Explore shelves come from each provider's real popularity
  browse instead of random-letter searches (the source of the junk titles).
- `lib/types.ts` — `categoryFamily()`: Korean long-strip titles count as manhwa
  as well as webtoon, so the manhwa shelf is no longer nearly empty.
- `lib/providers/anilist.ts` — browse filters by country of origin and format.
- `lib/providers/mangadex.ts` — page list carries a `data-saver` fallback URL per
  page; the reader retries with it before reporting a failure.
- `components/reader/comic-reader.tsx` — auto-fallback, retry, and an honest
  "source limitation, not a bug" empty state with a link to the source page.
- `app/globals.css` — tab bar fits narrow phones (Library was clipped off-screen).

Verified locally against the built app:

- `/explore?category=manga` — 110 proxied cover images, all HTTP 200 `image/jpeg`.
- `/explore?category=manhwa` — 114 images; 57 real titles (Solo Leveling,
  Omniscient Reader, A Returner's Magic Should Be Special…).
- Chainsaw Man chapter 1: 51 pages, pages 1–6 fetched through `/api/img` → 200,
  and the `data-saver` fallback → 200.
- `npm test` 23/23, `tsc --noEmit` clean, `npm run build` clean.
