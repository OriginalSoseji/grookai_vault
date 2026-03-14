"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import type { ComparePublicCard } from "@/lib/cards/getPublicCardsByGvIds";
import { buildCompareHref } from "@/lib/compareCards";
import CardZoomModal from "@/components/compare/CardZoomModal";

type CompareWorkspaceProps = {
  cards: ComparePublicCard[];
};

type AttributeKey = "set_name" | "number" | "rarity" | "artist" | "release_year";

type AttributeRow = {
  key: AttributeKey;
  label: string;
};

type AttributeSection = {
  title: string;
  rows: AttributeRow[];
};

const ATTRIBUTE_SECTIONS: AttributeSection[] = [
  {
    title: "Identity",
    rows: [
      { key: "set_name", label: "Set" },
      { key: "number", label: "Number" },
      { key: "rarity", label: "Rarity" },
    ],
  },
  {
    title: "Art",
    rows: [{ key: "artist", label: "Illustrator" }],
  },
  {
    title: "Release",
    rows: [{ key: "release_year", label: "Release Year" }],
  },
];

const GRID_CLASS_BY_COUNT: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
};

function formatAttributeValue(card: ComparePublicCard, key: AttributeKey) {
  const value = card[key];
  if (typeof value === "number") {
    return String(value);
  }

  return value?.trim() || "—";
}

function valuesMatch(left: ComparePublicCard, right: ComparePublicCard, key: AttributeKey) {
  return formatAttributeValue(left, key) === formatAttributeValue(right, key);
}

export default function CompareWorkspace({ cards }: CompareWorkspaceProps) {
  const [referenceGvId, setReferenceGvId] = useState(cards[0]?.gv_id ?? "");
  const [showDiffOnly, setShowDiffOnly] = useState(false);
  const [gridCols, setGridCols] = useState(cards.length);
  const [copied, setCopied] = useState(false);

  const referenceCard = useMemo(
    () => cards.find((card) => card.gv_id === referenceGvId) ?? cards[0],
    [cards, referenceGvId],
  );

  const visibleGridCols = Math.min(Math.max(1, gridCols), cards.length);
  const gridClassName = GRID_CLASS_BY_COUNT[visibleGridCols] ?? GRID_CLASS_BY_COUNT[cards.length] ?? GRID_CLASS_BY_COUNT[4];

  async function handleCopyShareUrl() {
    const url = typeof window === "undefined" ? buildCompareHref(cards.map((card) => card.gv_id)) : window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 py-6">
      <section className="space-y-5 rounded-[16px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Compare</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Card Comparison</h1>
          <p className="max-w-2xl text-sm text-slate-600">
            Compare cards side by side, pin a reference, and focus only on what changes.
          </p>
        </div>

        <div className="flex flex-col gap-4 rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600">Grid Size</span>
              <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
                {[1, 2, 3, 4].map((count) => (
                  <button
                    key={count}
                    type="button"
                    disabled={count > cards.length}
                    onClick={() => setGridCols(count)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                      visibleGridCols === count
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm">
              <input
                type="checkbox"
                checked={showDiffOnly}
                onChange={() => setShowDiffOnly((current) => !current)}
                className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-400"
              />
              Show only differences
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleCopyShareUrl}
              className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
            >
              {copied ? "Copied" : "Share URL"}
            </button>
          </div>
        </div>
      </section>

      <section className={`grid gap-6 ${gridClassName}`}>
        {cards.map((card) => {
          const isReference = card.gv_id === referenceCard.gv_id;
          const remainingCards = cards.filter((candidate) => candidate.gv_id !== card.gv_id).map((candidate) => candidate.gv_id);
          const removeHref = remainingCards.length >= 2 ? buildCompareHref(remainingCards) : `/card/${card.gv_id}`;

          return (
            <article
              key={card.gv_id}
              className={`card-hover overflow-hidden rounded-[16px] border bg-white shadow-sm ${
                isReference ? "border-amber-400 bg-amber-50" : "border-slate-200"
              }`}
            >
              <div className="space-y-4 border-b border-slate-100 px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    {isReference ? (
                      <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
                        Reference
                      </span>
                    ) : null}
                    <p className="truncate text-lg font-semibold text-slate-950">{card.name}</p>
                    <p className="text-sm text-slate-600">{card.set_name ?? "Unknown set"}</p>
                    <p className="text-xs font-medium tracking-[0.08em] text-slate-500">{card.gv_id}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setReferenceGvId(card.gv_id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        isReference
                          ? "border border-amber-300 bg-amber-100 text-amber-800"
                          : "border border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900"
                      }`}
                    >
                      {isReference ? "Reference" : "Pin as Reference"}
                    </button>
                    <Link
                      href={removeHref}
                      className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                    >
                      Remove
                    </Link>
                  </div>
                </div>

                <div className="rounded-[12px] bg-slate-50 p-4">
                  <CardZoomModal
                    src={card.image_url}
                    alt={card.name}
                    imageClassName="aspect-[3/4] w-full rounded-[12px] object-contain"
                    fallbackClassName="flex aspect-[3/4] items-center justify-center rounded-[12px] bg-slate-100 px-4 text-center text-sm text-slate-500"
                  />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 border-b border-slate-200 bg-slate-50 px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Attribute
                </th>
                {cards.map((card) => {
                  const isReference = card.gv_id === referenceCard.gv_id;
                  return (
                    <th
                      key={card.gv_id}
                      className={`min-w-[14rem] border-b border-slate-200 px-5 py-4 text-left text-sm font-semibold ${
                        isReference ? "bg-amber-50 text-amber-900" : "bg-slate-50 text-slate-800"
                      }`}
                    >
                      <div className="space-y-1">
                        <p className="truncate">{card.name}</p>
                        <p className="text-xs font-medium tracking-[0.08em] text-slate-500">{card.gv_id}</p>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {ATTRIBUTE_SECTIONS.map((section) => {
                const visibleRows = section.rows.filter((row) => {
                  const identical = cards.every((card) => valuesMatch(card, referenceCard, row.key));
                  return !showDiffOnly || !identical;
                });

                if (visibleRows.length === 0) {
                  return null;
                }

                return (
                  <Fragment key={section.title}>
                    <tr key={`${section.title}-header`}>
                      <td colSpan={cards.length + 1} className="border-b border-t border-slate-200 bg-slate-50 px-5 py-3">
                        <h3 className="text-xs uppercase tracking-wide text-slate-400">{section.title}</h3>
                      </td>
                    </tr>
                    {visibleRows.map((row) => (
                      <tr key={row.key}>
                        <td className="sticky left-0 z-10 border-b border-slate-100 bg-white px-5 py-4 text-sm font-medium text-slate-600">
                          {row.label}
                        </td>
                        {cards.map((card) => {
                          const differsFromReference = !valuesMatch(card, referenceCard, row.key);
                          return (
                            <td
                              key={`${card.gv_id}-${row.key}`}
                              className={`border-b border-slate-100 px-5 py-4 text-sm text-slate-800 ${
                                differsFromReference ? "border-l-4 border-amber-400 bg-amber-50" : ""
                              }`}
                            >
                              {formatAttributeValue(card, row.key)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
