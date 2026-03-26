import Link from "next/link";
import PageIntro from "@/components/layout/PageIntro";
import PageSection from "@/components/layout/PageSection";
import NetworkSectionNav from "@/components/network/NetworkSectionNav";
import SectionHeader from "@/components/layout/SectionHeader";
import CollectorListRow from "@/components/public/CollectorListRow";
import { PublicCollectionEmptyState } from "@/components/public/PublicCollectionEmptyState";
import { getCollectorFollowStateMap } from "@/lib/follows/getCollectorFollowStateMap";
import { getCollectorDiscoverRows } from "@/lib/network/getCollectorDiscoverRows";
import { createServerComponentClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeSearchQuery(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function formatJoinedAt(value: string | null) {
  if (!value) {
    return "Collector";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Collector";
  }

  return `Joined ${parsed.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  })}`;
}

export default async function NetworkDiscoverPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const client = createServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  const query = normalizeSearchQuery(searchParams?.q);
  const currentPath = query ? `/network/discover?q=${encodeURIComponent(query)}` : "/network/discover";
  const collectors = await getCollectorDiscoverRows({
    query,
    excludeUserId: user?.id ?? null,
    limit: 30,
  });
  const followStateMap = await getCollectorFollowStateMap(
    user?.id ?? null,
    collectors.map((collector) => collector.userId),
  );

  return (
    <div className="space-y-8 py-8">
      <PageSection surface="card" spacing="compact" className="px-5 py-5 sm:px-6">
        <PageIntro
          eyebrow="Collector Network"
          title="Discover collectors"
          description="Search by collector name or @username to quickly revisit the people behind the cards."
          actions={
            <Link
              href="/network"
              className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
            >
              View card stream
            </Link>
          }
        />
      </PageSection>

      <PageSection surface="subtle" spacing="compact" className="p-2.5">
        <NetworkSectionNav active="collectors" />
      </PageSection>

      <PageSection surface="card" spacing="compact" className="px-5 py-5 sm:px-6">
        <SectionHeader
          title="Collector search"
          description="Collector-only discovery lane. Separate from card and Pokemon search."
        />

        <form action="/network/discover" className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            name="q"
            defaultValue={query ?? ""}
            placeholder="Search collectors or @username"
            className="min-w-0 flex-1 rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
          />
          <button
            type="submit"
            className="inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Search
          </button>
        </form>
      </PageSection>

      <PageSection spacing="compact">
        <SectionHeader
          title={query ? `Collector results for “${query}”` : "Collectors to revisit"}
          description={query ? "Matching public collectors." : "Latest public collectors with shared vaults."}
        />

        {collectors.length === 0 ? (
          <PublicCollectionEmptyState
            title={query ? "No collectors found" : "No collectors available right now"}
            body={
              query
                ? "Try a display name or @username search."
                : "Collectors will appear here when they enable a public profile and shared vault."
            }
          />
        ) : (
          <div className="space-y-4">
            {collectors.map((collector) => (
              <CollectorListRow
                key={collector.userId}
                collector={collector}
                viewerUserId={user?.id ?? null}
                isAuthenticated={Boolean(user)}
                initialIsFollowing={followStateMap.has(collector.userId)}
                loginHref={`/login?next=${encodeURIComponent(currentPath)}`}
                metadata={formatJoinedAt(collector.createdAt)}
              />
            ))}
          </div>
        )}
      </PageSection>
    </div>
  );
}
