import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@supabase/supabase-js";
import PublicCardImage from "@/components/PublicCardImage";
import PublicSearchForm from "@/components/PublicSearchForm";
import { resolveCanonImageUrlV1 } from "@/lib/canon/resolveCanonImageV1";
import { getBestPublicCardImageUrl } from "@/lib/publicCardImage";

const FEATURED_CARD_NAMES = ["Pikachu", "Charizard", "Mewtwo"] as const;

type FeaturedCardRow = {
  gv_id: string | null;
  name: string | null;
  image_url: string | null;
  image_alt_url: string | null;
  image_source: string | null;
  image_path: string | null;
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
    .select("gv_id,name,image_url,image_alt_url,image_source,image_path")
    .eq("name", name)
    .order("gv_id")
    .limit(12);

  const resolvedRows = await Promise.all(
    ((data ?? []) as FeaturedCardRow[]).map(async (row) => ({
      row,
      resolvedImageUrl:
        (await resolveCanonImageUrlV1(row)) ??
        getBestPublicCardImageUrl(row.image_url, row.image_alt_url) ??
        null,
    })),
  );
  const bestRow = resolvedRows.find(
    (entry) => typeof entry.row.gv_id === "string" && Boolean(entry.resolvedImageUrl),
  );

  return {
    gv_id: bestRow?.row.gv_id ?? `featured-${name.toLowerCase()}`,
    name,
    image_url: bestRow?.resolvedImageUrl ?? undefined,
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
          placeholder="Search cards, sets, or Grookai IDs to find available cards"
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
                Find the cards you want. Reach the collectors who have them.
              </h1>
              <p className="max-w-2xl text-lg text-slate-600">
                See who has the card you want, who&rsquo;s willing to move it, and reach out instantly.
              </p>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                Built on a trusted card identity system.
              </p>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                Collectors can already mark cards for trade, sale, and showcase.
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
          <h2 className="text-2xl font-semibold text-slate-950">Cards aren&rsquo;t just data here</h2>
          <p className="max-w-xl text-sm leading-7 text-slate-600">
            Every card is tied to a real collector and a real intent.
          </p>
          <p className="max-w-xl text-sm leading-7 text-slate-600">
            You&rsquo;re not just browsing listings. You&rsquo;re seeing what collectors are actually open to moving.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-950">Built for how collectors actually move cards</h2>
          <p className="max-w-xl text-sm leading-7 text-slate-600">
            Collectors don&rsquo;t just track cards.
          </p>
          <p className="max-w-xl text-sm leading-7 text-slate-600">They trade, buy, sell, and connect.</p>
          <p className="max-w-xl text-sm leading-7 text-slate-600">Grookai makes that visible:</p>
          <ul className="max-w-xl space-y-1 text-sm leading-7 text-slate-600">
            <li>mark what you&rsquo;re willing to move</li>
            <li>see what other collectors have</li>
            <li>reach out directly on the card</li>
          </ul>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-8 shadow-sm shadow-slate-200/70 md:px-8">
        <div className="max-w-3xl space-y-4">
          <h2 className="text-2xl font-semibold text-slate-950">Turn your collection into real opportunities</h2>
          <p className="text-sm leading-7 text-slate-600">
            Set intent on your cards.
          </p>
          <p className="text-sm leading-7 text-slate-600">Trade them. Sell them. Showcase them.</p>
          <p className="text-sm leading-7 text-slate-600">
            When you&rsquo;re ready, other collectors can find them and reach out.
          </p>
          <div>
            <Link
              href="/login?next=%2Faccount"
              className="inline-flex rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Put your cards in play
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
