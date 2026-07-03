import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import CardZoomModal from "@/components/compare/CardZoomModal";
import { ConditionSnapshotSection } from "@/components/condition/ConditionSnapshotSection";
import CompareTray from "@/components/compare/CompareTray";
import CardPageMarketVaultPanels from "@/components/cards/CardPageMarketVaultPanels";
import VariantExplanationContextPreview from "@/components/cards/VariantExplanationContextPreview";
import PricingDisclosure from "@/components/common/PricingDisclosure";
import type { AddSlabActionResult } from "@/components/slabs/AddSlabCardAction";
import TrackPageEvent from "@/components/telemetry/TrackPageEvent";
import VariantBadge from "@/components/cards/VariantBadge";
import ContactOwnerButton from "@/components/network/ContactOwnerButton";
import type { AddToVaultActionResult } from "@/components/vault/AddToVaultCardAction";
import OwnedObjectRemoveAction from "@/components/vault/OwnedObjectRemoveAction";
import CopyButton from "@/components/CopyButton";
import PublicCardImage from "@/components/PublicCardImage";
import CardImageTruthBadge from "@/components/cards/CardImageTruthBadge";
import { buildGrookaiVariantExplanationFromPublicCopy } from "@/lib/ai/grookaiVariantExplanationBuilder";
import { buildTcgDexImageUrl } from "@/lib/cards/buildTcgDexImageUrl";
import {
  resolveDisplayIdentity,
  resolveDisplayIdentitySubtitleForContext,
} from "@/lib/cards/resolveDisplayIdentity";
import { getDisplayPrintedIdentity } from "@/lib/cards/getDisplayPrintedIdentity";
import { normalizeRequestedPublicGvId } from "@/lib/gvIdAlias";
import { normalizeCardImageUrl } from "@/lib/cards/normalizeCardImageUrl";
import { findPrintingByReference } from "@/lib/cards/printingSelection";
import { getCardImageAltText, resolveCardImagePresentation } from "@/lib/cards/resolveCardImagePresentation";
import { getVariantOriginPublicCopy } from "@/lib/cards/variantOriginPublicCopy";
import { getVariantLabels } from "@/lib/cards/variantPresentation";
import { getAdjacentPublicCardsByGvId } from "@/lib/getAdjacentPublicCardsByGvId";
import { buildCompareCardsParam, buildPathWithCompareCards, normalizeCompareCardsParam } from "@/lib/compareCards";
import { getCardStreamRows } from "@/lib/network/getCardStreamRows";
import { getVaultIntentLabel } from "@/lib/network/intent";
import {
  getPublicCameosByGvId,
  getPublicCardByGvId,
  getPublicRelatedPrintsByGvId,
} from "@/lib/getPublicCardByGvId";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { getConditionSnapshotsForCard } from "@/lib/condition/getConditionSnapshotsForCard";
import { getAssignmentCandidatesForSnapshot } from "@/lib/condition/getAssignmentCandidatesForSnapshot";
import { getCardPricingUiRowsByCardPrintId } from "@/lib/pricing/getCardPricingUiByCardPrintId";
import type { ConditionSnapshotListItem } from "@/lib/condition/getConditionSnapshotsForCard";
import type { AssignmentCandidate } from "@/lib/condition/getAssignmentCandidatesForSnapshot";
import { createSlabInstance } from "@/lib/slabs/createSlabInstance";
import { createServerComponentClient, hasSupabaseServerAuthCookie } from "@/lib/supabase/server";
import { trackServerEvent } from "@/lib/telemetry/trackServerEvent";
import { addCardToVault, type AddCardToVaultResult } from "@/lib/vault/addCardToVault";
import { getOwnedPrintingCountsByCardPrintIds } from "@/lib/vault/getOwnedPrintingCountsByCardPrintIds";
import { getVaultInstanceHref } from "@/lib/vault/getVaultInstanceHref";
import { getOwnedObjectSummaryForCard, type OwnedObjectSummary } from "@/lib/vault/getOwnedObjectSummaryForCard";
import type { CardCameo, CardDetail, RelatedCardPrint } from "@/types/cards";

type DetailItem = { label: string; value: string };

const PRINTED_TOTAL_FALLBACK_BY_SET_CODE: Record<string, string> = {
  // Chaos Rising has 122 canonical parent rows after variants, but its printed
  // collector identity uses the on-card denominator 086.
  me04: "086",
};

function formatPrintedTotal(number: string, printedTotal?: number | string) {
  if (!number || printedTotal === undefined || printedTotal === null) return undefined;
  const explicitPrintedTotal = typeof printedTotal === "string" ? printedTotal.trim() : "";
  if (explicitPrintedTotal) return explicitPrintedTotal;
  if (typeof printedTotal !== "number") return undefined;
  const prefix = number.match(/^[A-Za-z]+/)?.[0] ?? "";
  const numericWidth = number.match(/\d+/)?.[0]?.length ?? 0;
  const paddedTotal = numericWidth > 0 ? String(printedTotal).padStart(numericWidth, "0") : String(printedTotal);
  return `${prefix}${paddedTotal}`;
}

function getPrintedSetAbbrevFallback(card: { printed_set_abbrev?: string; set_code?: string; gv_id?: string }) {
  const explicitAbbrev = card.printed_set_abbrev?.trim().toUpperCase();
  if (explicitAbbrev) return explicitAbbrev;

  const gvIdAbbrev = card.gv_id?.match(/^GV-PK-([A-Z0-9]+)-/i)?.[1]?.trim().toUpperCase();
  if (gvIdAbbrev && gvIdAbbrev !== card.set_code?.trim().toUpperCase()) return gvIdAbbrev;

  return undefined;
}

function formatCollectorIdentity({
  printedSetAbbrev,
  printedNumber,
  printedTotal,
}: {
  printedSetAbbrev?: string;
  printedNumber?: string | null;
  printedTotal?: number | string;
}) {
  const normalizedNumber = printedNumber?.trim();
  if (!normalizedNumber) return undefined;

  const normalizedAbbrev = printedSetAbbrev?.trim().toUpperCase();
  const normalizedTotal = formatPrintedTotal(normalizedNumber, printedTotal);
  const normalizedPrintedNumber = normalizedTotal ? `${normalizedNumber}/${normalizedTotal}` : normalizedNumber;
  return [normalizedAbbrev, normalizedPrintedNumber]
    .filter((value): value is string => Boolean(value))
    .join(" ");
}

function getPrintedTotalFallback(card: { set_code?: string }) {
  const normalizedSetCode = card.set_code?.trim().toLowerCase();
  return normalizedSetCode ? PRINTED_TOTAL_FALLBACK_BY_SET_CODE[normalizedSetCode] : undefined;
}

function getCardLanguageLabel(gvId: string) {
  return /^GV-PK-JPN-/i.test(gvId) ? "Japanese" : "English";
}

function buildPokemonTcgHiresImageUrl(card: { set_code?: string; number?: string; number_plain?: string }) {
  const setCode = card.set_code?.trim().toLowerCase();
  const printedNumber = card.number?.trim();
  if (!setCode || !printedNumber || !/^\d+$/.test(printedNumber)) return null;

  const looksPokemonTcgCompatible =
    /^(base|gym|neo|ecard|ex|dp|pl|hgss|col|bw|xy|sm|swsh|sv|pop|sma|smp|svp|xyp|bwp|np|det|cel|g|ru|dv|pgo|fut)/.test(setCode);
  if (!looksPokemonTcgCompatible) return null;

  const normalizedNumber = String(Number(printedNumber));
  if (!normalizedNumber || normalizedNumber === "NaN") return null;

  return `https://images.pokemontcg.io/${encodeURIComponent(setCode)}/${encodeURIComponent(normalizedNumber)}_hires.png`;
}

function buildExactExternalImageFallback(primaryImageUrl: string | null | undefined, tcgdexExternalId?: string) {
  if (primaryImageUrl?.trim()) return null;
  return buildTcgDexImageUrl(tcgdexExternalId);
}

function formatReleaseDate(releaseDate?: string) {
  if (!releaseDate) return undefined;
  const match = releaseDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return releaseDate;
  const [, year, month, day] = match;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))));
}

function buildCardHref(gvId: string, compareCardsParam?: string, printingReference?: string) {
  const params = new URLSearchParams();
  if (compareCardsParam) params.set("cards", compareCardsParam);
  if (printingReference) params.set("printing", printingReference);
  const query = params.toString();
  return query ? `/card/${encodeURIComponent(gvId)}?${query}` : `/card/${encodeURIComponent(gvId)}`;
}

function asAbsoluteUrl(value: string | null | undefined, origin?: string | null) {
  const normalizedValue = value?.trim();
  if (!normalizedValue) return undefined;

  try {
    return new URL(normalizedValue).toString();
  } catch {
    if (origin && normalizedValue.startsWith("/")) {
      return `${origin}${normalizedValue}`;
    }
    return undefined;
  }
}

function jsonLdMarkup(value: Record<string, unknown>) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function buildCardProductJsonLd({
  card,
  canonicalUrl,
  collectorNumber,
  displayName,
  finishLabels,
  imageUrl,
  illustratorName,
  languageLabel,
  printedName,
  setName,
}: {
  card: CardDetail;
  canonicalUrl?: string;
  collectorNumber?: string;
  displayName: string;
  finishLabels: string[];
  imageUrl?: string;
  illustratorName?: string;
  languageLabel: string;
  printedName?: string;
  setName?: string;
}) {
  const additionalProperty = [
    { name: "Grookai Vault ID", value: card.gv_id },
    collectorNumber ? { name: "Collector number", value: collectorNumber } : null,
    setName ? { name: "Set", value: setName } : null,
    card.set_code ? { name: "Set code", value: card.set_code.toUpperCase() } : null,
    card.rarity ? { name: "Rarity", value: card.rarity } : null,
    languageLabel ? { name: "Language", value: languageLabel } : null,
    finishLabels.length > 0 ? { name: "Finishes", value: finishLabels.join(", ") } : null,
    illustratorName ? { name: "Illustrator", value: illustratorName } : null,
    printedName ? { name: "Printed name", value: printedName } : null,
  ]
    .filter((property): property is { name: string; value: string } => Boolean(property?.value))
    .map((property) => ({
      "@type": "PropertyValue",
      name: property.name,
      value: property.value,
    }));

  const description = [
    `${displayName} trading card`,
    setName ? `from ${setName}` : undefined,
    collectorNumber ? `with collector number ${collectorNumber}` : undefined,
    `and Grookai Vault ID ${card.gv_id}.`,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: displayName,
    alternateName: printedName && printedName !== displayName ? printedName : undefined,
    description,
    sku: card.gv_id,
    mpn: card.gv_id,
    brand: {
      "@type": "Brand",
      name: "Pokemon",
    },
    category: "Pokemon trading card",
    image: imageUrl,
    url: canonicalUrl,
    identifier: {
      "@type": "PropertyValue",
      propertyID: "Grookai Vault ID",
      value: card.gv_id,
    },
    additionalProperty,
  };
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: { gv_id: string } }): Promise<Metadata> {
  const card = await getPublicCardByGvId(params.gv_id, {
    includePricing: false,
    includeRelatedPrints: false,
    includeCameos: false,
  });
  const siteOrigin = getSiteOrigin();
  if (!card) return { title: "Card not found | Grookai Vault" };
  const displayIdentity = getDisplayPrintedIdentity(card);
  const displayName = resolveDisplayIdentity(card).display_name;
  const metadataImageUrl =
    normalizeCardImageUrl(card.image_url) ?? buildTcgDexImageUrl(card.tcgdex_external_id);

  const collectorNumberLabel = displayIdentity.displayPrintedNumber
    ? `#${displayIdentity.displayPrintedNumber}`
    : undefined;
  const titleParts = [card.gv_id, displayName, card.set_name, collectorNumberLabel].filter(
    (value): value is string => Boolean(value),
  );
  const title = `${titleParts.join(" • ")} | Grookai Vault`;
  const description = [
    `${card.gv_id} is the Grookai Vault canonical ID for ${displayName}`,
    card.set_name ? `from ${card.set_name}` : undefined,
    collectorNumberLabel,
    "including finishes and collection info on Grookai Vault.",
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");

  return {
    title,
    description,
    alternates: siteOrigin ? { canonical: `${siteOrigin}/card/${card.gv_id}` } : undefined,
    openGraph: {
      title,
      description,
      type: "website",
      url: siteOrigin ? `${siteOrigin}/card/${card.gv_id}` : undefined,
      images: metadataImageUrl ? [{ url: metadataImageUrl, alt: displayName }] : undefined,
    },
    twitter: {
      card: metadataImageUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: metadataImageUrl ? [metadataImageUrl] : undefined,
    },
  };
}

function CardLowerSectionFallback({ title = "Loading card context" }: { title?: string }) {
  return (
    <section className="gv-card-lower-section space-y-4 p-5 sm:p-6">
      <div className="gv-card-section-header">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
          {title}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-[16px] border border-slate-200 bg-slate-100/70 dark:border-slate-800 dark:bg-white/[0.04]"
          />
        ))}
      </div>
    </section>
  );
}

function ArtworkCameosSection({ cameoRows }: { cameoRows: CardCameo[] }) {
  if (cameoRows.length === 0) {
    return null;
  }

  return (
    <section className="gv-card-lower-section space-y-4 p-5 sm:p-6">
      <div className="gv-card-section-header">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Artwork Cameos</p>
        <h2>Visible in the artwork</h2>
        <p>
          Characters visible in the artwork. These are searchable enrichment facts and do not change this card&apos;s identity or Species Dex completion.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {cameoRows.map((cameo) => {
          const qualifierLabel = cameo.cameo_qualifiers?.length
            ? cameo.cameo_qualifiers.map((value) => value.replace(/_/g, " ")).join(", ")
            : null;
          const href =
            cameo.cameo_subject_type === "pokemon" && cameo.pokemon_ndex
              ? `/explore?q=${encodeURIComponent(`${cameo.cameo_subject_name} cameo`)}`
              : `/explore?q=${encodeURIComponent(`${cameo.cameo_subject_name} trainer cameo`)}`;
          return (
            <Link
              key={`${cameo.cameo_subject_type}:${cameo.cameo_subject_name}:${cameo.pokemon_ndex ?? ""}`}
              href={href}
              className="group rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3 transition hover:-translate-y-[1px] hover:border-slate-300 hover:bg-white hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-900/80"
            >
              <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                {cameo.cameo_subject_type === "trainer" ? "Trainer cameo" : "Pokemon cameo"}
              </span>
              <span className="mt-1 block text-sm font-semibold text-slate-950 dark:text-slate-50">
                {cameo.cameo_subject_name}
                {cameo.pokemon_ndex ? (
                  <span className="ml-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                    #{cameo.pokemon_ndex.padStart(3, "0")}
                  </span>
                ) : null}
              </span>
              {qualifierLabel ? (
                <span className="mt-1 block text-xs capitalize text-slate-500 dark:text-slate-400">
                  {qualifierLabel}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

async function StreamedArtworkCameosSection({ gvId }: { gvId: string }) {
  const cameoRows = await getPublicCameosByGvId(gvId);
  return <ArtworkCameosSection cameoRows={cameoRows ?? []} />;
}

function RelatedPrintsSection({
  relatedPrints,
  compareCards,
}: {
  relatedPrints: RelatedCardPrint[];
  compareCards: string[];
}) {
  if (relatedPrints.length === 0) {
    return null;
  }

  return (
    <section className="gv-card-lower-section space-y-4 p-5 sm:p-6">
      <div className="gv-card-section-header">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Other Versions</p>
        <h2>Other versions of this card</h2>
        <p>Read-only links to other prints that share this card name.</p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-3 md:gap-3 md:overflow-visible lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {relatedPrints.map((relatedCard) => {
          const relatedDisplayIdentity = resolveDisplayIdentity(relatedCard);
          const relatedSetCodeLabel = relatedCard.set_code?.trim().toUpperCase();
          const relatedSetLabel = relatedCard.set_name?.trim() || relatedSetCodeLabel || null;
          const relatedIdentitySubtitle = resolveDisplayIdentitySubtitleForContext({
            identitySubtitle: relatedDisplayIdentity.suffix,
            visibleSetLabel: relatedSetLabel,
          });
          const relatedVariantLabels = getVariantLabels(relatedCard, 2);
          const relatedImagePresentation = resolveCardImagePresentation(relatedCard);
          const relatedCardImageSrc =
            normalizeCardImageUrl(relatedCard.display_image_url ?? relatedCard.image_url) ?? undefined;
          const relatedCardImageFallback =
            normalizeCardImageUrl(relatedCard.display_image_fallback_url) ??
            (relatedCard.display_image_kind === "exact"
              ? buildExactExternalImageFallback(relatedCardImageSrc, relatedCard.tcgdex_external_id)
              : null);
          return (
            <Link
              key={relatedCard.gv_id}
              href={buildPathWithCompareCards(`/card/${relatedCard.gv_id}`, "", compareCards)}
              className="group min-w-[172px] rounded-[16px] border border-slate-200 bg-slate-50 p-3 transition-all duration-150 hover:-translate-y-[2px] hover:border-slate-300 hover:bg-white hover:shadow-md"
            >
              <div className="flex gap-3 md:flex-col md:items-start">
                <div className="space-y-2">
                  <PublicCardImage
                    src={relatedCardImageSrc}
                    fallbackSrc={relatedCardImageFallback ?? undefined}
                    alt={getCardImageAltText(relatedDisplayIdentity.display_name, relatedCard)}
                    imageClassName="h-20 w-14 rounded-[12px] border border-slate-200 bg-white object-contain p-1 shadow-sm md:h-[104px] md:w-[74px]"
                    fallbackClassName="flex h-20 w-14 items-center justify-center rounded-[12px] border border-slate-200 bg-white px-2 text-center text-[10px] text-slate-500 md:h-[104px] md:w-[74px]"
                    sizes="74px"
                  />
                  {relatedImagePresentation.compactBadgeLabel ? (
                    <CardImageTruthBadge
                      label={relatedImagePresentation.compactBadgeLabel}
                      emphasis={relatedImagePresentation.isCollisionRepresentative ? "strong" : "default"}
                    />
                  ) : null}
                </div>
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {relatedSetCodeLabel ? (
                      <span className="inline-flex rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                        {relatedSetCodeLabel}
                      </span>
                    ) : null}
                    {relatedCard.rarity ? <span className="text-[11px] text-slate-500">{relatedCard.rarity}</span> : null}
                  </div>
                  <div className="space-y-0.5">
                    <p className="line-clamp-2 text-[13px] font-semibold leading-5 text-slate-900">
                      {relatedDisplayIdentity.base_name}
                    </p>
                    {relatedIdentitySubtitle ? (
                      <p className="line-clamp-1 text-[11px] font-medium text-slate-500">
                        {relatedIdentitySubtitle}
                      </p>
                    ) : null}
                  </div>
                  {relatedCard.number ? <p className="text-[12px] text-slate-600">#{relatedCard.number}</p> : null}
                  {relatedVariantLabels.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {relatedVariantLabels.map((label) => (
                        <VariantBadge key={`${relatedCard.gv_id}-${label}`} label={label} />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

async function StreamedRelatedPrintsSection({
  gvId,
  compareCards,
}: {
  gvId: string;
  compareCards: string[];
}) {
  const relatedPrints = await getPublicRelatedPrintsByGvId(gvId);
  return <RelatedPrintsSection relatedPrints={relatedPrints ?? []} compareCards={compareCards} />;
}

export default async function CardPage({
  params,
  searchParams,
}: {
  params: { gv_id: string };
  searchParams?: { cards?: string; printing?: string };
}) {
  const card = await getPublicCardByGvId(params.gv_id, {
    includePricing: false,
    includeRelatedPrints: false,
    includeCameos: false,
  });
  if (!card) notFound();

  const resolvedCard = card;
  const resolvedDisplayIdentity = resolveDisplayIdentity(resolvedCard);
  const compareCards = normalizeCompareCardsParam(searchParams?.cards);
  const compareCardsParam = buildCompareCardsParam(compareCards);
  if (normalizeRequestedPublicGvId(params.gv_id) !== normalizeRequestedPublicGvId(card.gv_id)) {
    permanentRedirect(buildCardHref(card.gv_id, compareCardsParam, searchParams?.printing));
  }
  const currentCardPath = buildCardHref(resolvedCard.gv_id, compareCardsParam);
  const siteOrigin = getSiteOrigin();
  const canonicalCardUrl = siteOrigin ? `${siteOrigin}/card/${resolvedCard.gv_id}` : undefined;
  const selectedRoutePrinting = searchParams?.printing
    ? findPrintingByReference(
        (resolvedCard.display_printings ?? []).filter((printing) => !printing.is_display_fallback),
        searchParams.printing,
      )
    : null;
  const defaultDisplayPrintingWithImage = (resolvedCard.display_printings ?? [])
    .filter((printing) => !printing.is_display_fallback)
    .find((printing) => normalizeCardImageUrl(printing.display_image_url ?? printing.image_url));
  const defaultDisplayPrintingImageUrl =
    defaultDisplayPrintingWithImage?.display_image_url ?? defaultDisplayPrintingWithImage?.image_url ?? null;
  const selectedRoutePrintingImageUrl =
    selectedRoutePrinting?.display_image_url ?? selectedRoutePrinting?.image_url ?? null;
  const resolvedCardFallbackImageUrl = resolvedCard.display_image_url ?? resolvedCard.image_url ?? null;
  const selectedRoutePrintingUsesBaseImage = Boolean(
    selectedRoutePrinting && !selectedRoutePrintingImageUrl && resolvedCardFallbackImageUrl,
  );
  const displayedImageTruthSource = selectedRoutePrintingUsesBaseImage
    ? {
        ...selectedRoutePrinting,
        display_image_kind: "missing_variant_visual" as const,
        image_status: selectedRoutePrinting?.image_status ?? "missing_variant_visual",
        image_note:
          selectedRoutePrinting?.image_note ??
          "Correct printing. Image may not show exact finish, stamp, or parallel.",
      }
    : selectedRoutePrintingImageUrl
      ? selectedRoutePrinting
      : resolvedCard;
  const resolvedCardImagePresentation = resolveCardImagePresentation(displayedImageTruthSource);
  const pokemonTcgHiresImageUrl = buildPokemonTcgHiresImageUrl(resolvedCard);
  const resolvedCardImageSrc =
    normalizeCardImageUrl(
      selectedRoutePrintingImageUrl ??
        resolvedCardFallbackImageUrl ??
        defaultDisplayPrintingImageUrl ??
        pokemonTcgHiresImageUrl,
    ) ??
    undefined;
  const resolvedCardImageFallback =
    normalizeCardImageUrl(
      defaultDisplayPrintingImageUrl ??
        resolvedCardFallbackImageUrl,
    ) ??
    (resolvedCardImagePresentation.displayImageKind === "exact"
      ? buildExactExternalImageFallback(resolvedCardImageSrc, resolvedCard.tcgdex_external_id)
      : null);

  async function addToVaultAction(
    _previousState: AddToVaultActionResult | null,
    _formData: FormData,
  ): Promise<AddToVaultActionResult> {
    "use server";
    const selectedPrintingId =
      typeof _formData.get("card_printing_id") === "string" ? String(_formData.get("card_printing_id")).trim() : "";

    const actionClient = createServerComponentClient();
    const { data: { user } } = await actionClient.auth.getUser();
    const submissionKey = Date.now();
    if (!user) return { ok: false, status: "login-required", submissionKey };
    if (!resolvedCard.id || !resolvedCard.gv_id) return { ok: false, status: "not-found", submissionKey };

    let result: AddCardToVaultResult;
    try {
      result = await addCardToVault({
        client: actionClient,
        userId: user.id,
        cardPrintId: resolvedCard.id,
        gvId: resolvedCard.gv_id,
        name: resolvedCard.name,
        setName: resolvedCard.set_name,
        imageUrl: resolvedCard.image_url,
        cardPrintingId: selectedPrintingId || undefined,
      });
    } catch (error) {
      const detail =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? String(error.message)
            : "Unknown vault add error";
      console.error("[vault:add] addToVaultAction failed", {
        userId: user.id,
        gvId: resolvedCard.gv_id,
        cardId: resolvedCard.id,
        detail,
        error,
      });
      return {
        ok: false,
        status: "error",
        message: "Something went wrong while adding this card to your vault.",
        submissionKey,
      };
    }

    await trackServerEvent({
      eventName: "vault_add_success",
      userId: user.id,
      path: currentCardPath,
      gvId: resolvedCard.gv_id,
      metadata: { gv_vi_id: result.gvvi_id, quantity_delta: 1, card_printing_id: selectedPrintingId || null },
    });
    return { ok: true, status: "added", gvvi_id: result.gvvi_id, submissionKey };
  }

  async function createSlabAction(
    _previousState: AddSlabActionResult | null,
    formData: FormData,
  ): Promise<AddSlabActionResult> {
    "use server";
    const actionClient = createServerComponentClient();
    const { data: { user: actionUser } } = await actionClient.auth.getUser();
    const submissionKey = Date.now();
    if (!actionUser) return { ok: false, status: "login-required", message: "Sign in required.", submissionKey };
    if (!resolvedCard.id || !resolvedCard.gv_id) {
      return {
        ok: false,
        status: "error",
        errorCode: "MISSING_CARD_CONTEXT",
        message: "Card context could not be resolved.",
        submissionKey,
      };
    }

    const selectedGrade = typeof formData.get("grade") === "string" ? String(formData.get("grade")) : "";
    const certNumber = typeof formData.get("cert_number") === "string" ? String(formData.get("cert_number")) : "";
    const certNumberConfirm =
      typeof formData.get("cert_number_confirm") === "string" ? String(formData.get("cert_number_confirm")) : "";
    const ownershipConfirmed = formData.get("ownership_confirmed") === "true";
    if (!ownershipConfirmed) {
      return {
        ok: false,
        status: "validation-error",
        errorCode: undefined,
        message: "Confirm ownership before saving this slab.",
        submissionKey,
      };
    }

    const result = await createSlabInstance({
      userId: actionUser.id,
      cardPrintId: resolvedCard.id,
      gvId: resolvedCard.gv_id,
      cardName: resolvedCard.name,
      setName: resolvedCard.set_name,
      cardImageUrl: resolvedCard.image_url,
      grader: "PSA",
      selectedGrade,
      certNumber,
      certNumberConfirm,
    });
    if (!result.ok) {
      return {
        ok: false,
        status:
          result.errorCode === "CERT_MISMATCH" || result.errorCode === "GRADE_MISMATCH"
            ? "validation-error"
            : result.errorCode === "VERIFICATION_FAILED" || result.errorCode === "PSA_UNREACHABLE"
              ? "verification-failed"
              : "error",
        errorCode: result.errorCode,
        message: result.message,
        submissionKey,
      };
    }

    return {
      ok: true,
      status: "created",
      message: `PSA ${result.grade} added to your vault.`,
      submissionKey,
      grade: result.grade,
      certNumber: result.certNumber,
      gvviId: result.gvviId,
    };
  }

  const supabase = createServerComponentClient();
  const shouldReadAuthenticatedState = hasSupabaseServerAuthCookie();
  const {
    data: { user },
  } = shouldReadAuthenticatedState
    ? await supabase.auth.getUser()
    : { data: { user: null } };
  let vaultCount = 0;
  let ownedObjectSummary: OwnedObjectSummary = {
    totalCount: 0,
    rawCount: 0,
    slabCount: 0,
    removableRawInstanceId: null,
    rawItems: [],
    slabItems: [],
    lines: [],
  };
  let conditionSnapshots: ConditionSnapshotListItem[] = [];
  let assignmentCandidatesBySnapshotId: Record<string, AssignmentCandidate[]> = {};

  if (user && resolvedCard.id) {
    try {
      const [ownershipSummary, snapshots] = await Promise.all([
        getOwnedObjectSummaryForCard(user.id, resolvedCard.id),
        getConditionSnapshotsForCard(user.id, resolvedCard.id),
      ]);
      ownedObjectSummary = ownershipSummary;
      vaultCount = ownershipSummary.totalCount;
      conditionSnapshots = snapshots;

      const unassignedSnapshots = snapshots.filter((snapshot) => snapshot.assignment_state === "unassigned");
      if (unassignedSnapshots.length > 0) {
        const candidateEntries = await Promise.all(
          unassignedSnapshots.map(async (snapshot) => [
            snapshot.id,
            await getAssignmentCandidatesForSnapshot(user.id, snapshot.id, resolvedCard.id),
          ] as const),
        );
        assignmentCandidatesBySnapshotId = Object.fromEntries(candidateEntries);
      }
    } catch (error) {
      console.error("[vault:read] card-page ownership or condition read failed", {
        userId: user.id,
        cardPrintId: resolvedCard.id,
        error,
      });
      ownedObjectSummary = {
        totalCount: 0,
        rawCount: 0,
        slabCount: 0,
        removableRawInstanceId: null,
        rawItems: [],
        slabItems: [],
        lines: [],
      };
      conditionSnapshots = [];
      assignmentCandidatesBySnapshotId = {};
    }
  }

  const loginHref = `/login?next=${encodeURIComponent(currentCardPath)}`;
  const canViewPricing = Boolean(user);
  const [pricingRecords, ownedPrintingCounts] = await Promise.all([
    canViewPricing && resolvedCard.id ? getCardPricingUiRowsByCardPrintId(resolvedCard.id) : Promise.resolve([]),
    user && resolvedCard.id
      ? getOwnedPrintingCountsByCardPrintIds(user.id, [resolvedCard.id])
      : Promise.resolve(new Map()),
  ]);
  const pricingUi = pricingRecords.find((record) => record.pricing_scope === "parent") ?? pricingRecords[0] ?? null;

  const setName = typeof resolvedCard.set_name === "string" ? resolvedCard.set_name.trim() : "";
  const setCodeLabel = resolvedCard.set_code?.trim().toUpperCase();
  const setContextLabel = [setName || null, setCodeLabel || null].filter(Boolean).join(" • ");
  const identitySubtitle = resolveDisplayIdentitySubtitleForContext({
    identitySubtitle: resolvedDisplayIdentity.suffix,
    visibleSetLabel: setContextLabel,
  });
  const setHref = resolvedCard.set_code
    ? buildPathWithCompareCards(`/sets/${encodeURIComponent(resolvedCard.set_code)}`, "", compareCards)
    : null;
  const illustratorName = typeof resolvedCard.artist === "string" ? resolvedCard.artist.trim() : "";
  const displayIdentity = getDisplayPrintedIdentity(resolvedCard);
  const printedSetAbbrevLabel =
    displayIdentity.displayPrintedSetAbbrev?.trim().toUpperCase() ?? getPrintedSetAbbrevFallback(resolvedCard);
  const collectorNumberLine = formatCollectorIdentity({
    printedSetAbbrev: printedSetAbbrevLabel,
    printedNumber: displayIdentity.displayPrintedNumber,
    printedTotal: resolvedCard.printed_total ?? getPrintedTotalFallback(resolvedCard),
  });
  const releaseDateLabel = formatReleaseDate(resolvedCard.release_date);
  const variantLabels = getVariantLabels(resolvedCard, 3);
  const variantOriginCopy = getVariantOriginPublicCopy({
    cardPrintId: resolvedCard.id,
    gvId: resolvedCard.gv_id,
  });
  const variantExplanation = variantOriginCopy
    ? buildGrookaiVariantExplanationFromPublicCopy({
        card: {
          name: resolvedDisplayIdentity.base_name,
          set_name: setName || null,
          printed_number: displayIdentity.displayPrintedNumber ?? resolvedCard.number ?? null,
        },
        variantOrigin: variantOriginCopy,
      })
    : null;
  const ownedPrintingCountsForCard = resolvedCard.id ? ownedPrintingCounts.get(resolvedCard.id) : null;
  const displayPrintingsWithOwnedCounts = (resolvedCard.display_printings ?? []).map((printing) => ({
    ...printing,
    owned_count: printing.is_display_fallback ? 0 : ownedPrintingCountsForCard?.get(printing.id) ?? 0,
  }));
  const finishLabels = Array.from(
    new Set(
      displayPrintingsWithOwnedCounts
        .filter((printing) => !printing.is_display_fallback)
        .map((printing) => printing.finish_name?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const detailItems: DetailItem[] = [
    { label: "Language", value: getCardLanguageLabel(resolvedCard.gv_id) },
    collectorNumberLine ? { label: "Collector No.", value: collectorNumberLine } : null,
    resolvedCard.rarity ? { label: "Rarity", value: resolvedCard.rarity } : null,
    finishLabels.length > 0 ? { label: "Finishes", value: finishLabels.slice(0, 4).join(" • ") } : null,
    resolvedCard.supertype ? { label: "Type", value: resolvedCard.supertype } : null,
    resolvedCard.card_category ? { label: "Category", value: resolvedCard.card_category } : null,
    resolvedCard.types?.length ? { label: "Types", value: resolvedCard.types.join(" • ") } : null,
    typeof resolvedCard.hp === "number" ? { label: "HP", value: String(resolvedCard.hp) } : null,
    typeof resolvedCard.national_dex === "number" ? { label: "Pokedex No.", value: `#${resolvedCard.national_dex}` } : null,
    illustratorName ? { label: "Illustrator", value: illustratorName } : null,
    resolvedCard.number_plain && resolvedCard.number_plain !== (displayIdentity.displayPrintedNumber ?? "")
      ? { label: "Number Plain", value: resolvedCard.number_plain }
      : null,
  ].filter((item): item is DetailItem => item !== null);
  const setContextItems: DetailItem[] = [
    setName ? { label: "Set Name", value: setName } : null,
    setCodeLabel ? { label: "Set Code", value: setCodeLabel } : null,
    typeof resolvedCard.printed_total === "number" ? { label: "Printed Total", value: `${resolvedCard.printed_total} cards` } : null,
    releaseDateLabel ? { label: "Release Date", value: releaseDateLabel } : null,
  ].filter((item): item is DetailItem => item !== null);
  const hasOwnedItems = ownedObjectSummary.rawCount > 0 || ownedObjectSummary.slabItems.length > 0;
  const ownershipLabel = vaultCount > 0
    ? `You own ${vaultCount} ${vaultCount === 1 ? "copy" : "copies"}`
    : "This card can be added to your Vault";
  const cardProductJsonLd = buildCardProductJsonLd({
    card: resolvedCard,
    canonicalUrl: canonicalCardUrl,
    collectorNumber: collectorNumberLine,
    displayName: resolvedDisplayIdentity.display_name,
    finishLabels,
    imageUrl: asAbsoluteUrl(resolvedCardImageSrc ?? resolvedCardImageFallback, siteOrigin),
    illustratorName,
    languageLabel: getCardLanguageLabel(resolvedCard.gv_id),
    printedName: resolvedDisplayIdentity.printed_name ?? undefined,
    setName,
  });

  return (
    <div className={`space-y-7 py-5 ${compareCards.length > 0 ? "pb-32 md:pb-36" : ""}`}>
      <TrackPageEvent eventName="page_view_card" path={currentCardPath} gvId={resolvedCard.gv_id} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdMarkup(cardProductJsonLd) }}
      />
      <section className="gv-product-hero isolate">
        <div className="relative z-10 grid gap-8 p-5 sm:p-7 lg:grid-cols-[minmax(300px,440px)_minmax(0,1fr)] lg:items-start lg:gap-12 xl:p-12">
          <div className="mx-auto flex w-full max-w-[380px] flex-col items-center lg:sticky lg:top-8 lg:max-w-[430px]">
            <div className="gv-image-stage gv-card-hero-image-stage w-full p-3 sm:p-4">
              <CardZoomModal
                src={resolvedCardImageSrc}
                fallbackSrc={resolvedCardImageFallback ?? undefined}
                alt={getCardImageAltText(
                  resolvedDisplayIdentity.display_name,
                  displayedImageTruthSource,
                )}
                imageClassName="h-auto max-h-[580px] w-full cursor-zoom-in rounded-[22px] object-contain shadow-[0_30px_76px_-46px_rgba(15,23,42,0.88)] transition duration-150 hover:scale-[1.008] hover:shadow-[0_36px_84px_-46px_rgba(15,23,42,0.92)] sm:max-h-[660px]"
                fallbackClassName="flex aspect-[3/4] w-full items-center justify-center rounded-[22px] bg-white/42 px-4 text-center text-sm font-medium text-slate-400 ring-1 ring-inset ring-slate-200/40 dark:bg-white/[0.04] dark:text-slate-600 dark:ring-white/[0.05]"
                sizes="(max-width: 1024px) 86vw, 430px"
                priority
              />
            </div>
            {resolvedCardImagePresentation.compactBadgeLabel ? (
              <div className="mt-4 flex w-full flex-wrap justify-center gap-2">
                <CardImageTruthBadge
                  label={resolvedCardImagePresentation.detailBadgeLabel ?? resolvedCardImagePresentation.compactBadgeLabel}
                  note={resolvedCardImagePresentation.detailNote}
                  emphasis={
                    resolvedCardImagePresentation.isCollisionRepresentative ||
                    resolvedCardImagePresentation.isMissingVariantVisual ||
                    resolvedCardImagePresentation.isBlocked
                      ? "strong"
                      : "default"
                  }
                />
              </div>
            ) : null}
            {resolvedCardImagePresentation.detailNote ? (
              <p className="mt-4 rounded-[16px] border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm leading-6 text-amber-950 shadow-sm dark:border-amber-500/30 dark:bg-amber-950/28 dark:text-amber-100">
                {resolvedCardImagePresentation.detailNote}
              </p>
            ) : null}
          </div>

          <div className="gv-card-hero-copy min-w-0 space-y-7">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                {resolvedCard.supertype ? (
                  <span className="gv-card-detail-eyebrow">
                    {resolvedCard.supertype}
                  </span>
                ) : null}
                <span className="gv-hi-ownership inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                  {ownershipLabel}
                </span>
              </div>

              <div className="space-y-4">
                {(setName || setCodeLabel) ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {setCodeLabel ? (
                      <span className="inline-flex rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-800 shadow-sm dark:border-emerald-400/25 dark:bg-emerald-400/12 dark:text-emerald-100">
                        {setCodeLabel}
                      </span>
                    ) : null}
                    {setName ? (
                      setHref ? (
                        <Link
                          href={setHref}
                          className="inline-flex rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 shadow-sm underline-offset-4 transition hover:border-slate-300 hover:text-slate-950 hover:underline dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white"
                        >
                          {setName}
                        </Link>
                      ) : (
                        <span className="inline-flex rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
                          {setName}
                        </span>
                      )
                    ) : null}
                  </div>
                ) : null}
                <div className="space-y-3">
                  <h1 className="gv-hi-card-identity max-w-3xl text-[3rem] leading-[0.96] tracking-normal sm:text-[4.2rem] lg:text-[5.35rem]">
                    {resolvedDisplayIdentity.base_name}
                  </h1>
                  {resolvedDisplayIdentity.printed_name ? (
                    <p className="gv-hi-metadata text-sm font-medium sm:text-base">
                      {resolvedDisplayIdentity.printed_name}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="inline-flex w-fit rounded-full border border-slate-200/80 bg-slate-50/90 px-3 py-1 font-mono text-sm font-semibold uppercase tracking-[0.12em] text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                      Grookai ID {resolvedCard.gv_id}
                    </p>
                    {identitySubtitle ? (
                      <p className="gv-hi-metadata text-sm font-medium sm:text-base">{identitySubtitle}</p>
                    ) : null}
                    {collectorNumberLine ? (
                      <p className="inline-flex w-fit rounded-full border border-slate-200/80 bg-slate-50/90 px-3 py-1 font-mono text-sm font-semibold uppercase tracking-[0.12em] text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                        {collectorNumberLine}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              {(resolvedCard.rarity || variantLabels.length > 0) ? (
                <div className="flex flex-wrap gap-2">
                  {resolvedCard.rarity ? (
                    <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900 shadow-sm dark:bg-amber-500/18 dark:text-amber-200">
                      {resolvedCard.rarity}
                    </span>
                  ) : null}
                  {variantLabels.map((label) => (
                    <VariantBadge key={`${resolvedCard.gv_id}-${label}`} label={label} />
                  ))}
                </div>
              ) : null}

              {variantOriginCopy ? (
                <section className="gv-variant-story max-w-4xl px-5 py-5 sm:px-6 sm:py-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="gv-card-detail-eyebrow text-[10px]">
                      Why this version matters
                    </span>
                  </div>
                  <p className="mt-4 max-w-2xl text-2xl font-semibold leading-tight tracking-normal text-slate-950 dark:text-white sm:text-3xl">
                    {variantExplanation?.title ?? variantOriginCopy.family_label}
                  </p>
                  {variantExplanation?.summary ? (
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700 dark:text-slate-300">
                      {variantExplanation.summary}
                    </p>
                  ) : null}
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        Why it exists
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                        {variantExplanation?.why_it_exists ?? variantOriginCopy.why_it_exists}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        Why collectors care
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                        {variantExplanation?.why_collectors_care ?? variantOriginCopy.why_collectors_care}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {variantExplanation?.how_to_identify ?? variantOriginCopy.how_to_identify}
                  </p>
                  <details className="mt-4 rounded-[14px] border border-slate-200/70 bg-white/60 px-3 py-3 dark:border-slate-700 dark:bg-slate-900/50">
                    <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
                      Source-backed modeling
                    </summary>
                    <div className="mt-3 space-y-3 text-xs leading-5 text-slate-600 dark:text-slate-300">
                      <p>{variantExplanation?.grookai_rule ?? variantOriginCopy.grookai_rule}</p>
                      {(variantExplanation?.source_urls ?? variantOriginCopy.source_urls).length > 0 ? (
                        <ul className="space-y-1">
                          {(variantExplanation?.source_urls ?? variantOriginCopy.source_urls).slice(0, 4).map((url) => (
                            <li key={`${variantOriginCopy.gv_id}-${url}`}>
                              <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="break-words font-medium text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline dark:text-slate-200 dark:hover:text-white"
                              >
                                {url}
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </details>
                  <details className="mt-3 rounded-[14px] border border-violet-200/60 bg-violet-50/50 px-3 py-3 dark:border-violet-300/20 dark:bg-violet-400/[0.08]">
                    <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700 transition hover:text-violet-950 dark:text-violet-200 dark:hover:text-white">
                      Assistant grounding
                    </summary>
                    <VariantExplanationContextPreview
                      gvId={resolvedCard.gv_id}
                      printingGvId={selectedRoutePrinting?.printing_gv_id}
                      finishKey={selectedRoutePrinting?.finish_key}
                    />
                  </details>
                </section>
              ) : null}

              <div className="gv-hi-diagnostics flex flex-wrap items-center gap-3 text-sm">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em]">
                  {resolvedCard.gv_id}
                </span>
                <CopyButton text={resolvedCard.gv_id} />
                {illustratorName ? <span>Illustrated by {illustratorName}</span> : null}
              </div>
            </div>

            <CardPageMarketVaultPanels
              addToVaultAction={addToVaultAction}
              createSlabAction={createSlabAction}
              isAuthenticated={Boolean(user)}
              loginHref={loginHref}
              currentPath={currentCardPath}
              gvId={resolvedCard.gv_id}
              cardPrintId={resolvedCard.id}
              cardName={resolvedDisplayIdentity.display_name}
              printings={displayPrintingsWithOwnedCounts}
              initialPrintingId={searchParams?.printing ?? null}
              pricing={pricingUi}
              pricingRecords={pricingRecords}
              ownershipLabel={ownershipLabel}
              rawCount={ownedObjectSummary.rawCount}
              slabCount={ownedObjectSummary.slabCount}
            />
          </div>
        </div>
      </section>

      {detailItems.length > 0 ? (
        <section className="gv-card-lower-section space-y-4 p-5 sm:p-6">
          <div className="gv-card-section-header">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Card Details</p>
            <h2>Card information</h2>
            <p>Identity, traits, and artwork facts for this exact card.</p>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {detailItems.map((item) => (
              <div key={item.label} className="rounded-[18px] border border-slate-200/70 bg-white/54 px-4 py-4 dark:border-slate-700 dark:bg-white/[0.04]">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{item.label}</dt>
                <dd className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {setContextItems.length > 0 ? (
        <section className="gv-card-lower-section space-y-4 p-5 sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="gv-card-section-header">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">About This Set</p>
              {setName ? <h2>{setName}</h2> : null}
              <p>Set context for this exact print.</p>
            </div>
            {setHref ? (
              <Link
                href={setHref}
                className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              >
                View Set
              </Link>
            ) : null}
          </div>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {setContextItems.map((item) => (
              <div key={item.label} className="rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-white/[0.04]">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{item.label}</dt>
                <dd className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <Suspense fallback={<CardLowerSectionFallback title="Artwork Cameos" />}>
        <StreamedArtworkCameosSection gvId={resolvedCard.gv_id} />
      </Suspense>

      <Suspense fallback={<CardLowerSectionFallback title="Other Versions" />}>
        <StreamedRelatedPrintsSection gvId={resolvedCard.gv_id} compareCards={compareCards} />
      </Suspense>

      {user && hasOwnedItems ? (
        <section className="gv-card-lower-section space-y-4 p-5 sm:p-6">
          <div className="gv-card-section-header">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Your Vault</p>
            <h2>Your copies</h2>
            <p>Existing ownership entries for this card.</p>
          </div>
          <ul className="space-y-3 text-sm text-slate-600">
            {ownedObjectSummary.rawCount > 0 ? (
              ownedObjectSummary.rawItems.map((rawItem) => (
                <li
                  key={rawItem.instanceId}
                  className="flex flex-col gap-2 rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-slate-900">
                      {[rawItem.conditionLabel, rawItem.finishLabel, "Raw copy"]
                        .filter((value): value is string => Boolean(value))
                        .join(" • ")}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>Tracked on your active vault entry.</span>
                      {rawItem.gvviId ? <span>{rawItem.gvviId}</span> : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {rawItem.gvviId ? (
                      <Link
                        href={`/vault/gvvi/${encodeURIComponent(rawItem.gvviId)}`}
                        className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                      >
                        Open copy
                      </Link>
                    ) : null}
                    <OwnedObjectRemoveAction instanceId={rawItem.instanceId} label="Remove raw copy" />
                  </div>
                </li>
              ))
            ) : null}
            {ownedObjectSummary.slabItems.map((slabItem) => (
              <li
                key={slabItem.instanceId}
                className="flex flex-col gap-2 rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <p className="font-medium text-slate-900">
                    {[slabItem.grader, slabItem.grade].filter((value): value is string => Boolean(value)).join(" ") || "Graded slab"}
                  </p>
                  {slabItem.certNumber ? <p className="text-xs text-slate-500">Cert {slabItem.certNumber}</p> : null}
                </div>
                <OwnedObjectRemoveAction instanceId={slabItem.instanceId} label="Remove slab" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {user ? (
        <ConditionSnapshotSection
          snapshots={conditionSnapshots}
          candidatesBySnapshotId={assignmentCandidatesBySnapshotId}
          cardPrintId={resolvedCard.id}
        />
      ) : null}

      {user && resolvedCard.id ? (
        <Suspense fallback={null}>
          <CardNetworkOffersSection
            cardPrintId={resolvedCard.id}
            gvId={resolvedCard.gv_id}
            viewerUserId={user.id}
            cardName={resolvedDisplayIdentity.display_name}
            loginHref={loginHref}
            currentPath={currentCardPath}
          />
        </Suspense>
      ) : null}

      <Suspense fallback={null}>
        <NearbyCardsSection gvId={resolvedCard.gv_id} compareCards={compareCards} />
      </Suspense>

      <PricingDisclosure />

      <CompareTray cards={compareCards} addHref={buildPathWithCompareCards("/explore", "", compareCards)} />
    </div>
  );
}

type CardNetworkOffer = Awaited<ReturnType<typeof getCardStreamRows>>[number];
type NearbyPublicCard = NonNullable<Awaited<ReturnType<typeof getAdjacentPublicCardsByGvId>>["previous"]>;

function getOfferIntentSummary(offer: CardNetworkOffer) {
  return [
    offer.sellCount > 0 ? `${getVaultIntentLabel("sell")} ${offer.sellCount}` : null,
    offer.tradeCount > 0 ? `${getVaultIntentLabel("trade")} ${offer.tradeCount}` : null,
    offer.showcaseCount > 0 ? `${getVaultIntentLabel("showcase")} ${offer.showcaseCount}` : null,
  ].filter((value): value is string => Boolean(value));
}

function getGroupedOfferContactAnchor(offer: CardNetworkOffer) {
  const copyVaultItemIds = Array.from(new Set(offer.inPlayCopies.map((copy) => copy.vaultItemId)));
  if (copyVaultItemIds.length > 1) {
    return null;
  }

  return {
    vaultItemId: copyVaultItemIds[0] ?? offer.vaultItemId,
    intent: offer.intent,
  };
}

function getSingleOfferCopyHref(offer: CardNetworkOffer, viewerUserId: string | null) {
  return offer.inPlayCopies.length === 1 && offer.inPlayCopies[0]?.gvviId
    ? getVaultInstanceHref(offer.inPlayCopies[0].gvviId, viewerUserId, offer.ownerUserId)
    : null;
}

async function CardNetworkOffersSection({
  cardPrintId,
  gvId,
  viewerUserId,
  cardName,
  loginHref,
  currentPath,
}: {
  cardPrintId: string;
  gvId: string;
  viewerUserId: string;
  cardName: string;
  loginHref: string;
  currentPath: string;
}) {
  const networkOffers = await getCardStreamRows({
    cardPrintId,
    excludeUserId: viewerUserId,
    limit: 6,
  }).catch((error) => {
    console.error("[network:stream] card page offers read failed", {
      cardPrintId,
      gvId,
      error,
    });
    return [];
  });

  if (networkOffers.length === 0) return null;

  return (
    <section className="gv-card-lower-section space-y-4 p-5 sm:p-6">
      <div className="gv-card-section-header">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Collector Network</p>
        <h2>Available in the network</h2>
        <p>Collectors with this card marked Trade, Sell, or Showcase.</p>
      </div>
      <div className="space-y-3">
        {networkOffers.map((offer) => {
          const groupedContactAnchor = getGroupedOfferContactAnchor(offer);
          const singleCopyHref = getSingleOfferCopyHref(offer, viewerUserId);
          return (
            <article key={offer.vaultItemId} className="gv-quiet-panel px-4 py-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {getOfferIntentSummary(offer).map((label) => (
                      <span
                        key={`${offer.vaultItemId}-${label}`}
                        className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700"
                      >
                        {label}
                      </span>
                    ))}
                    <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                      {offer.inPlayCount > 1
                        ? `${offer.inPlayCount} copies visible`
                        : offer.isGraded
                          ? (offer.gradeLabel ?? [offer.gradeCompany, offer.gradeValue].filter(Boolean).join(" ")) || "Graded"
                          : offer.conditionLabel ?? "Raw"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    Collector{" "}
                    <Link
                      href={`/u/${offer.ownerSlug}`}
                      className="font-medium text-slate-900 underline-offset-4 hover:underline"
                    >
                      {offer.ownerDisplayName}
                    </Link>
                  </p>
                  {singleCopyHref ? (
                    <Link
                      href={singleCopyHref}
                      className="inline-flex text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline"
                    >
                      Open copy
                    </Link>
                  ) : null}
                </div>
                {offer.ownerUserId !== viewerUserId && groupedContactAnchor ? (
                  <ContactOwnerButton
                    vaultItemId={groupedContactAnchor.vaultItemId}
                    cardPrintId={offer.cardPrintId}
                    ownerUserId={offer.ownerUserId}
                    viewerUserId={viewerUserId}
                    ownerDisplayName={offer.ownerDisplayName}
                    cardName={cardName}
                    intent={groupedContactAnchor.intent}
                    buttonLabel={groupedContactAnchor.intent ? undefined : "Message collector"}
                    isAuthenticated={Boolean(viewerUserId)}
                    loginHref={loginHref}
                    currentPath={currentPath}
                  />
                ) : null}
              </div>
              {offer.inPlayCopies.length > 1 ? (
                <details className="gv-quiet-panel mt-4 px-4 py-3">
                  <summary className="cursor-pointer text-sm font-medium text-slate-800">
                    View copies ({offer.inPlayCopies.length})
                  </summary>
                  <div className="mt-3 space-y-2">
                    {offer.inPlayCopies.map((copy) => (
                      <div key={copy.instanceId} className="gv-quiet-panel px-3 py-3">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-700">
                              {getVaultIntentLabel(copy.intent)}
                            </span>
                            {copy.isGraded ? (
                              <span>
                                {copy.gradeLabel ?? ([copy.gradeCompany, copy.gradeValue].filter(Boolean).join(" ") || "Graded")}
                              </span>
                            ) : copy.conditionLabel ? (
                              <span>{copy.conditionLabel}</span>
                            ) : null}
                            {copy.certNumber ? <span>Cert {copy.certNumber}</span> : null}
                          </div>
                          {copy.gvviId ? (
                            <Link
                              href={getVaultInstanceHref(copy.gvviId, viewerUserId, offer.ownerUserId) ?? `/card/${gvId}`}
                              className="inline-flex text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline"
                            >
                              Open copy
                            </Link>
                          ) : null}
                          {offer.ownerUserId !== viewerUserId ? (
                            <ContactOwnerButton
                              vaultItemId={copy.vaultItemId}
                              cardPrintId={offer.cardPrintId}
                              ownerUserId={offer.ownerUserId}
                              viewerUserId={viewerUserId}
                              ownerDisplayName={offer.ownerDisplayName}
                              cardName={cardName}
                              intent={copy.intent}
                              buttonLabel="Message about this copy"
                              isAuthenticated={Boolean(viewerUserId)}
                              loginHref={loginHref}
                              currentPath={currentPath}
                              buttonClassName="inline-flex w-full items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                            />
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}
              {offer.ownerUserId !== viewerUserId && !groupedContactAnchor && offer.inPlayCopies.length > 1 ? (
                <p className="mt-3 text-xs text-slate-500">
                  Choose a copy above to message this collector about that card.
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function NearbyCardLink({
  card,
  direction,
  compareCards,
}: {
  card: NearbyPublicCard;
  direction: "previous" | "next";
  compareCards: string[];
}) {
  const imagePresentation = resolveCardImagePresentation(card);
  const cardImageSrc = normalizeCardImageUrl(card.display_image_url ?? card.image_url) ?? undefined;
  const cardImageFallback =
    card.display_image_kind === "exact"
      ? buildExactExternalImageFallback(cardImageSrc, card.tcgdex_external_id)
      : null;
  const displayIdentity = resolveDisplayIdentity(card);
  const directionLabel = direction === "previous" ? "Previous" : "Next";
  const directionArrow = direction === "previous" ? "←" : "→";

  return (
    <Link
      href={buildPathWithCompareCards(`/card/${card.gv_id}`, "", compareCards)}
      className="flex items-center gap-3 rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3 transition-all duration-150 hover:-translate-y-[2px] hover:border-slate-300 hover:bg-white hover:shadow-md"
    >
      <div className="space-y-2">
        <PublicCardImage
          src={cardImageSrc}
          fallbackSrc={cardImageFallback ?? undefined}
          alt={getCardImageAltText(displayIdentity.display_name, card)}
          imageClassName="h-16 w-12 rounded-lg border border-slate-200 bg-white object-contain p-1"
          fallbackClassName="flex h-16 w-12 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 px-1 text-center text-[10px] text-slate-500"
          sizes="48px"
        />
        {imagePresentation.compactBadgeLabel ? (
          <CardImageTruthBadge
            label={imagePresentation.compactBadgeLabel}
            emphasis={imagePresentation.isCollisionRepresentative ? "strong" : "default"}
          />
        ) : null}
      </div>
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {direction === "previous" ? `${directionArrow} ${directionLabel}` : `${directionLabel} ${directionArrow}`}
        </p>
        <p className="truncate text-sm font-medium text-slate-900">{displayIdentity.display_name}</p>
        <p className="text-xs text-slate-600">#{card.number}</p>
      </div>
    </Link>
  );
}

async function NearbyCardsSection({
  gvId,
  compareCards,
}: {
  gvId: string;
  compareCards: string[];
}) {
  const adjacentCards = await getAdjacentPublicCardsByGvId(gvId);
  if (!adjacentCards.previous && !adjacentCards.next) return null;

  return (
    <section className="gv-card-lower-section space-y-4 p-5 sm:p-6">
      <div className="gv-card-section-header">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">In This Set</p>
        <h2>Nearby cards</h2>
        <p>Cards from the same set, ordered around this print.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {adjacentCards.previous ? (
          <NearbyCardLink card={adjacentCards.previous} direction="previous" compareCards={compareCards} />
        ) : (
          <div className="hidden sm:block" />
        )}
        {adjacentCards.next ? (
          <NearbyCardLink card={adjacentCards.next} direction="next" compareCards={compareCards} />
        ) : (
          <div className="hidden sm:block" />
        )}
      </div>
    </section>
  );
}
