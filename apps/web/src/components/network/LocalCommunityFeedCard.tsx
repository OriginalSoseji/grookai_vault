import Link from "next/link";
import PublicCardImage from "@/components/PublicCardImage";
import type { LocalCommunityFeedRow } from "@/lib/network/getLocalCommunityFeedRows";
import { getVaultIntentLabel, normalizeDiscoverableVaultIntent } from "@/lib/network/intent";

type LocalCommunityFeedCardProps = {
  row: LocalCommunityFeedRow;
};

function getSourceLabel(row: LocalCommunityFeedRow) {
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

export default function LocalCommunityFeedCard({ row }: LocalCommunityFeedCardProps) {
  const ownerHref = `/u/${row.ownerSlug}`;
  const sourceLabel = getSourceLabel(row);

  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="flex flex-col gap-5 p-5 sm:flex-row">
        <Link href={row.routeTarget} className="flex w-full justify-center sm:w-[136px] sm:shrink-0">
          <PublicCardImage
            src={row.imageUrl ?? undefined}
            alt={row.cardName}
            imageClassName="aspect-[3/4] w-[136px] rounded-[1rem] border border-slate-200 bg-slate-50 object-contain p-2"
            fallbackClassName="flex aspect-[3/4] w-[136px] items-center justify-center rounded-[1rem] border border-slate-200 bg-slate-100 px-3 text-center text-xs text-slate-500"
            fallbackLabel={row.cardName}
          />
        </Link>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              {row.localityLabel}
            </span>
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              {sourceLabel}
            </span>
            {row.relationshipContext === "following" ? (
              <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                Following
              </span>
            ) : null}
          </div>

          <div className="space-y-2">
            <Link href={row.routeTarget} className="block">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 transition hover:text-slate-700">
                {row.cardName}
              </h2>
            </Link>
            <p className="text-sm text-slate-600">
              {[row.setName || row.setCode, row.cardNumber !== "—" ? `#${row.cardNumber}` : undefined]
                .filter(Boolean)
                .join(" • ")}
            </p>
            <p className="text-sm text-slate-600">
              From{" "}
              <Link href={ownerHref} className="font-medium text-slate-900 underline-offset-4 hover:underline">
                {row.ownerDisplayName}
              </Link>
            </p>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p>{row.gvId}</p>
              <p>{getFreshnessLabel(row.createdAt)}</p>
            </div>
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
        </div>
      </div>
    </article>
  );
}
