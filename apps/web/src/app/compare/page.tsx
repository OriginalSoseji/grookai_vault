import { notFound } from "next/navigation";
import CompareWorkspace from "@/components/compare/CompareWorkspace";
import { getPublicCardsByGvIds } from "@/lib/cards/getPublicCardsByGvIds";
import { MIN_COMPARE_CARDS, normalizeCompareCardsParam } from "@/lib/compareCards";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ComparePage({
  searchParams,
}: {
  searchParams?: { cards?: string };
}) {
  const requestedCards = normalizeCompareCardsParam(searchParams?.cards);
  if (requestedCards.length < MIN_COMPARE_CARDS) {
    notFound();
  }

  const cards = await getPublicCardsByGvIds(requestedCards);
  if (cards.length < MIN_COMPARE_CARDS) {
    notFound();
  }

  return <CompareWorkspace cards={cards} />;
}
