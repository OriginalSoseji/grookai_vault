import Link from "next/link";
import { notFound } from "next/navigation";
import { isGrookaiDexEnabled } from "@/lib/grookaiDex/featureFlag";
import { getGrookaiDexSpeciesDetail } from "@/lib/grookaiDex/getGrookaiDexSpeciesDetail";
import { createServerComponentClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type DexCardView = "all" | "owned" | "missing";

function parseView(value: string | string[] | undefined): DexCardView {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "owned" || raw === "missing" ? raw : "all";
}

function viewHref(speciesSlug: string, view: DexCardView) {
  return view === "all" ? `/dex/${speciesSlug}` : `/dex/${speciesSlug}?view=${view}`;
}

function formatPercent(owned: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((owned / total) * 100);
}

export default async function GrookaiDexSpeciesPage({
  params,
  searchParams,
}: {
  params: { speciesSlug: string };
  searchParams?: { view?: string | string[] };
}) {
  if (!isGrookaiDexEnabled()) {
    notFound();
  }

  const supabase = createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const detail = await getGrookaiDexSpeciesDetail(params.speciesSlug, user?.id ?? null);

  if (!detail) {
    notFound();
  }

  const ownedCards = detail.cards.filter((card) => card.isOwned);
  const missingCards = detail.cards.filter((card) => card.countsForCompletion && !card.isOwned);
  const activeView = parseView(searchParams?.view);
  const visibleCards =
    activeView === "owned" ? ownedCards : activeView === "missing" ? missingCards : detail.cards;
  const viewOptions: Array<{ view: DexCardView; label: string; count: number }> = [
    { view: "all", label: "All", count: detail.cards.length },
    { view: "owned", label: "Owned", count: ownedCards.length },
    { view: "missing", label: "Missing", count: missingCards.length },
  ];
  const variantCompletionPercent = formatPercent(detail.ownedVariantOptionCount, detail.variantOptionCount);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <header className="grid gap-5 border-b border-slate-200 pb-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          <Link href="/dex" className="text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-950 hover:underline">
            Back to Grookai Dex
          </Link>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              #{detail.nationalDexNumber.toString().padStart(4, "0")} Species Dex
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">{detail.displayName}</h1>
          </div>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Parent print progress and master-set option coverage for this species.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-slate-800">Card Print Completion</span>
              <span className="font-semibold text-slate-950">{detail.completionPercent}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, detail.completionPercent)}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {detail.ownedPrintCount}/{detail.totalPrintCount} parent prints owned
              {detail.ownedCopyCount > detail.ownedPrintCount ? `, ${detail.ownedCopyCount} total copies` : ""}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-slate-800">Master Set Options</span>
              <span className="font-semibold text-slate-950">{variantCompletionPercent}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-sky-500" style={{ width: `${Math.min(100, variantCompletionPercent)}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {detail.ownedVariantOptionCount}/{detail.variantOptionCount} finish and parallel options owned
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-2xl font-semibold text-slate-950">{detail.cards.length}</p>
          <p className="text-sm text-slate-500">Mapped prints</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-2xl font-semibold text-slate-950">{ownedCards.length}</p>
          <p className="text-sm text-slate-500">Owned prints</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-2xl font-semibold text-slate-950">{missingCards.length}</p>
          <p className="text-sm text-slate-500">Missing prints</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-2xl font-semibold text-slate-950">
            {detail.missingVariantOptionCount}
          </p>
          <p className="text-sm text-slate-500">Missing options</p>
        </div>
      </section>

      <nav className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
        {viewOptions.map((option) => {
          const isActive = option.view === activeView;
          return (
            <Link
              key={option.view}
              href={viewHref(detail.slug, option.view)}
              className={`rounded-md border px-3 py-2 font-medium ${
                isActive
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-950"
              }`}
            >
              {option.label} <span className={isActive ? "text-slate-200" : "text-slate-500"}>{option.count}</span>
            </Link>
          );
        })}
        </div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
          {visibleCards.length} shown
        </p>
      </nav>

      <section className="space-y-3">
        {visibleCards.map((card) => {
          const totalOptions = Math.max(1, card.printings.length);
          const ownedOptions = card.printings.length > 0
            ? card.printings.filter((printing) => printing.ownedCount > 0).length
            : card.isOwned
              ? 1
              : 0;
          const missingOptions = Math.max(0, totalOptions - ownedOptions);

          return (
            <article key={`${card.cardPrintId}:${card.role}`} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-[92px_minmax(0,1fr)_minmax(260px,380px)]">
              <Link
                href={card.gvId ? `/card/${card.gvId}` : "#"}
                className="block aspect-[3/4] overflow-hidden rounded-md border border-slate-100 bg-slate-100"
              >
                {card.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={card.imageUrl} alt={card.name} className="h-full w-full object-contain" />
                ) : null}
              </Link>

              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold leading-6 text-slate-950">{card.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {[card.setName ?? card.setCode, card.number ? `#${card.number}` : null, card.rarity].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                    card.isOwned
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                  >
                    {card.isOwned ? `${card.ownedCount} owned` : "Missing print"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {card.printLabel ? (
                    <span className="inline-flex rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900">
                      {card.printLabel}
                    </span>
                  ) : null}
                  <span className="inline-flex rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600">
                    {ownedOptions}/{totalOptions} options owned
                  </span>
                  {missingOptions > 0 ? (
                    <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-500">
                      {missingOptions} missing
                    </span>
                  ) : null}
                </div>

                {card.gvId ? (
                  <Link href={`/card/${card.gvId}`} className="inline-flex text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline">
                    {card.isOwned ? "View card" : "Find card"}
                  </Link>
                ) : null}
              </div>

              <div className="border-t border-slate-200 pt-3 md:border-l md:border-t-0 md:pl-4 md:pt-0">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Variant Options</p>
                  <p className="text-xs font-medium text-slate-500">{ownedOptions}/{totalOptions}</p>
                </div>

                {card.printings.length > 0 ? (
                  <div className="grid gap-1.5">
                  {card.printings.map((printing) => {
                    const isOwned = printing.ownedCount > 0;
                    return (
                      <span
                        key={`${card.cardPrintId}-${printing.id}`}
                        className={`flex items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-xs font-medium ${
                          isOwned
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <span className="truncate">{printing.finishName}</span>
                        <span className={isOwned ? "text-emerald-700" : "text-slate-400"}>
                          {isOwned ? `${printing.ownedCount}x` : "Missing"}
                        </span>
                      </span>
                    );
                  })}
                  </div>
                ) : (
                  <div className={`flex items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-xs font-medium ${
                    card.isOwned
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                  >
                    <span>Standard print</span>
                    <span>{card.isOwned ? `${card.ownedCount}x` : "Missing"}</span>
                  </div>
                )}
              </div>
            </article>
          );
        })}
        {visibleCards.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
            No cards in this view.
          </div>
        ) : null}
      </section>
    </main>
  );
}
