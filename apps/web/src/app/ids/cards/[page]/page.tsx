import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCardIdRegistryEntries,
  getCardIdRegistryPageCount,
  ID_REGISTRY_PAGE_SIZE,
} from "@/lib/seo/idRegistry";

export const revalidate = 300;

type CardIdPageProps = {
  params: { page: string };
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function parsePageIndex(value: string) {
  const pageIndex = Number(value);
  return Number.isInteger(pageIndex) && pageIndex >= 0 ? pageIndex : null;
}

export async function generateMetadata({ params }: CardIdPageProps): Promise<Metadata> {
  const pageIndex = parsePageIndex(params.page);
  if (pageIndex === null) {
    return {
      title: "Card ID registry page not found | Grookai Vault",
    };
  }

  const start = pageIndex * ID_REGISTRY_PAGE_SIZE + 1;
  const end = (pageIndex + 1) * ID_REGISTRY_PAGE_SIZE;

  return {
    title: `GV-ID registry page ${pageIndex + 1} | Records ${start}-${end} | Grookai Vault`,
    description: `Indexable Grookai Vault card ID links for records ${start}-${end}.`,
    alternates: {
      canonical: `https://grookaivault.com/ids/cards/${pageIndex}`,
    },
  };
}

export default async function CardIdRegistryChunkPage({ params }: CardIdPageProps) {
  const pageIndex = parsePageIndex(params.page);
  if (pageIndex === null) {
    notFound();
  }

  const pageCount = await getCardIdRegistryPageCount();
  if (pageIndex >= pageCount) {
    notFound();
  }

  const entries = await getCardIdRegistryEntries(pageIndex);
  const previousPage = pageIndex > 0 ? pageIndex - 1 : null;
  const nextPage = pageIndex + 1 < pageCount ? pageIndex + 1 : null;

  return (
    <div className="gv-page-rhythm py-6">
      <section className="gv-soft-surface px-5 py-6 sm:px-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="gv-eyebrow">Grookai card IDs</p>
            <h1 className="mt-2 text-3xl font-black tracking-normal text-slate-950 dark:text-slate-50">
              GV-ID page {pageIndex + 1}
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">
              {formatNumber(entries.length)} canonical card links on this page.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/ids" className="gv-secondary-button min-h-0 px-4 py-2 text-sm">
              All ID pages
            </Link>
            {previousPage !== null ? (
              <Link href={`/ids/cards/${previousPage}`} className="gv-secondary-button min-h-0 px-4 py-2 text-sm">
                Previous
              </Link>
            ) : null}
            {nextPage !== null ? (
              <Link href={`/ids/cards/${nextPage}`} className="gv-secondary-button min-h-0 px-4 py-2 text-sm">
                Next
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[8px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:border-slate-800 dark:bg-white/[0.03]">
          <span>Canonical card link</span>
          <span>Language</span>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {entries.map((entry) => (
            <Link
              key={entry.gvId}
              href={`/card/${encodeURIComponent(entry.gvId)}`}
              className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-white/[0.03]"
            >
              <span className="min-w-0">
                <span className="block font-mono text-xs font-bold uppercase tracking-[0.12em] text-slate-950 dark:text-slate-50">
                  {entry.gvId}
                </span>
                <span className="mt-1 block truncate text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {entry.name}
                  {entry.setName ? ` - ${entry.setName}` : ""}
                  {entry.number ? ` #${entry.number}` : ""}
                </span>
              </span>
              <span className="self-center text-xs font-semibold text-slate-500">{entry.language}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
