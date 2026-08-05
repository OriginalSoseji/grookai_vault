import Link from "next/link";
import PokemonCardGridTile, { PokemonCardGridBadge } from "@/components/cards/PokemonCardGridTile";
import ExploreResultActions from "@/components/explore/ExploreResultActions";
import ProductState from "@/components/layout/ProductState";
import { MobileParityDock } from "@/components/mobileParity/MobileParityDock";

export const RELEASE_CONVERGENCE_SCENARIOS = [
  "search-vault-bridge",
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
  if (scenario === "private-state") {
    return <PrivateState />;
  }
  return <ErrorState />;
}
