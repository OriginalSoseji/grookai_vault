import Link from "next/link";
import { ArrowLeft, Search, X } from "lucide-react";
import NetworkPageLayout from "@/components/network/NetworkPageLayout";
import CollectorListRow from "@/components/public/CollectorListRow";
import { PublicCollectionEmptyState } from "@/components/public/PublicCollectionEmptyState";
import { getOptionalServerUser } from "@/lib/auth/requireServerUser";
import { getCollectorDiscoverRows } from "@/lib/network/getCollectorDiscoverRows";
import { collectorPreview } from "@/lib/collectorPreview";

export const dynamic = "force-dynamic";

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

export default async function NetworkDiscoverPage(
  props: {
    searchParams?: Promise<{ q?: string }>;
  }
) {
  if (collectorPreview) return <NetworkPageLayout active="collectors" actions={null}>
    <h2 className="text-lg font-medium">Discover collectors</h2>
    <p>Collector accounts are not connected to this read-only preview.</p>
    <Link href="/explore" className="underline">Browse cards</Link>
  </NetworkPageLayout>;
  const searchParams = await props.searchParams;
  const { user } = await getOptionalServerUser();
  const viewerUserId = user?.id ?? null;
  const query = normalizeSearchQuery(searchParams?.q);
  const currentPath = query ? `/network/discover?q=${encodeURIComponent(query)}` : "/network/discover";
  const collectors = await getCollectorDiscoverRows({
    query,
    excludeUserId: viewerUserId,
    limit: 30,
  });

  return (
    <NetworkPageLayout
      active="collectors"
      actions={
        <Link
          href="/network"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[color:var(--gv-text-secondary)] transition hover:text-[color:var(--gv-text-primary)]"
        >
          <ArrowLeft size={17} aria-hidden="true" className="shrink-0" />
          Back to cards
        </Link>
      }
    >
      <section aria-labelledby="discover-heading" className="space-y-4">
        <h2 id="discover-heading" className="text-lg font-medium text-[color:var(--gv-text-primary)]">Discover collectors</h2>

        <form action="/network/discover" method="get" role="search" aria-label="Collector search" className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <label htmlFor="collector-query" className="sr-only">Collector name or username</label>
            <input
              id="collector-query"
              type="search"
              name="q"
              defaultValue={query ?? ""}
              placeholder="Search collectors or @username"
              className="min-h-11 w-full min-w-0 rounded-md border border-[color:var(--gv-border-soft)] bg-[color:var(--gv-surface-base)] px-3 py-2.5 text-sm text-[color:var(--gv-text-primary)] outline-none transition placeholder:text-[color:var(--gv-text-secondary)] focus-visible:ring-2 focus-visible:ring-[color:var(--gv-text-secondary)]"
            />
          </div>
          <button
            type="submit"
            aria-label="Search collectors"
            title="Search collectors"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[color:var(--gv-border-soft)] text-[color:var(--gv-text-primary)] transition hover:bg-[color:var(--gv-surface-container)]"
          >
            <Search size={18} aria-hidden="true" />
          </button>
          {query ? (
            <Link href="/network/discover" aria-label="Clear collector search" title="Clear collector search" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-[color:var(--gv-text-secondary)] transition hover:bg-[color:var(--gv-surface-container)]">
              <X size={18} aria-hidden="true" />
            </Link>
          ) : null}
        </form>
      </section>

      <section aria-labelledby="discover-results-heading" className="min-w-0 space-y-4">
        <h3 id="discover-results-heading" className="text-sm font-medium text-[color:var(--gv-text-secondary)] [overflow-wrap:anywhere]">
          {query ? `Collector results for "${query}"` : "Latest collectors"}
        </h3>

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
          <div className="space-y-3 [&>div]:rounded-lg">
            {collectors.map((collector) => (
              <CollectorListRow
                key={collector.userId}
                collector={collector}
                viewerUserId={viewerUserId}
                isAuthenticated={Boolean(user)}
                initialIsFollowing={false}
                loginHref={`/login?next=${encodeURIComponent(currentPath)}`}
                metadata={formatJoinedAt(collector.createdAt)}
              />
            ))}
          </div>
        )}
      </section>
    </NetworkPageLayout>
  );
}
