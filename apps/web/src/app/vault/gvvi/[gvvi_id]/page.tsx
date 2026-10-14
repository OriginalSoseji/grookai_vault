import Link from "next/link";
import { notFound } from "next/navigation";
import CopyButton from "@/components/CopyButton";
import VendorQrManagementCard from "@/components/gvvi/VendorQrManagementCard";
import SectionHeader from "@/components/layout/SectionHeader";
import MobilePushedRouteHeader from "@/components/layout/MobilePushedRouteHeader";
import VaultExactCopyHero from "@/components/vault/VaultExactCopyHero";
import { requireServerUser } from "@/lib/auth/requireServerUser";
import { resolveServerUserEntitlement } from "@/lib/entitlements/resolveServerUserEntitlement";
import { getVendorQrDestinationUrl, renderVendorQrSvg, svgToDataUrl } from "@/lib/gvvi/vendorQr";
import VaultInstancePricingCard from "@/components/vault/VaultInstancePricingCard";
import VaultInstanceNotesMediaCard from "@/components/vault/VaultInstanceNotesMediaCard";
import VaultInstanceSectionMembershipCard from "@/components/vault/VaultInstanceSectionMembershipCard";
import VaultInstanceSettingsCard from "@/components/vault/VaultInstanceSettingsCard";
import VaultDispositionCard from "@/components/vault/VaultDispositionCard";
import { readOwnerDisposition } from "@/lib/vault/vaultDisposition";
import {
  buildOwnedCardMessagesHref,
  getOwnedCardMessageSummaries,
} from "@/lib/network/getOwnedCardMessageSummaries";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { getVaultIntentLabel } from "@/lib/network/intent";
import { getVaultInstanceByGvvi, type VaultInstanceOutcome } from "@/lib/vault/getVaultInstanceByGvvi";
import { getPublicVaultInstanceByGvvi } from "@/lib/vault/getPublicVaultInstanceByGvvi";
import { getVaultInstancePresentationImageSources } from "@/lib/vaultInstanceImageDisplay";
import { getOwnerWallSectionMemberships } from "@/lib/wallSections/getOwnerWallSectionMemberships";
import {
  addCardReturnPath,
  addCollectionReturnPath,
  getCardReturnContext,
} from "@/lib/navigation/cardDetailNavigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Recently";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Recently";
  }

  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatOutcomeTitle(outcome: VaultInstanceOutcome) {
  if (outcome.role === "source") {
    return outcome.outcomeType === "sale" ? "Sold away" : "Traded away";
  }

  return outcome.outcomeType === "sale" ? "Received after sale" : "Received in trade";
}

function formatOutcomePrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatMessageSummary(activeCount: number, unreadCount: number) {
  if (unreadCount > 0) {
    return `${unreadCount} new ${unreadCount === 1 ? "message" : "messages"} about this card`;
  }

  return `${activeCount} ${activeCount === 1 ? "active message" : "active messages"} about this card`;
}

export default async function VaultInstancePage(
  props: {
    params: Promise<{ gvvi_id: string }>;
    searchParams?: Promise<{ from?: string }>;
  }
) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const returnContext = getCardReturnContext(searchParams?.from ?? "/vault");
  const requestedManagementPath = addCollectionReturnPath(
    `/vault/gvvi/${encodeURIComponent(params.gvvi_id)}`,
    returnContext.href,
  );
  const { user, supabase } = await requireServerUser(requestedManagementPath);

  const detail = await getVaultInstanceByGvvi(user.id, params.gvvi_id, { includeArchived: true });
  if (!detail) {
    notFound();
  }

  const isActive = detail.archivedAt === null;
  const disposition = await readOwnerDisposition(supabase, user.id, detail.instanceId)
    .then(receipt => ({ receipt, unavailable: false }))
    .catch(() => ({ receipt: null, unavailable: true }));
  const publicSharePath =
    isActive && detail.intent !== "hold" ? `/gvvi/${encodeURIComponent(detail.gvviId)}` : null;
  const managementPath = addCollectionReturnPath(
    `/vault/gvvi/${encodeURIComponent(detail.gvviId)}`,
    returnContext.href,
  );
  const sharePath = publicSharePath ?? managementPath;
  const siteOrigin = getSiteOrigin();
  const shareUrl = siteOrigin ? `${siteOrigin}${sharePath}` : sharePath;
  const heroImage = getVaultInstancePresentationImageSources({
    imageDisplayMode: detail.imageDisplayMode,
    uploadedImageUrl: detail.frontImageUrl,
    canonicalImageUrl: detail.imageUrl,
    providerImageUrl: detail.providerImageUrl,
  });
  const [sectionMembershipModel, messageSummary, entitlement, publicDetail] = await Promise.all([
    getOwnerWallSectionMemberships(user.id, detail.instanceId),
    getOwnedCardMessageSummaries(user.id, [detail.cardPrintId])
      .then(([summary]) => summary ?? null)
      .catch((error) => {
        console.error("[vault:gvvi] message summary lookup failed", {
          userId: user.id,
          cardPrintId: detail.cardPrintId,
          error,
        });
        return null;
      }),
    resolveServerUserEntitlement(user),
    publicSharePath
      ? getPublicVaultInstanceByGvvi(detail.gvviId)
      : Promise.resolve(null),
  ]);
  const canManageVendorQr = Boolean(
    entitlement.capabilities.canUseVendorTools &&
      publicDetail?.isVendorOffer &&
      publicDetail.ownerUserId === user.id,
  );
  const qrDestinationUrl = canManageVendorQr ? getVendorQrDestinationUrl(detail.gvviId) : null;
  const qrDataUrl = canManageVendorQr
    ? svgToDataUrl(await renderVendorQrSvg(detail.gvviId))
    : null;
  const messagesHref =
    messageSummary && messageSummary.activeCount > 0
      ? buildOwnedCardMessagesHref({
          cardPrintId: detail.cardPrintId,
          unreadCount: messageSummary.unreadCount,
        })
      : null;

  return (
    <div className="space-y-6 py-6 md:space-y-8 md:py-7">
      <MobilePushedRouteHeader
        backHref={returnContext.href}
        backLabel={returnContext.label}
        title="Exact copy"
      />
      <VaultExactCopyHero
        eyebrow="Your exact copy"
        cardName={detail.cardName}
        setName={detail.setName}
        setCode={detail.setCode}
        number={detail.number}
        gvId={detail.gvId}
        gvviId={detail.gvviId}
        primaryImageUrl={heroImage.primaryImageUrl}
        fallbackImageUrl={heroImage.fallbackImageUrl}
        fallbackImageUrls={heroImage.fallbackImageUrls.slice(1)}
        finishLabel={detail.finishLabel}
        conditionLabel={detail.conditionLabel}
        isGraded={detail.isGraded}
        grader={detail.grader}
        grade={detail.grade}
        certNumber={detail.certNumber}
        statusLabel={isActive ? "Active" : "Archived"}
        intentLabel={getVaultIntentLabel(detail.intent)}
        contextLabel={isActive ? "This copy is in your Vault." : "This copy remains available as preserved history."}
        actions={
          <>
            <Link
              href={returnContext.href}
              prefetch={false}
              className="gv-secondary-button gv-pushed-route-desktop-back"
            >
              Back to {returnContext.label}
            </Link>
            {detail.gvId ? (
              <Link
                href={addCardReturnPath(`/card/${detail.gvId}`, managementPath)}
                prefetch={false}
                className="gv-primary-button"
              >
                View card
              </Link>
            ) : null}
          </>
        }
        evidence={
          <>
            <p>Added {formatTimestamp(detail.createdAt)}</p>
            {detail.archivedAt ? <p>Archived {formatTimestamp(detail.archivedAt)}</p> : null}
          </>
        }
      />

      <section className="border-y border-slate-200/80 py-5" aria-labelledby="manage-copy-title">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Exact-copy workspace</p>
        <h2 id="manage-copy-title" className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
          Manage this copy
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Start with intent and condition. Pricing, notes, photos, and Wall sections are optional.
        </p>
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] xl:items-start">
        <div className="space-y-8">
          {/* LOCK: GVVI is the only product surface for exact-copy Wall and Section curation. */}
          <div id="copy-details" className="scroll-mt-24">
            <VaultInstanceSettingsCard
              instanceId={detail.instanceId}
              initialIntent={detail.intent}
              initialConditionLabel={detail.conditionLabel}
              initialImageDisplayMode={detail.imageDisplayMode}
              isActive={isActive}
              isGraded={detail.isGraded}
            />
          </div>

          <div id="copy-pricing" className="scroll-mt-24">
            <VaultInstancePricingCard
              instanceId={detail.instanceId}
              isActive={isActive}
              isGraded={detail.isGraded}
              initialPricingMode={detail.pricingMode}
              initialAskingPriceAmount={detail.askingPriceAmount}
              initialAskingPriceCurrency={detail.askingPriceCurrency}
              initialAskingPriceNote={detail.askingPriceNote}
              marketReferencePrice={detail.marketReferencePrice}
              marketReferenceSource={detail.marketReferenceSource}
              marketReferenceUpdatedAt={detail.marketReferenceUpdatedAt}
              marketReferenceObservedAt={detail.marketReferenceObservedAt}
              marketReferencePublishedAt={detail.marketReferencePublishedAt}
              marketReferenceProvenanceId={detail.marketReferenceProvenanceId}
              cardPrintId={detail.cardPrintId}
              cardPrintingId={detail.cardPrintingId}
              printingGvId={detail.marketReferencePrintingGvId}
            />
          </div>

          <section id="copy-notes-media" className="scroll-mt-24 space-y-5 border-t border-slate-200 pt-7">
            <SectionHeader
              title="Notes and photos"
              description="Private context and exact-copy photos stay attached to this copy."
            />

            <VaultInstanceNotesMediaCard
              userId={user.id}
              instanceId={detail.instanceId}
              initialNotes={detail.notes}
              initialFrontImageUrl={detail.frontImageUrl}
              initialBackImageUrl={detail.backImageUrl}
              initialFrontImagePath={detail.frontImagePath}
              initialBackImagePath={detail.backImagePath}
              isActive={isActive}
            />
          </section>
        </div>

        <div className="space-y-8">
          <div id="copy-sections" className="scroll-mt-24">
            <VaultInstanceSectionMembershipCard
              model={sectionMembershipModel}
              isActive={isActive}
            />
          </div>

          {messageSummary && messagesHref ? (
            <section className="space-y-4 border-t border-slate-200 pt-7">
              <SectionHeader
                title="Messages"
                description="Demand remains attached to the card while you manage this copy."
              />
              <p
                className={`text-sm font-medium ${
                  messageSummary.unreadCount > 0 ? "text-emerald-700" : "text-slate-700"
                }`}
              >
                {formatMessageSummary(messageSummary.activeCount, messageSummary.unreadCount)}
              </p>
              <Link
                href={messagesHref}
                prefetch={false}
                className="inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition active:scale-[0.98] hover:border-slate-400 hover:bg-slate-50"
              >
                View messages
              </Link>
            </section>
          ) : null}

          <section className="space-y-4 border-t border-slate-200 pt-7">
            <SectionHeader
              title={isActive ? "Share" : "Private history link"}
              description={
                publicSharePath
                  ? "Copy the public link for this exact copy."
                  : "Set the intent to Trade, Sell, or Showcase to create a public link."
              }
            />
            <p className="break-all text-sm leading-6 text-slate-600">{shareUrl}</p>
            <div className="flex flex-wrap gap-2">
              <CopyButton text={shareUrl} />
              <CopyButton text={detail.gvviId} />
              {publicSharePath ? (
                <Link
                  href={publicSharePath}
                  prefetch={false}
                  className="inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition active:scale-[0.98] hover:border-slate-400 hover:bg-slate-50"
                >
                  Open public page
                </Link>
              ) : null}
            </div>
          </section>

          <section id="copy-history" className="scroll-mt-24 space-y-4 border-t border-slate-200 pt-7">
            <SectionHeader
              title="History"
              description="Transfers and execution outcomes for this exact copy."
            />

            {detail.outcomes.length > 0 ? (
              <div className="divide-y divide-slate-200 border-y border-slate-200">
                {detail.outcomes.map((outcome) => (
                  <div key={outcome.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-950">{formatOutcomeTitle(outcome)}</p>
                      <p className="text-xs text-slate-500">{formatTimestamp(outcome.createdAt)}</p>
                    </div>
                    {outcome.priceAmount !== null && outcome.priceCurrency ? (
                      <span className="text-sm font-medium text-slate-700">
                        {formatOutcomePrice(outcome.priceAmount, outcome.priceCurrency)}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-slate-600">No transfer or sale has been recorded for this copy.</p>
            )}
          </section>

          {canManageVendorQr && qrDestinationUrl && qrDataUrl ? (
            <VendorQrManagementCard
              gvviId={detail.gvviId}
              qrDataUrl={qrDataUrl}
              destinationUrl={qrDestinationUrl}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
