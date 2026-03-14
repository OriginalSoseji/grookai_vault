"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildPathWithCompareCards, MAX_COMPARE_CARDS, normalizeCompareCardsParam, toggleCompareCard } from "@/lib/compareCards";

type CompareCardButtonProps = {
  gvId: string;
  variant?: "default" | "compact";
};

export default function CompareCardButton({ gvId, variant = "default" }: CompareCardButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const compareCards = normalizeCompareCardsParam(searchParams.get("cards"));
  const normalizedGvId = gvId.trim().toUpperCase();
  const isSelected = compareCards.includes(normalizedGvId);
  const isAtLimit = !isSelected && compareCards.length >= MAX_COMPARE_CARDS;

  function commitCards(nextCards: string[]) {
    router.replace(buildPathWithCompareCards(pathname, searchParams.toString(), nextCards), {
      scroll: false,
    });
  }

  function handleToggle() {
    if (isAtLimit) {
      return;
    }

    commitCards(toggleCompareCard(compareCards, gvId));
  }

  const buttonClassName = variant === "compact"
    ? `inline-flex rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-100 ${
        isSelected
          ? "border border-slate-900 bg-slate-900 text-white"
          : isAtLimit
            ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
            : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
      }`
    : `inline-flex rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-100 ${
        isSelected
          ? "border border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
          : isAtLimit
            ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
            : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
      }`;

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isAtLimit}
      title={isAtLimit ? `Compare is full. Remove a card to stay within the ${MAX_COMPARE_CARDS}-card limit.` : undefined}
      className={buttonClassName}
    >
      {isSelected ? "In Compare" : "Compare"}
    </button>
  );
}
