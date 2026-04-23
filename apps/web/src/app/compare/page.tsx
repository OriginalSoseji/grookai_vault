import Link from "next/link";
import CompareWorkspace from "@/components/compare/CompareWorkspace";
import PageIntro from "@/components/layout/PageIntro";
import PageSection from "@/components/layout/PageSection";
import type { ComparePublicCard } from "@/lib/cards/getPublicCardsByGvIds";
import { getPublicCardsByGvIds } from "@/lib/cards/getPublicCardsByGvIds";
import { buildCompareHref, buildPathWithCompareCards, MIN_COMPARE_CARDS, normalizeCompareCardsParam } from "@/lib/compareCards";

export const revalidate = 120;

function CompareUnderfilledState({ cards }: { cards: ComparePublicCard[] }) {
  const selectedIds = cards.map((card) => card.gv_id);
  const addMoreHref = buildPathWithCompareCards("/explore", "", selectedIds);
  const missingCount = Math.max(0, MIN_COMPARE_CARDS - selectedIds.length);
  const title = selectedIds.length === 0 ? "Pick cards to compare" : "Add one more card";
  const body = selectedIds.length === 0
    ? "Select at least two cards from Explore, Sets, or a card page to open the compare workspace."
    : `You have ${selectedIds.length} selected. Add ${missingCount} more card${missingCount === 1 ? "" : "s"} to compare side by side.`;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-8">
      <PageSection surface="card" spacing="loose">
        <PageIntro
          eyebrow="Compare"
          title={title}
          description={body}
          size="compact"
          actions={(
            <>
              <Link
                href={addMoreHref}
                className="inline-flex rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Browse cards
              </Link>
              {selectedIds[0] ? (
                <Link
                  href={buildPathWithCompareCards(`/card/${selectedIds[0]}`, "", selectedIds)}
                  className="inline-flex rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  View selected card
                </Link>
              ) : null}
            </>
          )}
        />

        {selectedIds.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedIds.map((gvId) => (
              <span
                key={gvId}
                className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                {gvId}
              </span>
            ))}
          </div>
        ) : null}
      </PageSection>
    </div>
  );
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams?: { cards?: string };
}) {
  const requestedCards = normalizeCompareCardsParam(searchParams?.cards);
  const cards = await getPublicCardsByGvIds(requestedCards);
  const canViewPricing = false;
  const pricingSignInHref = `/login?next=${encodeURIComponent(buildCompareHref(requestedCards))}`;

  if (cards.length < MIN_COMPARE_CARDS) {
    return <CompareUnderfilledState cards={cards} />;
  }

  return <CompareWorkspace cards={cards} canViewPricing={canViewPricing} pricingSignInHref={pricingSignInHref} />;
}
