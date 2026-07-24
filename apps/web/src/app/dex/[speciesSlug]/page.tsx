import Link from "next/link";
import { notFound } from "next/navigation";
import PublicCardImage from "@/components/PublicCardImage";
import { isGrookaiDexEnabled } from "@/lib/grookaiDex/featureFlag";
import { getGrookaiDexSpeciesDetail } from "@/lib/grookaiDex/getGrookaiDexSpeciesDetail";
import { createServerComponentClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type DexCardView = "collection" | "owned" | "missing" | "additional";
type DexCardSort = "set" | "name" | "rarity" | "owned" | "missing";
type DexCardLayout = "detailed" | "compact" | "grid";

type DexBrowseState = {
  view: DexCardView;
  page?: number;
  set?: string | null;
  rarity?: string | null;
  finish?: string | null;
  sort?: DexCardSort;
  layout?: DexCardLayout;
};

const DEX_CARD_PAGE_SIZE = 48;
const naturalCollator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

function parseView(value: string | string[] | undefined): DexCardView {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "owned" || raw === "missing" || raw === "additional"
    ? raw
    : "collection";
}

function parseSort(value: string | string[] | undefined): DexCardSort {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "name" || raw === "rarity" || raw === "owned" || raw === "missing"
    ? raw
    : "set";
}

function parseLayout(value: string | string[] | undefined): DexCardLayout {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "compact" || raw === "grid" ? raw : "detailed";
}

function parseTextFilter(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : null;
}

function parsePage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function browseHref(speciesSlug: string, state: DexBrowseState) {
  const query = new URLSearchParams();
  if (state.view !== "collection") {
    query.set("view", state.view);
  }
  if ((state.page ?? 1) > 1) {
    query.set("page", String(state.page));
  }
  if (state.set) {
    query.set("set", state.set);
  }
  if (state.rarity) {
    query.set("rarity", state.rarity);
  }
  if (state.finish) {
    query.set("finish", state.finish);
  }
  if (state.sort && state.sort !== "set") {
    query.set("sort", state.sort);
  }
  if (state.layout && state.layout !== "detailed") {
    query.set("layout", state.layout);
  }
  const suffix = query.toString();
  return suffix ? `/dex/${speciesSlug}?${suffix}` : `/dex/${speciesSlug}`;
}

function setLabel(card: { setName: string | null; setCode: string | null }) {
  return card.setName ?? card.setCode ?? "Unknown set";
}

function rarityLabel(card: { rarity: string | null }) {
  return card.rarity ?? "Unknown rarity";
}

function sortedUnique(values: string[]) {
  return [...new Set(values)].sort((left, right) => naturalCollator.compare(left, right));
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
  searchParams?: {
    view?: string | string[];
    page?: string | string[];
    set?: string | string[];
    rarity?: string | string[];
    finish?: string | string[];
    sort?: string | string[];
    layout?: string | string[];
  };
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

  const collectionCards = detail.cards.filter((card) => card.countsForCompletion);
  const ownedCards = collectionCards.filter((card) => card.isOwned);
  const missingCards = collectionCards.filter((card) => !card.isOwned);
  const additionalCards = detail.cards.filter(
    (card) => !card.countsForCompletion && card.role.trim().toLowerCase() !== "cameo",
  );
  const activeView = parseView(searchParams?.view);
  const activeSet = parseTextFilter(searchParams?.set);
  const activeRarity = parseTextFilter(searchParams?.rarity);
  const activeFinish = parseTextFilter(searchParams?.finish);
  const activeSort = parseSort(searchParams?.sort);
  const activeLayout = parseLayout(searchParams?.layout);
  const viewCards =
    activeView === "owned"
      ? ownedCards
      : activeView === "missing"
        ? missingCards
        : activeView === "additional"
          ? additionalCards
          : collectionCards;
  const setOptions = sortedUnique(detail.cards.map(setLabel));
  const rarityOptions = sortedUnique(detail.cards.map(rarityLabel));
  const finishOptions = sortedUnique(
    detail.cards.flatMap((card) =>
      card.printings.map((printing) => printing.finishName.trim()).filter(Boolean),
    ),
  );
  const visibleCards = viewCards
    .filter((card) => !activeSet || setLabel(card) === activeSet)
    .filter((card) => !activeRarity || rarityLabel(card) === activeRarity)
    .filter(
      (card) =>
        !activeFinish ||
        card.printings.some((printing) => printing.finishName.trim() === activeFinish),
    )
    .sort((left, right) => {
      let result = 0;
      if (activeSort === "name") {
        result = naturalCollator.compare(left.name, right.name);
      } else if (activeSort === "rarity") {
        result = naturalCollator.compare(rarityLabel(left), rarityLabel(right));
      } else if (activeSort === "owned") {
        result = right.ownedCount - left.ownedCount;
      } else if (activeSort === "missing") {
        result = Number(left.isOwned) - Number(right.isOwned);
      } else {
        result =
          naturalCollator.compare(setLabel(left), setLabel(right)) ||
          naturalCollator.compare(left.number ?? "", right.number ?? "");
      }

      return (
        result ||
        naturalCollator.compare(left.name, right.name) ||
        naturalCollator.compare(left.cardPrintId, right.cardPrintId)
      );
    });
  const pageCount = Math.max(1, Math.ceil(visibleCards.length / DEX_CARD_PAGE_SIZE));
  const activePage = Math.min(parsePage(searchParams?.page), pageCount);
  const pageStart = (activePage - 1) * DEX_CARD_PAGE_SIZE;
  const pageCards = visibleCards.slice(pageStart, pageStart + DEX_CARD_PAGE_SIZE);
  const viewOptions: Array<{ view: DexCardView; label: string; count: number }> = [
    { view: "collection", label: "Collection", count: collectionCards.length },
    { view: "owned", label: "Owned", count: ownedCards.length },
    { view: "missing", label: "Missing", count: missingCards.length },
    { view: "additional", label: "Additional", count: additionalCards.length },
  ];
  const browseState = {
    view: activeView,
    set: activeSet,
    rarity: activeRarity,
    finish: activeFinish,
    sort: activeSort,
    layout: activeLayout,
  } satisfies DexBrowseState;
  const hasFilters = Boolean(activeSet || activeRarity || activeFinish);
  const variantCompletionPercent = formatPercent(detail.ownedVariantOptionCount, detail.variantOptionCount);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <header className="grid gap-5 border-b border-[var(--gv-border-soft)] pb-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          <Link href="/dex" className="text-sm font-medium text-[var(--gv-text-secondary)] underline-offset-4 hover:text-[var(--gv-text-primary)] hover:underline">
            Back to Grookai Dex
          </Link>
          <Link
            href={`/vault?species=${encodeURIComponent(detail.slug)}`}
            className="ml-4 text-sm font-medium text-[var(--gv-text-secondary)] underline-offset-4 hover:text-[var(--gv-text-primary)] hover:underline"
          >
            View exact species in Vault
          </Link>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--gv-text-tertiary)]">
              #{detail.nationalDexNumber.toString().padStart(4, "0")} Species Dex
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--gv-text-primary)]">{detail.displayName}</h1>
          </div>
          <p className="max-w-3xl text-sm leading-6 text-[var(--gv-text-secondary)]">
            Parent print progress and master-set option coverage for this species.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-lg border border-[var(--gv-border-hairline)] bg-[var(--gv-surface-base)] p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-[var(--gv-text-secondary)]">Card Print Completion</span>
              <span className="font-semibold text-[var(--gv-text-primary)]">{detail.completionPercent}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--gv-surface-container)]">
              <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, detail.completionPercent)}%` }} />
            </div>
            <p className="mt-2 text-xs text-[var(--gv-text-tertiary)]">
              {detail.ownedPrintCount}/{detail.totalPrintCount} parent prints owned
              {detail.ownedCopyCount > detail.ownedPrintCount ? `, ${detail.ownedCopyCount} total copies` : ""}
              {detail.unassignedPrintingCount > 0
                ? `, ${detail.unassignedPrintingCount} ${detail.unassignedPrintingCount === 1 ? "copy needs" : "copies need"} a finish`
                : ""}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--gv-border-hairline)] bg-[var(--gv-surface-base)] p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-[var(--gv-text-secondary)]">Master Set Options</span>
              <span className="font-semibold text-[var(--gv-text-primary)]">{variantCompletionPercent}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--gv-surface-container)]">
              <div className="h-full bg-sky-500" style={{ width: `${Math.min(100, variantCompletionPercent)}%` }} />
            </div>
            <p className="mt-2 text-xs text-[var(--gv-text-tertiary)]">
              {detail.ownedVariantOptionCount}/{detail.variantOptionCount} finish and parallel options owned
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-[var(--gv-border-hairline)] bg-[var(--gv-surface-base)] p-4">
          <p className="text-2xl font-semibold text-[var(--gv-text-primary)]">{detail.cards.length}</p>
          <p className="text-sm text-[var(--gv-text-tertiary)]">Mapped prints</p>
        </div>
        <div className="rounded-lg border border-[var(--gv-border-hairline)] bg-[var(--gv-surface-base)] p-4">
          <p className="text-2xl font-semibold text-[var(--gv-text-primary)]">{ownedCards.length}</p>
          <p className="text-sm text-[var(--gv-text-tertiary)]">Owned prints</p>
        </div>
        <div className="rounded-lg border border-[var(--gv-border-hairline)] bg-[var(--gv-surface-base)] p-4">
          <p className="text-2xl font-semibold text-[var(--gv-text-primary)]">{missingCards.length}</p>
          <p className="text-sm text-[var(--gv-text-tertiary)]">Missing prints</p>
        </div>
        <div className="rounded-lg border border-[var(--gv-border-hairline)] bg-[var(--gv-surface-base)] p-4">
          <p className="text-2xl font-semibold text-[var(--gv-text-primary)]">
            {detail.missingVariantOptionCount}
          </p>
          <p className="text-sm text-[var(--gv-text-tertiary)]">Missing options</p>
        </div>
        <div className="rounded-lg border border-[var(--gv-border-hairline)] bg-[var(--gv-surface-base)] p-4">
          <p className="text-2xl font-semibold text-[var(--gv-text-primary)]">{detail.cameoAppearances.length}</p>
          <p className="text-sm text-[var(--gv-text-tertiary)]">Artwork cameos</p>
        </div>
      </section>

      {detail.cameoAppearances.length > 0 ? (
        <section className="space-y-3 rounded-lg border border-[var(--gv-border-hairline)] bg-[var(--gv-surface-base)] p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--gv-text-tertiary)]">
                Cameo Appearances
              </h2>
              <p className="mt-1 text-sm text-[var(--gv-text-secondary)]">
                Cards where {detail.displayName} appears in the artwork. These do not count toward Species Dex completion.
              </p>
            </div>
            <Link
              href={`/explore?q=${encodeURIComponent(`${detail.displayName} cameo`)}`}
              className="gv-secondary-button min-h-0 rounded-md px-3 py-2 text-sm"
            >
              Search cameos
            </Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {detail.cameoAppearances.slice(0, 12).map((cameo) => {
              const qualifierLabel = cameo.qualifiers.length
                ? cameo.qualifiers.map((value) => value.replace(/_/g, " ")).join(", ")
                : null;
              return (
                <Link
                  key={`${cameo.gvId}:${cameo.cardName}`}
                  href={`/card/${cameo.gvId}`}
                  className="rounded-md border border-[var(--gv-border-hairline)] bg-[var(--gv-surface-container)] px-3 py-3 transition hover:bg-[var(--gv-surface-base)]"
                >
                  <p className="truncate text-sm font-semibold text-[var(--gv-text-primary)]">{cameo.cardName}</p>
                  <p className="mt-1 truncate text-xs text-[var(--gv-text-tertiary)]">
                    {[cameo.setName ?? cameo.setCode, cameo.number ? `#${cameo.number}` : null].filter(Boolean).join(" · ")}
                  </p>
                  {qualifierLabel ? (
                    <p className="mt-2 text-xs capitalize text-[var(--gv-text-tertiary)]">{qualifierLabel}</p>
                  ) : null}
                </Link>
              );
            })}
          </div>
          {detail.cameoAppearances.length > 12 ? (
            <p className="text-xs text-[var(--gv-text-tertiary)]">
              Showing 12 of {detail.cameoAppearances.length}. Use cameo search to inspect the full list.
            </p>
          ) : null}
        </section>
      ) : null}

      <nav className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--gv-border-soft)] pb-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          {viewOptions.map((option) => {
            const isActive = option.view === activeView;
            return (
              <Link
                key={option.view}
                href={browseHref(detail.slug, { ...browseState, view: option.view })}
                className={`rounded-md border px-3 py-2 font-medium ${
                  isActive
                    ? "border-[var(--gv-text-primary)] bg-[var(--gv-text-primary)] text-[var(--gv-surface-page)]"
                    : "border-[var(--gv-border-hairline)] bg-[var(--gv-surface-base)] text-[var(--gv-text-secondary)] hover:text-[var(--gv-text-primary)]"
                }`}
              >
                {option.label} <span className={isActive ? "opacity-75" : "text-[var(--gv-text-tertiary)]"}>{option.count}</span>
              </Link>
            );
          })}
        </div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--gv-text-tertiary)]">
          {visibleCards.length > 0
            ? `${pageStart + 1}-${Math.min(pageStart + pageCards.length, visibleCards.length)} of ${visibleCards.length}`
            : "0 shown"}
        </p>
      </nav>

      <section
        aria-labelledby="dex-browse-controls"
        className="space-y-3 rounded-lg border border-[var(--gv-border-hairline)] bg-[var(--gv-surface-base)] p-4 shadow-sm"
      >
        <div>
          <h2 id="dex-browse-controls" className="text-sm font-semibold text-[var(--gv-text-primary)]">
            Browse card prints
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--gv-text-tertiary)]">
            Collection, Owned, and Missing use completion-eligible prints. Additional mappings and artwork cameos stay separate.
          </p>
        </div>

        <form method="get" action={`/dex/${detail.slug}`} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {activeView !== "collection" ? <input type="hidden" name="view" value={activeView} /> : null}
          {activeLayout !== "detailed" ? <input type="hidden" name="layout" value={activeLayout} /> : null}
          <label className="grid gap-1 text-xs font-medium text-[var(--gv-text-secondary)]">
            Set
            <select
              name="set"
              defaultValue={activeSet ?? ""}
              className="gv-control-surface min-w-0 rounded-md px-2.5 py-2 text-sm text-[var(--gv-text-primary)]"
            >
              <option value="">All sets</option>
              {setOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-[var(--gv-text-secondary)]">
            Rarity
            <select
              name="rarity"
              defaultValue={activeRarity ?? ""}
              className="gv-control-surface min-w-0 rounded-md px-2.5 py-2 text-sm text-[var(--gv-text-primary)]"
            >
              <option value="">All rarities</option>
              {rarityOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-[var(--gv-text-secondary)]">
            Finish
            <select
              name="finish"
              defaultValue={activeFinish ?? ""}
              className="gv-control-surface min-w-0 rounded-md px-2.5 py-2 text-sm text-[var(--gv-text-primary)]"
            >
              <option value="">All finishes</option>
              {finishOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-[var(--gv-text-secondary)]">
            Sort
            <select
              name="sort"
              defaultValue={activeSort}
              className="gv-control-surface min-w-0 rounded-md px-2.5 py-2 text-sm text-[var(--gv-text-primary)]"
            >
              <option value="set">Set and number</option>
              <option value="name">Card name</option>
              <option value="rarity">Rarity</option>
              <option value="owned">Most copies</option>
              <option value="missing">Missing first</option>
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="gv-primary-button min-h-0 rounded-md px-3 py-2 text-sm"
            >
              Apply
            </button>
            {hasFilters ? (
              <Link
                href={browseHref(detail.slug, {
                  ...browseState,
                  set: null,
                  rarity: null,
                  finish: null,
                })}
                className="gv-secondary-button min-h-0 rounded-md px-3 py-2 text-sm"
              >
                Clear
              </Link>
            ) : null}
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--gv-border-hairline)] pt-3">
          <p className="text-xs text-[var(--gv-text-tertiary)]">
            {hasFilters ? `${visibleCards.length} matching card prints` : `${viewCards.length} card prints in this view`}
          </p>
          <div className="flex items-center gap-1" aria-label="Card layout">
            {([
              { layout: "detailed", label: "Detailed" },
              { layout: "compact", label: "Compact" },
              { layout: "grid", label: "Grid" },
            ] satisfies Array<{ layout: DexCardLayout; label: string }>).map((option) => {
              const isActive = option.layout === activeLayout;
              return (
                <Link
                  key={option.layout}
                  href={browseHref(detail.slug, {
                    ...browseState,
                    page: activePage,
                    layout: option.layout,
                  })}
                  aria-current={isActive ? "page" : undefined}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
                    isActive
                      ? "bg-[var(--gv-text-primary)] text-[var(--gv-surface-page)]"
                      : "border border-[var(--gv-border-hairline)] bg-[var(--gv-surface-base)] text-[var(--gv-text-secondary)] hover:text-[var(--gv-text-primary)]"
                  }`}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className={activeLayout === "grid" ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3" : "space-y-3"}>
        {pageCards.map((card) => {
          const totalOptions = Math.max(1, card.printings.length);
          const ownedOptions = card.printings.length > 0
            ? card.printings.filter((printing) => printing.ownedCount > 0).length
            : card.isOwned
              ? 1
              : 0;
          const missingOptions = Math.max(0, totalOptions - ownedOptions);
          const articleClassName =
            activeLayout === "grid"
              ? "grid grid-cols-[76px_minmax(0,1fr)] gap-3 rounded-lg border border-[var(--gv-border-hairline)] bg-[var(--gv-surface-base)] p-3 shadow-sm"
              : activeLayout === "compact"
                ? "grid grid-cols-[64px_minmax(0,1fr)] gap-3 rounded-lg border border-[var(--gv-border-hairline)] bg-[var(--gv-surface-base)] p-3 shadow-sm md:grid-cols-[64px_minmax(0,1fr)_minmax(220px,320px)]"
                : "grid gap-4 rounded-lg border border-[var(--gv-border-hairline)] bg-[var(--gv-surface-base)] p-3 shadow-sm md:grid-cols-[92px_minmax(0,1fr)_minmax(260px,380px)]";
          const variantClassName =
            activeLayout === "grid"
              ? "col-span-2 border-t border-[var(--gv-border-soft)] pt-3"
              : activeLayout === "compact"
                ? "col-span-2 border-t border-[var(--gv-border-soft)] pt-3 md:col-span-1 md:border-l md:border-t-0 md:pl-3 md:pt-0"
                : "border-t border-[var(--gv-border-soft)] pt-3 md:border-l md:border-t-0 md:pl-4 md:pt-0";
          const imageSizes =
            activeLayout === "grid" ? "76px" : activeLayout === "compact" ? "64px" : "92px";
          const artwork = (
            <PublicCardImage
              src={card.imageUrl ?? undefined}
              fallbackSrc={card.imageFallbackUrls[0]}
              fallbackSources={card.imageFallbackUrls.slice(1)}
              alt={card.name}
              loading="lazy"
              decoding="async"
              imageClassName="h-full w-full object-contain"
              fallbackClassName="flex h-full w-full items-center justify-center bg-[var(--gv-surface-container)] px-2 text-center text-[10px] text-[var(--gv-text-tertiary)]"
              fallbackLabel={card.name}
              sizes={imageSizes}
            />
          );
          const artworkClassName =
            "block aspect-[3/4] self-start overflow-hidden rounded-md border border-[var(--gv-border-hairline)] bg-[var(--gv-surface-container)]";

          return (
            <article key={`${card.cardPrintId}:${card.role}`} className={articleClassName}>
              {card.gvId ? (
                <Link href={`/card/${card.gvId}`} className={artworkClassName}>
                  {artwork}
                </Link>
              ) : (
                <div className={artworkClassName}>{artwork}</div>
              )}

              <div className={activeLayout === "compact" ? "min-w-0 space-y-2" : "min-w-0 space-y-3"}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold leading-6 text-[var(--gv-text-primary)]">{card.name}</h2>
                    <p className="mt-1 text-sm text-[var(--gv-text-tertiary)]">
                      {[card.setName ?? card.setCode, card.number ? `#${card.number}` : null, card.rarity].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                    card.isOwned
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/35 dark:bg-emerald-400/15 dark:text-emerald-100"
                      : "border-[var(--gv-border-hairline)] bg-[var(--gv-surface-container)] text-[var(--gv-text-secondary)]"
                  }`}
                  >
                    {card.isOwned ? `${card.ownedCount} owned` : "Missing print"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {card.printLabel ? (
                    <span className="inline-flex rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900 dark:border-amber-400/35 dark:bg-amber-400/15 dark:text-amber-100">
                      {card.printLabel}
                    </span>
                  ) : null}
                  <span className="inline-flex rounded-md border border-[var(--gv-border-hairline)] bg-[var(--gv-surface-base)] px-2 py-1 text-xs font-medium text-[var(--gv-text-secondary)]">
                    {ownedOptions}/{totalOptions} options owned
                  </span>
                  {missingOptions > 0 ? (
                    <span className="inline-flex rounded-md border border-[var(--gv-border-hairline)] bg-[var(--gv-surface-container)] px-2 py-1 text-xs font-medium text-[var(--gv-text-tertiary)]">
                      {missingOptions} missing
                    </span>
                  ) : null}
                </div>

                {card.unassignedPrintingCount > 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-400/35 dark:bg-amber-400/15 dark:text-amber-100">
                    <span className="font-medium">
                      {card.unassignedPrintingCount} owned{" "}
                      {card.unassignedPrintingCount === 1 ? "copy needs" : "copies need"} a finish selection.
                    </span>
                    <Link
                      href={`/vault/card/${encodeURIComponent(card.cardPrintId)}`}
                      className="font-semibold underline underline-offset-2 hover:text-amber-700 dark:hover:text-amber-200"
                    >
                      Manage copies
                    </Link>
                  </div>
                ) : null}

                {card.gvId ? (
                  <Link href={`/card/${card.gvId}`} className="inline-flex text-sm font-medium text-[var(--gv-text-secondary)] underline-offset-4 hover:text-[var(--gv-text-primary)] hover:underline">
                    {card.isOwned ? "View card" : "Find card"}
                  </Link>
                ) : null}
              </div>

              <div className={variantClassName}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--gv-text-tertiary)]">Variant Options</p>
                  <p className="text-xs font-medium text-[var(--gv-text-tertiary)]">{ownedOptions}/{totalOptions}</p>
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
                            ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-100"
                            : "bg-[var(--gv-surface-container)] text-[var(--gv-text-secondary)]"
                        }`}
                      >
                        <span className="truncate">{printing.finishName}</span>
                        <span className={isOwned ? "text-emerald-700 dark:text-emerald-200" : "text-[var(--gv-text-tertiary)]"}>
                          {isOwned ? `${printing.ownedCount}x` : "Missing"}
                        </span>
                      </span>
                    );
                  })}
                  </div>
                ) : (
                  <div className={`flex items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-xs font-medium ${
                    card.isOwned
                      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-100"
                      : "bg-[var(--gv-surface-container)] text-[var(--gv-text-secondary)]"
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
          <div className={`rounded-lg border border-[var(--gv-border-hairline)] bg-[var(--gv-surface-base)] p-6 text-sm text-[var(--gv-text-tertiary)] ${
            activeLayout === "grid" ? "sm:col-span-2 xl:col-span-3" : ""
          }`}
          >
            No card prints match this view and its filters.
          </div>
        ) : null}
      </section>

      {pageCount > 1 ? (
        <nav aria-label="Card result pages" className="flex items-center justify-between gap-3 border-t border-[var(--gv-border-soft)] pt-4 text-sm">
          {activePage > 1 ? (
            <Link
              href={browseHref(detail.slug, { ...browseState, page: activePage - 1 })}
              className="gv-secondary-button min-h-0 rounded-md px-3 py-2"
            >
              Previous
            </Link>
          ) : (
            <span className="rounded-md border border-[var(--gv-border-hairline)] bg-[var(--gv-surface-soft)] px-3 py-2 text-[var(--gv-text-tertiary)]" aria-disabled="true">
              Previous
            </span>
          )}
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--gv-text-tertiary)]">
            Page {activePage} of {pageCount}
          </span>
          {activePage < pageCount ? (
            <Link
              href={browseHref(detail.slug, { ...browseState, page: activePage + 1 })}
              className="gv-secondary-button min-h-0 rounded-md px-3 py-2"
            >
              Next
            </Link>
          ) : (
            <span className="rounded-md border border-[var(--gv-border-hairline)] bg-[var(--gv-surface-soft)] px-3 py-2 text-[var(--gv-text-tertiary)]" aria-disabled="true">
              Next
            </span>
          )}
        </nav>
      ) : null}
    </main>
  );
}
