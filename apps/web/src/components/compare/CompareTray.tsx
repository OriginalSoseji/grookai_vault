"use client";

import Link from "next/link";
import { buildCompareHref, MAX_COMPARE_CARDS, MIN_COMPARE_CARDS } from "@/lib/compareCards";

type CompareTrayProps = {
  cards: string[];
  onRemoveCard?: (gvId: string) => void;
  addHref?: string;
};

export default function CompareTray({ cards, onRemoveCard, addHref = "/explore" }: CompareTrayProps) {
  const compareHref = buildCompareHref(cards);
  const visibleCards = cards.slice(0, MAX_COMPARE_CARDS);

  if (visibleCards.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Compare</p>
          <div className="flex flex-wrap gap-2">
            {visibleCards.map((gvId) => (
              <div
                key={gvId}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                <span>{gvId}</span>
                {onRemoveCard ? (
                  <button
                    type="button"
                    onClick={() => onRemoveCard(gvId)}
                    className="rounded-full text-slate-500 transition hover:text-slate-900"
                    aria-label={`Remove ${gvId} from compare`}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            ))}
            {Array.from({ length: Math.max(0, MAX_COMPARE_CARDS - visibleCards.length) }).map((_, index) => (
              <Link
                key={`empty-slot-${index}`}
                href={addHref}
                className="inline-flex items-center rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
              >
                + Add card
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <p className="text-xs text-slate-500">
            {visibleCards.length < MIN_COMPARE_CARDS
              ? `Pick ${MIN_COMPARE_CARDS - visibleCards.length} more card${MIN_COMPARE_CARDS - visibleCards.length === 1 ? "" : "s"}`
              : `${visibleCards.length} card${visibleCards.length === 1 ? "" : "s"} ready`}
          </p>
          <Link
            href={compareHref}
            aria-disabled={visibleCards.length < MIN_COMPARE_CARDS}
            className={`inline-flex rounded-full px-5 py-2.5 text-sm font-medium transition ${
              visibleCards.length < MIN_COMPARE_CARDS
                ? "pointer-events-none border border-slate-200 bg-slate-100 text-slate-400"
                : "bg-slate-950 text-white hover:bg-slate-800"
            }`}
          >
            Compare
          </Link>
        </div>
      </div>
    </div>
  );
}
