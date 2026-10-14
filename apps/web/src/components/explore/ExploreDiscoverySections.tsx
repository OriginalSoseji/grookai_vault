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
import { addCardReturnPath } from "@/lib/navigation/cardDetailNavigation";

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
  returnPath: string;
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

function buildCardHref(gvId: string, compareCards: string[], returnPath: string) {
  return addCardReturnPath(
    buildPathWithCompareCards(`/card/${gvId}`, "", compareCards),
    returnPath,
  );
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
  compareCards,
  featuredCards,
  notableSets,
  provisionalCards,
  recentlyConfirmedCards,
  currentView,
  canViewPricing,
  returnPath,
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
    <div className="space-y-7 md:space-y-12">
      <div className="space-y-5 md:hidden">
        {spotlightCard ? (
          <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03]">
            <div className="space-y-2.5">
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Spotlight</p>
                <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">One standout card</h2>
              </div>
              <Link href={buildCardHref(spotlightCard.gv_id, compareCards, returnPath)} className="block space-y-2.5">
                <div className="overflow-hidden rounded-[1.2rem] border border-slate-200 bg-white/90 shadow-sm">
                  {(() => {
                    const imagePresentation = resolveCardImagePresentation(spotlightCard);
                    return (
                      <div className="space-y-2 p-0">
                        <PublicCardImage
                          src={spotlightCard.display_image_url ?? spotlightCard.image_url}
                          fallbackSrc={spotlightCard.display_image_fallback_url}
                          fallbackSources={[spotlightCard.external_image_fallback_url]}
                          alt={getCardImageAltText(spotlightCard.display_name, spotlightCard)}
                          imageClassName="aspect-[5/7] w-full rounded-[22px] bg-slate-50 object-contain"
                          fallbackClassName="flex aspect-[5/7] items-center justify-center rounded-[22px] bg-slate-100 px-4 text-center text-sm text-slate-500"
                        />
                        {imagePresentation.compactBadgeLabel ? (
                          <div className="px-3 pb-3">
                            <CardImageTruthBadge
                              label={imagePresentation.compactBadgeLabel}
                              emphasis={imagePresentation.isCollisionRepresentative ? "strong" : "default"}
                            />
                          </div>
                        ) : null}
                      </div>
                    );
                  })()}
                </div>
                <div className="space-y-0.5">
                  <p className="text-[1.15rem] font-semibold tracking-tight text-slate-950">{spotlightCard.display_name}</p>
                  <p className="text-[13px] leading-5 text-slate-600">{buildCardMetaLine(spotlightCard)}</p>
                  <FeaturedPrice card={spotlightCard} canViewPricing={canViewPricing} />
                </div>
              </Link>
              <CompareCardButton gvId={spotlightCard.gv_id} variant="compact" />
            </div>
          </section>
        ) : null}

        {hasRailSection ? (
          <section className="space-y-2.5">
            <MobileFeedSectionHeader
              eyebrow="More to explore"
              title="Keep scrolling"
              action={
                <Link
                  href={buildPathWithCompareCards("/explore", "", compareCards)}
                  className="text-xs font-medium text-slate-600 underline-offset-4 hover:text-slate-950 hover:underline"
                >
                  View all
                </Link>
              }
            />
            <div className="-mx-5 overflow-x-auto px-5">
              <div className="flex gap-3 pb-1">
                {railCards.map((card) => (
                  <article
                    key={card.gv_id}
                    className="w-[166px] shrink-0 overflow-hidden rounded-[1.2rem] border border-slate-200 bg-white shadow-sm transition-transform duration-150 active:scale-[0.99]"
                  >
                    <Link href={buildCardHref(card.gv_id, compareCards, returnPath)} className="block space-y-1.5 p-2.5">
                      <div className="rounded-[0.9rem] border border-slate-100 bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] p-2.5">
                        {(() => {
                          const imagePresentation = resolveCardImagePresentation(card);
                          return (
                            <div className="space-y-2">
                              <PublicCardImage
                                src={card.display_image_url ?? card.image_url}
                                fallbackSrc={card.display_image_fallback_url}
                                fallbackSources={[card.external_image_fallback_url]}
                                alt={getCardImageAltText(card.display_name, card)}
                                imageClassName="aspect-[5/7] w-full rounded-[22px] object-contain"
                                fallbackClassName="flex aspect-[5/7] items-center justify-center rounded-[22px] bg-slate-100 px-3 text-center text-xs text-slate-500"
                              />
                              {imagePresentation.compactBadgeLabel ? (
                                <CardImageTruthBadge
                                  label={imagePresentation.compactBadgeLabel}
                                  emphasis={imagePresentation.isCollisionRepresentative ? "strong" : "default"}
                                />
                              ) : null}
                            </div>
                          );
                        })()}
                      </div>
                      <div className="space-y-0.5">
                        <p className="line-clamp-2 text-sm font-semibold text-slate-950">{card.display_name}</p>
                        <p className="line-clamp-2 text-[11px] leading-[1.125rem] text-slate-500">{buildCardMetaLine(card)}</p>
                        <FeaturedPrice card={card} canViewPricing={canViewPricing} />
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {hasGridSection ? (
          <section className="space-y-2.5">
            <MobileFeedSectionHeader
              eyebrow="More cards"
              title="Worth a closer look"
            />
            <div className={POKEMON_CARD_DISCOVERY_COMPACT_GRID_CLASSNAME}>
              {gridCards.map((card) => (
                (() => {
                  const imagePresentation = resolveCardImagePresentation(card);
                  return (
                <PokemonCardGridTile
                  key={card.gv_id}
                  density="compact"
                  imageSrc={card.display_image_url ?? card.image_url}
                  imageFallbackSrc={card.display_image_fallback_url}
                  imageFallbackSources={[card.external_image_fallback_url]}
                  imageAlt={getCardImageAltText(card.display_name, card)}
                  imageHref={buildCardHref(card.gv_id, compareCards, returnPath)}
                  imageOverlay={
                    imagePresentation.compactBadgeLabel ? (
                      <CardImageTruthBadge
                        label={imagePresentation.compactBadgeLabel}
                        emphasis={imagePresentation.isCollisionRepresentative ? "strong" : "default"}
                      />
                    ) : null
                  }
                  title={
                    <Link
                      href={buildCardHref(card.gv_id, compareCards, returnPath)}
                      className="line-clamp-2 block transition hover:text-slate-700"
                    >
                      {card.display_name}
                    </Link>
                  }
                  subtitle={<span className="line-clamp-2 block text-[11px] leading-[1.125rem]">{buildCardMetaLine(card)}</span>}
                  summary={<FeaturedPrice card={card} canViewPricing={canViewPricing} />}
                />
                  );
                })()
              ))}
            </div>
          </section>
        ) : null}

        {hasSetsSection ? (
          <section className="space-y-2.5 rounded-[1.25rem] bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] px-4 py-3">
            <MobileFeedSectionHeader
              eyebrow="Sets"
              title="Browse sets"
              action={
                <Link
                  href={buildPathWithCompareCards("/sets", "", compareCards)}
                  className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:text-slate-950"
                >
                  All sets
                </Link>
              }
            />
            <div className="grid grid-cols-2 gap-2.5">
              {mobileSetCards.map((setInfo) => (
                <Link
                  key={setInfo.code}
                  href={buildPathWithCompareCards(`/sets/${setInfo.code}`, "", compareCards)}
                  className="rounded-[1rem] border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                >
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{setInfo.code}</p>
                    <h3 className="line-clamp-2 text-[15px] font-semibold tracking-tight text-slate-950">{setInfo.name}</h3>
                    <p className="text-[11px] leading-[1.125rem] text-slate-500">
                      {[
                        typeof setInfo.release_year === "number" ? String(setInfo.release_year) : undefined,
                        typeof setInfo.printed_total === "number" ? `${setInfo.printed_total} cards` : undefined,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-2.5">
          <MobileFeedSectionHeader
            eyebrow="Pokémon"
            title="Start with a favorite"
          />
          <div className="flex flex-wrap gap-2">
            {POPULAR_POKEMON.map((pokemon) => (
              <Link
                key={pokemon}
                href={buildExploreQueryHref(pokemon, compareCards, currentView)}
                className="inline-flex rounded-full border border-slate-200 bg-white px-3.5 py-[0.4375rem] text-[13px] font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
              >
                {pokemon}
              </Link>
            ))}
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
                  imageHref={buildCardHref(card.gv_id, compareCards, returnPath)}
                  imageOverlay={
                    imagePresentation.compactBadgeLabel ? (
                      <CardImageTruthBadge
                        label={imagePresentation.compactBadgeLabel}
                        emphasis={imagePresentation.isCollisionRepresentative ? "strong" : "default"}
                      />
                    ) : null
                  }
                  title={
                    <Link
                      href={buildCardHref(card.gv_id, compareCards, returnPath)}
                      className="block truncate transition hover:text-slate-700"
                    >
                      {getDisplayName(card)}
                    </Link>
                  }
                  subtitle={<span className="block truncate">{card.set_name ?? card.set_code ?? "Unknown set"}</span>}
                  meta={
                    <span>{[card.number ? `#${card.number}` : undefined, card.rarity].filter(Boolean).join(" • ")}</span>
                  }
                  summary={<FeaturedPrice card={card} canViewPricing={canViewPricing} />}
                  footer={<details className="gv-collector-card-reference"><summary>Card reference</summary><span>{card.gv_id}</span></details>}
                />
                  );
                })()
              ))}
            </div>
          ) : (
            <div className="rounded-[22px] border border-slate-200 bg-white px-5 py-6 text-sm text-slate-600 shadow-sm">
              Featured cards are being refreshed. Try exploring by Pokémon or set.
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Browse by Pokémon</p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Choose a Pokémon</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {POPULAR_POKEMON.map((pokemon) => (
              <Link
                key={pokemon}
                href={buildExploreQueryHref(pokemon, compareCards, currentView)}
                className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950"
              >
                {pokemon}
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Special identity families</p>
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Search the collector graph</h2>
                <p className="max-w-2xl text-sm leading-6 text-slate-600">
                  Stamps, errors, and print-run variants are modeled as searchable identities when evidence supports the exact lane.
                </p>
              </div>
            </div>
            <Link
              href={buildPathWithCompareCards("/explore", "identity=stamped", compareCards)}
              className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950"
            >
              Stamped lanes
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {FEATURED_VARIANT_FAMILY_KEYS.map((familyKey) => {
              const family = VARIANT_FAMILY_DISCOVERY_COPY[familyKey];
              return (
                <Link
                  key={family.family_key}
                  href={buildExploreQueryHref(family.family_label, compareCards, currentView)}
                  className="group rounded-[22px] border border-slate-200 bg-white px-5 py-5 shadow-sm transition-[transform,border-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {family.variant_category.replace(/_/g, " ")}
                      </p>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                        {family.confidence}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold tracking-tight text-slate-950">{family.family_label}</h3>
                      <p className="line-clamp-3 text-sm leading-6 text-slate-600">{family.why_collectors_care}</p>
                    </div>
                  </div>
                </Link>
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

          {notableSets.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {notableSets.map((setInfo) => (
                <Link
                  key={setInfo.code}
                  href={buildPathWithCompareCards(`/sets/${setInfo.code}`, "", compareCards)}
                  className="group rounded-[22px] border border-slate-200 bg-white px-5 py-5 shadow-sm transition-[transform,border-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                >
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{setInfo.code}</p>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold tracking-tight text-slate-950">{setInfo.name}</h3>
                      <p className="text-sm text-slate-600">
                        {[typeof setInfo.release_year === "number" ? String(setInfo.release_year) : undefined, typeof setInfo.printed_total === "number" ? `${setInfo.printed_total} cards` : undefined]
                          .filter(Boolean)
                          .join(" • ")}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-[22px] border border-slate-200 bg-white px-5 py-6 text-sm text-slate-600 shadow-sm">
              Set highlights are being refreshed. Start with a featured card or favorite Pokémon.
            </div>
          )}
        </section>
      </div>

      {/* LOCK: Canonical, recently confirmed, and unconfirmed Pulse surfaces must remain visually and structurally separated. */}
      {/* LOCK: Do not blend trust states into a single undifferentiated Pulse. */}
      <RecentlyConfirmedDiscoverySection
        cards={recentlyConfirmedCards}
        compareCards={compareCards}
        returnPath={returnPath}
      />
      <PublicProvisionalDiscoverySection cards={provisionalCards} />
    </div>
  );
}
