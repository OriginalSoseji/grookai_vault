import Link from "next/link";
import { notFound } from "next/navigation";
import PageIntro from "@/components/layout/PageIntro";
import PageSection from "@/components/layout/PageSection";
import SectionHeader from "@/components/layout/SectionHeader";
import LocalCommunityFeedCard, { getLocalCommunityFeedSourceLabel } from "@/components/network/LocalCommunityFeedCard";
import NetworkSectionNav from "@/components/network/NetworkSectionNav";
import { PublicCollectionEmptyState } from "@/components/public/PublicCollectionEmptyState";
import { requireServerUser } from "@/lib/auth/requireServerUser";
import { getLocalCommunityFeedRows, type LocalCommunityFeedRow } from "@/lib/network/getLocalCommunityFeedRows";
import { isLocalCommunityFeedEnabled } from "@/lib/network/localCommunityFeatureFlag";

export const revalidate = 0;

type NearbyDisplayRow = {
  row: LocalCommunityFeedRow;
  sourceLabels: string[];
  activityCount: number;
};

function getDisplayRows(rows: LocalCommunityFeedRow[]): NearbyDisplayRow[] {
  const groups = new Map<string, NearbyDisplayRow>();

  for (const row of rows) {
    const key = [row.ownerSlug, row.gvId, row.routeTarget].join("|");
    const sourceLabel = getLocalCommunityFeedSourceLabel(row);
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        row,
        sourceLabels: [sourceLabel],
        activityCount: 1,
      });
      continue;
    }

    existing.activityCount += 1;
    if (!existing.sourceLabels.includes(sourceLabel)) {
      existing.sourceLabels.push(sourceLabel);
    }
  }

  return Array.from(groups.values());
}

export default async function NearbyNetworkPage() {
  const enabled = isLocalCommunityFeedEnabled();
  if (!enabled) {
    notFound();
  }

  await requireServerUser("/network/nearby");
  const feed = await getLocalCommunityFeedRows({ enabled, limit: 40 });
  const displayRows = feed.status === "ready" ? getDisplayRows(feed.rows) : [];

  return (
    <div className="space-y-8 py-8">
      <PageSection surface="card" spacing="compact" className="px-5 py-5 sm:px-6">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              Internal preview
            </span>
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Opt-in only
            </span>
          </div>
          <PageIntro
            eyebrow="Nearby Collectors"
            title="Fresh cards from your local collector area"
            description="Only public cards from opted-in collectors appear here. Exact location is never shown."
          />
        </div>
      </PageSection>

      <PageSection surface="subtle" spacing="compact" className="p-2.5">
        <NetworkSectionNav active="nearby" />
      </PageSection>

      {feed.status === "local_discovery_off" ? (
        <PageSection spacing="compact">
          <PublicCollectionEmptyState
            title="Local discovery is off"
            body="Turn on local discovery from your account settings before nearby collector cards can appear here."
          />
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/account"
              className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Open account settings
            </Link>
            <Link
              href="/network"
              className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Browse network
            </Link>
          </div>
        </PageSection>
      ) : null}

      {feed.status === "error" ? (
        <PageSection spacing="compact">
          <PublicCollectionEmptyState
            title="Nearby activity is unavailable"
            body="Nearby activity could not load. Your location and private vault data were not exposed."
          />
        </PageSection>
      ) : null}

      {feed.status === "ready" ? (
        <PageSection spacing="compact">
          <SectionHeader
            title="Nearby activity"
            description={
              feed.rows.length > 0
                ? "Only public cards from opted-in collectors appear here."
                : "No nearby public cards are available yet."
            }
          />

          {displayRows.length === 0 ? (
            <PublicCollectionEmptyState
              title="No nearby cards yet"
              body="Cards appear here when opted-in local collectors share Wall, Trade, Sell, or Showcase cards."
            />
          ) : (
            <div className="space-y-4">
              {displayRows.map(({ row, sourceLabels, activityCount }) => (
                <LocalCommunityFeedCard
                  key={`${row.ownerSlug}-${row.gvId}-${row.routeTarget}`}
                  row={row}
                  sourceLabels={sourceLabels}
                  activityCount={activityCount}
                />
              ))}
            </div>
          )}
        </PageSection>
      ) : null}
    </div>
  );
}
