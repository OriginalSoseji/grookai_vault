import Link from "next/link";
import { ArrowRight } from "lucide-react";
import CardImageTruthBadge from "@/components/cards/CardImageTruthBadge";
import PokemonCardGridTile from "@/components/cards/PokemonCardGridTile";
import { POKEMON_CARD_DISCOVERY_GRID_CLASSNAME } from "@/components/cards/pokemonCardGridLayout";
import CompareCardButton from "@/components/compare/CompareCardButton";
import VisiblePrice from "@/components/pricing/VisiblePrice";
import PublicProvisionalDiscoverySection from "@/components/provisional/PublicProvisionalDiscoverySection";
import RecentlyConfirmedDiscoverySection from "@/components/provisional/RecentlyConfirmedDiscoverySection";
import PublicCardImage from "@/components/PublicCardImage";
import PublicSetTile from "@/components/sets/PublicSetTile";
import { buildPathWithCompareCards } from "@/lib/compareCards";
import type { FeaturedExploreCard } from "@/lib/cards/getFeaturedExploreCards";
import { getCardImageAltText, resolveCardImagePresentation } from "@/lib/cards/resolveCardImagePresentation";
import type { ExploreViewMode } from "@/lib/exploreViewModes";
import type { PublicProvisionalCard } from "@/lib/provisional/publicProvisionalTypes";
import type { RecentlyConfirmedCanonicalCard } from "@/lib/provisional/getRecentlyConfirmedCanonicalCards";
import type { PublicSetSummary } from "@/lib/publicSets.shared";
import { resolveDisplayIdentity } from "@/lib/cards/resolveDisplayIdentity";
import { VARIANT_FAMILY_DISCOVERY_COPY } from "@/lib/cards/variantFamilyDiscoveryCopy";
import { normalizePublicCardImageSrc } from "@/lib/publicCardImage";

const POPULAR_POKEMON = [
  "Pikachu", "Charizard", "Eevee", "Umbreon", "Mewtwo", "Gengar", "Rayquaza", "Gardevoir",
] as const;

const FEATURED_VARIANT_FAMILY_KEYS = [
  "pokemon_center_stamp", "wb_kids_stamp", "jungle_no_symbol_error",
  "base_pikachu_print_run", "build_a_bear_workshop_stamp", "pokemon_together_stamp",
] as const;

type ExploreDiscoverySectionsProps = {
  compareCards: string[];
  featuredCards: FeaturedExploreCard[];
  notableSets: PublicSetSummary[];
  provisionalCards: PublicProvisionalCard[];
  recentlyConfirmedCards: RecentlyConfirmedCanonicalCard[];
  currentView?: ExploreViewMode;
  canViewPricing: boolean;
};

function FeaturedPrice({ card, canViewPricing }: { card: FeaturedExploreCard; canViewPricing: boolean }) {
  if (!canViewPricing || typeof card.raw_price !== "number") return null;
  return (
    <VisiblePrice
      value={card.raw_price}
      size="dense"
      cardPrintId={card.id}
      observedAt={card.raw_price_ts}
      publishedAt={card.raw_price_published_at}
      provenanceId={card.pricing_provenance_id}
      sourceLabel={card.pricing_source_label}
      pricingScope={card.pricing_scope}
      isFromPrice={card.pricing_is_from_price}
    />
  );
}

function buildExploreQueryHref(query: string, compareCards: string[], currentView?: ExploreViewMode) {
  const params = new URLSearchParams({ q: query });
  if (currentView) params.set("view", currentView);
  return buildPathWithCompareCards("/explore", params.toString(), compareCards);
}

function buildCardHref(gvId: string, compareCards: string[]) {
  return buildPathWithCompareCards(`/card/${gvId}`, "", compareCards);
}

function getDisplayName(card: FeaturedExploreCard) {
  return resolveDisplayIdentity({
    name: card.name,
    variant_key: card.variant_key ?? null,
    printed_identity_modifier: card.printed_identity_modifier ?? null,
    set_identity_model: card.set_identity_model ?? null,
    set_code: card.set_code ?? "",
    number: card.number,
  }).display_name;
}

export default function ExploreDiscoverySections({
  compareCards, featuredCards, notableSets, provisionalCards,
  recentlyConfirmedCards, currentView, canViewPricing,
}: ExploreDiscoverySectionsProps) {
  // Promote only already-authorized, usable artwork. Every supplied card stays
  // in the grid, including missing-image and review states.
  const featureArtCards = featuredCards.filter((card) => {
    const presentation = resolveCardImagePresentation(card);
    return !presentation.isBlocked && presentation.displayImageKind !== "missing" &&
      [card.display_image_url ?? card.image_url, card.display_image_fallback_url, card.external_image_fallback_url]
        .some((src) => normalizePublicCardImageSrc(src));
  }).slice(0, 3);
  const spotlightCard = featureArtCards[0] ?? null;

  return (
    <div className="gv-collector-discovery space-y-8 md:space-y-12">
      {spotlightCard ? (
        <section className="gv-collector-discovery-feature grid min-w-0 gap-6 border-y border-slate-200 bg-slate-50 px-5 py-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:items-center md:px-8">
          <div className="gv-collector-discovery-feature-copy min-w-0 space-y-3 break-words">
            <p className="gv-eyebrow">In the spotlight</p>
            <h2 className="text-2xl font-semibold text-slate-950">{getDisplayName(spotlightCard)}</h2>
            <p className="text-sm text-slate-600">
              {[spotlightCard.set_name ?? spotlightCard.set_code ?? "Unknown set", spotlightCard.number ? `#${spotlightCard.number}` : undefined, spotlightCard.rarity].filter(Boolean).join(" • ")}
            </p>
            <FeaturedPrice card={spotlightCard} canViewPricing={canViewPricing} />
            <div className="flex flex-wrap items-center gap-4">
              <Link href={buildCardHref(spotlightCard.gv_id, compareCards)} className="gv-collector-discovery-link inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">
                View card <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <CompareCardButton gvId={spotlightCard.gv_id} variant="compact" />
            </div>
          </div>
          <div className="gv-collector-discovery-feature-art flex min-w-0 items-start justify-center gap-2 sm:gap-4">
            {featureArtCards.map((spotlightCard, index) => {
              const imagePresentation = resolveCardImagePresentation(spotlightCard);
              return (
                <div key={spotlightCard.gv_id} className="gv-collector-discovery-feature-card min-w-0 flex-1 basis-0 space-y-2" data-feature-position={index}>
                  <Link href={buildCardHref(spotlightCard.gv_id, compareCards)} className="block h-[190px] sm:h-[260px]">
                    <PublicCardImage
                      src={spotlightCard.display_image_url ?? spotlightCard.image_url}
                      fallbackSrc={spotlightCard.display_image_fallback_url}
                      fallbackSources={[spotlightCard.external_image_fallback_url]}
                      alt={getCardImageAltText(getDisplayName(spotlightCard), spotlightCard)}
                      imageClassName={`gv-collector-discovery-feature-image h-full w-full object-contain p-2 drop-shadow-md ${index === 0 ? "-rotate-[7deg]" : index === 2 ? "rotate-[7deg]" : ""}`}
                      fallbackClassName="gv-collector-discovery-feature-empty flex h-full items-center justify-center px-2 text-center text-xs text-slate-500"
                      priority={index === 0}
                      sizes="(max-width: 640px) 30vw, (max-width: 1024px) 22vw, 220px"
                    />
                  </Link>
                  {imagePresentation.compactBadgeLabel ? (
                    <CardImageTruthBadge label={imagePresentation.compactBadgeLabel} emphasis={imagePresentation.isCollisionRepresentative ? "strong" : "default"} />
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="gv-collector-discovery-products space-y-5">
        <div className="gv-collector-discovery-section-heading flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-xl font-semibold text-slate-950">Find your next addition</h2>
          <Link href={buildPathWithCompareCards("/sets", "", compareCards)} className="gv-collector-discovery-link inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            Browse sets <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        {featuredCards.length > 0 ? (
          <div className={`gv-collector-discovery-product-grid ${POKEMON_CARD_DISCOVERY_GRID_CLASSNAME}`}>
            {featuredCards.map((card) => {
              const imagePresentation = resolveCardImagePresentation(card);
              return (
                <PokemonCardGridTile
                  key={card.gv_id}
                  className="gv-collector-discovery-product min-w-0"
                  utility={<CompareCardButton gvId={card.gv_id} variant="compact" />}
                  imageSrc={card.display_image_url ?? card.image_url}
                  imageFallbackSrc={card.display_image_fallback_url}
                  imageFallbackSources={[card.external_image_fallback_url]}
                  imageAlt={getCardImageAltText(getDisplayName(card), card)}
                  imageHref={buildCardHref(card.gv_id, compareCards)}
                  imageOverlay={imagePresentation.compactBadgeLabel ? (
                    <CardImageTruthBadge label={imagePresentation.compactBadgeLabel} emphasis={imagePresentation.isCollisionRepresentative ? "strong" : "default"} />
                  ) : null}
                  title={<Link href={buildCardHref(card.gv_id, compareCards)} className="block break-words transition hover:text-slate-700">{getDisplayName(card)}</Link>}
                  subtitle={<span className="block break-words">{card.set_name ?? card.set_code ?? "Unknown set"}</span>}
                  meta={<span>{[card.number ? `#${card.number}` : undefined, card.rarity].filter(Boolean).join(" • ")}</span>}
                  summary={<FeaturedPrice card={card} canViewPricing={canViewPricing} />}
                  footer={<details className="gv-collector-card-reference"><summary>Card reference</summary><span>{card.gv_id}</span></details>}
                />
              );
            })}
          </div>
        ) : (
          <p className="gv-collector-discovery-empty border-y border-slate-200 py-6 text-sm text-slate-600">Featured cards are being refreshed. Try exploring by Pokémon or set.</p>
        )}
      </section>

      <section className="gv-collector-discovery-pokemon space-y-4">
        <h2 className="text-xl font-semibold text-slate-950">Choose a Pokémon</h2>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {POPULAR_POKEMON.map((pokemon) => (
            <Link key={pokemon} href={buildExploreQueryHref(pokemon, compareCards, currentView)} className="gv-collector-discovery-pokemon-link py-2 text-sm font-medium text-slate-700 underline-offset-4 hover:underline">{pokemon}</Link>
          ))}
        </div>
      </section>

      <details className="gv-collector-discovery-families gv-collector-disclosure">
        <summary>Explore stamps and variants</summary>
        <div className="space-y-5 pt-4">
        <div className="gv-collector-discovery-section-heading flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <h2 className="text-xl font-semibold text-slate-950">Variant families</h2>
          </div>
          <Link href={buildPathWithCompareCards("/explore", "identity=stamped", compareCards)} className="gv-collector-discovery-link inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            Stamped cards <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <div className="gv-collector-discovery-family-grid grid gap-x-6 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
          {FEATURED_VARIANT_FAMILY_KEYS.map((familyKey) => {
            const family = VARIANT_FAMILY_DISCOVERY_COPY[familyKey];
            return (
              <Link key={family.family_key} href={buildExploreQueryHref(family.family_label, compareCards, currentView)} className="gv-collector-discovery-family min-w-0 space-y-3 border-t border-slate-200 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <p>{family.variant_category.replace(/_/g, " ")}</p>
                  <span className="font-semibold text-emerald-700">{family.confidence}</span>
                </div>
                <h3 className="break-words text-base font-semibold text-slate-950">{family.family_label}</h3>
                <p className="text-sm leading-6 text-slate-600">{family.why_collectors_care}</p>
              </Link>
            );
          })}
        </div>
        </div>
      </details>

      <section className="gv-collector-discovery-sets space-y-5">
        <div className="gv-collector-discovery-section-heading flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-xl font-semibold text-slate-950">Explore by set</h2>
          <Link href={buildPathWithCompareCards("/sets", "", compareCards)} className="gv-collector-discovery-link inline-flex items-center gap-2 text-sm font-medium text-slate-700">All sets <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
        {notableSets.length > 0 ? (
          <div className="gv-collector-discovery-set-grid grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {notableSets.map((setInfo) => (
              <PublicSetTile key={`${setInfo.game_code}:${setInfo.code}`} setInfo={setInfo} compareCards={compareCards} />
            ))}
          </div>
        ) : (
          <p className="gv-collector-discovery-empty border-y border-slate-200 py-6 text-sm text-slate-600">Set highlights are being refreshed. Start with a featured card or favorite Pokémon.</p>
        )}
      </section>

      {/* LOCK: Canonical, recently confirmed, and unconfirmed Pulse surfaces must remain visually and structurally separated. */}
      {/* LOCK: Do not blend trust states into a single undifferentiated Pulse. */}
      <div className="gv-collector-discovery-confirmed">
        <RecentlyConfirmedDiscoverySection cards={recentlyConfirmedCards} compareCards={compareCards} />
      </div>
      <div className="gv-collector-discovery-provisional">
        <PublicProvisionalDiscoverySection cards={provisionalCards} />
      </div>
    </div>
  );
}
