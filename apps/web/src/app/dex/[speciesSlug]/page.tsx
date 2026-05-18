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

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Link href="/dex" className="text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-950 hover:underline">
            Back to Grookai Dex
          </Link>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            #{detail.nationalDexNumber.toString().padStart(4, "0")}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{detail.displayName}</h1>
          <p className="text-sm text-slate-600">
            {detail.ownedPrintCount} / {detail.totalPrintCount} card prints owned
            {detail.ownedCopyCount > detail.ownedPrintCount ? `, ${detail.ownedCopyCount} total copies` : ""}
            {detail.variantOptionCount > detail.totalPrintCount
              ? ` • ${detail.variantOptionCount} master set options`
              : ""}
          </p>
        </div>
        <div className="w-full max-w-xs">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">Completion</span>
            <span className="font-semibold text-slate-950">{detail.completionPercent}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, detail.completionPercent)}%` }} />
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
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
        <div className="rounded-lg border border-slate-200 bg-white p-4 sm:col-span-3">
          <p className="text-2xl font-semibold text-slate-950">
            {detail.ownedVariantOptionCount}/{detail.variantOptionCount}
          </p>
          <p className="text-sm text-slate-500">Master set options owned</p>
        </div>
      </section>

      <nav className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 text-sm">
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
      </nav>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {visibleCards.map((card) => (
          <article key={`${card.cardPrintId}:${card.role}`} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="aspect-[3/4] bg-slate-100">
              {card.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={card.imageUrl} alt={card.name} className="h-full w-full object-contain" />
              ) : null}
            </div>
            <div className="space-y-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-sm font-semibold leading-5 text-slate-950">{card.name}</h2>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${card.isOwned ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  {card.isOwned ? `${card.ownedCount}x` : "Missing"}
                </span>
              </div>
              {card.printLabel ? (
                <p className="inline-flex rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900">
                  {card.printLabel}
                </p>
              ) : null}
              {card.printings.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {card.printings.map((printing) => {
                    const isOwned = printing.ownedCount > 0;
                    return (
                      <span
                        key={`${card.cardPrintId}-${printing.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-medium ${
                          isOwned
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}
                      >
                        {printing.finishName}
                        {isOwned ? ` ${printing.ownedCount}x` : ""}
                      </span>
                    );
                  })}
                </div>
              ) : null}
              <p className="text-xs text-slate-500">
                {[card.setName ?? card.setCode, card.number, card.rarity].filter(Boolean).join(" · ")}
              </p>
              {card.gvId ? (
                <Link href={`/card/${card.gvId}`} className="inline-flex text-xs font-medium text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline">
                  {card.isOwned ? "View card" : "Find card"}
                </Link>
              ) : null}
            </div>
          </article>
        ))}
        {visibleCards.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 sm:col-span-2 lg:col-span-4 xl:col-span-5">
            No cards in this view.
          </div>
        ) : null}
      </section>
    </main>
  );
}
