import Link from "next/link";
import { notFound } from "next/navigation";
import { isGrookaiDexEnabled } from "@/lib/grookaiDex/featureFlag";
import { getGrookaiDexSpeciesPage } from "@/lib/grookaiDex/getGrookaiDexSpecies";
import { createServerComponentClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAGE_SIZE = 100;

function parsePage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function parseSearchQuery(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").trim().slice(0, 64);
}

function dexPageHref(page: number, query: string) {
  const params = new URLSearchParams();
  if (page > 1) {
    params.set("page", String(page));
  }
  if (query) {
    params.set("q", query);
  }
  const queryString = params.toString();
  return queryString ? `/dex?${queryString}` : "/dex";
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

function completionLabel(percent: number, owned: number, total: number) {
  if (total <= 0) {
    return "No mapped prints";
  }

  if (percent >= 100) {
    return "Complete";
  }

  if (owned > 0) {
    return "Started";
  }

  return "Open";
}

export default async function GrookaiDexPage({
  searchParams,
}: {
  searchParams?: { page?: string | string[]; q?: string | string[] };
}) {
  if (!isGrookaiDexEnabled()) {
    notFound();
  }

  const supabase = createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const searchQuery = parseSearchQuery(searchParams?.q);
  const currentPage = parsePage(searchParams?.page);
  const speciesPage = await getGrookaiDexSpeciesPage(user?.id ?? null, {
    page: currentPage,
    pageSize: PAGE_SIZE,
    searchQuery,
  });
  const species = speciesPage.species;
  const incompleteCount = species.filter((row) => row.totalPrintCount > 0 && row.ownedPrintCount < row.totalPrintCount).length;
  const ownedSpeciesCount = species.filter((row) => row.ownedPrintCount > 0).length;
  const startRow = species.length === 0 ? 0 : (speciesPage.page - 1) * speciesPage.pageSize + 1;
  const endRow = Math.min(speciesPage.totalSpeciesCount, startRow + species.length - 1);

  return (
    <main className="gv-page-shell gv-mobile-safe-content">
      <div className="gv-page-container gv-page-rhythm">
        <header className="gv-hero-section px-5 py-6 sm:px-7 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,430px)] lg:items-end">
            <div className="space-y-4">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] border border-sky-200/70 bg-sky-500/[0.08] text-lg font-black text-sky-700 dark:border-sky-300/20 dark:bg-sky-400/[0.13] dark:text-sky-200">
                G
              </div>
              <div className="space-y-2">
                <p className="gv-eyebrow">Grookai Dex</p>
                <h1 className="gv-display-title">Pokemon Progress</h1>
                <p className="gv-body-copy max-w-2xl">
                  Track every mapped card print by Pokemon and see what is already in your vault. Showing {startRow}-{endRow} of {speciesPage.totalSpeciesCount}.
                </p>
              </div>
              <form action="/dex" className="gv-control-surface flex max-w-2xl flex-col gap-2 rounded-[22px] p-2 sm:flex-row">
                <label htmlFor="dex-character-search" className="sr-only">
                  Search Pokemon character
                </label>
                <input
                  id="dex-character-search"
                  name="q"
                  type="search"
                  defaultValue={searchQuery}
                  placeholder="Search Pokemon, like Gengar or #025"
                  className="min-h-11 min-w-0 flex-1 rounded-full border border-transparent bg-white/70 px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:bg-white dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
                <div className="flex gap-2">
                  <button type="submit" className="gv-primary-button min-h-11 flex-1 px-5 py-2 text-sm sm:flex-none">
                    Search
                  </button>
                  {searchQuery ? (
                    <Link href="/dex" className="gv-secondary-button min-h-11 flex-1 px-5 py-2 text-sm sm:flex-none">
                      Reset
                    </Link>
                  ) : null}
                </div>
              </form>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="gv-soft-surface px-4 py-3 text-center">
                <p className="text-2xl font-bold text-slate-950 dark:text-slate-50">{species.length}</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Shown</p>
              </div>
              <div className="gv-soft-surface px-4 py-3 text-center">
                <p className="text-2xl font-bold text-slate-950 dark:text-slate-50">{ownedSpeciesCount}</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Started</p>
              </div>
              <div className="gv-soft-surface px-4 py-3 text-center">
                <p className="text-2xl font-bold text-slate-950 dark:text-slate-50">{incompleteCount}</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Open</p>
              </div>
            </div>
          </div>
        </header>

        <section className="space-y-3" aria-label="Pokemon species progress">
          {searchQuery ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                Search results for <span className="text-slate-950 dark:text-slate-50">&quot;{searchQuery}&quot;</span>
              </p>
              <Link href="/dex" className="text-sm font-semibold text-sky-700 hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-200">
                Clear search
              </Link>
            </div>
          ) : null}
          {species.length === 0 ? (
            <div className="gv-premium-surface px-5 py-10 text-center">
              <p className="text-lg font-bold text-slate-950 dark:text-slate-50">No Pokemon found</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Try a species name like Pikachu, a slug like mr-mime, or a Dex number like #025.
              </p>
            </div>
          ) : null}
          {species.map((row) => {
            const percent = clampPercent(row.completionPercent);
            const status = completionLabel(percent, row.ownedPrintCount, row.totalPrintCount);
            return (
              <Link
                key={row.speciesId}
                href={`/dex/${row.slug}`}
                className="gv-visual-card group grid gap-4 px-4 py-4 sm:grid-cols-[92px_minmax(0,1fr)_minmax(180px,260px)] sm:items-center sm:px-5"
              >
                <div className="flex items-center justify-between gap-3 sm:block">
                  <span className="inline-flex min-w-[4.75rem] items-center justify-center rounded-full border border-slate-200/80 bg-white/78 px-3 py-1 text-xs font-bold text-slate-500 dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-400">
                    #{row.nationalDexNumber.toString().padStart(4, "0")}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] sm:hidden ${
                      status === "Complete"
                        ? "bg-emerald-100 text-emerald-800"
                        : status === "Started"
                          ? "bg-sky-100 text-sky-800"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {status}
                  </span>
                </div>

                <div className="min-w-0 space-y-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <h2 className="truncate text-xl font-extrabold tracking-tight text-slate-950 dark:text-slate-50">
                      {row.displayName}
                    </h2>
                    <span
                      className={`hidden rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] sm:inline-flex ${
                        status === "Complete"
                          ? "bg-emerald-100 text-emerald-800"
                          : status === "Started"
                            ? "bg-sky-100 text-sky-800"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {status}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {row.ownedPrintCount} of {row.totalPrintCount} mapped printings in your vault
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Completion</span>
                    <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{percent}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-emerald-500 transition-all group-hover:bg-emerald-400" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              </Link>
            );
          })}
        </section>

        <nav className="flex items-center justify-between gap-3 text-sm">
        <Link
          href={dexPageHref(Math.max(1, speciesPage.page - 1), searchQuery)}
          aria-disabled={speciesPage.page <= 1}
          className={`gv-secondary-button min-h-0 px-4 py-2 ${
            speciesPage.page <= 1
              ? "pointer-events-none opacity-45"
              : ""
          }`}
        >
          Previous
        </Link>
        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          Page {speciesPage.page} of {speciesPage.totalPages}
        </span>
        <Link
          href={dexPageHref(Math.min(speciesPage.totalPages, speciesPage.page + 1), searchQuery)}
          aria-disabled={speciesPage.page >= speciesPage.totalPages}
          className={`gv-secondary-button min-h-0 px-4 py-2 ${
            speciesPage.page >= speciesPage.totalPages
              ? "pointer-events-none opacity-45"
              : ""
          }`}
        >
          Next
        </Link>
        </nav>
      </div>
    </main>
  );
}
