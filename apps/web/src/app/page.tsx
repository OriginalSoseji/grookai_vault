import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import type { CardSummary } from "@/types/cards";

const FEATURED_CARD_COUNT = 3;
const FEATURED_CANDIDATE_WINDOW = 48;

export const dynamic = "force-dynamic";

type HomeCardRow = {
  gv_id: string | null;
  name: string | null;
  image_url: string | null;
  external_ids: { tcgdex?: string | null } | null;
};

type PokemonTypeRow = {
  tcgdex_card_id: string | null;
};

function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createClient(url, anon);
}

function getRotationOffset(totalRows: number) {
  const maxOffset = Math.max(totalRows - FEATURED_CANDIDATE_WINDOW, 0);

  if (maxOffset === 0) {
    return 0;
  }

  return Date.now() % (maxOffset + 1);
}

async function getPokemonCardsFromWindow(
  supabase: ReturnType<typeof createServerSupabase>,
  offset: number,
) {
  const { data } = await supabase
    .from("card_prints")
    .select("gv_id,name,image_url,external_ids")
    .order("gv_id")
    .range(offset, offset + FEATURED_CANDIDATE_WINDOW - 1);

  const candidates = ((data ?? []) as HomeCardRow[]).filter(
    (row): row is HomeCardRow & { gv_id: string } => Boolean(row.gv_id),
  );
  const tcgdexIds = Array.from(
    new Set(
      candidates
        .map((row) => row.external_ids?.tcgdex)
        .filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  );

  if (tcgdexIds.length === 0) {
    return [] as CardSummary[];
  }

  const { data: pokemonTypeData } = await supabase
    .from("tcgdex_cards")
    .select("tcgdex_card_id")
    .eq("lang", "en")
    .eq("supertype", "Pokemon")
    .in("tcgdex_card_id", tcgdexIds);

  const pokemonIds = new Set(
    ((pokemonTypeData ?? []) as PokemonTypeRow[])
      .map((row) => row.tcgdex_card_id)
      .filter((value): value is string => typeof value === "string" && value.length > 0),
  );

  return candidates
    .filter((row) => {
      const tcgdexId = row.external_ids?.tcgdex;
      return Boolean(tcgdexId && pokemonIds.has(tcgdexId));
    })
    .slice(0, FEATURED_CARD_COUNT)
    .map((row) => ({
      gv_id: row.gv_id,
      name: row.name ?? "Unknown",
      number: "",
      image_url: row.image_url ?? undefined,
    }));
}

export default async function HomePage() {
  const supabase = createServerSupabase();
  const { count } = await supabase.from("card_prints").select("*", { count: "exact", head: true });
  const featuredOffset = getRotationOffset(count ?? 0);
  const cards = await getPokemonCardsFromWindow(supabase, featuredOffset);
  const fallbackCards =
    cards.length < FEATURED_CARD_COUNT && featuredOffset !== 0 ? await getPokemonCardsFromWindow(supabase, 0) : [];
  const mergedCards = [...cards];

  for (const card of fallbackCards) {
    if (mergedCards.some((existing) => existing.gv_id === card.gv_id)) continue;
    mergedCards.push(card);
    if (mergedCards.length === FEATURED_CARD_COUNT) break;
  }

  return (
    <div className="space-y-16 py-8">
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-center">
        <div className="space-y-6">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-500">Canonical Identity</p>
          <div className="space-y-4">
            <h1 className="text-5xl font-semibold tracking-tight text-slate-950">Grookai Vault</h1>
            <p className="max-w-2xl text-lg text-slate-600">
              A collector-first card catalog anchored by stable Grookai Vault IDs.
            </p>
          </div>
          <form action="/explore" method="get" className="max-w-2xl">
            <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-3 shadow-sm shadow-slate-200/50">
              <input
                type="search"
                name="q"
                placeholder="Search by card name or printed number"
                className="min-w-0 flex-1 bg-transparent px-3 text-base text-slate-900 outline-none placeholder:text-slate-400"
              />
              <button
                type="submit"
                className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                Search
              </button>
            </div>
          </form>
          <div className="flex flex-wrap gap-3">
            <Link href="/explore" className="rounded bg-slate-950 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800">
              Explore cards
            </Link>
            <Link href="/login" className="rounded border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Sign in
            </Link>
          </div>
        </div>

        <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
          {mergedCards.map((card) => (
            <Link
              key={card.gv_id}
              href={`/card/${card.gv_id}`}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition hover:-translate-y-0.5 hover:bg-white"
            >
              {card.image_url ? (
                <img src={card.image_url} alt={card.name} className="aspect-[3/4] w-full object-contain p-3" />
              ) : (
                <div className="flex aspect-[3/4] items-center justify-center bg-slate-100 text-sm text-slate-500">
                  No image
                </div>
              )}
              <div className="space-y-1 border-t border-slate-200 px-3 py-3">
                <p className="line-clamp-2 text-sm font-medium text-slate-900">{card.name}</p>
                <p className="text-xs text-slate-500">{card.gv_id}</p>
              </div>
            </Link>
          ))}
          {mergedCards.length === 0 && (
            <div className="col-span-full flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
              Featured Pokemon cards will appear here.
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-2xl font-semibold text-slate-950">What is Grookai Vault</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Grookai Vault gives collectors a clean way to explore card prints through a stable public ID. Each card
            page is built around the card itself first, with a Grookai Vault ID that stays consistent across the wider
            product.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-2xl font-semibold text-slate-950">Future vision</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            This is the first public layer of a broader collector experience: card discovery, collection context, and
            future product surfaces that all resolve to the same canonical card record.
          </p>
        </div>
      </section>
    </div>
  );
}
