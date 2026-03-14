"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildCompareHref, buildPathWithCompareCards, MAX_COMPARE_CARDS, MIN_COMPARE_CARDS, normalizeCompareCardsParam } from "@/lib/compareCards";

type CompareTrayProps = {
  cards: string[];
  addHref?: string;
};

export default function CompareTray({ cards, addHref = "/explore" }: CompareTrayProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visibleCards = normalizeCompareCardsParam(cards).slice(0, MAX_COMPARE_CARDS);
  const compareHref = buildCompareHref(visibleCards);
  const clearHref = buildPathWithCompareCards(pathname, searchParams.toString(), []);

  if (visibleCards.length === 0) {
    return null;
  }

  function commitCards(nextCards: string[]) {
    router.replace(buildPathWithCompareCards(pathname, searchParams.toString(), nextCards), {
      scroll: false,
    });
  }

  const remainingCount = Math.max(0, MIN_COMPARE_CARDS - visibleCards.length);
  const primaryHref = visibleCards.length < MIN_COMPARE_CARDS ? addHref : compareHref;
  const primaryLabel = visibleCards.length < MIN_COMPARE_CARDS
    ? `Add ${remainingCount} more card${remainingCount === 1 ? "" : "s"}`
    : "Open Compare";

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Compare</p>
            <p className="text-xs text-slate-500">
              {visibleCards.length} of {MAX_COMPARE_CARDS} selected
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {visibleCards.map((gvId) => (
              <div
                key={gvId}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                <span>{gvId}</span>
                <button
                  type="button"
                  onClick={() => commitCards(visibleCards.filter((value) => value !== gvId))}
                  className="rounded-full text-slate-500 transition hover:text-slate-900"
                  aria-label={`Remove ${gvId} from compare`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={clearHref}
            className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
          >
            Clear
          </Link>
          <Link
            href={primaryHref}
            className="inline-flex rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            {primaryLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
