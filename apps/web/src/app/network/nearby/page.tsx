import Link from "next/link";
import { notFound } from "next/navigation";
import PageIntro from "@/components/layout/PageIntro";
import PageSection from "@/components/layout/PageSection";
import SectionHeader from "@/components/layout/SectionHeader";
import LocalCommunityFeedCard from "@/components/network/LocalCommunityFeedCard";
import NetworkSectionNav from "@/components/network/NetworkSectionNav";
import { PublicCollectionEmptyState } from "@/components/public/PublicCollectionEmptyState";
import { requireServerUser } from "@/lib/auth/requireServerUser";
import { getLocalCommunityFeedRows } from "@/lib/network/getLocalCommunityFeedRows";
import { isLocalCommunityFeedEnabled } from "@/lib/network/localCommunityFeatureFlag";

export const revalidate = 0;

export default async function NearbyNetworkPage() {
  const enabled = isLocalCommunityFeedEnabled();
  if (!enabled) {
    notFound();
  }

  await requireServerUser("/network/nearby");
  const feed = await getLocalCommunityFeedRows({ enabled, limit: 40 });

  return (
    <div className="space-y-8 py-8">
      <PageSection surface="card" spacing="compact" className="px-5 py-5 sm:px-6">
        <PageIntro
          eyebrow="Nearby Collectors"
          title="Fresh cards from your local collector area"
          description="See public Wall, Trade, Sell, and Showcase cards from collectors who opted into local discovery."
        />
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
            title="Nearby feed is unavailable"
            body="The local feed could not load. Your location and private vault data were not exposed."
          />
        </PageSection>
      ) : null}

      {feed.status === "ready" ? (
        <PageSection spacing="compact">
          <SectionHeader
            title="Nearby activity"
            description={
              feed.rows.length > 0
                ? "Public collector cards from your coarse local area."
                : "No nearby public cards are available yet."
            }
          />

          {feed.rows.length === 0 ? (
            <PublicCollectionEmptyState
              title="No nearby cards yet"
              body="Cards appear here when opted-in local collectors share Wall, Trade, Sell, or Showcase cards."
            />
          ) : (
            <div className="space-y-4">
              {feed.rows.map((row) => (
                <LocalCommunityFeedCard key={row.feedItemId} row={row} />
              ))}
            </div>
          )}
        </PageSection>
      ) : null}
    </div>
  );
}
