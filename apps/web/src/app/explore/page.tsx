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

export default async function ExplorePage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams ?? {};
  const supabase = await createServerComponentClient();
  const { data: { user } } = await hasSupabaseServerAuthCookie() ? await supabase.auth.getUser() : { data: { user: null } };
  const canViewPricing = Boolean(user);
  const discovery = normalizePublicGameScope(params.game) === "pokemon" &&
    !CONSTRAINT_FIELDS.some(field => params[field]?.trim()) &&
    (!params.identity || params.identity === "all") && !params.sort && !params.view && !params.image;

  if (discovery) {
    // Reuse the public identity/image/pricing reader within its four-ID limit.
    const chunks = [];
    for (let offset = 0; offset < FEATURED_151_IDS.length; offset += MAX_COMPARE_CARDS) {
      chunks.push(getPublicCardsByGvIds(FEATURED_151_IDS.slice(offset, offset + MAX_COMPARE_CARDS), {
        includePricing: canViewPricing, pricingClient: supabase,
      }));
    }
    const [groups, sets] = await Promise.all([Promise.all(chunks).catch(() => []), getPublicSets().catch(() => [])]);
    const cards = groups.flat().filter(card => matchesPublicLanguageScope(card, normalizePublicLanguageScope(params.lang)));
    return <Suspense fallback={<LoadingCardGridSkeleton />}><CollectorCatalogView cards={cards} canViewPricing={canViewPricing}
      printedTotal={sets.find(set => set.game_code === "pokemon" && set.code === "sv03.5")?.printed_total} /></Suspense>;
  }
  return <Suspense fallback={<LoadingCardGridSkeleton />}><ExplorePageClient canViewPricing={canViewPricing} /></Suspense>;
}
