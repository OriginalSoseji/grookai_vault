import Link from "next/link";
import { MessageCircle } from "lucide-react";
import NetworkPageLayout from "@/components/network/NetworkPageLayout";
import NetworkStreamCard from "@/components/network/NetworkStreamCard";
import ContactEligibilityProvider, {
  type ContactEligibilityTarget,
} from "@/components/network/ContactEligibilityProvider";
import { PublicCollectionEmptyState } from "@/components/public/PublicCollectionEmptyState";
import { getOptionalServerUser } from "@/lib/auth/requireServerUser";
import { getCardStreamRows } from "@/lib/network/getCardStreamRows";
import { collectorPreview } from "@/lib/collectorPreview";
import {
  DISCOVERABLE_VAULT_INTENT_VALUES,
  getVaultIntentLabel,
  normalizeDiscoverableVaultIntent,
} from "@/lib/network/intent";

export const dynamic = "force-dynamic";
const NETWORK_STREAM_PAGE_SIZE = 8;

function parsePage(value?: string) {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

function buildNetworkHref(intent: string | null, page: number) {
  const params = new URLSearchParams();
  if (intent) params.set("intent", intent);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/network?${query}` : "/network";
}

export default async function NetworkPage(
  props: {
    searchParams?: Promise<{ intent?: string; page?: string }>;
  }
) {
  if (collectorPreview) return <NetworkPageLayout active="cards" actions={null}>
    <h2 className="text-lg font-medium">Latest cards</h2>
    <p>Collector accounts are not connected to this read-only preview.</p>
    <Link href="/network/discover" className="underline">Discover collectors</Link>
  </NetworkPageLayout>;
  const searchParams = await props.searchParams;
  const { user } = await getOptionalServerUser();
  const viewerUserId = user?.id ?? null;
  const intent = normalizeDiscoverableVaultIntent(searchParams?.intent);
  const currentPage = parsePage(searchParams?.page);
  const currentPath = buildNetworkHref(intent, currentPage);
  const pageRows = await getCardStreamRows({
    intent,
    excludeUserId: viewerUserId,
    limit: NETWORK_STREAM_PAGE_SIZE + 1,
    offset: (currentPage - 1) * NETWORK_STREAM_PAGE_SIZE,
  });
  const hasNextPage = pageRows.length > NETWORK_STREAM_PAGE_SIZE;
  const rows = pageRows.slice(0, NETWORK_STREAM_PAGE_SIZE);
  const contactEligibilityTargets: ContactEligibilityTarget[] = rows.flatMap((row) => {
    const copyTargets = row.inPlayCopies.map((copy) => ({
      vaultItemId: copy.vaultItemId,
      cardPrintId: row.cardPrintId,
    }));

    return copyTargets.length > 0
      ? copyTargets
      : [{ vaultItemId: row.vaultItemId, cardPrintId: row.cardPrintId }];
  });

  return (
    <div className="gv-network-page space-y-8 py-8">
      <PageSection spacing="compact" className="gv-network-intro border-b border-slate-200/70 pb-8 dark:border-slate-700/70">
        <PageIntro
          eyebrow="Community"
          title="Collector activity"
          description="See what collectors are adding, sharing, and making available."
          actions={
            <Link
              href={user ? "/network/inbox" : "/login?next=%2Fnetwork"}
              className="gv-primary-button px-4 py-2 text-sm"
            >
              {user ? "Open inbox" : "Sign in to interact"}
            </Link>
          }
        />
      </PageSection>

      <PageSection spacing="compact" className="gv-network-controls flex flex-col gap-3 border-b border-slate-200/70 pb-5 dark:border-slate-700/70 md:flex-row md:items-center md:justify-between">
        <NetworkSectionNav active="cards" />
        <div className="flex flex-wrap gap-2">
          <Link
            key={value}
            href={`/network?intent=${encodeURIComponent(value)}`}
            aria-current={intent === value ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-md px-4 py-2 text-sm font-medium transition ${
              intent === value
                ? "bg-[color:var(--gv-surface-container)] text-[color:var(--gv-text-primary)]"
                : "text-[color:var(--gv-text-secondary)] hover:bg-[color:var(--gv-surface-soft)] hover:text-[color:var(--gv-text-primary)]"
            }`}
          >
            {getVaultIntentLabel(value)}
          </Link>
        ))}
      </nav>

      <div className="gv-network-layout">
      <PageSection spacing="compact" className="min-w-0">
        {/* LOCK: Intent, discoverability, and contact language must stay calm and product-facing. */}
        <h2 id="pulse-cards-heading" className="text-lg font-medium text-[color:var(--gv-text-primary)]">
          {intent ? `${getVaultIntentLabel(intent)} cards` : "Latest cards"}
        </h2>

        {rows.length === 0 ? (
          <PublicCollectionEmptyState
            title="No cards available right now"
            body="Cards appear here when collectors mark them Trade, Sell, or Showcase."
          />
        ) : (
          <ContactEligibilityProvider targets={contactEligibilityTargets}>
            <div className="min-w-0 space-y-5 [overflow-wrap:anywhere]">
              {rows.map((row) => (
                <NetworkStreamCard
                  key={row.vaultItemId}
                  row={row}
                  isAuthenticated={Boolean(user)}
                  viewerUserId={viewerUserId}
                  currentPath={currentPath}
                />
              ))}
            </div>
          </ContactEligibilityProvider>
        )}
        {(currentPage > 1 || hasNextPage) ? (
          <nav className="flex items-center justify-between gap-3 border-t border-slate-200/70 pt-5 text-sm dark:border-slate-700/70" aria-label="Collector activity pages">
            <Link
              href={buildNetworkHref(intent, Math.max(1, currentPage - 1))}
              aria-disabled={currentPage <= 1}
              className={`gv-secondary-button min-h-0 px-4 py-2 ${currentPage <= 1 ? "pointer-events-none opacity-40" : ""}`}
            >
              Newer
            </Link>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Page {currentPage}</span>
            <Link
              href={buildNetworkHref(intent, currentPage + 1)}
              aria-disabled={!hasNextPage}
              className={`gv-secondary-button min-h-0 px-4 py-2 ${!hasNextPage ? "pointer-events-none opacity-40" : ""}`}
            >
              Older
            </Link>
          </nav>
        ) : null}
      </PageSection>
      <aside className="gv-network-sidebar" aria-label="Network shortcuts">
        <p className="gv-eyebrow">Your network</p>
        <h2 className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">
          Collect with people, not listings.
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Discover collectors, follow the cards they share, and keep conversations tied to an exact copy.
        </p>
        <div className="mt-6 grid gap-1 border-y border-slate-200/70 py-3 dark:border-slate-700/70">
          <Link href="/network/discover" className="gv-network-sidebar-link">Discover collectors <span aria-hidden="true">→</span></Link>
          <Link href={user ? "/network/inbox" : "/login?next=%2Fnetwork%2Finbox"} className="gv-network-sidebar-link">Messages <span aria-hidden="true">→</span></Link>
          <Link href="/wall" className="gv-network-sidebar-link">Your Wall <span aria-hidden="true">→</span></Link>
        </div>
        <p className="mt-5 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {rows.length} visible {rows.length === 1 ? "card" : "cards"} in this activity window.
        </p>
      </aside>
      </div>
    </div>
  );
}
