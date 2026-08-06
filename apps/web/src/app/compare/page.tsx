import Link from "next/link";
import CompareWorkspace from "@/components/compare/CompareWorkspace";
import ProductState from "@/components/layout/ProductState";
import type { ComparePublicCard } from "@/lib/cards/getPublicCardsByGvIds";
import { getPublicCardsByGvIds } from "@/lib/cards/getPublicCardsByGvIds";
import { buildCompareHref, buildPathWithCompareCards, MIN_COMPARE_CARDS, normalizeCompareCardsParam } from "@/lib/compareCards";
import {
  createServerComponentClient,
  hasSupabaseServerAuthCookie,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function CompareUnderfilledState({ cards }: { cards: ComparePublicCard[] }) {
  const selectedIds = cards.map((card) => card.gv_id);
  const addMoreHref = buildPathWithCompareCards("/explore", "", selectedIds);
  const missingCount = Math.max(0, MIN_COMPARE_CARDS - selectedIds.length);
  const title = selectedIds.length === 0 ? "Pick cards to compare" : "Add one more card";
  const body = selectedIds.length === 0
    ? "Select at least two cards from Explore, Sets, or a card page to open the compare workspace."
    : `You have ${selectedIds.length} selected. Add ${missingCount} more card${missingCount === 1 ? "" : "s"} to compare side by side.`;

  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <ProductState
        eyebrow="Compare"
        title={title}
        description={body}
        action={<Link href={addMoreHref} className="gv-primary-button">Browse cards</Link>}
        secondaryAction={selectedIds[0]
          ? <Link href={buildPathWithCompareCards(`/card/${selectedIds[0]}`, "", selectedIds)} className="gv-secondary-button">View selected card</Link>
          : undefined}
      />
    </div>
  );
}

export default async function ComparePage(
  props: {
    searchParams?: Promise<{ cards?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const supabase = await createServerComponentClient();
  const {
    data: { user },
  } = await hasSupabaseServerAuthCookie()
    ? await supabase.auth.getUser()
    : { data: { user: null } };
  const requestedCards = normalizeCompareCardsParam(searchParams?.cards);
  const canViewPricing = Boolean(user);
  const cards = await getPublicCardsByGvIds(requestedCards, {
    includePricing: canViewPricing,
    pricingClient: canViewPricing ? supabase : undefined,
  });
  const pricingSignInHref = `/login?next=${encodeURIComponent(buildCompareHref(requestedCards))}`;

  if (cards.length < MIN_COMPARE_CARDS) {
    return <CompareUnderfilledState cards={cards} />;
  }

  return <CompareWorkspace cards={cards} canViewPricing={canViewPricing} pricingSignInHref={pricingSignInHref} />;
}
