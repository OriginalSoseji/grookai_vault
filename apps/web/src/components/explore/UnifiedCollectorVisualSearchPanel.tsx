"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import type {
  UnifiedCollectorSearchResponseV2,
  UnifiedCollectorSearchResultV2,
} from "@/lib/search/unifiedCollectorSearchV2";

type CorrectionType =
  | "character_not_present"
  | "wrong_role"
  | "wrong_object"
  | "missing_detail";

type Props = {
  query: string;
  response: UnifiedCollectorSearchResponseV2;
};

const CORRECTIONS: Array<{ value: CorrectionType; label: string }> = [
  { value: "character_not_present", label: "Character not present" },
  { value: "wrong_role", label: "Wrong role" },
  { value: "wrong_object", label: "Wrong object" },
  { value: "missing_detail", label: "Missing detail" },
];

function cardHref(result: UnifiedCollectorSearchResultV2) {
  const printing = result.printings.find((row) => row.gvId);
  return printing?.gvId ? `/card/${encodeURIComponent(printing.gvId)}` : "#";
}

function imageHref(result: UnifiedCollectorSearchResultV2) {
  const printing = result.printings.find((row) => row.gvId);
  return printing?.gvId
    ? `/api/canon/cards/${encodeURIComponent(printing.gvId)}/image`
    : null;
}

export default function UnifiedCollectorVisualSearchPanel({
  query,
  response,
}: Props) {
  const [selected, setSelected] =
    useState<UnifiedCollectorSearchResultV2 | null>(null);
  const [reporting, setReporting] = useState<CorrectionType | null>(null);
  const [reportMessage, setReportMessage] = useState<string | null>(null);

  const reportCorrection = async (
    result: UnifiedCollectorSearchResultV2,
    correctionType: CorrectionType,
  ) => {
    setReporting(correctionType);
    setReportMessage(null);
    try {
      const response = await fetch("/api/search/visual/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardPrintId: result.representativeCardPrintId,
          artworkGroupId: result.artworkGroupId,
          originalQuery: query,
          correctionType,
          evidence: result.evidence,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Could not submit correction.");
      }
      setReportMessage("Correction saved for review.");
    } catch (error) {
      setReportMessage(
        error instanceof Error ? error.message : "Could not submit correction.",
      );
    } finally {
      setReporting(null);
    }
  };

  return (
    <section className="space-y-5" aria-label="Visual artwork search results">
      {response.intent ? (
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4 dark:border-slate-800">
          {response.intent.chips.map((chip) => (
            <span
              key={chip.key}
              className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900 dark:border-emerald-300/20 dark:bg-emerald-400/[0.12] dark:text-emerald-100"
            >
              {chip.label}
            </span>
          ))}
        </div>
      ) : null}

      {response.zeroState ? (
        <div className="border-y border-slate-200 py-5 dark:border-slate-800">
          <p className="max-w-3xl text-sm leading-6 text-slate-700 dark:text-slate-300">
            {response.zeroState.message}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {response.zeroState.relaxations.map((relaxation) => (
              <Link
                key={relaxation.query}
                href={`/explore?q=${encodeURIComponent(relaxation.query)}`}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                {relaxation.label} ({relaxation.resultCount})
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {response.groups.map((group) => (
        <section key={group.key} className="space-y-3">
          <div className="flex items-baseline justify-between gap-3 border-b border-slate-200 pb-2 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">
              {group.label}
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {group.results.length}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {group.results.map((result) => {
              const image = imageHref(result);
              return (
                <article
                  key={result.artworkGroupId}
                  className="min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
                >
                  <button
                    type="button"
                    onClick={() => setSelected(result)}
                    className="relative block aspect-[2.5/3.5] w-full overflow-hidden bg-slate-100 dark:bg-slate-900"
                    aria-label={`View evidence for ${result.representativeName}`}
                  >
                    {image ? (
                      <Image
                        src={image}
                        alt={`${result.representativeName} card`}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        className="object-contain"
                        unoptimized
                      />
                    ) : (
                      <span className="grid h-full place-items-center p-3 text-xs text-slate-500">
                        Image unavailable
                      </span>
                    )}
                  </button>
                  <div className="space-y-2 p-3">
                    <Link
                      href={cardHref(result)}
                      className="block text-sm font-semibold text-slate-950 hover:underline dark:text-slate-50"
                    >
                      {result.representativeName}
                    </Link>
                    <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                      {result.reason}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelected(result)}
                      className="text-xs font-semibold text-emerald-800 hover:underline dark:text-emerald-200"
                    >
                      View evidence
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      {selected ? (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-3"
          role="dialog"
          aria-modal="true"
          aria-label={`${selected.representativeName} visual evidence`}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setSelected(null);
          }}
        >
          <div className="grid max-h-[94vh] w-full max-w-6xl overflow-hidden rounded-md bg-white shadow-2xl lg:grid-cols-[minmax(360px,1.2fr)_minmax(320px,0.8fr)] dark:bg-slate-950">
            <div className="relative min-h-[50vh] overflow-auto bg-slate-950">
              {imageHref(selected) ? (
                <Image
                  src={imageHref(selected) as string}
                  alt={`${selected.representativeName} full card`}
                  width={900}
                  height={1260}
                  className="mx-auto h-auto max-h-[92vh] w-auto object-contain"
                  unoptimized
                />
              ) : null}
            </div>
            <div className="overflow-y-auto p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
                    {selected.representativeName}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {selected.reason}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-slate-300 text-xl dark:border-slate-700"
                  aria-label="Close evidence"
                  title="Close"
                >
                  ×
                </button>
              </div>
              <h3 className="mt-6 text-xs font-semibold uppercase text-slate-500">
                Matched visible facts
              </h3>
              <ul className="mt-2 space-y-2">
                {selected.evidence.map((evidence, index) => (
                  <li
                    key={`${evidence.term}-${index}`}
                    className="border-l-2 border-emerald-600 pl-3 text-sm text-slate-700 dark:text-slate-300"
                  >
                    <p>{evidence.term}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {evidence.appearanceRole?.replaceAll("_", " ")} ·{" "}
                      {evidence.authority.replaceAll("_", " ")}
                    </p>
                  </li>
                ))}
              </ul>
              <h3 className="mt-6 text-xs font-semibold uppercase text-slate-500">
                Report a correction
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {CORRECTIONS.map((correction) => (
                  <button
                    key={correction.value}
                    type="button"
                    disabled={Boolean(reporting)}
                    onClick={() =>
                      void reportCorrection(selected, correction.value)
                    }
                    className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
                  >
                    {reporting === correction.value
                      ? "Saving..."
                      : correction.label}
                  </button>
                ))}
              </div>
              {reportMessage ? (
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                  {reportMessage}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
