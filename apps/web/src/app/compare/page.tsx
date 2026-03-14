import Link from "next/link";
import CompareWorkspace from "@/components/compare/CompareWorkspace";
import type { ComparePublicCard } from "@/lib/cards/getPublicCardsByGvIds";
import { getPublicCardsByGvIds } from "@/lib/cards/getPublicCardsByGvIds";
import { buildCompareHref, buildPathWithCompareCards, MIN_COMPARE_CARDS, normalizeCompareCardsParam } from "@/lib/compareCards";
import { createServerComponentClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function CompareUnderfilledState({ cards }: { cards: ComparePublicCard[] }) {
  const selectedIds = cards.map((card) => card.gv_id);
  const addMoreHref = buildPathWithCompareCards("/explore", "", selectedIds);
  const missingCount = Math.max(0, MIN_COMPARE_CARDS - selectedIds.length);
  const title = selectedIds.length === 0 ? "Pick cards to compare" : "Add one more card";
  const body = selectedIds.length === 0
    ? "Select at least two cards from Explore, Sets, or a card page to open the compare workspace."
    : `You have ${selectedIds[0]} selected. Add ${missingCount} more card${missingCount === 1 ? "" : "s"} to compare side by side.`;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-8">
      <section className="space-y-5 rounded-[16px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Compare</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
          <p className="max-w-2xl text-sm text-slate-600">{body}</p>
        </div>

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

        <div className="flex flex-wrap gap-3">
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
        </div>
      </section>
    </div>
  );
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams?: { cards?: string };
}) {
  const requestedCards = normalizeCompareCardsParam(searchParams?.cards);
  const supabase = createServerComponentClient();
  const [
    {
      data: { user },
    },
    cards,
  ] = await Promise.all([supabase.auth.getUser(), getPublicCardsByGvIds(requestedCards)]);
  const canViewPricing = Boolean(user);
  const pricingSignInHref = `/login?next=${encodeURIComponent(buildCompareHref(requestedCards))}`;

  if (cards.length < MIN_COMPARE_CARDS) {
    return <CompareUnderfilledState cards={cards} />;
  }

  return <CompareWorkspace cards={cards} canViewPricing={canViewPricing} pricingSignInHref={pricingSignInHref} />;
}
