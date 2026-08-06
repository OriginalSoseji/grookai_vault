import Link from "next/link";
import PokemonCardGridTile, { PokemonCardGridBadge } from "@/components/cards/PokemonCardGridTile";
import ExploreResultActions from "@/components/explore/ExploreResultActions";
import ExploreCardListItem from "@/components/explore/ExploreCardListItem";
import type { ExploreResultCard } from "@/components/explore/exploreResultTypes";
import ProductState from "@/components/layout/ProductState";
import { MobileParityDock } from "@/components/mobileParity/MobileParityDock";

export const RELEASE_CONVERGENCE_SCENARIOS = [
  "search-vault-bridge",
  "search-result-hierarchy",
  "card-detail-hierarchy",
  "error-state",
  "private-state",
] as const;

export type ReleaseConvergenceScenarioName = typeof RELEASE_CONVERGENCE_SCENARIOS[number];

export function isReleaseConvergenceScenario(value: string): value is ReleaseConvergenceScenarioName {
  return RELEASE_CONVERGENCE_SCENARIOS.includes(value as ReleaseConvergenceScenarioName);
}

function FixtureHeader({ title }: { title: string }) {
  return (
    <header className="flex h-[46px] items-center justify-between border-b border-slate-200/70 bg-white/92 px-4 dark:border-white/[0.08] dark:bg-[#080b11]">
      <h1 className="text-lg font-semibold text-slate-950 dark:text-white">{title}</h1>
      <button type="button" aria-label="Open account menu" className="gv-icon-button">
        <span aria-hidden="true">GV</span>
      </button>
    </header>
  );
}

function SearchVaultBridge() {
  return (
    <div className="min-h-dvh bg-[var(--gv-bg-base)] pb-[104px] text-slate-950 dark:text-white" data-release-convergence-root>
      <FixtureHeader title="Search" />
      <main className="mx-auto w-full max-w-3xl space-y-5 px-[10px] py-4">
        <label className="block">
          <span className="sr-only">Search cards</span>
          <input
            readOnly
            value="Pikachu reverse holo"
            className="gv-input min-h-11 w-full"
            aria-label="Search cards"
          />
        </label>
        <div>
          <p className="gv-eyebrow">Exact card results</p>
          <h2 className="gv-section-title mt-1">Choose the version you own</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Finish and set details stay visible before the card enters your Vault.
          </p>
        </div>
        <div className="grid max-w-[190px] grid-cols-1">
          <PokemonCardGridTile
            density="compact"
            imageAlt="Pikachu reverse holo fixture"
            imageFallbackLabel={(
              <span className="px-3 text-center text-xs leading-5">
                Stable 5:7 card artwork
              </span>
            )}
            imageHref="/card/GV-FIXTURE-PIKACHU"
            title={<Link href="/card/GV-FIXTURE-PIKACHU">Pikachu</Link>}
            subtitle={<span>Scarlet &amp; Violet 151 · #025</span>}
            badges={(
              <>
                <PokemonCardGridBadge tone="accent">Reverse Holo</PokemonCardGridBadge>
                <PokemonCardGridBadge>English</PokemonCardGridBadge>
              </>
            )}
            meta={<span>Near Mint · Market price unavailable</span>}
            actions={(
              <ExploreResultActions
                cardHref="/card/GV-FIXTURE-PIKACHU"
                cardName="Pikachu"
              />
            )}
          />
        </div>
      </main>
      <MobileParityDock activeKey="search" wallHref="/wall" />
    </div>
  );
}

const SEARCH_RESULT_FIXTURE: ExploreResultCard = {
  id: "fixture-pikachu-parent",
  gv_id: "GV-FIXTURE-PIKACHU",
  printing_gv_id: "GV-FIXTURE-PIKACHU-RH",
  name: "Pikachu",
  number: "025",
  set_name: "Scarlet & Violet 151",
  rarity: "Common",
  finish_key: "reverse_holo",
  finish_label: "Reverse Holo",
  display_discriminator: "Reverse Holo",
  raw_price: 3.42,
  raw_price_source: "tcgplayer",
  pricing_source_label: "TCGPlayer Market",
  pricing_scope: "card_printing",
  image_status: "missing_variant_visual",
  display_image_kind: "missing_variant_visual",
};

function SearchResultHierarchy() {
  return (
    <div className="min-h-dvh bg-[var(--gv-bg-base)] pb-[104px] text-slate-950 dark:text-white" data-release-convergence-root>
      <FixtureHeader title="Search" />
      <main className="mx-auto w-full max-w-5xl space-y-5 px-4 py-5">
        <label className="block">
          <span className="sr-only">Search cards</span>
          <input readOnly value="Pikachu reverse holo" className="gv-input min-h-11 w-full" aria-label="Search cards" />
        </label>
        <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-3 dark:border-white/[0.08]">
          <div>
            <p className="gv-eyebrow">Exact version matches</p>
            <h2 className="mt-1 text-2xl font-semibold">Pikachu reverse holo</h2>
            <p className="mt-1 text-sm text-slate-500">1 exact result</p>
          </div>
        </div>
        <ul>
          <ExploreCardListItem
            card={SEARCH_RESULT_FIXTURE}
            href="/card/GV-FIXTURE-PIKACHU?printing=GV-FIXTURE-PIKACHU-RH"
            canViewPricing
            matchReason="Exact name and reverse-holo finish match"
          />
        </ul>
      </main>
      <MobileParityDock activeKey="search" wallHref="/wall" />
    </div>
  );
}

function CardDetailHierarchy() {
  return (
    <div className="min-h-dvh bg-[var(--gv-bg-base)] pb-[104px] text-slate-950 dark:text-white" data-release-convergence-root>
      <FixtureHeader title="Card" />
      <main className="mx-auto w-full max-w-6xl px-4 py-5">
        <section className="gv-product-hero gv-card-detail-hero isolate">
          <div className="relative z-10 grid gap-8 py-2 sm:py-4 lg:grid-cols-[minmax(280px,390px)_minmax(0,1fr)] lg:items-start lg:gap-12">
            <div className="mx-auto w-full max-w-[260px] sm:max-w-[330px] lg:max-w-[390px]">
              <div className="gv-image-stage gv-card-hero-image-stage p-3">
                <div className="flex aspect-[5/7] w-full items-center justify-center rounded-[18px] bg-white/40 px-5 text-center text-sm text-slate-500 ring-1 ring-inset ring-slate-200/50 dark:bg-white/[0.04] dark:ring-white/[0.06]">
                  Exact card image unavailable
                </div>
              </div>
            </div>
            <div className="gv-card-hero-copy flex min-w-0 flex-col gap-5">
              <div className="contents">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="gv-card-detail-eyebrow">Pokémon</span>
                  <span className="gv-hi-ownership inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                    Not in your Vault
                  </span>
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-500">Scarlet &amp; Violet 151 · MEW 025/165</p>
                  <h1 className="gv-hi-card-identity text-[2.5rem] leading-[1.02] sm:text-[3.4rem] lg:text-[4.25rem]">Pikachu</h1>
                  <div className="flex flex-wrap gap-2">
                    <PokemonCardGridBadge tone="accent">Reverse Holo</PokemonCardGridBadge>
                    <PokemonCardGridBadge>English</PokemonCardGridBadge>
                  </div>
                </div>
                <div id="vault-actions" className="gv-action-panel order-1 space-y-3 p-4">
                  <p className="text-sm font-semibold">Choose the exact version you own</p>
                  <ExploreResultActions cardHref="/card/GV-FIXTURE-PIKACHU" cardName="Pikachu" />
                </div>
                <details className="gv-variant-story order-2 group px-5 py-4">
                  <summary className="cursor-pointer list-none text-sm font-semibold">Why this version matters +</summary>
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Version context remains available after the collection action.</p>
                </details>
                <details className="gv-result-evidence order-3">
                  <summary>Card evidence</summary>
                  <div className="gv-result-evidence-body"><p>Grookai ID GV-FIXTURE-PIKACHU</p></div>
                </details>
              </div>
            </div>
          </div>
        </section>
      </main>
      <MobileParityDock activeKey="search" wallHref="/wall" />
    </div>
  );
}

function ErrorState() {
  return (
    <div className="min-h-dvh bg-[var(--gv-bg-base)] text-slate-950 dark:text-white" data-release-convergence-root>
      <FixtureHeader title="Vault" />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <ProductState
          tone="error"
          eyebrow="Could not load this page"
          title="Grookai hit a problem"
          description="Your collection was not changed. Try this page again, or return to Search and continue from there."
          action={<button type="button" className="gv-primary-button">Try again</button>}
          secondaryAction={<Link href="/explore" className="gv-secondary-button">Search cards</Link>}
        />
      </main>
    </div>
  );
}

function PrivateState() {
  return (
    <div className="min-h-dvh bg-[var(--gv-bg-base)] text-slate-950 dark:text-white" data-release-convergence-root>
      <FixtureHeader title="Binder" />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <ProductState
          tone="private"
          eyebrow="Private collection"
          title="This Binder is not shared"
          description="Ask the collector for access, or return to your own Binders."
          action={<Link href="/binders" className="gv-primary-button">My Binders</Link>}
          secondaryAction={<Link href="/explore" className="gv-secondary-button">Search cards</Link>}
        />
      </main>
    </div>
  );
}

export function ReleaseConvergenceScenario({ scenario }: { scenario: ReleaseConvergenceScenarioName }) {
  if (scenario === "search-vault-bridge") {
    return <SearchVaultBridge />;
  }
  if (scenario === "search-result-hierarchy") {
    return <SearchResultHierarchy />;
  }
  if (scenario === "card-detail-hierarchy") {
    return <CardDetailHierarchy />;
  }
  if (scenario === "private-state") {
    return <PrivateState />;
  }
  return <ErrorState />;
}
