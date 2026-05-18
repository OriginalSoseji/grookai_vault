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

function pageHref(page: number) {
  return page <= 1 ? "/dex" : `/dex?page=${page}`;
}

export default async function GrookaiDexPage({
  searchParams,
}: {
  searchParams?: { page?: string | string[] };
}) {
  if (!isGrookaiDexEnabled()) {
    notFound();
  }

  const supabase = createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const speciesPage = await getGrookaiDexSpeciesPage(user?.id ?? null, {
    page: parsePage(searchParams?.page),
    pageSize: PAGE_SIZE,
  });
  const species = speciesPage.species;
  const incompleteCount = species.filter((row) => row.totalPrintCount > 0 && row.ownedPrintCount < row.totalPrintCount).length;
  const ownedSpeciesCount = species.filter((row) => row.ownedPrintCount > 0).length;
  const startRow = species.length === 0 ? 0 : (speciesPage.page - 1) * speciesPage.pageSize + 1;
  const endRow = Math.min(speciesPage.totalSpeciesCount, startRow + species.length - 1);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Grookai Dex</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Pokemon Progress</h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            Track every mapped card print by Pokemon and see which cards are still missing from your vault. Showing {startRow}-{endRow} of {speciesPage.totalSpeciesCount}.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-right">
          <div>
            <p className="text-2xl font-semibold text-slate-950">{speciesPage.totalSpeciesCount}</p>
            <p className="text-xs text-slate-500">Pokemon</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-slate-950">{ownedSpeciesCount}</p>
            <p className="text-xs text-slate-500">Started here</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-slate-950">{incompleteCount}</p>
            <p className="text-xs text-slate-500">Open here</p>
          </div>
        </div>
      </header>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="grid grid-cols-[72px_minmax(0,1fr)_96px_80px] border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">
          <span>No.</span>
          <span>Pokemon</span>
          <span className="text-right">Owned</span>
          <span className="text-right">Done</span>
        </div>
        {species.map((row) => (
          <Link
            key={row.speciesId}
            href={`/dex/${row.slug}`}
            className="grid grid-cols-[72px_minmax(0,1fr)_96px_80px] items-center border-b border-slate-100 px-3 py-2 text-sm last:border-b-0 hover:bg-slate-50"
          >
            <span className="font-medium text-slate-500">#{row.nationalDexNumber.toString().padStart(4, "0")}</span>
            <span className="truncate font-semibold text-slate-950">{row.displayName}</span>
            <span className="text-right text-slate-700">{row.ownedPrintCount}/{row.totalPrintCount}</span>
            <span className="text-right font-medium text-slate-600">{row.completionPercent}%</span>
          </Link>
        ))}
      </section>

      <nav className="flex items-center justify-between gap-3 text-sm">
        <Link
          href={pageHref(Math.max(1, speciesPage.page - 1))}
          aria-disabled={speciesPage.page <= 1}
          className={`rounded-md border px-3 py-2 font-medium ${
            speciesPage.page <= 1
              ? "pointer-events-none border-slate-100 text-slate-300"
              : "border-slate-200 text-slate-700 hover:border-slate-300 hover:text-slate-950"
          }`}
        >
          Previous
        </Link>
        <span className="text-slate-500">
          Page {speciesPage.page} of {speciesPage.totalPages}
        </span>
        <Link
          href={pageHref(Math.min(speciesPage.totalPages, speciesPage.page + 1))}
          aria-disabled={speciesPage.page >= speciesPage.totalPages}
          className={`rounded-md border px-3 py-2 font-medium ${
            speciesPage.page >= speciesPage.totalPages
              ? "pointer-events-none border-slate-100 text-slate-300"
              : "border-slate-200 text-slate-700 hover:border-slate-300 hover:text-slate-950"
          }`}
        >
          Next
        </Link>
      </nav>
    </main>
  );
}
