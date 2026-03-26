import Link from "next/link";
import PageIntro from "@/components/layout/PageIntro";
import PageSection from "@/components/layout/PageSection";
import NetworkSectionNav from "@/components/network/NetworkSectionNav";
import SectionHeader from "@/components/layout/SectionHeader";
import NetworkStreamCard from "@/components/network/NetworkStreamCard";
import { PublicCollectionEmptyState } from "@/components/public/PublicCollectionEmptyState";
import { getCardStreamRows } from "@/lib/network/getCardStreamRows";
import {
  DISCOVERABLE_VAULT_INTENT_VALUES,
  getVaultIntentLabel,
  normalizeDiscoverableVaultIntent,
} from "@/lib/network/intent";
import { createServerComponentClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function buildCurrentPath(intent: string | null) {
  const params = new URLSearchParams();
  if (intent) {
    params.set("intent", intent);
  }

  const query = params.toString();
  return query ? `/network?${query}` : "/network";
}

export default async function NetworkPage({
  searchParams,
}: {
  searchParams?: { intent?: string };
}) {
  const client = createServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  const intent = normalizeDiscoverableVaultIntent(searchParams?.intent);
  const currentPath = buildCurrentPath(intent);
  const rows = await getCardStreamRows({
    intent,
    excludeUserId: user?.id ?? null,
    limit: 60,
  });

  return (
    <div className="space-y-8 py-8">
      <PageSection surface="card" spacing="compact" className="px-5 py-5 sm:px-6">
        <PageIntro
          eyebrow="Collector Network"
          title="Cards open for interaction"
          description="Trade, sell, and showcase cards from collectors who have chosen to be discoverable."
          actions={
            user ? (
              <Link
                href="/network/inbox"
                className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
              >
                View interactions
              </Link>
            ) : (
              <Link
                href="/login?next=%2Fnetwork"
                className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Sign in to interact
              </Link>
            )
          }
        />
      </PageSection>

      <PageSection surface="subtle" spacing="compact" className="p-2.5">
        <NetworkSectionNav active="cards" />
      </PageSection>

      <PageSection surface="subtle" spacing="compact" className="p-2.5">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/network"
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              intent === null
                ? "border border-slate-300 bg-white text-slate-950 shadow-sm"
                : "border border-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-950"
            }`}
          >
            All intents
          </Link>
          {DISCOVERABLE_VAULT_INTENT_VALUES.map((value) => (
            <Link
              key={value}
              href={`/network?intent=${encodeURIComponent(value)}`}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                intent === value
                  ? "border border-slate-300 bg-white text-slate-950 shadow-sm"
                  : "border border-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-950"
              }`}
            >
              {getVaultIntentLabel(value)}
            </Link>
          ))}
        </div>
      </PageSection>

      <PageSection spacing="compact">
        <SectionHeader
          title={intent ? `${getVaultIntentLabel(intent)} cards` : "Latest cards"}
          description="Chronological stream only. No ranking layer."
        />

        {rows.length === 0 ? (
          <PublicCollectionEmptyState
            title="No cards available right now"
            body="Collectors will appear here when they mark cards for trade, sale, or showcase."
          />
        ) : (
          <div className="space-y-4">
            {rows.map((row) => (
              <NetworkStreamCard
                key={row.vaultItemId}
                row={row}
                isAuthenticated={Boolean(user)}
                viewerUserId={user?.id ?? null}
                currentPath={currentPath}
              />
            ))}
          </div>
        )}
      </PageSection>
    </div>
  );
}
