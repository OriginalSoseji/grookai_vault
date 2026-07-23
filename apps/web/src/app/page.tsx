import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Suspense } from "react";
import PublicCardImage from "@/components/PublicCardImage";
import PublicSearchForm from "@/components/PublicSearchForm";
import { resolveDisplayIdentity } from "@/lib/cards/resolveDisplayIdentity";
import { VARIANT_FAMILY_DISCOVERY_COPY } from "@/lib/cards/variantFamilyDiscoveryCopy";
import { resolveCardImageFieldsV1 } from "@/lib/canon/resolveCardImageFieldsV1";
import {
  applyChildDisplayImageFallback,
  getChildDisplayImageFallbacks,
} from "@/lib/cards/childDisplayImageFallbacks";
import { createPublicServerClient } from "@/lib/supabase/publicServer";

const FEATURED_CARD_NAMES = ["Pikachu", "Charizard", "Mewtwo"] as const;

export const revalidate = 300;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

type FeaturedCardRow = {
  id: string | null;
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

const DISCOVERY_SEARCHES = [
  {
    label: "WB Kids Stamp",
    href: "/explore?q=WB%20Kids%20Stamp",
    description: "Find the promo stamp states and recognized WB Kids variants.",
  },
  {
    label: "Pikachu reverse holo 2022-2024",
    href: "/explore?q=Pikachu&year_min=2022&year_max=2024&finish=reverse",
    description: "Search by Pokemon, finish, and year range in one collector query.",
  },
  {
    label: "Build-A-Bear stamped cards",
    href: "/explore?q=Build-A-Bear%20stamped%20cards",
    description: "Retailer distribution stamps modeled as distinct identities.",
  },
  {
    label: "Gengar cameos",
    href: "/explore?q=Gengar%20cameo",
    description: "Search artwork appearances beyond the main card name.",
  },
] as const;

const FEATURED_FAMILY_KEYS = [
  "pokemon_center_stamp",
  "jungle_no_symbol_error",
  "base_pikachu_print_run",
  "build_a_bear_workshop_stamp",
] as const;

const COLLECTOR_PATHWAYS = [
  {
    eyebrow: "Search",
    title: "Ask in collector language",
    body: "Search understands stamps, finishes, years, ownership, artists, and exact versions instead of forcing database syntax.",
    href: "/explore",
    cta: "Search the catalog",
  },
  {
    eyebrow: "Dex",
    title: "Track character completion",
    body: "Dex connects Pokemon species to your Vault progress so completion is about the character, not just one set.",
    href: "/dex",
    cta: "Open Dex",
  },
  {
    eyebrow: "Vault",
    title: "Turn ownership into context",
    body: "Vault is the collection layer. It shows what you own and becomes the basis for gaps, missing variants, and collector goals.",
    href: "/vault",
    cta: "Open Vault",
  },
] as const;

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
      "id,gv_id,name,set_code,number,variant_key,printed_identity_modifier,image_url,image_alt_url,image_source,image_path,representative_image_url,image_status,image_note,sets(identity_model)",
    )
    .eq("name", name)
    .order("gv_id")
    .limit(12);

  const rows = (data ?? []) as FeaturedCardRow[];
  const childDisplayImageFallbacks = await getChildDisplayImageFallbacks(
    supabase,
    rows,
  );
  const resolvedRows = await Promise.all(
    rows.map(async (row) => {
      const imageFields = applyChildDisplayImageFallback(
        await resolveCardImageFieldsV1(row),
        row.id ? childDisplayImageFallbacks.get(row.id) : null,
      );
      return {
        row,
        resolvedImageUrl: imageFields.display_image_url,
      };
    }),
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
              <span className="sm:hidden">
                Collect with
                <br />
                purpose.
              </span>
              <span className="hidden sm:inline">Collect with purpose.</span>
            </h1>
            <p className="gv-body-copy mx-auto max-w-2xl">
              Search cards, variants, stamps, cameos, Pokemon, sets, and your own collection through one collector intelligence layer.
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

      <section className="space-y-5">
        <div className="mx-auto max-w-3xl space-y-2 text-center">
          <p className="gv-eyebrow">Collector intelligence</p>
          <h2 className="gv-section-title">Start with the relationship, not the row.</h2>
          <p className="gv-body-copy text-sm">
            Grookai understands card identity, special variants, stamp families, Pokemon completion, image truth, and vault ownership as connected collector facts.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {DISCOVERY_SEARCHES.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="gv-premium-surface group px-5 py-5 transition hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-slate-600"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Try searching</p>
              <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950 dark:text-slate-50">{item.label}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.description}</p>
              <span className="mt-4 inline-flex text-sm font-bold text-sky-600 transition group-hover:text-sky-700 dark:text-sky-300">
                Open results
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div className="space-y-2">
            <p className="gv-eyebrow">Variant families</p>
            <h2 className="gv-section-title">Special cards are first-class identities.</h2>
          </div>
          <Link href="/explore?identity=stamped" className="gv-secondary-button self-start px-4 py-2 text-sm md:self-auto">
            Browse stamped lanes
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {FEATURED_FAMILY_KEYS.map((familyKey) => {
            const family = VARIANT_FAMILY_DISCOVERY_COPY[familyKey];
            return (
              <Link
                key={family.family_key}
                href={`/explore?q=${encodeURIComponent(family.family_label)}`}
                className="group rounded-[28px] border border-slate-200/70 bg-white/78 p-5 shadow-[0_30px_80px_-62px_rgba(15,23,42,0.52)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white dark:border-white/[0.08] dark:bg-white/[0.04] dark:hover:border-white/[0.14] dark:hover:bg-white/[0.06]"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-slate-950 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white dark:bg-white dark:text-slate-950">
                      {family.variant_category.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-300">
                      {family.confidence}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-slate-950 dark:text-slate-50">{family.family_label}</h3>
                    <p className="mt-2 line-clamp-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{family.why_collectors_care}</p>
                  </div>
                  <p className="text-sm font-bold text-sky-600 transition group-hover:text-sky-700 dark:text-sky-300">View family results</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {COLLECTOR_PATHWAYS.map((item) => (
          <Link key={item.eyebrow} href={item.href} className="gv-premium-surface group px-6 py-7">
            <p className="gv-eyebrow">{item.eyebrow}</p>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-slate-50">{item.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.body}</p>
            <span className="mt-5 inline-flex text-sm font-bold text-sky-600 transition group-hover:text-sky-700 dark:text-sky-300">
              {item.cta}
            </span>
          </Link>
        ))}
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
