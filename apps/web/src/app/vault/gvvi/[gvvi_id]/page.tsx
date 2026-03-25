import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import CopyButton from "@/components/CopyButton";
import PublicCardImage from "@/components/PublicCardImage";
import PageIntro from "@/components/layout/PageIntro";
import PageSection from "@/components/layout/PageSection";
import SectionHeader from "@/components/layout/SectionHeader";
import VaultInstanceSettingsCard from "@/components/vault/VaultInstanceSettingsCard";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { getVaultIntentLabel } from "@/lib/network/intent";
import { createServerComponentClient } from "@/lib/supabase/server";
import { getVaultInstanceByGvvi, type VaultInstanceOutcome } from "@/lib/vault/getVaultInstanceByGvvi";

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
  const sharePath = `/vault/gvvi/${encodeURIComponent(detail.gvviId)}`;
  const siteOrigin = getSiteOrigin();
  const shareUrl = siteOrigin ? `${siteOrigin}${sharePath}` : sharePath;

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
                  src={detail.imageUrl ?? undefined}
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
              description="Per-copy notes and photo hooks live here instead of inside the grouped vault card."
            />

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Notes</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {detail.notes ?? "No notes are stored on this copy yet."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                    {detail.hasFrontPhoto ? "Front photo ready" : "No front photo"}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                    {detail.hasBackPhoto ? "Back photo ready" : "No back photo"}
                  </span>
                </div>
              </div>

              <div className="overflow-hidden rounded-[1rem] border border-slate-200 bg-slate-50 p-3">
                {detail.photoUrl ? (
                  <PublicCardImage
                    src={detail.photoUrl}
                    alt={`${detail.cardName} owned copy`}
                    imageClassName="aspect-[3/4] w-full object-contain"
                    fallbackClassName="flex aspect-[3/4] w-full items-center justify-center bg-slate-100 px-3 text-center text-xs text-slate-500"
                    fallbackLabel={detail.cardName}
                  />
                ) : (
                  <div className="flex aspect-[3/4] w-full items-center justify-center rounded-[0.85rem] border border-dashed border-slate-300 bg-white px-4 text-center text-sm text-slate-500">
                    Photo upload remains tied to your existing vault capture flows.
                  </div>
                )}
              </div>
            </div>
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
          <VaultInstanceSettingsCard
            instanceId={detail.instanceId}
            initialIntent={detail.intent}
            initialConditionLabel={detail.conditionLabel}
            isActive={isActive}
            isGraded={detail.isGraded}
          />

          <PageSection surface="card" spacing="compact" className="px-4 py-4 sm:px-5">
            <SectionHeader
              title="Share"
              description="Copy the exact GVVI route for this owned card."
            />
            <div className="space-y-3 rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
              <p className="break-all text-sm text-slate-600">{shareUrl}</p>
              <div className="flex flex-wrap gap-2">
                <CopyButton text={shareUrl} />
                <CopyButton text={detail.gvviId} />
              </div>
            </div>
          </PageSection>
        </div>
      </div>
    </div>
  );
}
