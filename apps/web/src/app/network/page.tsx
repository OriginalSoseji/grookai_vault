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

function buildCurrentPath(intent: string | null, page = 1) {
  const params = new URLSearchParams();
  if (intent) {
    params.set("intent", intent);
  }
  if (page > 1) {
    params.set("page", String(page));
  }

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
  const currentPath = buildCurrentPath(intent, currentPage);
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
    <NetworkPageLayout
      active="cards"
      actions={
        <Link
          href={user ? "/network/inbox" : "/login?next=%2Fnetwork"}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[color:var(--gv-border-soft)] px-4 py-2 text-sm font-medium text-[color:var(--gv-text-primary)] transition hover:bg-[color:var(--gv-surface-soft)]"
        >
          <MessageCircle size={17} aria-hidden="true" className="shrink-0" />
          {user ? "Open inbox" : "Sign in to interact"}
        </Link>
      }
    >
      <nav aria-label="Card intent" className="flex flex-wrap gap-1">
        <Link
          href="/network"
          aria-current={intent === null ? "page" : undefined}
          className={`inline-flex min-h-11 items-center rounded-md px-4 py-2 text-sm font-medium transition ${
            intent === null
              ? "bg-[color:var(--gv-surface-container)] text-[color:var(--gv-text-primary)]"
              : "text-[color:var(--gv-text-secondary)] hover:bg-[color:var(--gv-surface-soft)] hover:text-[color:var(--gv-text-primary)]"
          }`}
        >
          All
        </Link>
        {DISCOVERABLE_VAULT_INTENT_VALUES.map((value) => (
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

      <section aria-labelledby="pulse-cards-heading" className="min-w-0 space-y-5">
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
        {currentPage > 1 || hasNextPage ? (
          <nav className="flex items-center justify-between gap-3 border-t border-[color:var(--gv-border-soft)] pt-5 text-sm" aria-label="Collector activity pages">
            <Link
              href={buildCurrentPath(intent, Math.max(1, currentPage - 1))}
              aria-disabled={currentPage <= 1}
              className={`gv-secondary-button min-h-0 px-4 py-2 ${currentPage <= 1 ? "pointer-events-none opacity-40" : ""}`}
            >
              Newer
            </Link>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--gv-text-secondary)]">Page {currentPage}</span>
            <Link
              href={buildCurrentPath(intent, currentPage + 1)}
              aria-disabled={!hasNextPage}
              className={`gv-secondary-button min-h-0 px-4 py-2 ${!hasNextPage ? "pointer-events-none opacity-40" : ""}`}
            >
              Older
            </Link>
          </nav>
        ) : null}
      </section>
    </NetworkPageLayout>
  );
}
