import { Suspense } from "react";
import type { Metadata } from "next";
import CollectorCatalogView from "@/components/explore/CollectorCatalogView";
import ExplorePageClient from "@/components/explore/ExplorePageClient";
import LoadingCardGridSkeleton from "@/components/layout/LoadingCardGridSkeleton";
import { getPublicCardsByGvIds } from "@/lib/cards/getPublicCardsByGvIds";
import { MAX_COMPARE_CARDS } from "@/lib/compareCards";
import { normalizePublicGameScope } from "@/lib/publicGameScope";
import { matchesPublicLanguageScope, normalizePublicLanguageScope } from "@/lib/publicLanguageScope";
import { getPublicSets } from "@/lib/publicSets";
import { createServerComponentClient, hasSupabaseServerAuthCookie } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: "Search | Grookai Vault",
  alternates: { canonical: "/explore" },
  openGraph: { url: "/explore" },
};

// The approved feature is a specific real collection, not a rotating promotion.
const FEATURED_151_IDS = [199, 200, 198, 173, 166, 168, 170, 183, 6, 205]
  .map(number => `GV-PK-MEW-${String(number).padStart(3, "0")}`);
const CONSTRAINT_FIELDS = ["q", "set", "year", "illustrator", "year_min", "year_max", "finish", "stamp", "owned", "image_state"];

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

function buildExploreReturnPath(searchParams?: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value) query.set(key, value);
  }
  const suffix = query.toString();
  return suffix ? `/explore?${suffix}` : "/explore";
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

export default async function ExplorePage(
  props: {
    searchParams?: Promise<{ q?: string; set?: string; year?: string; illustrator?: string; cards?: string; view?: string; lang?: string; game?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const supabase = await createServerComponentClient();
  const { data: { user } } = await hasSupabaseServerAuthCookie() ? await supabase.auth.getUser() : { data: { user: null } };
  const canViewPricing = Boolean(user);
  const compareCards = normalizeCompareCardsParam(searchParams?.cards);
  const languageScope = normalizePublicLanguageScope(searchParams?.lang);
  const gameScope = normalizePublicGameScope(searchParams?.game);
  const exploreReturnPath = buildExploreReturnPath(searchParams);
  const isDiscoveryMode =
    gameScope === "pokemon" &&
    !normalizeFreeTextQuery(searchParams?.q) &&
    !normalizeSetCode(searchParams?.set) &&
    !parseReleaseYear(searchParams?.year) &&
    !(searchParams?.illustrator ?? "").trim();

  let discoveryContent = null;

  if (isDiscoveryMode) {
    const [featuredCardRows, allSets, recentlyConfirmedCards, provisionalCards] = await Promise.all([
      getFeaturedExploreCards().catch(() => []),
      getPublicSets()
        .then((sets) => sets.filter((setInfo) => setInfo.game_code === "pokemon"))
        .catch(() => []),
      getRecentlyConfirmedCanonicalCards().catch(() => []),
      getDiscoveryProvisionalCards().catch(() => []),
    ]);
    const featuredPricing = canViewPricing
      ? await getPublicPricingByCardIds(
          supabase,
          featuredCardRows.map((card) => card.id),
        )
      : new Map();
    const featuredCards = featuredCardRows.map((card) => ({
      ...card,
      ...(featuredPricing.get(card.id) ?? {}),
    }));

    discoveryContent = (
      <ExploreDiscoverySections
        compareCards={compareCards}
        featuredCards={featuredCards.filter((card) =>
          matchesPublicLanguageScope(card, languageScope),
        )}
        notableSets={getNotableExploreSets(allSets)}
        recentlyConfirmedCards={recentlyConfirmedCards.filter((card) =>
          matchesPublicLanguageScope(card, languageScope),
        )}
        provisionalCards={languageScope === "ja" ? [] : provisionalCards}
        currentView={searchParams?.view ? normalizeExploreViewMode(searchParams.view) : undefined}
        canViewPricing={canViewPricing}
        returnPath={exploreReturnPath}
      />
    );
  }
  return <Suspense fallback={<LoadingCardGridSkeleton />}><ExplorePageClient canViewPricing={canViewPricing} /></Suspense>;
}
