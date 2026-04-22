import { Suspense } from "react";
import ExploreDiscoverySections from "@/components/explore/ExploreDiscoverySections";
import ExplorePageClient from "@/components/explore/ExplorePageClient";
import LoadingCardGridSkeleton from "@/components/layout/LoadingCardGridSkeleton";
import { getFeaturedExploreCards } from "@/lib/cards/getFeaturedExploreCards";
import { normalizeCompareCardsParam } from "@/lib/compareCards";
import { normalizeExploreViewMode } from "@/lib/exploreViewModes";
import { getDiscoveryProvisionalCards } from "@/lib/provisional/getDiscoveryProvisionalCards";
import { getRecentlyConfirmedCanonicalCards } from "@/lib/provisional/getRecentlyConfirmedCanonicalCards";
import { getPublicSets } from "@/lib/publicSets";
import type { PublicSetSummary } from "@/lib/publicSets.shared";
import { createServerComponentClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NOTABLE_SET_CODES = [
  "sv3pt5",
  "sv8pt5",
  "sv3",
  "sv02",
  "sv4",
  "sv08",
  "swsh12pt5",
  "sv06",
] as const;

function normalizeFreeTextQuery(value?: string | null) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeSetCode(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function parseReleaseYear(value?: string | null) {
  const normalized = (value ?? "").trim();
  return /^\d{4}$/.test(normalized) ? normalized : "";
}

function getNotableExploreSets(sets: PublicSetSummary[]) {
  const selected = new Set<string>();
  const byCode = new Map(sets.map((setInfo) => [setInfo.code, setInfo]));
  const notableSets: PublicSetSummary[] = [];

  for (const code of NOTABLE_SET_CODES) {
    const match = byCode.get(code);
    if (!match || selected.has(match.code)) {
      continue;
    }

    selected.add(match.code);
    notableSets.push(match);
  }

  for (const setInfo of sets) {
    if (notableSets.length >= 8) {
      break;
    }

    if (selected.has(setInfo.code)) {
      continue;
    }

    selected.add(setInfo.code);
    notableSets.push(setInfo);
  }

  return notableSets.slice(0, 8);
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams?: { q?: string; set?: string; year?: string; illustrator?: string; cards?: string; view?: string };
}) {
  const supabase = createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const compareCards = normalizeCompareCardsParam(searchParams?.cards);
  const isDiscoveryMode =
    !normalizeFreeTextQuery(searchParams?.q) &&
    !normalizeSetCode(searchParams?.set) &&
    !parseReleaseYear(searchParams?.year) &&
    !(searchParams?.illustrator ?? "").trim();

  let discoveryContent = null;

  if (isDiscoveryMode) {
    const [featuredCards, allSets, recentlyConfirmedCards, provisionalCards] = await Promise.all([
      getFeaturedExploreCards().catch(() => []),
      getPublicSets().catch(() => []),
      getRecentlyConfirmedCanonicalCards().catch(() => []),
      getDiscoveryProvisionalCards().catch(() => []),
    ]);

    discoveryContent = (
      <ExploreDiscoverySections
        compareCards={compareCards}
        featuredCards={featuredCards}
        notableSets={getNotableExploreSets(allSets)}
        recentlyConfirmedCards={recentlyConfirmedCards}
        provisionalCards={provisionalCards}
        currentView={searchParams?.view ? normalizeExploreViewMode(searchParams.view) : undefined}
      />
    );
  }

  return (
    <Suspense fallback={<LoadingCardGridSkeleton />}>
      <ExplorePageClient discoveryContent={discoveryContent} canViewPricing={Boolean(user)} />
    </Suspense>
  );
}
