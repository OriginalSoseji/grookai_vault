import Link from "next/link";
import type { ReactNode } from "react";
import PokemonCardGridTile, { PokemonCardGridBadge } from "@/components/cards/PokemonCardGridTile";
import ExploreResultActions from "@/components/explore/ExploreResultActions";
import ExploreCardListItem from "@/components/explore/ExploreCardListItem";
import type { ExploreResultCard } from "@/components/explore/exploreResultTypes";
import ProductState from "@/components/layout/ProductState";
import { MobileParityDock } from "@/components/mobileParity/MobileParityDock";
import NetworkStreamCard from "@/components/network/NetworkStreamCard";
import { FeaturedWallSection } from "@/components/public/FeaturedWallSection";
import { PublicCollectorHeader } from "@/components/public/PublicCollectorHeader";
import type { CardStreamRow } from "@/lib/network/getCardStreamRows";
import type { PublicWallCard } from "@/lib/sharedCards/publicWall.shared";
import type { VaultCardData } from "@/components/vault/VaultCardTile";
import VaultExactCopyHero from "@/components/vault/VaultExactCopyHero";
import ReleaseConvergenceVaultTileFixture from "@/components/visualParity/ReleaseConvergenceVaultTileFixture";

export const RELEASE_CONVERGENCE_SCENARIOS = [
  "search-vault-bridge",
  "search-result-hierarchy",
  "card-detail-hierarchy",
  "vault-loaded",
  "vault-empty",
  "vault-private",
  "vault-partial-error",
  "vault-duplicate-copy",
  "vault-offline",
  "vault-exact-copy",
  "pulse-event",
  "pulse-empty",
  "pulse-partial-error",
  "social-loading",
  "wall-collection",
  "wall-private",
  "profile-collector",
  "profile-blocked",
  "profile-deleted",
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

const SOCIAL_CARD_FIXTURE: PublicWallCard = {
  card_print_id: "fixture-card-print-pikachu",
  gv_id: "GV-FIXTURE-PIKACHU-IR",
  gv_vi_id: "GV-VI-FIXTURE-PIKACHU-IR-NM",
  name: "Pikachu",
  variant_key: "illustration_rare",
  set_identity_model: "parent_with_finish_children",
  set_code: "PAL",
  set_name: "Paldea Evolved",
  number: "173",
  rarity: "Illustration Rare",
  display_image_kind: "missing_variant_visual",
  image_status: "missing_variant_visual",
  image_note: "Exact finish image is not available.",
  owned_count: 1,
  raw_count: 1,
  slab_count: 0,
  is_slab: false,
  public_note: "A favorite from this collector's illustration collection.",
};

const PULSE_CARD_FIXTURE: CardStreamRow = {
  vaultItemId: "fixture-vault-item-pikachu",
  ownerUserId: "fixture-owner",
  ownerSlug: "fixture-collector",
  ownerDisplayName: "Fixture Collector",
  cardPrintId: "fixture-card-print-pikachu",
  intent: "trade",
  quantity: 1,
  inPlayCount: 1,
  tradeCount: 1,
  sellCount: 0,
  showcaseCount: 0,
  rawCount: 1,
  slabCount: 0,
  conditionLabel: "NM",
  isGraded: false,
  gradeCompany: null,
  gradeValue: null,
  gradeLabel: null,
  createdAt: "2026-08-05T15:30:00.000Z",
  gvId: "GV-FIXTURE-PIKACHU-IR",
  name: "Pikachu",
  setCode: "PAL",
  setName: "Paldea Evolved",
  number: "173",
  variantKey: "illustration_rare",
  printedIdentityModifier: null,
  setIdentityModel: "parent_with_finish_children",
  imageUrl: null,
  imageFallbackUrls: [],
  hostedImageUrl: null,
  providerImageUrl: null,
  displayImageKind: "missing_variant_visual",
  imageStatus: "missing_variant_visual",
  imageNote: "Exact finish image is not available.",
  inPlayCopies: [{
    instanceId: "fixture-instance-pikachu",
    gvviId: "GV-VI-FIXTURE-PIKACHU-IR-NM",
    vaultItemId: "fixture-vault-item-pikachu",
    intent: "trade",
    conditionLabel: "NM",
    isGraded: false,
    gradeCompany: null,
    gradeValue: null,
    gradeLabel: null,
    certNumber: null,
    createdAt: "2026-08-05T15:30:00.000Z",
  }],
};

function SocialFixtureShell({
  title,
  activeKey,
  children,
}: {
  title: string;
  activeKey: "pulse" | "wall";
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[var(--gv-bg-base)] pb-[104px] text-slate-950 dark:text-white" data-release-convergence-root>
      <FixtureHeader title={title} />
      <main className="mx-auto w-full max-w-4xl px-4 py-5">{children}</main>
      <MobileParityDock activeKey={activeKey} wallHref="/wall" />
    </div>
  );
}

function PulseEventFixture() {
  return (
    <SocialFixtureShell title="Pulse" activeKey="pulse">
      <div className="mb-5 border-b border-slate-200/80 pb-4 dark:border-white/[0.08]">
        <p className="gv-eyebrow">Latest from collectors</p>
        <h2 className="mt-1 text-2xl font-semibold">Pulse</h2>
      </div>
      <NetworkStreamCard
        row={PULSE_CARD_FIXTURE}
        isAuthenticated
        viewerUserId="fixture-owner"
        currentPath="/network"
      />
    </SocialFixtureShell>
  );
}

function WallCollectionFixture({ withProfile = false }: { withProfile?: boolean }) {
  return (
    <SocialFixtureShell title={withProfile ? "Collector" : "Wall"} activeKey="wall">
      <div className="space-y-6">
        {withProfile ? (
          <PublicCollectorHeader
            displayName="Fixture Collector"
            slug="fixture-collector"
            description="A collection of illustration rares and favorite exact copies."
            joinedAt="2025-05-18T12:00:00.000Z"
            followingCount={18}
            followerCount={24}
            followingHref="/u/fixture-collector/following"
            followerHref="/u/fixture-collector/followers"
            stats={[{ value: "31", label: "cards" }, { value: "12", label: "sets" }]}
            actions={<button type="button" className="gv-secondary-button">Follow</button>}
          />
        ) : null}
        <FeaturedWallSection cards={[SOCIAL_CARD_FIXTURE]} viewerUserId={null} ownerUserId="fixture-owner" />
      </div>
    </SocialFixtureShell>
  );
}

function SocialState({ kind }: { kind: "pulse-empty" | "pulse-partial" | "wall-private" | "profile-blocked" | "profile-deleted" }) {
  const model = {
    "pulse-empty": { title: "You are caught up", description: "Nothing new around your collection right now.", eyebrow: "Pulse", tone: "neutral" as const },
    "pulse-partial": { title: "Some activity is unavailable", description: "Loaded events are still shown. Newer activity could not be refreshed.", eyebrow: "Pulse", tone: "error" as const },
    "wall-private": { title: "This Wall is private", description: "Only the collector can see its cards and collection details.", eyebrow: "Private collection", tone: "private" as const },
    "profile-blocked": { title: "This collector is unavailable", description: "Profile, Wall, follow, and message actions are hidden while this block is active.", eyebrow: "Collector blocked", tone: "private" as const },
    "profile-deleted": { title: "Collector profile not found", description: "This profile may have been deleted or is no longer shared.", eyebrow: "Profile unavailable", tone: "neutral" as const },
  }[kind];
  const isPulse = kind.startsWith("pulse");

  return (
    <SocialFixtureShell title={isPulse ? "Pulse" : kind === "wall-private" ? "Wall" : "Collector"} activeKey={isPulse ? "pulse" : "wall"}>
      <ProductState {...model} />
      {kind === "pulse-partial" ? (
        <div className="mt-7">
          <NetworkStreamCard row={PULSE_CARD_FIXTURE} isAuthenticated viewerUserId="fixture-owner" currentPath="/network" />
        </div>
      ) : null}
    </SocialFixtureShell>
  );
}

function SocialLoadingFixture() {
  return (
    <SocialFixtureShell title="Pulse" activeKey="pulse">
      <section className="space-y-4" aria-busy="true" aria-label="Loading collector activity">
        <div className="h-5 w-36 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-4 border-t border-slate-200/80 pt-5 dark:border-white/[0.08]">
          <div className="aspect-[5/7] rounded-[18px] bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-3 pt-1">
            <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-6 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </section>
    </SocialFixtureShell>
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

const VAULT_SINGLE_COPY: VaultCardData = {
  id: "fixture-vault-pikachu",
  vault_item_id: "fixture-vault-item-pikachu",
  gv_vi_id: "GV-VI-FIXTURE-PIKACHU-RH",
  card_id: "fixture-card-print-pikachu",
  gv_id: "GV-FIXTURE-PIKACHU",
  name: "Pikachu",
  variant_key: "standard",
  printed_identity_modifier: "",
  set_identity_model: "parent_with_finish_children",
  set_code: "MEW",
  set_name: "Scarlet & Violet 151",
  number: "025",
  condition_label: "NM",
  intent: "hold",
  primary_intent: "hold",
  hold_count: 1,
  trade_count: 0,
  sell_count: 0,
  showcase_count: 0,
  in_play_count: 0,
  owned_count: 1,
  raw_count: 1,
  slab_count: 0,
  removable_raw_instance_id: "fixture-instance-pikachu",
  slab_items: [],
  copy_items: [{
    instance_id: "fixture-instance-pikachu",
    gv_vi_id: "GV-VI-FIXTURE-PIKACHU-RH",
    card_printing_id: "fixture-printing-pikachu-rh",
    finish_label: "Reverse Holo",
    intent: "hold",
    condition_label: "NM",
    is_graded: false,
    grader: null,
    grade: null,
    cert_number: null,
    notes: null,
    created_at: "2026-08-04T18:00:00.000Z",
    market_price: 3.42,
  }],
  effective_price: 3.42,
  pricing_updated_at: "2026-08-05T08:15:00.000Z",
  priced_raw_copy_count: 1,
  unpriced_raw_copy_count: 0,
  canonical_image_status: "missing_variant_visual",
  canonical_image_note: "Exact finish image is not available.",
  canonical_display_image_kind: "missing_variant_visual",
  created_at: "2026-08-04T18:00:00.000Z",
  is_slab: false,
  grader: null,
  grade: null,
  cert_number: null,
  is_shared: false,
  active_message_count: 0,
  unread_message_count: 0,
  messages_href: null,
};

const VAULT_DUPLICATE_COPY: VaultCardData = {
  ...VAULT_SINGLE_COPY,
  id: "fixture-vault-charizard",
  vault_item_id: "fixture-vault-item-charizard",
  gv_vi_id: null,
  card_id: "fixture-card-print-charizard",
  gv_id: "GV-FIXTURE-CHARIZARD",
  name: "Charizard ex",
  set_code: "OBF",
  set_name: "Obsidian Flames",
  number: "125",
  condition_label: "Mixed",
  intent: "showcase",
  primary_intent: "showcase",
  hold_count: 1,
  showcase_count: 1,
  in_play_count: 1,
  owned_count: 2,
  raw_count: 2,
  removable_raw_instance_id: null,
  copy_items: [
    {
      ...VAULT_SINGLE_COPY.copy_items[0],
      instance_id: "fixture-instance-charizard-normal",
      gv_vi_id: "GV-VI-FIXTURE-CHARIZARD-NORMAL",
      card_printing_id: "fixture-printing-charizard-normal",
      finish_label: "Holofoil",
      intent: "showcase",
    },
    {
      ...VAULT_SINGLE_COPY.copy_items[0],
      instance_id: "fixture-instance-charizard-reverse",
      gv_vi_id: "GV-VI-FIXTURE-CHARIZARD-REVERSE",
      card_printing_id: "fixture-printing-charizard-reverse",
      finish_label: "Reverse Holo",
      condition_label: "LP",
    },
  ],
  effective_price: 15.26,
  priced_raw_copy_count: 2,
  canonical_image_status: "verified",
  canonical_image_note: null,
  canonical_display_image_kind: "exact",
  is_shared: true,
};

function VaultFixtureShell({ children, title = "Vault" }: { children: ReactNode; title?: string }) {
  return (
    <div className="min-h-dvh bg-[var(--gv-bg-base)] pb-[104px] text-slate-950 dark:text-white" data-release-convergence-root>
      <FixtureHeader title={title} />
      {children}
      <MobileParityDock activeKey="vault" wallHref="/wall" />
    </div>
  );
}

function VaultLoaded() {
  return (
    <VaultFixtureShell>
      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-5">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200/80 pb-4 dark:border-white/[0.08]">
          <div>
            <p className="gv-eyebrow">Your collection</p>
            <h2 className="mt-1 text-2xl font-semibold">24 cards · 18 unique · 6 sets</h2>
          </div>
          <p className="text-sm text-slate-500">Value pending</p>
        </div>
        <label className="block">
          <span className="sr-only">Search your Vault</span>
          <input className="gv-input min-h-11 w-full" readOnly placeholder="Search your Vault" />
        </label>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          <ReleaseConvergenceVaultTileFixture item={VAULT_SINGLE_COPY} />
          <ReleaseConvergenceVaultTileFixture item={VAULT_DUPLICATE_COPY} />
        </div>
      </main>
    </VaultFixtureShell>
  );
}

function VaultDuplicateCopy() {
  return (
    <VaultFixtureShell title="Card family">
      <main className="mx-auto w-full max-w-xl space-y-5 px-4 py-5">
        <div>
          <p className="gv-eyebrow">Card family</p>
          <h2 className="mt-1 text-2xl font-semibold">Choose an exact copy</h2>
          <p className="mt-1 text-sm text-slate-500">This family contains more than one finish.</p>
        </div>
        <div className="max-w-[330px]">
          <ReleaseConvergenceVaultTileFixture item={VAULT_DUPLICATE_COPY} initialExpanded />
        </div>
      </main>
    </VaultFixtureShell>
  );
}

function VaultExactCopy() {
  return (
    <VaultFixtureShell title="Exact copy">
      <main className="mx-auto w-full max-w-6xl px-4 py-5">
        <VaultExactCopyHero
          eyebrow="Your exact copy"
          cardName="Pikachu"
          setName="Scarlet & Violet 151"
          setCode="MEW"
          number="025"
          gvId="GV-FIXTURE-PIKACHU"
          gvviId="GV-VI-FIXTURE-PIKACHU-RH"
          finishLabel="Reverse Holo"
          conditionLabel="NM"
          isGraded={false}
          statusLabel="Active"
          intentLabel="Hold"
          contextLabel="This copy is in your Vault."
          actions={<><Link href="/vault" className="gv-secondary-button">Back to Vault</Link><Link href="/card/GV-FIXTURE-PIKACHU" className="gv-primary-button">View card</Link></>}
          evidence={<p>Added Aug 4, 2026</p>}
        />
      </main>
    </VaultFixtureShell>
  );
}

function VaultState({ kind }: { kind: "empty" | "private" | "partial" | "offline" }) {
  const model = {
    empty: { tone: "neutral" as const, eyebrow: "No cards yet", title: "Your Vault is ready", description: "Add an exact card version from Search to start your collection." },
    private: { tone: "private" as const, eyebrow: "Private collection", title: "This Vault is not shared", description: "Only the collector can see private copies and collection details." },
    partial: { tone: "error" as const, eyebrow: "Some details are unavailable", title: "Your cards are still here", description: "Collection cards loaded, but value and recent activity could not be refreshed. No ownership data changed." },
    offline: { tone: "error" as const, eyebrow: "You are offline", title: "Vault could not refresh", description: "Previously loaded collection data was not changed. Reconnect and try again." },
  }[kind];
  return (
    <VaultFixtureShell>
      <main className="mx-auto max-w-2xl px-4 py-12">
        <ProductState {...model} action={kind === "empty" ? <Link href="/explore" className="gv-primary-button">Search cards</Link> : <button type="button" className="gv-primary-button">Try again</button>} />
        {kind === "partial" ? <div className="mt-8 max-w-[190px]"><ReleaseConvergenceVaultTileFixture item={VAULT_SINGLE_COPY} /></div> : null}
      </main>
    </VaultFixtureShell>
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
  if (scenario === "vault-loaded") {
    return <VaultLoaded />;
  }
  if (scenario === "vault-empty") {
    return <VaultState kind="empty" />;
  }
  if (scenario === "vault-private") {
    return <VaultState kind="private" />;
  }
  if (scenario === "vault-partial-error") {
    return <VaultState kind="partial" />;
  }
  if (scenario === "vault-duplicate-copy") {
    return <VaultDuplicateCopy />;
  }
  if (scenario === "vault-offline") {
    return <VaultState kind="offline" />;
  }
  if (scenario === "vault-exact-copy") {
    return <VaultExactCopy />;
  }
  if (scenario === "pulse-event") {
    return <PulseEventFixture />;
  }
  if (scenario === "pulse-empty") {
    return <SocialState kind="pulse-empty" />;
  }
  if (scenario === "pulse-partial-error") {
    return <SocialState kind="pulse-partial" />;
  }
  if (scenario === "social-loading") {
    return <SocialLoadingFixture />;
  }
  if (scenario === "wall-collection") {
    return <WallCollectionFixture />;
  }
  if (scenario === "wall-private") {
    return <SocialState kind="wall-private" />;
  }
  if (scenario === "profile-collector") {
    return <WallCollectionFixture withProfile />;
  }
  if (scenario === "profile-blocked") {
    return <SocialState kind="profile-blocked" />;
  }
  if (scenario === "profile-deleted") {
    return <SocialState kind="profile-deleted" />;
  }
  if (scenario === "private-state") {
    return <PrivateState />;
  }
  return <ErrorState />;
}
