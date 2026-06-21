import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import PublicCardImage from "@/components/PublicCardImage";
import PublicSearchForm from "@/components/PublicSearchForm";
import { resolveDisplayIdentity } from "@/lib/cards/resolveDisplayIdentity";
import { resolveCardImageFieldsV1 } from "@/lib/canon/resolveCardImageFieldsV1";
import { createPublicServerClient } from "@/lib/supabase/publicServer";

const FEATURED_CARD_NAMES = ["Pikachu", "Charizard", "Mewtwo"] as const;

export const revalidate = 300;

type FeaturedCardRow = {
  gv_id: string | null;
  name: string | null;
  set_code: string | null;
  number: string | null;
  variant_key: string | null;
  printed_identity_modifier: string | null;
  image_url: string | null;
  image_alt_url: string | null;
  image_source: string | null;
  image_path: string | null;
  representative_image_url: string | null;
  image_status: string | null;
  image_note: string | null;
  sets?:
    | {
        identity_model: string | null;
      }
    | {
        identity_model: string | null;
      }[]
    | null;
};

type FeaturedCard = {
  gv_id: string;
  display_name: string;
  image_url?: string;
};

function createServerSupabase() {
  return createPublicServerClient(300);
}

async function getFeaturedCardByName(
  supabase: ReturnType<typeof createServerSupabase>,
  name: (typeof FEATURED_CARD_NAMES)[number],
): Promise<FeaturedCard> {
  const { data } = await supabase
    .from("card_prints")
    .select(
      "gv_id,name,set_code,number,variant_key,printed_identity_modifier,image_url,image_alt_url,image_source,image_path,representative_image_url,image_status,image_note,sets(identity_model)",
    )
    .eq("name", name)
    .order("gv_id")
    .limit(12);

  const resolvedRows = await Promise.all(
    ((data ?? []) as FeaturedCardRow[]).map(async (row) => ({
      row,
      resolvedImageUrl: (await resolveCardImageFieldsV1(row)).display_image_url,
    })),
  );
  const bestRow = resolvedRows.find(
    (entry) => typeof entry.row.gv_id === "string" && Boolean(entry.resolvedImageUrl),
  );
  const bestSet = Array.isArray(bestRow?.row.sets) ? bestRow?.row.sets[0] : bestRow?.row.sets;
  const displayIdentity = resolveDisplayIdentity({
    name: bestRow?.row.name ?? name,
    variant_key: bestRow?.row.variant_key ?? null,
    printed_identity_modifier: bestRow?.row.printed_identity_modifier ?? null,
    set_identity_model: bestSet?.identity_model ?? null,
    set_code: bestRow?.row.set_code ?? "",
    number: bestRow?.row.number ?? null,
  });

  return {
    gv_id: bestRow?.row.gv_id ?? `featured-${name.toLowerCase()}`,
    display_name: displayIdentity.display_name,
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
      <div className="flex items-center gap-3 rounded-full bg-white/78 px-3 py-3 shadow-[0_28px_70px_-52px_rgba(15,23,42,0.72)] ring-1 ring-white/80 backdrop-blur-xl">
        <input
          type="search"
          name="q"
          placeholder="Search cards, sets, or Grookai IDs to find available cards"
          className="min-w-0 flex-1 bg-transparent px-3 text-base text-slate-900 outline-none placeholder:text-slate-400"
          aria-label="Search cards"
        />
        <button
          type="submit"
          className="gv-primary-button"
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
    <div className="space-y-16 py-8 md:space-y-20 md:py-12">
      <section className="gv-showcase-hero px-5 py-10 md:px-10 md:py-14">
        <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-8 text-center">
          <div className="space-y-5">
            <Image
              src="/grookai-logo-192.png"
              alt="Grookai Vault logo"
              width={88}
              height={88}
              className="mx-auto rounded-[26px] shadow-[0_18px_40px_-30px_rgba(74,144,226,0.9)]"
              priority
            />
            <p className="gv-eyebrow">Grookai Vault</p>
            <h1 className="gv-display-title mx-auto max-w-4xl">
              Collect with purpose.
            </h1>
            <p className="gv-body-copy mx-auto max-w-2xl">
              Show your collection, connect with collectors, and act when it matters.
            </p>
          </div>

          <div className="w-full max-w-2xl">
            <Suspense fallback={<HomeSearchFallback />}>
              <PublicSearchForm variant="hero" />
            </Suspense>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/early-access" className="gv-primary-button">
              Join early access
            </Link>
            <Link href="/explore" className="gv-secondary-button">
              Preview search
            </Link>
          </div>

          <div className="mx-auto flex w-full max-w-[560px] items-end justify-center gap-3 pt-2 sm:gap-5">
            <Link
              href={leftCard.gv_id.startsWith("featured-") ? "/explore" : `/card/${leftCard.gv_id}`}
              className="block w-[29%] translate-y-5 -rotate-6 transition hover:-translate-y-0.5"
            >
              <div className="overflow-hidden rounded-[1.65rem] bg-white/82 p-3 shadow-[0_30px_70px_-48px_rgba(15,23,42,0.72)] ring-1 ring-white/80">
                <PublicCardImage
                  src={leftCard.image_url}
                  alt={leftCard.display_name}
                  imageClassName="aspect-[3/4] w-full rounded-[1rem] bg-slate-50 object-contain"
                  fallbackClassName="flex aspect-[3/4] w-full items-center justify-center rounded-[1rem] bg-slate-100 px-3 text-center text-xs text-slate-500"
                  fallbackLabel={leftCard.display_name}
                />
              </div>
            </Link>

            <Link
              href={centerCard.gv_id.startsWith("featured-") ? "/explore" : `/card/${centerCard.gv_id}`}
              className="block w-[38%] -translate-y-5 transition hover:-translate-y-6"
            >
              <div className="overflow-hidden rounded-[1.9rem] bg-white/88 p-3 shadow-[0_42px_90px_-50px_rgba(15,23,42,0.78)] ring-1 ring-white/90">
                <PublicCardImage
                  src={centerCard.image_url}
                  alt={centerCard.display_name}
                  imageClassName="aspect-[3/4] w-full rounded-[1.1rem] bg-slate-50 object-contain"
                  fallbackClassName="flex aspect-[3/4] w-full items-center justify-center rounded-[1.1rem] bg-slate-100 px-4 text-center text-sm text-slate-500"
                  fallbackLabel={centerCard.display_name}
                />
              </div>
            </Link>

            <Link
              href={rightCard.gv_id.startsWith("featured-") ? "/explore" : `/card/${rightCard.gv_id}`}
              className="block w-[29%] translate-y-6 rotate-6 transition hover:translate-y-1"
            >
              <div className="overflow-hidden rounded-[1.65rem] bg-white/82 p-3 shadow-[0_30px_70px_-48px_rgba(15,23,42,0.72)] ring-1 ring-white/80">
                <PublicCardImage
                  src={rightCard.image_url}
                  alt={rightCard.display_name}
                  imageClassName="aspect-[3/4] w-full rounded-[1rem] bg-slate-50 object-contain"
                  fallbackClassName="flex aspect-[3/4] w-full items-center justify-center rounded-[1rem] bg-slate-100 px-3 text-center text-xs text-slate-500"
                  fallbackLabel={rightCard.display_name}
                />
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <div className="gv-premium-surface space-y-4 px-6 py-7 md:px-8">
          <h2 className="gv-section-title">Cards are not just data here</h2>
          <p className="gv-body-copy max-w-xl text-sm">
            Every card is tied to a real collector and a real intent.
          </p>
          <p className="gv-body-copy max-w-xl text-sm">
            You&rsquo;re not just browsing listings. You&rsquo;re seeing what collectors are actually open to moving.
          </p>
        </div>

        <div className="gv-premium-surface space-y-4 px-6 py-7 md:px-8">
          <h2 className="gv-section-title">Built for how collectors move cards</h2>
          <p className="gv-body-copy max-w-xl text-sm">
            Collectors don&rsquo;t just track cards.
          </p>
          <p className="gv-body-copy max-w-xl text-sm">They trade, buy, sell, and connect.</p>
          <p className="gv-body-copy max-w-xl text-sm">Grookai makes that visible:</p>
          <ul className="gv-body-copy max-w-xl space-y-1 text-sm">
            <li>mark what you&rsquo;re willing to move</li>
            <li>see what other collectors have</li>
            <li>reach out directly on the card</li>
          </ul>
        </div>
      </section>

      <section className="gv-showcase-hero px-6 py-9 md:px-9">
        <div className="max-w-3xl space-y-4">
          <h2 className="gv-section-title">Turn your collection into real opportunities</h2>
          <p className="gv-body-copy text-sm">
            Set intent on your cards.
          </p>
          <p className="gv-body-copy text-sm">Trade them. Sell them. Showcase them.</p>
          <p className="gv-body-copy text-sm">
            When you&rsquo;re ready, other collectors can find them and reach out.
          </p>
          <div>
            <Link
              href="/login?next=%2Faccount"
              className="gv-primary-button"
            >
              Make your cards visible
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
