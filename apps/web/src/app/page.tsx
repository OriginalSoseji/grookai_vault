import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@supabase/supabase-js";
import PublicCardImage from "@/components/PublicCardImage";
import PublicSearchForm from "@/components/PublicSearchForm";
import { getBestPublicCardImageUrl } from "@/lib/publicCardImage";

const FEATURED_CARD_NAMES = ["Pikachu", "Charizard", "Mewtwo"] as const;

type FeaturedCardRow = {
  gv_id: string | null;
  name: string | null;
  image_url: string | null;
  image_alt_url: string | null;
};

type FeaturedCard = {
  gv_id: string;
  name: string;
  image_url?: string;
};

function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createClient(url, anon);
}

async function getFeaturedCardByName(
  supabase: ReturnType<typeof createServerSupabase>,
  name: (typeof FEATURED_CARD_NAMES)[number],
): Promise<FeaturedCard> {
  const { data } = await supabase
    .from("card_prints")
    .select("gv_id,name,image_url,image_alt_url")
    .eq("name", name)
    .order("gv_id")
    .limit(12);

  const bestRow = ((data ?? []) as FeaturedCardRow[]).find(
    (row) => typeof row.gv_id === "string" && Boolean(getBestPublicCardImageUrl(row.image_url, row.image_alt_url)),
  );

  return {
    gv_id: bestRow?.gv_id ?? `featured-${name.toLowerCase()}`,
    name,
    image_url: bestRow ? getBestPublicCardImageUrl(bestRow.image_url, bestRow.image_alt_url) ?? undefined : undefined,
  };
}

async function getFeaturedCards() {
  const supabase = createServerSupabase();
  return Promise.all(FEATURED_CARD_NAMES.map((name) => getFeaturedCardByName(supabase, name)));
}

function HomeSearchFallback() {
  return (
    <form action="/search" className="max-w-2xl">
      <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-3 shadow-sm shadow-slate-200/60">
        <input
          type="search"
          name="q"
          placeholder="Search Pokémon cards, sets, or Grookai IDs"
          className="min-w-0 flex-1 bg-transparent px-3 text-base text-slate-900 outline-none placeholder:text-slate-400"
          aria-label="Search cards"
        />
        <button
          type="submit"
          className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white"
        >
          Search
        </button>
      </div>
    </form>
  );
}

export default async function HomePage() {
  const [leftCard, centerCard, rightCard] = await getFeaturedCards();

  return (
    <div className="space-y-20 py-10 md:py-14">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white px-6 py-10 shadow-sm shadow-slate-200/70 md:px-10 md:py-14">
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-amber-100/50 via-sky-50/40 to-transparent" />
        <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center">
          <div className="space-y-6">
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                The vault for trading card collectors.
              </h1>
              <p className="max-w-2xl text-lg text-slate-600">
                Catalog your cards. Verify exactly what you own. Share your collection.
              </p>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                Built on a trusted card identity system
              </p>
            </div>

            <Suspense fallback={<HomeSearchFallback />}>
              <PublicSearchForm variant="hero" />
            </Suspense>
          </div>

          <div className="mx-auto flex w-full max-w-[420px] items-end justify-center gap-3 sm:gap-4">
            <Link
              href={leftCard.gv_id.startsWith("featured-") ? "/explore" : `/card/${leftCard.gv_id}`}
              className="block w-[30%] translate-y-4 -rotate-6 transition hover:-translate-y-0.5"
            >
              <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-md shadow-slate-200/70">
                <PublicCardImage
                  src={leftCard.image_url}
                  alt={leftCard.name}
                  imageClassName="aspect-[3/4] w-full rounded-[1rem] bg-slate-50 object-contain"
                  fallbackClassName="flex aspect-[3/4] w-full items-center justify-center rounded-[1rem] bg-slate-100 px-3 text-center text-xs text-slate-500"
                  fallbackLabel={leftCard.name}
                />
              </div>
            </Link>

            <Link
              href={centerCard.gv_id.startsWith("featured-") ? "/explore" : `/card/${centerCard.gv_id}`}
              className="block w-[38%] -translate-y-4 transition hover:-translate-y-5"
            >
              <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-3 shadow-xl shadow-slate-300/60">
                <PublicCardImage
                  src={centerCard.image_url}
                  alt={centerCard.name}
                  imageClassName="aspect-[3/4] w-full rounded-[1.1rem] bg-slate-50 object-contain"
                  fallbackClassName="flex aspect-[3/4] w-full items-center justify-center rounded-[1.1rem] bg-slate-100 px-4 text-center text-sm text-slate-500"
                  fallbackLabel={centerCard.name}
                />
              </div>
            </Link>

            <Link
              href={rightCard.gv_id.startsWith("featured-") ? "/explore" : `/card/${rightCard.gv_id}`}
              className="block w-[30%] translate-y-5 rotate-6 transition hover:translate-y-1"
            >
              <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-md shadow-slate-200/70">
                <PublicCardImage
                  src={rightCard.image_url}
                  alt={rightCard.name}
                  imageClassName="aspect-[3/4] w-full rounded-[1rem] bg-slate-50 object-contain"
                  fallbackClassName="flex aspect-[3/4] w-full items-center justify-center rounded-[1rem] bg-slate-100 px-3 text-center text-xs text-slate-500"
                  fallbackLabel={rightCard.name}
                />
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-10 md:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-950">What is Grookai Vault</h2>
          <p className="max-w-xl text-sm leading-7 text-slate-600">
            Grookai Vault is a platform where collectors catalog, verify, and show their trading cards.
          </p>
          <p className="max-w-xl text-sm leading-7 text-slate-600">
            Every card on Grookai is anchored to a trusted identity so collectors always know exactly which card they
            are referencing.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-950">Where Grookai is going</h2>
          <p className="max-w-xl text-sm leading-7 text-slate-600">
            Grookai starts with trusted card identity, then expands into collection tools, provenance, and trading
            utilities.
          </p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-8 shadow-sm shadow-slate-200/70 md:px-8">
        <div className="max-w-3xl space-y-4">
          <h2 className="text-2xl font-semibold text-slate-950">Create your profile</h2>
          <p className="text-sm leading-7 text-slate-600">
            Build your personal card vault. Track the cards you own, show your collection, and explore what other
            collectors are discovering.
          </p>
          <div>
            <Link
              href="/login?next=%2Faccount"
              className="inline-flex rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Create your profile
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
