import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import FeaturedCardTile from "@/components/FeaturedCardTile";
import { getBestPublicCardImageUrl } from "@/lib/publicCardImage";
import type { CardSummary } from "@/types/cards";

const FEATURED_CARD_COUNT = 3;
const FEATURED_CANDIDATE_WINDOW = 120;
const MAX_FEATURED_WINDOWS = 6;

export const dynamic = "force-dynamic";

type HomeCardRow = {
  gv_id: string | null;
  name: string | null;
  number: string | null;
  image_url: string | null;
  image_alt_url: string | null;
  external_ids: { tcgdex?: string | null } | null;
};

type PokemonTypeRow = {
  tcgdex_card_id: string | null;
};

type FeaturedCard = CardSummary & {
  image_url: string;
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

function getBestImageUrl(row: Pick<HomeCardRow, "image_url" | "image_alt_url">) {
  return getBestPublicCardImageUrl(row.image_url, row.image_alt_url);
}

function getNumericCardNumber(value: string | null) {
  const match = value?.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function isLikelyPokemonCard(row: HomeCardRow & { gv_id: string }) {
  const name = row.name ?? "";
  const numericNumber = getNumericCardNumber(row.number);

  if (!name || /\benergy\b/i.test(name) || /\btrainer'?s?\b/i.test(name)) {
    return false;
  }

  return numericNumber !== null && numericNumber <= 60;
}

function getCandidateOffsets(totalRows: number, startOffset: number) {
  const maxOffset = Math.max(totalRows - FEATURED_CANDIDATE_WINDOW, 0);
  const offsets: number[] = [];

  if (maxOffset === 0) {
    return [0];
  }

  let currentOffset = Math.min(Math.max(startOffset, 0), maxOffset);
  while (offsets.length < MAX_FEATURED_WINDOWS && !offsets.includes(currentOffset)) {
    offsets.push(currentOffset);
    currentOffset = currentOffset + FEATURED_CANDIDATE_WINDOW;
    if (currentOffset > maxOffset) {
      currentOffset = currentOffset % (maxOffset + 1);
    }
  }

  if (!offsets.includes(0) && offsets.length < MAX_FEATURED_WINDOWS) {
    offsets.push(0);
  }

  return offsets;
}

async function getPokemonCardsFromWindow(
  supabase: ReturnType<typeof createServerSupabase>,
  offset: number,
) : Promise<FeaturedCard[]> {
  const { data } = await supabase
    .from("card_prints")
    .select("gv_id,name,number,image_url,image_alt_url,external_ids")
    .order("gv_id")
    .range(offset, offset + FEATURED_CANDIDATE_WINDOW - 1);

  const candidates = ((data ?? []) as HomeCardRow[]).filter(
    (row): row is HomeCardRow & { gv_id: string } => Boolean(row.gv_id) && Boolean(getBestImageUrl(row)),
  );
  const tcgdexIds = Array.from(
    new Set(
      candidates
        .map((row) => row.external_ids?.tcgdex)
        .filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  );

  const pokemonIds =
    tcgdexIds.length > 0
      ? new Set(
          (((await supabase
            .from("tcgdex_cards")
            .select("tcgdex_card_id")
            .eq("lang", "en")
            .eq("supertype", "Pokemon")
            .in("tcgdex_card_id", tcgdexIds)).data ?? []) as PokemonTypeRow[])
            .map((row) => row.tcgdex_card_id)
            .filter((value): value is string => typeof value === "string" && value.length > 0),
        )
      : new Set<string>();

  const tcgdexBackedCandidates = candidates.filter((row) => {
    const tcgdexId = row.external_ids?.tcgdex;
    return Boolean(tcgdexId && pokemonIds.has(tcgdexId));
  });
  const heuristicCandidates = candidates.filter(
    (row) => !tcgdexBackedCandidates.some((candidate) => candidate.gv_id === row.gv_id) && isLikelyPokemonCard(row),
  );

  return [...tcgdexBackedCandidates, ...heuristicCandidates]
    .sort((a, b) => {
      const numberCompare = (getNumericCardNumber(a.number) ?? 9999) - (getNumericCardNumber(b.number) ?? 9999);
      if (numberCompare !== 0) return numberCompare;
      return a.gv_id.localeCompare(b.gv_id);
    })
    .filter((row) => {
      const name = row.name ?? "";
      return !/\benergy\b/i.test(name) && !/\btrainer'?s?\b/i.test(name);
    })
    .slice(0, FEATURED_CARD_COUNT)
    .map((row) => ({
      gv_id: row.gv_id,
      name: row.name ?? "Unknown",
      number: "",
      image_url: getBestImageUrl(row)!,
    }));
}

async function getFeaturedCards(
  supabase: ReturnType<typeof createServerSupabase>,
  totalRows: number,
  startOffset: number,
) {
  const cards: FeaturedCard[] = [];

  for (const offset of getCandidateOffsets(totalRows, startOffset)) {
    const windowCards = await getPokemonCardsFromWindow(supabase, offset);
    for (const card of windowCards) {
      if (cards.some((existing) => existing.gv_id === card.gv_id)) continue;
      cards.push(card);
      if (cards.length === FEATURED_CARD_COUNT) {
        return cards;
      }
    }
  }

  return cards;
}

export default async function HomePage() {
  const supabase = createServerSupabase();
  const { count } = await supabase.from("card_prints").select("*", { count: "exact", head: true });
  const featuredOffset = getRotationOffset(count ?? 0);
  const featuredCards = await getFeaturedCards(supabase, count ?? 0, featuredOffset);

  return (
    <div className="space-y-16 py-8">
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-center">
        <div className="space-y-6">
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
          {featuredCards.map((card) => (
            <FeaturedCardTile key={card.gv_id} gv_id={card.gv_id} name={card.name} image_url={card.image_url} />
          ))}
          {Array.from({ length: Math.max(FEATURED_CARD_COUNT - featuredCards.length, 0) }).map((_, index) => (
            <div
              key={`placeholder-${index}`}
              className="overflow-hidden rounded-2xl border border-dashed border-slate-200 bg-slate-50"
            >
              <div className="flex aspect-[3/4] items-center justify-center bg-slate-100 px-4 text-center text-sm text-slate-500">
                Image unavailable
              </div>
              <div className="space-y-1 border-t border-slate-200 px-3 py-3">
                <p className="line-clamp-2 text-sm font-medium text-slate-700">Featured card</p>
                <p className="text-xs text-slate-500">Loading stable art</p>
              </div>
            </div>
          ))}
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
