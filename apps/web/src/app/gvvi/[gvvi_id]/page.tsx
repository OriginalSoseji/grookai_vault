import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CopyButton from "@/components/CopyButton";
import VendorCardPageViewEvent from "@/components/gvvi/VendorCardPageViewEvent";
import VendorOfferSummary from "@/components/gvvi/VendorOfferSummary";
import PublicCardImage from "@/components/PublicCardImage";
import ContactOwnerButton from "@/components/network/ContactOwnerButton";
import PageSection from "@/components/layout/PageSection";
import SectionHeader from "@/components/layout/SectionHeader";
import VaultExactCopyHero from "@/components/vault/VaultExactCopyHero";
import VaultInstanceVisiblePricingCard from "@/components/vault/VaultInstanceVisiblePricingCard";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { getVaultIntentActionLabel, getVaultIntentLabel } from "@/lib/network/intent";
import { getPublicVaultInstanceByGvvi } from "@/lib/vault/getPublicVaultInstanceByGvvi";
import { getVaultInstancePresentationImageSources } from "@/lib/vaultInstanceImageDisplay";
import {
  createServerComponentClient,
  hasSupabaseServerAuthCookie,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function asAbsoluteUrl(origin: string, value: string | null | undefined) {
  const normalized = value?.trim();
  if (!normalized) return undefined;

  try {
    return new URL(normalized).toString();
  } catch {
    return normalized.startsWith("/") ? `${origin}${normalized}` : undefined;
  }
}

export async function generateMetadata(
  props: {
    params: Promise<{ gvvi_id: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  const detail = await getPublicVaultInstanceByGvvi(params.gvvi_id);
  if (!detail) {
    notFound();
  }

  const siteOrigin = getSiteOrigin();
  const canonicalUrl = `${siteOrigin}/gvvi/${encodeURIComponent(detail.gvviId)}`;
  const imageUrl = asAbsoluteUrl(siteOrigin, detail.imageUrl);
  const title = detail.isVendorOffer
    ? `${detail.cardName} • ${detail.ownerDisplayName} vendor price | Grookai Vault`
    : `${detail.cardName} • ${detail.ownerDisplayName}'s copy | Grookai Vault`;
  const description = detail.isVendorOffer
    ? `View ${detail.ownerDisplayName}'s current vendor price and condition for ${detail.cardName}.`
    : `View ${detail.ownerDisplayName}'s ${detail.cardName} exact copy on Grookai Vault.`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonicalUrl,
      images: imageUrl ? [{ url: imageUrl, alt: detail.cardName }] : undefined,
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

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

export default async function PublicVaultInstancePage(
  props: {
    params: Promise<{ gvvi_id: string }>;
  }
) {
  const params = await props.params;
  const supabase = await createServerComponentClient();
  const {
    data: { user },
  } = await hasSupabaseServerAuthCookie()
    ? await supabase.auth.getUser()
    : { data: { user: null } };
  const detail = await getPublicVaultInstanceByGvvi(params.gvvi_id, {
    includeMarketPricing: Boolean(user),
  });
  if (!detail) {
    notFound();
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
    providerImageUrl: detail.providerImageUrl,
  });

  return (
    <div className="space-y-6 py-6 md:space-y-8 md:py-7">
      {detail.isVendorOffer ? (
        <VendorCardPageViewEvent
          gvviId={detail.gvviId}
          gvId={detail.gvId}
          vendorSlug={detail.ownerSlug}
        />
      ) : null}
      <VaultExactCopyHero
        eyebrow={detail.isVendorOffer ? "Vendor card" : "Collector exact copy"}
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
        statusLabel={detail.isVendorOffer ? "Available" : "Shared"}
        intentLabel={getVaultIntentLabel(detail.intent)}
        contextLabel={
          <>
            {detail.isVendorOffer ? "Offered by" : "Shared by"}{" "}
            <Link href={`/u/${detail.ownerSlug}`} className="font-semibold text-slate-900 underline-offset-4 hover:underline dark:text-white">
              {detail.ownerDisplayName}
            </Link>
          </>
        }
        featuredContent={
          detail.isVendorOffer && detail.askingPriceAmount !== null ? (
            <VendorOfferSummary
              askingPriceAmount={detail.askingPriceAmount}
              askingPriceCurrency={detail.askingPriceCurrency}
              askingPriceNote={detail.askingPriceNote}
              conditionLabel={detail.conditionLabel}
              vendorDisplayName={detail.ownerDisplayName}
              vendorSlug={detail.ownerSlug}
              vendorAvatarUrl={detail.ownerAvatarUrl}
            />
          ) : null
        }
        actions={
          <>
            <Link href={`/u/${detail.ownerSlug}`} className="gv-secondary-button">
              {detail.isVendorOffer ? "View vendor Wall" : "View collector"}
            </Link>
            {detail.gvId ? <Link href={`/card/${detail.gvId}`} className="gv-primary-button">View card</Link> : null}
          </>
        }
        evidence={<p>Shared {formatTimestamp(detail.createdAt)}</p>}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div className="space-y-6">
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
                      imageClassName="aspect-[5/7] w-full object-contain"
                      fallbackClassName="flex aspect-[5/7] w-full items-center justify-center bg-slate-100 px-3 text-center text-xs text-slate-500"
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
                      imageClassName="aspect-[5/7] w-full object-contain"
                      fallbackClassName="flex aspect-[5/7] w-full items-center justify-center bg-slate-100 px-3 text-center text-xs text-slate-500"
                      fallbackLabel={detail.cardName}
                    />
                  </div>
                ) : null}
              </div>
            </PageSection>
          ) : null}
        </div>

        <div className="space-y-6">
          {!detail.isVendorOffer ? (
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
              marketReferenceObservedAt={detail.marketReferenceObservedAt}
              marketReferencePublishedAt={detail.marketReferencePublishedAt}
              marketReferenceProvenanceId={detail.marketReferenceProvenanceId}
              cardPrintId={detail.cardPrintId}
              cardPrintingId={detail.cardPrintingId}
              printingGvId={detail.marketReferencePrintingGvId}
              isGraded={detail.isGraded}
            />
            </PageSection>
          ) : null}

          {contactIntent ? (
            <PageSection surface="card" spacing="compact" className="px-4 py-4 sm:px-5">
            <SectionHeader
              title={detail.isVendorOffer ? "Contact vendor" : "Contact"}
              description={detail.isVendorOffer ? "Message this vendor about this exact card." : "Message this collector about this card."}
            />
              <div className="space-y-3 rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
                <p className="text-sm text-slate-600">
                  This card is marked <span className="font-medium text-slate-900">{getVaultIntentLabel(detail.intent)}</span>.
                </p>
                <ContactOwnerButton
                  vaultItemInstanceId={detail.instanceId}
                  vaultItemId={detail.vaultItemId}
                  cardPrintId={detail.cardPrintId}
                  ownerUserId={detail.ownerUserId}
                  viewerUserId={null}
                  ownerDisplayName={detail.ownerDisplayName}
                  cardName={detail.cardName}
                  intent={contactIntent}
                  buttonLabel={getVaultIntentActionLabel(contactIntent)}
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
              description="Copy the public link for this card."
            />
            <div className="space-y-3 rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
              <p className="break-all text-sm text-slate-600">{shareUrl}</p>
              <div className="flex flex-wrap gap-2">
                <CopyButton
                  text={shareUrl}
                  label="Copy public link"
                  copiedLabel="Link copied!"
                />
                <CopyButton
                  text={detail.gvviId}
                  label="Copy GVVI ID"
                  copiedLabel="GVVI ID copied!"
                />
              </div>
            </div>
          </PageSection>
        </div>
      </div>
    </div>
  );
}
