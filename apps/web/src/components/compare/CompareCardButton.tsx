"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import CompareTray from "@/components/compare/CompareTray";
import { buildPathWithCompareCards, normalizeCompareCardsParam, toggleCompareCard } from "@/lib/compareCards";

type CompareCardButtonProps = {
  gvId: string;
  addHref?: string;
};

export default function CompareCardButton({ gvId, addHref = "/explore" }: CompareCardButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const compareCards = normalizeCompareCardsParam(searchParams.get("cards"));
  const isSelected = compareCards.includes(gvId);

  function commitCards(nextCards: string[]) {
    router.replace(buildPathWithCompareCards(pathname, searchParams.toString(), nextCards), {
      scroll: false,
    });
  }

  function handleToggle() {
    commitCards(toggleCompareCard(compareCards, gvId));
  }

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        className={`inline-flex rounded-full px-5 py-2.5 text-sm font-medium transition ${
          isSelected
            ? "border border-slate-300 bg-white text-slate-900 hover:border-slate-400"
            : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
        }`}
      >
        {isSelected ? "In Compare" : "Compare"}
      </button>
      <CompareTray cards={compareCards} addHref={addHref} onRemoveCard={(cardId) => commitCards(compareCards.filter((value) => value !== cardId))} />
    </>
  );
}
