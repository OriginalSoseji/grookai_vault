import Link from "next/link";
import CardImageTruthBadge from "@/components/cards/CardImageTruthBadge";
import {
  CollectorCardFacts,
  CollectorEvidenceDisclosure,
} from "@/components/collector/CollectorCardPresentation";
import PublicCardImage from "@/components/PublicCardImage";
import { resolveCardImagePresentation } from "@/lib/cards/resolveCardImagePresentation";
import type { LocalCommunityFeedRow } from "@/lib/network/getLocalCommunityFeedRows";
import { getVaultIntentLabel, normalizeDiscoverableVaultIntent } from "@/lib/network/intent";

type LocalCommunityFeedCardProps = {
  row: LocalCommunityFeedRow;
  sourceLabels?: string[];
  activityCount?: number;
};

export function getLocalCommunityFeedSourceLabel(row: LocalCommunityFeedRow) {
  if (row.sourceType === "wall_card") {
    return "Wall";
  }

  const intent = normalizeDiscoverableVaultIntent(row.intent);
  return intent ? getVaultIntentLabel(intent) : "Network";
}

function getFreshnessLabel(createdAt: string | null) {
  if (!createdAt) {
    return "Recently";
  }

  return new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getCollectorInitials(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((token) => token.charAt(0).toUpperCase())
    .join("") || "GV";
}

export default function LocalCommunityFeedCard({
  row,
  sourceLabels,
  activityCount = 1,
}: LocalCommunityFeedCardProps) {
  const ownerHref = `/u/${row.ownerSlug}`;
  const labels = sourceLabels && sourceLabels.length > 0 ? sourceLabels : [getLocalCommunityFeedSourceLabel(row)];
  const primarySourceLabel = labels[0] ?? "Network";
  const secondarySourceLabels = labels.slice(1);
  const hasMultipleSources = activityCount > 1 || secondarySourceLabels.length > 0;
  const imagePresentation = resolveCardImagePresentation({
    display_image_kind: row.displayImageKind,
  });

  return (
    <article className="border-b border-slate-200/80 py-5 first:pt-0 last:border-b-0 dark:border-white/[0.08]" data-pulse-event-card>
      <header className="mb-4 flex min-w-0 items-center gap-3">
        <Link
          href={ownerHref}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-slate-200 bg-slate-950 text-xs font-semibold text-white dark:border-white/[0.12]"
          aria-label={`View ${row.ownerDisplayName}'s profile`}
        >
          {getCollectorInitials(row.ownerDisplayName)}
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            <Link href={ownerHref} className="font-semibold text-slate-950 underline-offset-4 hover:underline dark:text-white">
              {row.ownerDisplayName}
            </Link>{" "}
            shared a card in {row.localityLabel}
          </p>
          <p className="text-xs text-slate-500">{getFreshnessLabel(row.createdAt)}</p>
        </div>
      </header>

      <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-4 sm:grid-cols-[128px_minmax(0,1fr)] sm:gap-5">
        <Link href={row.routeTarget} className="relative self-start">
          <PublicCardImage
            src={row.imageUrl ?? undefined}
            fallbackSrc={row.imageFallbackUrls[0]}
            fallbackSources={row.imageFallbackUrls.slice(1)}
            alt={row.cardName}
            imageClassName="aspect-[5/7] w-full rounded-[18px] bg-slate-50 object-contain"
            fallbackClassName="flex aspect-[5/7] w-full flex-col items-center justify-center gap-2 rounded-[18px] bg-slate-100 px-3 text-center text-xs text-slate-500"
            fallbackLabel={
              <>
                <span className="text-sm font-semibold text-slate-700">{row.cardName}</span>
                <span>Image not available yet</span>
              </>
            }
          />
        </Link>

        <div className="min-w-0 space-y-4">
          <CollectorCardFacts
            title={<Link href={row.routeTarget} className="transition hover:text-slate-700">{row.cardName}</Link>}
            setName={row.setName || row.setCode}
            number={row.cardNumber}
            ownershipLabel={row.localityLabel}
            availabilityLabels={[primarySourceLabel, ...secondarySourceLabels]}
          />
          <div className="flex flex-wrap items-center gap-2">
            {row.relationshipContext === "following" ? (
              <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                Following
              </span>
            ) : null}
            {row.viewerWishlistMatch ? (
              <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                Wishlist match
              </span>
            ) : null}
          </div>

          {imagePresentation.compactBadgeLabel ? (
            <div className="w-fit">
              <CardImageTruthBadge label={imagePresentation.compactBadgeLabel} note={imagePresentation.detailNote} />
            </div>
          ) : null}

          <div className="space-y-2 text-sm">
            {hasMultipleSources ? (
              <p className="text-sm text-slate-500">
                Appears in {labels.join(", ")} for this collector.
              </p>
            ) : null}
            {row.matchReason === "viewer_wishlist" ? (
              <p className="text-sm font-medium text-amber-700">
                This card matches your wishlist.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Link
                href={row.routeTarget}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
              >
                View card
              </Link>
              <Link
                href={ownerHref}
                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                View wall
              </Link>
            </div>
          </div>
          <CollectorEvidenceDisclosure label="Event evidence">
            <p>Card ID: {row.gvId}</p>
            <p>Source: {labels.join(", ")}</p>
            <p>Relationship: {row.relationshipContext === "following" ? "Following" : "Community"}</p>
          </CollectorEvidenceDisclosure>
        </div>
      </div>
    </article>
  );
}
