import { NextResponse } from "next/server";

/**
 * Image proxy.
 *
 * Provider CDNs (MangaDex's especially, and its third-party network hosts)
 * intermittently refuse browser requests from foreign origins, which shows up
 * as broken-image icons. Streaming through our own origin removes the referer
 * problem entirely and lets us cache aggressively at the edge.
 *
 * Only an explicit allowlist of image hosts is proxied — this is not an open
 * proxy.
 */

export const runtime = "nodejs";

const ALLOWED_HOSTS = [
  "uploads.mangadex.org",
  "s4.anilist.co",
  "covers.openlibrary.org",
  "www.gutenberg.org",
  "gutenberg.org",
  "t.vndb.org",
  "librivox.org",
];

function hostAllowed(host: string): boolean {
  if (ALLOWED_HOSTS.includes(host)) return true;
  // MangaDex page CDN rotates across *.mangadex.network subdomains.
  if (/^[a-z0-9-]+\.mangadex\.network$/i.test(host)) return true;
  return false;
}

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("u");
  if (!raw) return new NextResponse("missing u", { status: 400 });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new NextResponse("bad url", { status: 400 });
  }
  if (target.protocol !== "https:" || !hostAllowed(target.hostname)) {
    return new NextResponse("host not allowed", { status: 403 });
  }

  const host = target.hostname;
  // MangaDex's CDN checks Referer on some nodes; Amazon's does not care.
  const referer = /mangadex\.(org|network)$/i.test(host) ? "https://mangadex.org/" : undefined;

  async function attempt(): Promise<Response> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    try {
      return await fetch(target.toString(), {
        signal: ctrl.signal,
        headers: {
          // Important: MangaDex's image CDN answers 403 to *browser-like*
          // User-Agents from datacentre IPs but serves a plain client UA fine.
          // Impersonating a browser here is what broke every cover and page.
          "User-Agent": "Animus/1.0 (+https://sumi-ruby.vercel.app)",
          Accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8",
          "Accept-Encoding": "identity",
          ...(referer ? { Referer: referer } : {}),
        },
        cache: "no-store",
      });
    } finally {
      clearTimeout(timer);
    }
  }

  try {
    // One retry: CDN refusals are usually transient, and a retry is far cheaper
    // than showing the reader a broken page.
    let upstream: Response;
    try {
      upstream = await attempt();
      if (!upstream.ok) upstream = await attempt();
    } catch {
      upstream = await attempt();
    }

    if (!upstream.ok || !upstream.body) {
      return new NextResponse("upstream error", { status: 502 });
    }

    const type = upstream.headers.get("content-type") ?? "image/jpeg";
    if (!type.startsWith("image/")) {
      return new NextResponse("not an image", { status: 415 });
    }

    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": type,
        // Images are immutable once published.
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("fetch failed", { status: 502 });
  }
}
