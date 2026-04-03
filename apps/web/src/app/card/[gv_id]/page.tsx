import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import CardZoomModal from "@/components/compare/CardZoomModal";
import { ConditionSnapshotSection } from "@/components/condition/ConditionSnapshotSection";
import CompareCardButton from "@/components/compare/CompareCardButton";
import CompareTray from "@/components/compare/CompareTray";
import PrintingSelector from "@/components/cards/PrintingSelector";
import PricingDisclosure from "@/components/common/PricingDisclosure";
import AddSlabCardAction, { type AddSlabActionResult } from "@/components/slabs/AddSlabCardAction";
import TrackPageEvent from "@/components/telemetry/TrackPageEvent";
import VariantBadge from "@/components/cards/VariantBadge";
import CardPagePricingRail from "@/components/pricing/CardPagePricingRail";
import ShareCardButton from "@/components/ShareCardButton";
import ContactOwnerButton from "@/components/network/ContactOwnerButton";
import AddToVaultCardAction, { type AddToVaultActionResult } from "@/components/vault/AddToVaultCardAction";
import OwnedObjectRemoveAction from "@/components/vault/OwnedObjectRemoveAction";
import CopyButton from "@/components/CopyButton";
import PublicCardImage from "@/components/PublicCardImage";
import { buildTcgDexImageUrl } from "@/lib/cards/buildTcgDexImageUrl";
import { getDisplayPrintedIdentity } from "@/lib/cards/getDisplayPrintedIdentity";
import { normalizeCardImageUrl } from "@/lib/cards/normalizeCardImageUrl";
import { getVariantLabels } from "@/lib/cards/variantPresentation";
import { getAdjacentPublicCardsByGvId } from "@/lib/getAdjacentPublicCardsByGvId";
import { buildCompareCardsParam, buildPathWithCompareCards, normalizeCompareCardsParam } from "@/lib/compareCards";
import { getCardStreamRows } from "@/lib/network/getCardStreamRows";
import { getVaultIntentLabel } from "@/lib/network/intent";
import { getPublicCardByGvId } from "@/lib/getPublicCardByGvId";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { getSetLogoAssetPathMap } from "@/lib/setLogoAssets";
import { getConditionSnapshotsForCard } from "@/lib/condition/getConditionSnapshotsForCard";
import { getAssignmentCandidatesForSnapshot } from "@/lib/condition/getAssignmentCandidatesForSnapshot";
import { getCardPricingUiByCardPrintId } from "@/lib/pricing/getCardPricingUiByCardPrintId";
import type { ConditionSnapshotListItem } from "@/lib/condition/getConditionSnapshotsForCard";
import type { AssignmentCandidate } from "@/lib/condition/getAssignmentCandidatesForSnapshot";
import { createSlabInstance } from "@/lib/slabs/createSlabInstance";
import { createServerComponentClient } from "@/lib/supabase/server";
import { trackServerEvent } from "@/lib/telemetry/trackServerEvent";
import { addCardToVault, type AddCardToVaultResult } from "@/lib/vault/addCardToVault";
import { getVaultInstanceHref } from "@/lib/vault/getVaultInstanceHref";
import { getOwnedObjectSummaryForCard, type OwnedObjectSummary } from "@/lib/vault/getOwnedObjectSummaryForCard";

type DetailItem = { label: string; value: string };

function formatPrintedTotal(number: string, printedTotal?: number) {
  if (!number || typeof printedTotal !== "number") return undefined;
  const prefix = number.match(/^[A-Za-z]+/)?.[0] ?? "";
  return `${prefix}${printedTotal}`;
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

function buildCardHref(gvId: string, compareCardsParam?: string) {
  const params = new URLSearchParams();
  if (compareCardsParam) params.set("cards", compareCardsParam);
  const query = params.toString();
  return query ? `/card/${encodeURIComponent(gvId)}?${query}` : `/card/${encodeURIComponent(gvId)}`;
}

export const revalidate = 0;
export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: { gv_id: string } }): Promise<Metadata> {
  const card = await getPublicCardByGvId(params.gv_id);
  const siteOrigin = getSiteOrigin();
  if (!card) return { title: "Card not found | Grookai Vault" };
  const displayIdentity = getDisplayPrintedIdentity(card);
  const metadataImageUrl =
    normalizeCardImageUrl(card.image_url) ?? buildTcgDexImageUrl(card.tcgdex_external_id);

  const titleParts = [card.name, card.set_name, card.gv_id].filter((value): value is string => Boolean(value));
  const title = `${titleParts.join(" • ")} | Grookai Vault`;
  const description = [
    `View card details for ${card.name}`,
    card.set_name ? `from ${card.set_name}` : undefined,
    displayIdentity.displayPrintedNumber ? `#${displayIdentity.displayPrintedNumber}` : undefined,
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
      images: metadataImageUrl ? [{ url: metadataImageUrl, alt: card.name }] : undefined,
    },
    twitter: {
      card: metadataImageUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: metadataImageUrl ? [metadataImageUrl] : undefined,
    },
  };
}

export default async function CardPage({
  params,
  searchParams,
}: {
  params: { gv_id: string };
  searchParams?: { cards?: string };
}) {
  const supabase = createServerComponentClient();
  const [{ data: authData }, card, adjacentCards] = await Promise.all([
    supabase.auth.getUser(),
    getPublicCardByGvId(params.gv_id),
    getAdjacentPublicCardsByGvId(params.gv_id),
  ]);
  if (!card) notFound();

  const resolvedCard = card;
  const compareCards = normalizeCompareCardsParam(searchParams?.cards);
  const compareCardsParam = buildCompareCardsParam(compareCards);
  const currentCardPath = buildCardHref(resolvedCard.gv_id, compareCardsParam);
  const resolvedCardImageSrc = normalizeCardImageUrl(resolvedCard.image_url) ?? undefined;
  const resolvedCardImageFallback = buildTcgDexImageUrl(resolvedCard.tcgdex_external_id);

  async function addToVaultAction(
    _previousState: AddToVaultActionResult | null,
    _formData: FormData,
  ): Promise<AddToVaultActionResult> {
    "use server";
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
      metadata: { gv_vi_id: result.gvvi_id, quantity_delta: 1 },
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

  const user = authData.user;
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
  const pricingUi = canViewPricing && resolvedCard.id ? await getCardPricingUiByCardPrintId(resolvedCard.id) : null;
  const setLogoPath = resolvedCard.set_code
    ? (await getSetLogoAssetPathMap([resolvedCard.set_code])).get(resolvedCard.set_code.toLowerCase())
    : undefined;
  const identityWatermarkStyle = {
    "--wm-opacity-desktop": "0.05",
    "--wm-blur-desktop": "8px",
    "--wm-scale-desktop": "1.12",
    "--wm-opacity-mobile": "0.06",
    "--wm-blur-mobile": "6px",
    "--wm-scale-mobile": "1.14",
  } as CSSProperties;

  const setName = typeof resolvedCard.set_name === "string" ? resolvedCard.set_name.trim() : "";
  const setCodeLabel = resolvedCard.set_code?.trim().toUpperCase();
  const setHref = resolvedCard.set_code
    ? buildPathWithCompareCards(`/sets/${encodeURIComponent(resolvedCard.set_code)}`, "", compareCards)
    : null;
  const illustratorName = typeof resolvedCard.artist === "string" ? resolvedCard.artist.trim() : "";
  const displayIdentity = getDisplayPrintedIdentity(resolvedCard);
  const printedTotal = formatPrintedTotal(displayIdentity.displayPrintedNumber ?? "", resolvedCard.printed_total);
  const collectorIdentity = displayIdentity.displayPrintedNumber
    ? `${displayIdentity.displayPrintedNumber}${printedTotal ? `/${printedTotal}` : ""}`
    : null;
  const collectorNumberLine = collectorIdentity
    ? [displayIdentity.displayPrintedSetAbbrev, collectorIdentity]
        .filter((value): value is string => Boolean(value))
        .join(" ")
    : undefined;
  const releaseDateLabel = formatReleaseDate(resolvedCard.release_date);
  const variantLabels = getVariantLabels(resolvedCard, 3);
  const detailItems: DetailItem[] = [
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
  const relatedPrints = resolvedCard.related_prints ?? [];
  const networkOffers = resolvedCard.id
    ? await getCardStreamRows({
        cardPrintId: resolvedCard.id,
        excludeUserId: user?.id ?? null,
        limit: 6,
      })
    : [];
  const hasOwnedItems = ownedObjectSummary.rawCount > 0 || ownedObjectSummary.slabItems.length > 0;
  const ownershipLabel = vaultCount > 0
    ? `You own ${vaultCount} ${vaultCount === 1 ? "copy" : "copies"}`
    : "This card can be added to your Vault";

  const getOfferIntentSummary = (offer: (typeof networkOffers)[number]) =>
    [
      offer.sellCount > 0 ? `${getVaultIntentLabel("sell")} ${offer.sellCount}` : null,
      offer.tradeCount > 0 ? `${getVaultIntentLabel("trade")} ${offer.tradeCount}` : null,
      offer.showcaseCount > 0 ? `${getVaultIntentLabel("showcase")} ${offer.showcaseCount}` : null,
    ].filter((value): value is string => Boolean(value));

  const getGroupedOfferContactAnchor = (offer: (typeof networkOffers)[number]) => {
    const copyVaultItemIds = Array.from(new Set(offer.inPlayCopies.map((copy) => copy.vaultItemId)));
    if (copyVaultItemIds.length > 1) {
      return null;
    }

    return {
      vaultItemId: copyVaultItemIds[0] ?? offer.vaultItemId,
      intent: offer.intent,
    };
  };
  const getSingleOfferCopyHref = (offer: (typeof networkOffers)[number]) =>
    offer.inPlayCopies.length === 1 && offer.inPlayCopies[0]?.gvviId
      ? getVaultInstanceHref(offer.inPlayCopies[0].gvviId, user?.id ?? null, offer.ownerUserId)
      : null;

  return (
    <div className={`space-y-8 py-4 ${compareCards.length > 0 ? "pb-32 md:pb-36" : ""}`}>
      <TrackPageEvent eventName="page_view_card" path={currentCardPath} gvId={resolvedCard.gv_id} />
      <section className="relative isolate overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        {setLogoPath ? (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
            <Image
              src={setLogoPath}
              alt=""
              width={520}
              height={260}
              className="gv-ghost-watermark h-auto w-[78%] object-contain"
              style={identityWatermarkStyle}
            />
          </div>
        ) : null}
        {setLogoPath ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.97)_0%,rgba(255,255,255,0.94)_42%,rgba(255,255,255,0.98)_100%)]"
          />
        ) : null}
        <div className="relative z-10 grid gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)_300px] xl:gap-8 xl:p-8">
          <div className="rounded-[24px] border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 shadow-sm">
            <CardZoomModal
              src={resolvedCardImageSrc}
              fallbackSrc={resolvedCardImageFallback ?? undefined}
              alt={resolvedCard.name}
              imageClassName="w-full cursor-zoom-in object-contain"
              fallbackClassName="flex aspect-[3/4] items-center justify-center rounded-[18px] bg-slate-100 px-4 text-center text-sm text-slate-500"
            />
          </div>

          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              {resolvedCard.supertype ? (
                <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                  {resolvedCard.supertype}
                </span>
              ) : null}
              <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                {ownershipLabel}
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">{resolvedCard.name}</h1>
              {(setName || setCodeLabel) ? (
                <div className="flex flex-wrap items-center gap-3 text-lg text-slate-700">
                  {setName ? (
                    setHref ? (
                      <Link href={setHref} className="font-medium underline-offset-4 hover:text-slate-950 hover:underline">
                        {setName}
                      </Link>
                    ) : (
                      <span className="font-medium">{setName}</span>
                    )
                  ) : null}
                  {setCodeLabel ? (
                    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                      {setCodeLabel}
                    </span>
                  ) : null}
                </div>
              ) : null}
              {collectorNumberLine ? <p className="text-lg font-medium text-slate-700">{collectorNumberLine}</p> : null}
            </div>

            {(resolvedCard.rarity || variantLabels.length > 0) ? (
              <div className="flex flex-wrap gap-2">
                {resolvedCard.rarity ? (
                  <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900">
                    {resolvedCard.rarity}
                  </span>
                ) : null}
                {variantLabels.map((label) => (
                  <VariantBadge key={`${resolvedCard.gv_id}-${label}`} label={label} />
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {resolvedCard.gv_id}
              </span>
              <CopyButton text={resolvedCard.gv_id} />
              {illustratorName ? <span>Illustrated by {illustratorName}</span> : null}
            </div>
          </div>

          <aside className="rounded-[24px] border border-slate-200 bg-slate-50/90 p-5 shadow-sm backdrop-blur">
            <div className="space-y-4">
              <CardPagePricingRail isAuthenticated={canViewPricing} loginHref={loginHref} gvId={resolvedCard.gv_id} pricing={pricingUi} />

              <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Vault</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{ownershipLabel}.</p>
                {vaultCount > 0 && (ownedObjectSummary.rawCount > 0 || ownedObjectSummary.slabCount > 0) ? (
                  <p className="mt-2 text-xs text-slate-500">
                    {[ownedObjectSummary.rawCount > 0 ? `${ownedObjectSummary.rawCount} raw` : null, ownedObjectSummary.slabCount > 0 ? `${ownedObjectSummary.slabCount} slab` : null]
                      .filter((value): value is string => value !== null)
                      .join(" • ")}
                  </p>
                ) : null}
              </div>

              <AddToVaultCardAction
                action={addToVaultAction}
                isAuthenticated={Boolean(user)}
                loginHref={loginHref}
                currentPath={currentCardPath}
                gvId={resolvedCard.gv_id}
              />

              <div className="flex flex-wrap items-center gap-3">
                {user ? <AddSlabCardAction action={createSlabAction} cardName={resolvedCard.name} /> : null}
                <CompareCardButton gvId={resolvedCard.gv_id} />
                <ShareCardButton gvId={resolvedCard.gv_id} />
              </div>
            </div>
          </aside>
        </div>
      </section>

      <PrintingSelector printings={resolvedCard.display_printings} />

      {networkOffers.length > 0 ? (
        <section className="space-y-4 rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Collector Network</h2>
            <p className="text-sm text-slate-600">Collectors currently exposing this exact card for trade, sale, or showcase.</p>
          </div>
          <div className="space-y-3">
            {networkOffers.map((offer) => (
              <article key={offer.vaultItemId} className="rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-4">
                {(() => {
                  const groupedContactAnchor = getGroupedOfferContactAnchor(offer);
                  const singleCopyHref = getSingleOfferCopyHref(offer);
                  return (
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
                          ? `${offer.inPlayCount} copies in play`
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
                        Open exact copy
                      </Link>
                    ) : null}
                  </div>
                  {offer.ownerUserId !== user?.id && groupedContactAnchor ? (
                    <ContactOwnerButton
                      vaultItemId={groupedContactAnchor.vaultItemId}
                      cardPrintId={offer.cardPrintId}
                      ownerUserId={offer.ownerUserId}
                      viewerUserId={user?.id ?? null}
                      ownerDisplayName={offer.ownerDisplayName}
                      cardName={resolvedCard.name}
                      intent={groupedContactAnchor.intent}
                      buttonLabel={groupedContactAnchor.intent ? undefined : "Contact owner"}
                      isAuthenticated={Boolean(user)}
                      loginHref={loginHref}
                      currentPath={currentCardPath}
                    />
                  ) : null}
                </div>
                  );
                })()}
                {offer.inPlayCopies.length > 1 ? (
                  <details className="mt-4 rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
                    <summary className="cursor-pointer text-sm font-medium text-slate-800">
                      View copies ({offer.inPlayCopies.length})
                    </summary>
                    <div className="mt-3 space-y-2">
                      {offer.inPlayCopies.map((copy) => (
                        <div key={copy.instanceId} className="rounded-[0.9rem] border border-slate-200 bg-slate-50 px-3 py-3">
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
                                href={getVaultInstanceHref(copy.gvviId, user?.id ?? null, offer.ownerUserId) ?? `/card/${resolvedCard.gv_id}`}
                                className="inline-flex text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline"
                              >
                                Open copy
                              </Link>
                            ) : null}
                            {offer.ownerUserId !== user?.id ? (
                              <ContactOwnerButton
                                vaultItemId={copy.vaultItemId}
                                cardPrintId={offer.cardPrintId}
                                ownerUserId={offer.ownerUserId}
                                viewerUserId={user?.id ?? null}
                                ownerDisplayName={offer.ownerDisplayName}
                                cardName={resolvedCard.name}
                                intent={copy.intent}
                                buttonLabel="Contact about this copy"
                                isAuthenticated={Boolean(user)}
                                loginHref={loginHref}
                                currentPath={currentCardPath}
                                buttonClassName="inline-flex w-full items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                              />
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}
                {offer.ownerUserId !== user?.id && !getGroupedOfferContactAnchor(offer) && offer.inPlayCopies.length > 1 ? (
                  <p className="mt-3 text-xs text-slate-500">
                    Choose a copy above to contact this collector about the exact card in play.
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {detailItems.length > 0 ? (
        <section className="space-y-4 rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Card Details</h2>
            <p className="text-sm text-slate-600">Identity and card traits surfaced from the current catalog data.</p>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {detailItems.map((item) => (
              <div key={item.label} className="rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-4">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</dt>
                <dd className="mt-2 text-sm font-medium text-slate-900">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {relatedPrints.length > 0 ? (
        <section className="space-y-4 rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Other Versions of This Card</h2>
            <p className="text-sm text-slate-600">Read-only links to other prints that share this card name.</p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-3 md:gap-3 md:overflow-visible lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {relatedPrints.map((relatedCard) => {
              const relatedVariantLabels = getVariantLabels(relatedCard, 2);
              const relatedSetCodeLabel = relatedCard.set_code?.trim().toUpperCase();
              const relatedCardImageSrc = normalizeCardImageUrl(relatedCard.image_url) ?? undefined;
              const relatedCardImageFallback = buildTcgDexImageUrl(relatedCard.tcgdex_external_id);
              return (
                <Link
                  key={relatedCard.gv_id}
                  href={buildPathWithCompareCards(`/card/${relatedCard.gv_id}`, "", compareCards)}
                  className="group min-w-[172px] rounded-[16px] border border-slate-200 bg-slate-50 p-3 transition-all duration-150 hover:-translate-y-[2px] hover:border-slate-300 hover:bg-white hover:shadow-md"
                >
                  <div className="flex gap-3 md:flex-col md:items-start">
                    <PublicCardImage
                      src={relatedCardImageSrc}
                      fallbackSrc={relatedCardImageFallback ?? undefined}
                      alt={relatedCard.name}
                      imageClassName="h-20 w-14 rounded-[12px] border border-slate-200 bg-white object-contain p-1 shadow-sm md:h-[104px] md:w-[74px]"
                      fallbackClassName="flex h-20 w-14 items-center justify-center rounded-[12px] border border-slate-200 bg-white px-2 text-center text-[10px] text-slate-500 md:h-[104px] md:w-[74px]"
                    />
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {relatedSetCodeLabel ? (
                          <span className="inline-flex rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                            {relatedSetCodeLabel}
                          </span>
                        ) : null}
                        {relatedCard.rarity ? <span className="text-[11px] text-slate-500">{relatedCard.rarity}</span> : null}
                      </div>
                      <p className="line-clamp-2 text-[13px] font-semibold leading-5 text-slate-900">
                        {relatedCard.set_name ?? relatedCard.name}
                      </p>
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
      ) : null}

      {setContextItems.length > 0 ? (
        <section className="space-y-4 rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">About This Set</h2>
              {setName ? <p className="text-2xl font-semibold tracking-tight text-slate-950">{setName}</p> : null}
              <p className="text-sm text-slate-600">Context for the set this print belongs to.</p>
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
              <div key={item.label} className="rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-4">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</dt>
                <dd className="mt-2 text-sm font-medium text-slate-900">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {user && hasOwnedItems ? (
        <section className="space-y-4 rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Your Vault</h2>
            <p className="text-sm text-slate-600">Existing ownership entries for this card.</p>
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
                      {rawItem.conditionLabel ? `${rawItem.conditionLabel} • Raw copy` : "Raw copy"}
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

      {(adjacentCards.previous || adjacentCards.next) ? (
        <section className="space-y-4 rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">In This Set</h2>
            <p className="text-sm text-slate-600">Nearby cards from the same set, ordered around this print.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {adjacentCards.previous ? (
              (() => {
                const previousCardImageSrc = normalizeCardImageUrl(adjacentCards.previous?.image_url) ?? undefined;
                const previousCardImageFallback = buildTcgDexImageUrl(adjacentCards.previous?.tcgdex_external_id);
                return (
              <Link
                href={buildPathWithCompareCards(`/card/${adjacentCards.previous.gv_id}`, "", compareCards)}
                className="flex items-center gap-3 rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3 transition-all duration-150 hover:-translate-y-[2px] hover:border-slate-300 hover:bg-white hover:shadow-md"
              >
                <PublicCardImage
                  src={previousCardImageSrc}
                  fallbackSrc={previousCardImageFallback ?? undefined}
                  alt={adjacentCards.previous.name}
                  imageClassName="h-16 w-12 rounded-lg border border-slate-200 bg-white object-contain p-1"
                  fallbackClassName="flex h-16 w-12 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 px-1 text-center text-[10px] text-slate-500"
                />
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">← Previous</p>
                  <p className="truncate text-sm font-medium text-slate-900">{adjacentCards.previous.name}</p>
                  <p className="text-xs text-slate-600">#{adjacentCards.previous.number}</p>
                </div>
              </Link>
                );
              })()
            ) : (
              <div className="hidden sm:block" />
            )}

            {adjacentCards.next ? (
              (() => {
                const nextCardImageSrc = normalizeCardImageUrl(adjacentCards.next?.image_url) ?? undefined;
                const nextCardImageFallback = buildTcgDexImageUrl(adjacentCards.next?.tcgdex_external_id);
                return (
              <Link
                href={buildPathWithCompareCards(`/card/${adjacentCards.next.gv_id}`, "", compareCards)}
                className="flex items-center gap-3 rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3 transition-all duration-150 hover:-translate-y-[2px] hover:border-slate-300 hover:bg-white hover:shadow-md"
              >
                <PublicCardImage
                  src={nextCardImageSrc}
                  fallbackSrc={nextCardImageFallback ?? undefined}
                  alt={adjacentCards.next.name}
                  imageClassName="h-16 w-12 rounded-lg border border-slate-200 bg-white object-contain p-1"
                  fallbackClassName="flex h-16 w-12 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 px-1 text-center text-[10px] text-slate-500"
                />
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Next →</p>
                  <p className="truncate text-sm font-medium text-slate-900">{adjacentCards.next.name}</p>
                  <p className="text-xs text-slate-600">#{adjacentCards.next.number}</p>
                </div>
              </Link>
                );
              })()
            ) : (
              <div className="hidden sm:block" />
            )}
          </div>
        </section>
      ) : null}

      <PricingDisclosure />

      <CompareTray cards={compareCards} addHref={buildPathWithCompareCards("/explore", "", compareCards)} />
    </div>
  );
}
