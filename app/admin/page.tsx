import Link from "next/link";
import { getHealth, PROVIDERS } from "@/lib/catalog";
import { readData } from "@/lib/store";
import { AdminSections } from "@/components/admin-sections";

export const dynamic = "force-dynamic";

const ALL_SECTIONS = [
  ["trending", "Trending now"],
  ["popular-manga", "Popular manga"],
  ["popular-manhwa", "Popular manhwa"],
  ["popular-manhua", "Popular manhua"],
  ["visual-novels", "Visual novels"],
  ["mangadex-trending", "Latest updates"],
  ["novels", "Novels & books"],
  ["hidden-gems", "Hidden gems"],
  ["top-rated", "Top rated"],
];

export default async function AdminPage() {
  const health = getHealth();
  const data = await readData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="mt-1 text-[13px] text-white/45">
          Provider health, homepage composition and data management.
        </p>
      </div>

      <section className="glass-panel p-4">
        <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-white/45">API health</h2>
        <div className="space-y-1.5">
          {health.map((h) => {
            const meta = PROVIDERS.find((p) => p.id === h.provider);
            return (
              <div key={h.provider} className="rounded-xl bg-white/[0.04] px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${h.ok ? "bg-emerald-400" : "bg-rose-500"}`} />
                  <span className="text-[13px] font-semibold">{meta?.label ?? h.provider}</span>
                  <span className="ml-auto text-[11px] text-white/35">
                    {h.lastChecked === "never" ? "not yet called" : `${h.latencyMs}ms · ${new Date(h.lastChecked).toLocaleTimeString()}`}
                  </span>
                </div>
                <p className="mt-1 pl-4 text-[11px] text-white/30">
                  {meta?.categories.length} categories · {meta?.attribution}
                </p>
                {h.lastError && (
                  <p className="mt-1 pl-4 text-[11px] text-rose-300/80">
                    Last error: {h.lastError} ({h.consecutiveFailures} consecutive)
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <AdminSections sections={ALL_SECTIONS} active={data.settings.homepageSections} />

      <section className="glass-panel p-4">
        <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wider text-white/45">Data</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            ["Library entries", data.library.length],
            ["Progress records", Object.keys(data.progress).length],
            ["Recent views", data.recent.length],
          ].map(([k, v]) => (
            <div key={k as string} className="rounded-xl bg-white/[0.04] px-3 py-2">
              <p className="text-[11px] text-white/35">{k}</p>
              <p className="text-[15px] font-bold">{v}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="/api/export" className="btn btn-glass" download>
            Export JSON
          </a>
          <a href="/api/health" className="btn btn-glass" target="_blank" rel="noreferrer">
            Health JSON
          </a>
          <Link href="/api/search?q=berserk" className="btn btn-glass" target="_blank">
            Test search API
          </Link>
        </div>
      </section>

      <section className="glass-panel p-4">
        <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wider text-white/45">Known limitations</h2>
        <ul className="space-y-1.5 text-[12.5px] leading-relaxed text-white/50">
          <li>• Comic pages come from MangaDex’s official @home endpoint. Titles without English chapters get metadata only.</li>
          <li>• No copyrighted prose is bundled — novel chapters open in placeholder mode until you attach authorized text.</li>
          <li>• Data is stored in a local JSON file. On Vercel the filesystem is read-only, so persistence requires Supabase (schema included in the repo docs).</li>
          <li>• Comic Vine and Google Books are not enabled: the former needs a key, the latter is quota-exhausted on shared IPs.</li>
        </ul>
      </section>
    </div>
  );
}
