import Link from "next/link";
import { notFound } from "next/navigation";
import CopyButton from "@/components/CopyButton";
import VendorQrManagementCard from "@/components/gvvi/VendorQrManagementCard";
import PageSection from "@/components/layout/PageSection";
import SectionHeader from "@/components/layout/SectionHeader";
import VaultExactCopyHero from "@/components/vault/VaultExactCopyHero";
import { requireServerUser } from "@/lib/auth/requireServerUser";
import { resolveServerUserEntitlement } from "@/lib/entitlements/resolveServerUserEntitlement";
import { getVendorQrDestinationUrl, renderVendorQrSvg, svgToDataUrl } from "@/lib/gvvi/vendorQr";
import VaultInstancePricingCard from "@/components/vault/VaultInstancePricingCard";
import VaultInstanceNotesMediaCard from "@/components/vault/VaultInstanceNotesMediaCard";
import VaultInstanceSectionMembershipCard from "@/components/vault/VaultInstanceSectionMembershipCard";
import VaultInstanceSettingsCard from "@/components/vault/VaultInstanceSettingsCard";
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
  }
) {
  const params = await props.params;
  const { user } = await requireServerUser(`/vault/gvvi/${params.gvvi_id}`);

  const detail = await getVaultInstanceByGvvi(user.id, params.gvvi_id);
  if (!detail) {
    notFound();
  }

  const isActive = detail.archivedAt === null;
  const publicSharePath =
    isActive && detail.intent !== "hold" ? `/gvvi/${encodeURIComponent(detail.gvviId)}` : null;
  const managementPath = `/vault/gvvi/${encodeURIComponent(detail.gvviId)}`;
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
            <Link href="/vault" prefetch={false} className="gv-secondary-button">
              Back to Vault
            </Link>
            {detail.gvId ? (
              <Link href={`/card/${detail.gvId}`} prefetch={false} className="gv-primary-button">
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div className="space-y-6">
          <PageSection surface="card" spacing="compact" className="px-4 py-4 sm:px-5 md:px-6">
            <SectionHeader
              title="Notes / Media"
              description="Per-copy notes and exact-copy media live here instead of inside the grouped vault card."
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
          </PageSection>

          <PageSection surface="card" spacing="compact" className="px-4 py-4 sm:px-5 md:px-6">
            <SectionHeader
              title="Execution / History"
              description="Exact transfer history and execution outcomes for this owned copy."
            />

            {detail.outcomes.length > 0 ? (
              <div className="space-y-3">
                {detail.outcomes.map((outcome) => (
                  <div key={outcome.id} className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-950">{formatOutcomeTitle(outcome)}</p>
                        <p className="text-xs text-slate-500">{formatTimestamp(outcome.createdAt)}</p>
                      </div>
                      {outcome.priceAmount !== null && outcome.priceCurrency ? (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                          {formatOutcomePrice(outcome.priceAmount, outcome.priceCurrency)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
                No execution outcome has been recorded for this copy yet.
              </div>
            )}
          </PageSection>
        </div>

        <div className="space-y-6">
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

          {messageSummary && messagesHref ? (
            <PageSection surface="card" spacing="compact" className="px-4 py-4 sm:px-5">
              <SectionHeader
                title="Messages"
                description="Demand for this card stays card-anchored, even when you are managing one exact copy."
              />
              <div className="space-y-3 rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
                <p
                  className={`text-sm font-medium ${
                    messageSummary.unreadCount > 0 ? "text-emerald-700" : "text-slate-700"
                  }`}
                >
                  {formatMessageSummary(messageSummary.activeCount, messageSummary.unreadCount)}
                </p>
                <div>
                  <Link
                    href={messagesHref}
                    prefetch={false}
                    className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    View messages
                  </Link>
                </div>
              </div>
            </PageSection>
          ) : null}

          {/* LOCK: GVVI is the only product surface for exact-copy Wall and Section curation. */}
          <VaultInstanceSettingsCard
            instanceId={detail.instanceId}
            initialIntent={detail.intent}
            initialConditionLabel={detail.conditionLabel}
            initialImageDisplayMode={detail.imageDisplayMode}
            isActive={isActive}
            isGraded={detail.isGraded}
          />

          <VaultInstanceSectionMembershipCard
            model={sectionMembershipModel}
            isActive={isActive}
          />

          <PageSection surface="card" spacing="compact" className="px-4 py-4 sm:px-5">
            <SectionHeader
              title="Share"
              description={
                publicSharePath
                  ? "Copy the public link for this card."
                  : "Mark this copy Trade, Sell, or Showcase to share a public link."
              }
            />
            <div className="space-y-3 rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
              <p className="break-all text-sm text-slate-600">{shareUrl}</p>
              <div className="flex flex-wrap gap-2">
                <CopyButton text={shareUrl} />
                <CopyButton text={detail.gvviId} />
                {publicSharePath ? (
                  <Link
                    href={publicSharePath}
                    prefetch={false}
                    className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    Open public page
                  </Link>
                ) : null}
              </div>
            </div>
          </PageSection>

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
