import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { loadMtgSealedCatalogV1 } from "@/lib/sealed/mtgSealedClientV1";
import { createMtgSealedSupabaseTransportV1 } from "@/lib/sealed/mtgSealedSupabaseTransportV1";
import { createServerComponentClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const forms: Record<string, string> = { "": "All packages", booster_box: "Booster boxes", display: "Booster displays",
  pack: "Booster packs", sleeved_pack: "Sleeved packs", kit: "Kits / ETBs", tin: "Tins", collection: "Collections",
  bundle: "Bundles", deck: "Decks", deck_display: "Deck displays", case: "Cases", promo_pack: "Promo packs" };
const languages: Record<string, string> = { "": "All languages", en: "English", ja: "Japanese", zh: "Chinese", ko: "Korean",
  fr: "French", de: "German", it: "Italian", pt: "Portuguese", es: "Spanish", ru: "Russian" };

export default async function PokemonSealedPage({ searchParams }: {
  searchParams?: Promise<{ q?: string; form?: string; lang?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = params?.q?.trim().slice(0, 100) ?? "";
  const form = Object.hasOwn(forms, params?.form ?? "") ? params?.form ?? "" : "";
  const language = Object.hasOwn(languages, params?.lang ?? "") ? params?.lang ?? "" : "";
  const rawPage = Number(params?.page ?? 1);
  const page = Number.isSafeInteger(rawPage) ? Math.min(Math.max(rawPage, 1), 1000) : 1;
  const href = (number: number) => `/sealed/pokemon?${new URLSearchParams({ q: query, form, lang: language, page: String(number) })}`;
  const supabase = await createServerComponentClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(href(page))}`);
  const state = await loadMtgSealedCatalogV1(
    createMtgSealedSupabaseTransportV1(supabase, "pokemon", { packageForm: form, languageCode: language }),
    { query, limit: 24, offset: (page - 1) * 24 }, { gameKey: "pokemon" },
  );
  const control = "min-h-11 min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50";
  return <main className="gv-page-shell gv-mobile-safe-content">
    <div className="gv-page-container gv-page-rhythm">
      <header className="border-b border-slate-200 pb-4 dark:border-slate-800">
        <Link href="/sets?game=pokemon" className="inline-flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300"><ArrowLeft size={16} />Pokemon sets</Link>
        <h1 className="mt-3 text-2xl font-bold">Pokemon sealed products</h1>
      </header>
      <form action="/sealed/pokemon" method="get" role="search" className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="pokemon-sealed-q">Search sealed products</label>
        <input className={`${control} flex-1 basis-60`} id="pokemon-sealed-q" type="search" name="q" defaultValue={query} placeholder="Search boxes, tins, collections" />
        <select className={control} name="form" aria-label="Package type" defaultValue={form}>
          {Object.entries(forms).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select className={control} name="lang" aria-label="Product language" defaultValue={language}>
          {Object.entries(languages).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button title="Search" aria-label="Search" type="submit" className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-700 text-white hover:bg-emerald-800"><Search size={20} /></button>
      </form>
      {state.status === "ready" ? <section aria-label="Pokemon sealed products" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {state.rows.map(row => <article key={row.variantId} className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <a href={row.imageUrl!} target="_blank" rel="noreferrer" aria-label={`View ${row.canonicalName} image`} className="relative block aspect-square bg-slate-100 dark:bg-slate-900">
            <Image src={row.imageUrl!} alt={row.canonicalName} fill unoptimized sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 17vw" className="object-contain p-2" />
          </a>
          <div className="space-y-2 border-t border-slate-200 p-3 dark:border-slate-800">
            <h2 className="text-sm font-semibold leading-5">{row.canonicalName}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{row.packageForm.replaceAll("_", " ")} · {languages[row.languageCode] ?? row.languageCode}</p>
            <div className="flex items-end justify-between gap-2"><span className="text-xs text-slate-500">Market</span><span className="font-bold">${row.marketPrice.toFixed(2)}</span></div>
            <p className="text-[11px] text-slate-500">TCGPlayer · {row.observedOn}</p>
          </div>
        </article>)}
      </section> : <section className="border-y border-slate-200 py-10 text-center dark:border-slate-800">
        <h2 className="text-lg font-semibold">{state.status === "empty" ? "No sealed products match these filters." : state.status === "disabled" ? "Pokemon sealed browsing is temporarily unavailable." : "Sealed products could not load. Please try again."}</h2>
        <Link href="/sealed/pokemon" className="mt-4 inline-block text-emerald-700 dark:text-emerald-300">Clear filters</Link>
      </section>}
      <nav aria-label="Sealed catalog pages" className="flex items-center justify-center gap-5">
        {page > 1 ? <Link href={href(page - 1)} aria-label="Previous page" title="Previous page" className="p-3"><ChevronLeft size={20} /></Link> : <span className="w-11" />}
        <span className="text-sm">Page {page}</span>
        {state.status === "ready" && state.rows.length === 24 ? <Link href={href(page + 1)} aria-label="Next page" title="Next page" className="p-3"><ChevronRight size={20} /></Link> : <span className="w-11" />}
      </nav>
    </div>
  </main>;
}
