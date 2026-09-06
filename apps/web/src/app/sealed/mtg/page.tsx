import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  loadMtgSealedCatalogV1,
  type MtgSealedCatalogStateV1,
} from "@/lib/sealed/mtgSealedClientV1";
import { createMtgSealedSupabaseTransportV1 } from "@/lib/sealed/mtgSealedSupabaseTransportV1";
import { createServerComponentClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type MtgSealedPageProps = {
  searchParams?: Promise<{ q?: string }>;
};

function packageLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusMessage(state: Exclude<MtgSealedCatalogStateV1, { status: "ready" }>) {
  switch (state.status) {
    case "disabled":
      return "MTG sealed browsing is temporarily unavailable.";
    case "empty":
      return "No sealed products matched this search.";
    case "missing_image":
      return "Some sealed products are waiting for verified images.";
    case "stale":
      return "Sealed pricing is being refreshed.";
    case "offline":
      return "MTG sealed browsing is temporarily offline.";
    case "error":
      return "MTG sealed products could not load.";
    case "loading":
      return "Loading MTG sealed products.";
    case "signed_out":
      return "Sign in to browse MTG sealed products.";
  }
}

export default async function MtgSealedPage({ searchParams }: MtgSealedPageProps) {
  const params = await searchParams;
  const query = params?.q?.trim().slice(0, 100) ?? "";
  const supabase = await createServerComponentClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/sealed/mtg${query ? `?q=${encodeURIComponent(query)}` : ""}`)}`);

  const state = await loadMtgSealedCatalogV1(
    createMtgSealedSupabaseTransportV1(supabase),
    { query: query || null, limit: 24, offset: 0 },
  );

  return (
    <main className="gv-page-shell gv-mobile-safe-content">
      <div className="gv-page-container gv-page-rhythm">
        <header className="border-b border-slate-200 px-1 pb-5 dark:border-slate-800">
          <Link href="/sets?game=mtg" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200">
            MTG sets
          </Link>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="gv-eyebrow">Magic: The Gathering</p>
              <h1 className="gv-display-title">Sealed products</h1>
            </div>
            {state.status === "ready" ? (
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                {state.rows.length} products
              </p>
            ) : null}
          </div>
        </header>

        <form action="/sealed/mtg" method="get" className="flex gap-2" role="search">
          <label htmlFor="mtg-sealed-query" className="sr-only">Search MTG sealed products</label>
          <input
            id="mtg-sealed-query"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Search booster boxes, bundles, or decks"
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
          />
          <button type="submit" className="min-h-11 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400">
            Search
          </button>
        </form>

        {state.status === "ready" ? (
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6" aria-label="MTG sealed products">
            {state.rows.map((row) => (
              <article key={row.variantId} className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                <div className="relative aspect-[3/4] bg-slate-100 dark:bg-slate-900">
                  {row.imageUrl ? (
                    <Image
                      src={row.imageUrl}
                      alt={row.canonicalName}
                      fill
                      unoptimized
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 17vw"
                      className="object-contain p-2"
                    />
                  ) : null}
                </div>
                <div className="space-y-2 border-t border-slate-200 p-3 dark:border-slate-800">
                  <h2 className="text-sm font-semibold leading-5 text-slate-950 dark:text-slate-50">{row.canonicalName}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{packageLabel(row.packageForm)}</p>
                  <div className="flex items-end justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Market</span>
                    <span className="text-base font-bold text-slate-950 dark:text-slate-50">${row.marketPrice.toFixed(2)}</span>
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="border-y border-slate-200 py-10 text-center dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">{statusMessage(state)}</h2>
            {query ? (
              <Link href="/sealed/mtg" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Clear search
              </Link>
            ) : null}
          </section>
        )}
      </div>
    </main>
  );
}
