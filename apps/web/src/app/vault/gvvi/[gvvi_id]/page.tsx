import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import CopyButton from "@/components/CopyButton";
import PublicCardImage from "@/components/PublicCardImage";
import PageIntro from "@/components/layout/PageIntro";
import PageSection from "@/components/layout/PageSection";
import SectionHeader from "@/components/layout/SectionHeader";
import VaultInstancePricingCard from "@/components/vault/VaultInstancePricingCard";
import VaultInstanceNotesMediaCard from "@/components/vault/VaultInstanceNotesMediaCard";
import VaultInstanceSettingsCard from "@/components/vault/VaultInstanceSettingsCard";
import {
  buildOwnedCardMessagesHref,
  getOwnedCardMessageSummaries,
} from "@/lib/network/getOwnedCardMessageSummaries";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { getVaultIntentLabel } from "@/lib/network/intent";
import { createServerComponentClient } from "@/lib/supabase/server";
import { getVaultInstanceByGvvi, type VaultInstanceOutcome } from "@/lib/vault/getVaultInstanceByGvvi";
import { getVaultInstancePresentationImageSources } from "@/lib/vaultInstanceImageDisplay";

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

export default async function VaultInstancePage({
  params,
}: {
  params: { gvvi_id: string };
}) {
  const supabase = createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/vault/gvvi/${params.gvvi_id}`)}`);
  }

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
  });
  let messageSummary:
    | {
        activeCount: number;
        unreadCount: number;
      }
    | null = null;
  try {
    const [summary] = await getOwnedCardMessageSummaries(user.id, [detail.cardPrintId]);
    messageSummary = summary ?? null;
  } catch (error) {
    console.error("[vault:gvvi] message summary lookup failed", {
      userId: user.id,
      cardPrintId: detail.cardPrintId,
      error,
    });
  }
  const messagesHref =
    messageSummary && messageSummary.activeCount > 0
      ? buildOwnedCardMessagesHref({
          cardPrintId: detail.cardPrintId,
          unreadCount: messageSummary.unreadCount,
        })
      : null;

  return (
    <div className="space-y-6 py-6 md:space-y-8 md:py-7">
      <PageSection surface="card" spacing="compact" className="px-4 py-4 sm:px-5 md:px-7 md:py-5">
        <PageIntro
          eyebrow="GVVI"
          title={detail.cardName}
          description="One exact owned copy."
          size="compact"
          actions={
            <>
              <Link
                href="/vault"
                className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Back to vault
              </Link>
              {detail.gvId ? (
                <Link
                  href={`/card/${detail.gvId}`}
                  className="inline-flex rounded-full bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  View card
                </Link>
              ) : null}
            </>
          }
        />
      </PageSection>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div className="space-y-6">
          <PageSection surface="card" spacing="compact" className="px-4 py-4 sm:px-5 md:px-6">
            <SectionHeader
              title="Identity"
              description="Canonical card identity plus exact owned-copy identity."
            />

            <div className="grid gap-5 md:grid-cols-[180px_minmax(0,1fr)]">
              <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-50 p-3">
                <PublicCardImage
                  src={heroImage.primaryImageUrl ?? undefined}
                  fallbackSrc={heroImage.fallbackImageUrl ?? undefined}
                  alt={detail.cardName}
                  imageClassName="aspect-[3/4] w-full object-contain"
                  fallbackClassName="flex aspect-[3/4] w-full items-center justify-center bg-slate-100 px-3 text-center text-xs text-slate-500"
                  fallbackLabel={detail.cardName}
                />
              </div>

              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Card</p>
                    <p className="mt-2 text-sm font-medium text-slate-950">{detail.cardName}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {[detail.setName || detail.setCode, detail.number !== "—" ? `#${detail.number}` : undefined]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Identity</p>
                    <div className="mt-2 space-y-1 text-sm text-slate-700">
                      <p>GV-ID {detail.gvId}</p>
                      <p>GVVI {detail.gvviId}</p>
                    </div>
                  </div>
                  <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Ownership</p>
                    <div className="mt-2 space-y-1 text-sm text-slate-700">
                      <p>{isActive ? "Active copy" : "Archived copy"}</p>
                      <p>Intent {getVaultIntentLabel(detail.intent)}</p>
                    </div>
                  </div>
                  <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Created</p>
                    <div className="mt-2 space-y-1 text-sm text-slate-700">
                      <p>{formatTimestamp(detail.createdAt)}</p>
                      {detail.archivedAt ? <p>Archived {formatTimestamp(detail.archivedAt)}</p> : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </PageSection>

          <PageSection surface="card" spacing="compact" className="px-4 py-4 sm:px-5 md:px-6">
            <SectionHeader
              title="Ownership"
              description="Condition, slab identity, and exact current state for this owned copy."
            />

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Condition</p>
                <p className="mt-2 text-sm font-medium text-slate-950">{detail.isGraded ? "SLAB" : detail.conditionLabel ?? "Unknown"}</p>
              </div>
              <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Format</p>
                <p className="mt-2 text-sm font-medium text-slate-950">{detail.isGraded ? "Graded slab" : "Raw copy"}</p>
              </div>
              <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Grader</p>
                <p className="mt-2 text-sm font-medium text-slate-950">{detail.grader ?? "—"}</p>
              </div>
              <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Grade / Cert</p>
                <p className="mt-2 text-sm font-medium text-slate-950">
                  {[detail.grade, detail.certNumber ? `Cert ${detail.certNumber}` : null].filter(Boolean).join(" • ") || "—"}
                </p>
              </div>
            </div>
          </PageSection>

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
                    className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    View messages
                  </Link>
                </div>
              </div>
            </PageSection>
          ) : null}

          <VaultInstanceSettingsCard
            instanceId={detail.instanceId}
            initialIntent={detail.intent}
            initialConditionLabel={detail.conditionLabel}
            initialImageDisplayMode={detail.imageDisplayMode}
            isActive={isActive}
            isGraded={detail.isGraded}
          />

          <PageSection surface="card" spacing="compact" className="px-4 py-4 sm:px-5">
            <SectionHeader
              title="Share"
              description={
                publicSharePath
                  ? "Copy the public exact-copy route for this discoverable owned card."
                  : "Only discoverable copies have a public exact-copy route."
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
                    className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    Open public page
                  </Link>
                ) : null}
              </div>
            </div>
          </PageSection>
        </div>
      </div>
    </div>
  );
}
