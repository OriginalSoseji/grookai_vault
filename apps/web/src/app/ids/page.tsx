import type { Metadata } from "next";
import Link from "next/link";
import { getCardIdRegistrySummary } from "@/lib/seo/idRegistry";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Grookai Card ID Registry | Grookai Vault",
  description:
    "Browse indexable Grookai Vault card IDs by page, language, and set. Each registry page links directly to canonical card records.",
  alternates: {
    canonical: "https://grookaivault.com/ids",
  },
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export default async function CardIdRegistryPage() {
  const summary = await getCardIdRegistrySummary();
  const pageIndexes = Array.from({ length: summary.pageCount }, (_, index) => index);

  return (
    <div className="gv-page-rhythm py-6">
      <section className="gv-soft-surface px-5 py-6 sm:px-7">
        <p className="gv-eyebrow">Grookai identity registry</p>
        <div className="mt-3 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)] lg:items-end">
          <div className="space-y-3">
            <h1 className="text-4xl font-black tracking-normal text-slate-950 dark:text-slate-50 sm:text-5xl">
              Card IDs
            </h1>
            <p className="max-w-3xl text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
              Public canonical Grookai Vault identifiers, organized into crawlable pages that link directly to card records.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="gv-dex-mini-stat">
              <p>{formatNumber(summary.totalCards)}</p>
              <span>Cards</span>
            </div>
            <div className="gv-dex-mini-stat">
              <p>{formatNumber(summary.japaneseCards)}</p>
              <span>Japanese</span>
            </div>
            <div className="gv-dex-mini-stat">
              <p>{formatNumber(summary.englishCards)}</p>
              <span>English</span>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="gv-eyebrow">Identifier pages</p>
            <h2 className="mt-1 text-2xl font-black tracking-normal text-slate-950 dark:text-slate-50">
              Public GV-ID ranges
            </h2>
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            {formatNumber(summary.pageCount)} pages
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {pageIndexes.map((pageIndex) => {
            const start = pageIndex * 1000 + 1;
            const end = Math.min((pageIndex + 1) * 1000, summary.totalCards);
            return (
              <Link
                key={pageIndex}
                href={`/ids/cards/${pageIndex}`}
                className="rounded-[8px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
              >
                <span className="block">GV-ID page {pageIndex + 1}</span>
                <span className="mt-1 block text-xs font-medium text-slate-500">
                  Records {formatNumber(start)}-{formatNumber(end)}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="gv-eyebrow">Set entry points</p>
          <h2 className="mt-1 text-2xl font-black tracking-normal text-slate-950 dark:text-slate-50">
            High-signal set links
          </h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {summary.featuredSets.map((setInfo) => (
            <Link
              key={setInfo.code}
              href={`/sets/${encodeURIComponent(setInfo.code)}`}
              className="rounded-[8px] border border-slate-200 bg-white px-4 py-3 transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-600"
            >
              <span className="block text-sm font-bold text-slate-950 dark:text-slate-50">{setInfo.name}</span>
              <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {setInfo.code.toUpperCase()} - {formatNumber(setInfo.cardCount)} cards
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
