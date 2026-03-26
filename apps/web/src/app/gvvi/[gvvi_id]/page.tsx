import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import CopyButton from "@/components/CopyButton";
import PublicCardImage from "@/components/PublicCardImage";
import ContactOwnerButton from "@/components/network/ContactOwnerButton";
import PageIntro from "@/components/layout/PageIntro";
import PageSection from "@/components/layout/PageSection";
import SectionHeader from "@/components/layout/SectionHeader";
import VaultInstanceVisiblePricingCard from "@/components/vault/VaultInstanceVisiblePricingCard";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { getVaultIntentLabel } from "@/lib/network/intent";
import { createServerComponentClient } from "@/lib/supabase/server";
import { getPublicVaultInstanceByGvvi } from "@/lib/vault/getPublicVaultInstanceByGvvi";
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

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getContactLabel(intent: "trade" | "sell" | "showcase") {
  switch (intent) {
    case "trade":
      return "Ask to trade";
    case "sell":
      return "Ask to buy";
    case "showcase":
    default:
      return "Contact";
  }
}

export default async function PublicVaultInstancePage({
  params,
}: {
  params: { gvvi_id: string };
}) {
  const detail = await getPublicVaultInstanceByGvvi(params.gvvi_id);
  if (!detail) {
    notFound();
  }

  const supabase = createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id === detail.ownerUserId) {
    redirect(`/vault/gvvi/${encodeURIComponent(detail.gvviId)}`);
  }

  const currentPath = `/gvvi/${encodeURIComponent(detail.gvviId)}`;
  const loginHref = `/login?next=${encodeURIComponent(currentPath)}`;
  const siteOrigin = getSiteOrigin();
  const shareUrl = siteOrigin ? `${siteOrigin}${currentPath}` : currentPath;
  const contactIntent =
    detail.isDiscoverable &&
    (detail.intent === "trade" || detail.intent === "sell" || detail.intent === "showcase")
      ? detail.intent
      : null;
  const heroImage = getVaultInstancePresentationImageSources({
    imageDisplayMode: detail.imageDisplayMode,
    uploadedImageUrl: detail.frontImageUrl,
    canonicalImageUrl: detail.imageUrl,
  });

  return (
    <div className="space-y-6 py-6 md:space-y-8 md:py-7">
      <PageSection surface="card" spacing="compact" className="px-4 py-4 sm:px-5 md:px-7 md:py-5">
        <PageIntro
          eyebrow="Exact Copy"
          title={detail.cardName}
          description="One discoverable owned copy shared by its collector."
          size="compact"
          actions={
            <>
              <Link
                href={`/u/${detail.ownerSlug}`}
                className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
              >
                View collector
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
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Collector</p>
                  <div className="mt-2 space-y-1 text-sm text-slate-700">
                    <Link href={`/u/${detail.ownerSlug}`} className="font-medium text-slate-950 underline-offset-4 hover:underline">
                      {detail.ownerDisplayName}
                    </Link>
                    <p>Shared {formatTimestamp(detail.createdAt)}</p>
                  </div>
                </div>
                <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Intent</p>
                  <p className="mt-2 text-sm font-medium text-slate-950">{getVaultIntentLabel(detail.intent)}</p>
                </div>
              </div>
            </div>
          </PageSection>

          <PageSection surface="card" spacing="compact" className="px-4 py-4 sm:px-5 md:px-6">
            <SectionHeader
              title="Owned Copy"
              description="Condition and slab identity for this exact discoverable copy."
            />

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Condition</p>
                <p className="mt-2 text-sm font-medium text-slate-950">
                  {detail.isGraded ? "SLAB" : detail.conditionLabel ?? "Unknown"}
                </p>
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

          {(detail.frontImageUrl || detail.backImageUrl) ? (
            <PageSection surface="card" spacing="compact" className="px-4 py-4 sm:px-5 md:px-6">
              <SectionHeader
                title="Photos"
                description="Exact-copy images shared for this owned card."
              />

              <div className="grid gap-4 md:grid-cols-2">
                {detail.frontImageUrl ? (
                  <div className="overflow-hidden rounded-[1rem] border border-slate-200 bg-white p-3">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Front</p>
                    <PublicCardImage
                      src={detail.frontImageUrl}
                      alt={`${detail.cardName} front`}
                      imageClassName="aspect-[3/4] w-full object-contain"
                      fallbackClassName="flex aspect-[3/4] w-full items-center justify-center bg-slate-100 px-3 text-center text-xs text-slate-500"
                      fallbackLabel={detail.cardName}
                    />
                  </div>
                ) : null}
                {detail.backImageUrl ? (
                  <div className="overflow-hidden rounded-[1rem] border border-slate-200 bg-white p-3">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Back</p>
                    <PublicCardImage
                      src={detail.backImageUrl}
                      alt={`${detail.cardName} back`}
                      imageClassName="aspect-[3/4] w-full object-contain"
                      fallbackClassName="flex aspect-[3/4] w-full items-center justify-center bg-slate-100 px-3 text-center text-xs text-slate-500"
                      fallbackLabel={detail.cardName}
                    />
                  </div>
                ) : null}
              </div>
            </PageSection>
          ) : null}
        </div>

        <div className="space-y-6">
          <PageSection surface="card" spacing="compact" className="px-4 py-4 sm:px-5">
            <SectionHeader
              title="Pricing"
              description="This exact copy can show a market reference or an owner-set asking price."
            />
            <VaultInstanceVisiblePricingCard
              pricingMode={detail.pricingMode}
              askingPriceAmount={detail.askingPriceAmount}
              askingPriceCurrency={detail.askingPriceCurrency}
              askingPriceNote={detail.askingPriceNote}
              marketReferencePrice={detail.marketReferencePrice}
              marketReferenceSource={detail.marketReferenceSource}
              marketReferenceUpdatedAt={detail.marketReferenceUpdatedAt}
              isGraded={detail.isGraded}
            />
          </PageSection>

          {contactIntent ? (
            <PageSection surface="card" spacing="compact" className="px-4 py-4 sm:px-5">
              <SectionHeader
                title="Contact"
                description="Reach out about this exact discoverable copy."
              />
              <div className="space-y-3 rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
                <p className="text-sm text-slate-600">
                  This copy is currently marked <span className="font-medium text-slate-900">{getVaultIntentLabel(detail.intent)}</span>.
                </p>
                <ContactOwnerButton
                  vaultItemId={detail.vaultItemId}
                  cardPrintId={detail.cardPrintId}
                  ownerUserId={detail.ownerUserId}
                  viewerUserId={user?.id ?? null}
                  ownerDisplayName={detail.ownerDisplayName}
                  cardName={detail.cardName}
                  intent={contactIntent}
                  buttonLabel={getContactLabel(contactIntent)}
                  isAuthenticated={Boolean(user)}
                  loginHref={loginHref}
                  currentPath={currentPath}
                  buttonClassName="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                />
              </div>
            </PageSection>
          ) : null}

          <PageSection surface="card" spacing="compact" className="px-4 py-4 sm:px-5">
            <SectionHeader
              title="Share"
              description="Copy the public exact-copy route for this owned card."
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
