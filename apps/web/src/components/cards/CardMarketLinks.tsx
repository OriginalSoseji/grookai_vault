import { buildCardMarketSearchUrls } from "@/lib/cards/buildCardMarketSearchUrls";

export default function CardMarketLinks({
  name,
  setName,
  setCode,
  number,
}: {
  name: string;
  setName?: string | null;
  setCode?: string | null;
  number?: string | null;
}) {
  const links = buildCardMarketSearchUrls({ name, setName, setCode, number });

  return (
    <div className="mt-5 w-full border-t border-slate-200/70 pt-4 dark:border-slate-700/80">
      <p className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        Check market comps
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <a
          href={links.tcgplayer}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition hover:-translate-y-px hover:border-slate-500 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 dark:border-slate-600 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:border-slate-400 dark:hover:bg-slate-800"
        >
          TCGplayer
        </a>
        <a
          href={links.ebay}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition hover:-translate-y-px hover:border-slate-500 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 dark:border-slate-600 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:border-slate-400 dark:hover:bg-slate-800"
        >
          eBay sold
        </a>
      </div>
      <p className="mt-2 text-center text-[11px] leading-5 text-slate-500 dark:text-slate-400">
        Opens the current card identity in a new tab.
      </p>
    </div>
  );
}
