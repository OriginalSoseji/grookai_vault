"use client";

import ShareCardButton from "@/components/ShareCardButton";
import CompareCardButton from "@/components/compare/CompareCardButton";

export default function CardUtilityActions({
  gvId,
  printingReference,
  cardName,
}: {
  gvId: string;
  printingReference?: string | null;
  cardName?: string;
}) {
  return (
    <details className="group" data-card-utility-actions>
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-1 py-2 marker:content-none">
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-900 dark:text-white">More card actions</span>
          <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
            Compare this card or copy a direct link.
          </span>
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition group-hover:border-slate-300 group-hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:group-hover:border-slate-600 dark:group-hover:bg-white/[0.06]">
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="h-4 w-4"
            fill="currentColor"
          >
            <circle cx="4" cy="10" r="1.4" />
            <circle cx="10" cy="10" r="1.4" />
            <circle cx="16" cy="10" r="1.4" />
          </svg>
        </span>
      </summary>

      <div className="mt-2 divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-700 dark:border-slate-700">
        <CompareCardButton gvId={gvId} variant="menu" />
        <ShareCardButton
          gvId={gvId}
          printingReference={printingReference}
          cardName={cardName}
          variant="menu"
        />
      </div>
    </details>
  );
}
