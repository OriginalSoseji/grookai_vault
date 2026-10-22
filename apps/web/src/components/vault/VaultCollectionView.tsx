"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import PokemonCardGridTile from "@/components/cards/PokemonCardGridTile";
import { getPokemonCardCollectionGridClassName } from "@/components/cards/pokemonCardGridLayout";
import { SearchToolbar, SearchToolbarButton, SearchToolbarInput } from "@/components/common/SearchToolbar";
import { ViewDensityToggle } from "@/components/collection/ViewDensityToggle";
import PageIntro from "@/components/layout/PageIntro";
import PageSection from "@/components/layout/PageSection";
import ProductState from "@/components/layout/ProductState";
import SectionHeader from "@/components/layout/SectionHeader";
import { CollectorPageActivationCard } from "@/components/vault/CollectorPageActivationCard";
import { formatVaultCurrency } from "@/components/vault/VaultCardPrimitives";
import { VaultMobileToolbar } from "@/components/vault/VaultMobileToolbar";
import { VaultMobileViews } from "@/components/vault/VaultMobileViews";
import { VaultCardTile, type VaultCardData } from "@/components/vault/VaultCardTile";
import { resolveDisplayIdentity } from "@/lib/cards/resolveDisplayIdentity";
import { useVaultMobileViewMode } from "@/hooks/useVaultMobileViewMode";
import { useViewDensity, type ViewDensity } from "@/hooks/useViewDensity";
import type { ReactNode } from "react";
import { addCardReturnPath } from "@/lib/navigation/cardDetailNavigation";
import { OwnedSealedPanel } from "@/components/vault/OwnedSealedPanel";
import { combineUsdTotal, sealedOwnershipEnabled, type SealedTotals } from "@/lib/sealed/ownedSealedV1";

export type RecentCardData = {
  id: string;
  gv_id: string;
  name: string;
  display_name: string;
  set_code: string;
  set_name: string;
  number: string;
  created_at: string | null;
  image_url?: string;
};

type SmartViewKey = "all" | "duplicates" | "recent" | "by-set" | "pokemon" | "shared";

type VaultHeaderValueSummary = {
  totalEstimatedValue: number | null;
  pricedGroupedCount: number;
  totalGroupedCount: number;
  pricedCopyCount: number;
  totalRawCopyCount: number;
  unpricedCopyCount: number;
  latestPricingUpdateAt: string | null;
};

type SetGroup = {
  setCode: string;
  setName: string;
  items: VaultCardData[];
};

const COLLECTOR_PAGE_ACTIVATION_MIN_UNIQUE_CARDS = 6;
const VAULT_PAGE_SIZE = 24;
const VAULT_FULL_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const VAULT_SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function parseVaultPage(value: string | null) {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}
function parseVaultView(value: string | null): SmartViewKey {
  return value === "duplicates" ||
    value === "recent" ||
    value === "by-set" ||
    value === "pokemon" ||
    value === "shared"
    ? value
    : "all";
}
function VaultPagination({
  page,
  totalPages,
  totalItems,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const firstItem = (page - 1) * VAULT_PAGE_SIZE + 1;
  const lastItem = Math.min(page * VAULT_PAGE_SIZE, totalItems);

  return (
    <nav className="gv-vault-pagination" aria-label="Vault card pages">
      <p className="gv-vault-pagination__status" aria-live="polite">
        Showing {firstItem}–{lastItem} of {totalItems}
      </p>
      <div className="gv-vault-pagination__controls">
        <button
          type="button"
          className="gv-secondary-button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <span className="gv-vault-pagination__page" aria-current="page">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          className="gv-secondary-button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </nav>
  );
}

function formatTimeAgo(value: string | null) {
  if (!value) return "Recently";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  const diffMs = Date.now() - date.getTime();
  const diffSeconds = Math.max(1, Math.floor(diffMs / 1000));

  if (diffSeconds < 60) return `${diffSeconds}s ago`;

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;

  return VAULT_FULL_DATE_FORMATTER.format(date);
}

function formatLastAdded(value: string | null) {
  if (!value) {
    return "No cards yet";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfTarget.getTime()) / 86400000);
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.max(1, Math.floor(diffMs / 3600000));

  if (diffDays === 0) {
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    }

    return "Today";
  }

  if (diffDays === 1) {
    return "Yesterday";
  }

  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  return (date.getFullYear() !== now.getFullYear()
    ? VAULT_FULL_DATE_FORMATTER
    : VAULT_SHORT_DATE_FORMATTER
  ).format(date);
}

function formatPricingFreshness(value: string | null) {
  if (!value) {
    return "Updated recently";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Updated recently";
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) {
    return `Updated ${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `Updated ${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `Updated ${diffDays}d ago`;
  }

  const formatter = date.getFullYear() !== new Date().getFullYear()
    ? VAULT_FULL_DATE_FORMATTER
    : VAULT_SHORT_DATE_FORMATTER;
  return `Updated ${formatter.format(date)}`;
}

function SmartViewButton({
  label,
  count,
  selected,
  onClick,
}: {
  label: string;
  count?: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
        selected
          ? "border border-slate-200 bg-white text-slate-950 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.35)] dark:border-slate-700 dark:bg-slate-100 dark:text-slate-950"
          : "border border-transparent text-slate-500 hover:bg-white/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-slate-100"
      }`}
    >
      <span>{label}</span>
      {typeof count === "number" ? <span className="ml-1.5 text-slate-400">{count}</span> : null}
    </button>
  );
}

function ViewEmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return <ProductState compact title={title} description={body} />;
}

function getVaultRowRuntimeKey(item: Pick<VaultCardData, "card_id">) {
  return item.card_id;
}

function renderVaultGrid(
  items: VaultCardData[],
  returnPath: string,
  density: ViewDensity,
  setLogoPathByCode: Record<string, string>,
  expandedCardId: string | null,
  onExpansionToggle: (item: VaultCardData) => void,
) {
  return (
    <div className={`${getPokemonCardCollectionGridClassName(density)} gv-vault-card-grid gv-vault-card-grid--${density}`}>
      {items.map((item) => {
        const rowKey = getVaultRowRuntimeKey(item);
        return (
          <VaultCardTile
            key={item.id}
            item={item}
            returnPath={returnPath}
            density={density}
            logoPath={setLogoPathByCode[item.set_code.trim().toLowerCase()] ?? undefined}
            isExpanded={expandedCardId === rowKey}
            onExpansionToggle={onExpansionToggle}
          />
        );
      })}
    </div>
  );
}

type VaultCollectionViewProps = {
  bindersEnabled: boolean;
  initialItems: VaultCardData[];
  recent: RecentCardData[];
  itemsError?: string | null;
  recentError?: string | null;
  valueSummary: VaultHeaderValueSummary;
  publicProfileHref?: string | null;
  publicCollectionHref?: string | null;
  setLogoPathByCode?: Record<string, string>;
};

export function VaultCollectionView({
  bindersEnabled,
  initialItems,
  recent,
  itemsError,
  recentError,
  valueSummary,
  publicProfileHref = null,
  setLogoPathByCode = {},
}: VaultCollectionViewProps) {
  const searchParams = useSearchParams();
  const { density, setDensity } = useViewDensity();
  const { mode: mobileViewMode, setMode: setMobileViewMode } = useVaultMobileViewMode();
  const [items, setItems] = useState(initialItems);
  const [sealedTotals, setSealedTotals] = useState<SealedTotals | null>(null);
  const [vaultReturnPath, setVaultReturnPath] = useState(() =>
    searchParams.toString() ? `/vault?${searchParams.toString()}` : "/vault",
  );
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") ?? "");
  const [pokemonQuery, setPokemonQuery] = useState(() => searchParams.get("pokemon") ?? "");
  const [activeView, setActiveView] = useState<SmartViewKey>(() => parseVaultView(searchParams.get("view")));
  const [currentPage, setCurrentPage] = useState(() => parseVaultPage(searchParams.get("page")));

  useEffect(() => {
    setItems(initialItems);
    setExpandedCardId((current) => {
      if (!current) {
        return null;
      }

      return initialItems.some((item) => getVaultRowRuntimeKey(item) === current) ? current : null;
    });
  }, [initialItems]);

  const summary = useMemo(() => {
    const cards = items.reduce((sum, item) => sum + item.owned_count, 0);
    const uniqueCards = items.length;
    const sets = new Set(
      items.map((item) => item.set_name.trim() || item.set_code.trim() || "Unknown set"),
    ).size;
    const latestTimestamp = items.reduce<string | null>((latest, item) => {
      if (!item.created_at) {
        return latest;
      }

      if (!latest) {
        return item.created_at;
      }

      return new Date(item.created_at).getTime() > new Date(latest).getTime() ? item.created_at : latest;
    }, null);

    return {
      cards,
      uniqueCards,
      sets,
      lastAdded: formatLastAdded(latestTimestamp),
    };
  }, [items]);

  const collectorPageActivationVariant =
    summary.uniqueCards >= COLLECTOR_PAGE_ACTIVATION_MIN_UNIQUE_CARDS
      ? publicProfileHref
        ? "live"
        : "setup"
      : null;
  const collectorPageActivationHref = publicProfileHref ?? "/account";
  const combinedValue = combineUsdTotal(valueSummary.totalEstimatedValue, sealedTotals);
  const formattedVaultValue =
    typeof combinedValue === "number"
      ? formatVaultCurrency(combinedValue)
      : null;
  const coverageLabel = `${valueSummary.pricedCopyCount + (sealedTotals?.priced_copy_count ?? 0)} / ${valueSummary.totalRawCopyCount + (sealedTotals?.active_copy_count ?? 0)}`;
  const freshnessLabel = formatPricingFreshness(valueSummary.latestPricingUpdateAt);

  const recentItems = useMemo(
    () =>
      [...items].sort((left, right) => {
        const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0;
        const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0;
        return rightTime - leftTime;
      }),
    [items],
  );

  const duplicateItems = useMemo(() => items.filter((item) => item.owned_count > 1), [items]);
  const wallItems = useMemo(() => items.filter((item) => item.in_play_count > 0), [items]);
  const pokemonSuggestionNames = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map((item) => item.name.trim())
            .filter((name) => name.length > 0),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [items],
  );
  const pokemonSuggestions = useMemo(() => {
    const query = pokemonQuery.trim().toLowerCase();
    if (!query) {
      return [];
    }

    return pokemonSuggestionNames
      .filter((name) => name.toLowerCase().includes(query))
      .slice(0, 10);
  }, [pokemonQuery, pokemonSuggestionNames]);

  const bySetGroups = useMemo<SetGroup[]>(() => {
    const groups = new Map<string, VaultCardData[]>();

    for (const item of recentItems) {
      const key = item.set_code.trim() || "Unknown set";
      const current = groups.get(key) ?? [];
      current.push(item);
      groups.set(key, current);
    }

    return Array.from(groups.entries())
      .map(([setCode, groupedItems]) => ({
        setCode,
        setName: groupedItems[0]?.set_name || setCode,
        items: groupedItems,
      }))
      .sort((left, right) => left.setCode.localeCompare(right.setCode));
  }, [recentItems]);

  const smartViews: Array<{ key: SmartViewKey; label: string; count?: number }> = [
    { key: "all", label: "All Cards", count: items.length },
    { key: "shared", label: "On Wall", count: wallItems.length },
    { key: "duplicates", label: "Duplicates", count: duplicateItems.length },
    { key: "recent", label: "Recently Added", count: recentItems.length },
    { key: "by-set", label: "By Set" },
    { key: "pokemon", label: "Pokémon", count: items.length },
  ];

  function applySearch(sourceItems: VaultCardData[]) {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return sourceItems;
    }

    return sourceItems.filter((item) => {
      const name = item.name?.toLowerCase() ?? "";
      const setName = item.set_name?.toLowerCase() ?? "";
      const set = item.set_code?.toLowerCase() ?? "";
      const number = item.number?.toLowerCase() ?? "";

      return name.includes(query) || setName.includes(query) || set.includes(query) || number.includes(query);
    });
  }

  function applyPokemonNameFilter(sourceItems: VaultCardData[]) {
    const query = pokemonQuery.trim().toLowerCase();
    if (!query) {
      return sourceItems;
    }

    return sourceItems.filter((item) => {
      const name = item.name?.toLowerCase() ?? "";
      return name.includes(query);
    });
  }

  function handleExpansionToggle(item: VaultCardData) {
    const rowKey = getVaultRowRuntimeKey(item);
    setExpandedCardId((current) => (current === rowKey ? null : rowKey));
  }

  function updateVaultUrl({
    page = currentPage,
    view = activeView,
    query = searchQuery,
    pokemon = pokemonQuery,
  }: {
    page?: number;
    view?: SmartViewKey;
    query?: string;
    pokemon?: string;
  }) {
    const url = new URL(window.location.href);

    if (page > 1) url.searchParams.set("page", String(page));
    else url.searchParams.delete("page");

    if (view !== "all") url.searchParams.set("view", view);
    else url.searchParams.delete("view");

    if (query.trim()) url.searchParams.set("q", query.trim());
    else url.searchParams.delete("q");

    if (view === "pokemon" && pokemon.trim()) url.searchParams.set("pokemon", pokemon.trim());
    else url.searchParams.delete("pokemon");

    window.history.replaceState(window.history.state, "", url);
    setVaultReturnPath(`/vault${url.search}`);
  }

  function handlePageChange(nextPage: number) {
    setCurrentPage(nextPage);
    setExpandedCardId(null);
    updateVaultUrl({ page: nextPage });
    document.getElementById("vault-cards")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  }

  function handleViewChange(nextView: SmartViewKey) {
    setActiveView(nextView);
    setCurrentPage(1);
    setExpandedCardId(null);
    updateVaultUrl({ page: 1, view: nextView });
  }

  function handleSearchChange(nextQuery: string) {
    setSearchQuery(nextQuery);
    setCurrentPage(1);
    updateVaultUrl({ page: 1, query: nextQuery });
  }

  function handlePokemonSearchChange(nextQuery: string) {
    setPokemonQuery(nextQuery);
    setCurrentPage(1);
    updateVaultUrl({ page: 1, pokemon: nextQuery });
  }

  function paginateItems(sourceItems: VaultCardData[], page: number) {
    const firstIndex = (page - 1) * VAULT_PAGE_SIZE;
    return sourceItems.slice(firstIndex, firstIndex + VAULT_PAGE_SIZE);
  }

  function renderMobileVaultItems(sourceItems: VaultCardData[]) {
    return (
      <VaultMobileViews
        items={sourceItems}
        mode={mobileViewMode}
        expandedCardId={expandedCardId}
        returnPath={vaultReturnPath}
        onExpansionToggle={handleExpansionToggle}
      />
    );
  }

  function renderMobileBySetGroups(groups: SetGroup[]) {
    return (
      <div className="space-y-6 md:hidden">
        {groups.map((group) => (
          <section key={group.setCode} className="space-y-3">
            <PageSection surface="subtle" spacing="compact" className="px-4 py-3.5">
              <div className="space-y-1">
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Set</p>
                <SectionHeader
                  title={<span className="text-base">{group.setName}</span>}
                  description={group.setCode}
                  actions={<p className="text-sm text-slate-500">{group.items.length} cards</p>}
                  className="gap-2"
                />
              </div>
            </PageSection>
            {renderMobileVaultItems(group.items)}
          </section>
        ))}
      </div>
    );
  }

  const activeSourceItems =
    activeView === "duplicates"
      ? applySearch(duplicateItems)
      : activeView === "recent"
        ? applySearch(recentItems)
        : activeView === "shared"
          ? applySearch(wallItems)
          : activeView === "by-set"
            ? bySetGroups.flatMap((group) => applySearch(group.items))
            : activeView === "pokemon"
              ? applyPokemonNameFilter(items)
              : applySearch(items);
  const activeResultCount = activeSourceItems.length;
  const activePageCount = Math.max(1, Math.ceil(activeResultCount / VAULT_PAGE_SIZE));
  const renderedPage = Math.min(currentPage, activePageCount);
  const visiblePageItems = paginateItems(activeSourceItems, renderedPage);

  let vaultContent: ReactNode = null;
  let mobileVaultContent: ReactNode = null;

  if (activeView === "duplicates") {
    const filteredDuplicateItems = activeSourceItems;
    const visibleDuplicateItems = visiblePageItems;
    vaultContent =
      filteredDuplicateItems.length > 0
        ? renderVaultGrid(visibleDuplicateItems, vaultReturnPath, density, setLogoPathByCode, expandedCardId, handleExpansionToggle)
        : searchQuery.trim().length > 0
          ? <ViewEmptyState title="No cards found in your vault." body="Try a different search or clear the current query." />
          : <ViewEmptyState title="No duplicate cards yet." body="Duplicate copies will appear here once you add more than one." />;
    mobileVaultContent =
      filteredDuplicateItems.length > 0
        ? renderMobileVaultItems(visibleDuplicateItems)
        : searchQuery.trim().length > 0
          ? <ViewEmptyState title="No cards found in your vault." body="Try a different search or clear the current query." />
          : <ViewEmptyState title="No duplicate cards yet." body="Duplicate copies will appear here once you add more than one." />;
  } else if (activeView === "recent") {
    const filteredRecentItems = activeSourceItems;
    const visibleRecentItems = visiblePageItems;
    vaultContent =
      filteredRecentItems.length > 0
        ? renderVaultGrid(visibleRecentItems, vaultReturnPath, density, setLogoPathByCode, expandedCardId, handleExpansionToggle)
        : searchQuery.trim().length > 0
          ? <ViewEmptyState title="No cards found in your vault." body="Try a different search or clear the current query." />
          : <ViewEmptyState title="No recent cards to show." body="New additions will appear here." />;
    mobileVaultContent =
      filteredRecentItems.length > 0
        ? renderMobileVaultItems(visibleRecentItems)
        : searchQuery.trim().length > 0
          ? <ViewEmptyState title="No cards found in your vault." body="Try a different search or clear the current query." />
          : <ViewEmptyState title="No recent cards to show." body="New additions will appear here." />;
  } else if (activeView === "shared") {
    const filteredWallItems = activeSourceItems;
    const visibleWallItems = visiblePageItems;
    vaultContent =
      filteredWallItems.length > 0
        ? renderVaultGrid(visibleWallItems, vaultReturnPath, density, setLogoPathByCode, expandedCardId, handleExpansionToggle)
        : searchQuery.trim().length > 0
          ? <ViewEmptyState title="No cards found in your vault." body="Try a different search or clear the current query." />
          : <ViewEmptyState title="No wall items yet" body="Copies marked Trade, Sell, or Showcase will appear here." />;
    mobileVaultContent =
      filteredWallItems.length > 0
        ? renderMobileVaultItems(visibleWallItems)
        : searchQuery.trim().length > 0
          ? <ViewEmptyState title="No cards found in your vault." body="Try a different search or clear the current query." />
          : <ViewEmptyState title="No wall items yet" body="Copies marked Trade, Sell, or Showcase will appear here." />;
  } else if (activeView === "by-set") {
    const filteredBySetGroups = bySetGroups
      .map((group) => ({
        ...group,
        items: applySearch(group.items),
      }))
      .filter((group) => group.items.length > 0);
    const visibleBySetGroups = visiblePageItems.reduce<SetGroup[]>((groups, item) => {
      const setCode = item.set_code.trim() || "Unknown set";
      const currentGroup = groups.at(-1);

      if (currentGroup?.setCode === setCode) {
        currentGroup.items.push(item);
        return groups;
      }

      groups.push({
        setCode,
        setName: item.set_name || setCode,
        items: [item],
      });
      return groups;
    }, []);

    vaultContent =
      filteredBySetGroups.length > 0 ? (
        <div className="space-y-8">
          {visibleBySetGroups.map((group) => (
            <section key={group.setCode} className="space-y-4">
              <PageSection surface="subtle" spacing="compact" className="px-5 py-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Set</p>
                  <SectionHeader
                    title={<span className="text-lg">{group.setName}</span>}
                    description={group.setCode}
                    actions={
                      <p className="text-sm text-slate-500">
                        {group.items.length} {group.items.length === 1 ? "card" : "cards"}
                      </p>
                    }
                    className="gap-2"
                  />
                </div>
              </PageSection>
              <div className="pt-1">
                {renderVaultGrid(group.items, vaultReturnPath, density, setLogoPathByCode, expandedCardId, handleExpansionToggle)}
              </div>
            </section>
          ))}
        </div>
      ) : searchQuery.trim().length > 0 ? (
        <ViewEmptyState title="No cards found in your vault." body="Try a different search or clear the current query." />
      ) : (
        <ViewEmptyState title="No cards found for this view." body="Set groups will appear as your collection grows." />
      );
    mobileVaultContent =
      filteredBySetGroups.length > 0 ? (
        renderMobileBySetGroups(visibleBySetGroups)
      ) : searchQuery.trim().length > 0 ? (
        <ViewEmptyState title="No cards found in your vault." body="Try a different search or clear the current query." />
      ) : (
        <ViewEmptyState title="No cards found for this view." body="Set groups will appear as your collection grows." />
      );
  } else if (activeView === "pokemon") {
    const filteredPokemonItems = activeSourceItems;
    const visiblePokemonItems = visiblePageItems;
    vaultContent = (
      <div className="space-y-4">
        <PageSection surface="subtle" spacing="compact" className="px-4 py-4">
          <div className="space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Pokémon Name</p>
            <SearchToolbar>
              <SearchToolbarInput
                id="pokemon-name-filter"
                type="search"
                name="pokemon"
                placeholder="Search Pokémon name…"
                value={pokemonQuery}
                aria-label="Search Pokémon name"
                autoComplete="off"
                onChange={(event) => handlePokemonSearchChange(event.target.value)}
                tone="default"
              />
            </SearchToolbar>
          </div>

          {pokemonSuggestions.length > 0 ? (
            <div className="mt-3 overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-sm">
              <div className="divide-y divide-slate-100">
                {pokemonSuggestions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handlePokemonSearchChange(name)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                  >
                    <span className="truncate">{name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </PageSection>

        {filteredPokemonItems.length > 0 ? (
          renderVaultGrid(visiblePokemonItems, vaultReturnPath, density, setLogoPathByCode, expandedCardId, handleExpansionToggle)
        ) : (
          <ViewEmptyState title="No matching cards" body="Try a different Pokémon name." />
        )}
      </div>
    );
    mobileVaultContent = (
      <div className="space-y-4 md:hidden">
        <PageSection surface="subtle" spacing="compact" className="px-4 py-4">
          <div className="space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Pokémon Name</p>
            <SearchToolbar>
              <SearchToolbarInput
                id="pokemon-name-filter-mobile"
                type="search"
                name="pokemon"
                placeholder="Search Pokémon name…"
                value={pokemonQuery}
                aria-label="Search Pokémon name"
                autoComplete="off"
                onChange={(event) => handlePokemonSearchChange(event.target.value)}
                tone="default"
              />
            </SearchToolbar>
          </div>

          {pokemonSuggestions.length > 0 ? (
            <div className="mt-3 overflow-hidden rounded-[1rem] border border-slate-200 bg-white shadow-sm">
              <div className="divide-y divide-slate-100">
                {pokemonSuggestions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handlePokemonSearchChange(name)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                  >
                    <span className="truncate">{name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </PageSection>

        {filteredPokemonItems.length > 0 ? (
          renderMobileVaultItems(visiblePokemonItems)
        ) : (
          <ViewEmptyState title="No matching cards" body="Try a different Pokémon name." />
        )}
      </div>
    );
  } else {
    const filteredItems = activeSourceItems;
    const visibleItems = visiblePageItems;
    vaultContent =
      filteredItems.length > 0 ? (
        renderVaultGrid(visibleItems, vaultReturnPath, density, setLogoPathByCode, expandedCardId, handleExpansionToggle)
      ) : (
        <ViewEmptyState title="No cards found in your vault." body="Try a different search or clear the current query." />
      );
    mobileVaultContent =
      filteredItems.length > 0 ? (
        renderMobileVaultItems(visibleItems)
      ) : (
        <ViewEmptyState title="No cards found in your vault." body="Try a different search or clear the current query." />
      );
  }

  return (
    <div className="gv-vault-page space-y-7 py-7 md:space-y-10 md:py-9">
      <section className="gv-vault-overview">
        <PageIntro
          title="grookai vault"
          eyebrow="Vault"
          description="Your collection, organized by exact printing."
          actions={
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/explore"
                className="gv-primary-button px-4 py-2.5 text-sm md:px-5"
              >
                Search Cards
              </Link>
              <Link
                href="/vault/import"
                className="gv-secondary-button px-4 py-2.5 text-sm md:px-5"
              >
                Import Collection
              </Link>
              {bindersEnabled ? (
                <Link
                  href="/binders"
                  className="px-2 py-2 text-sm font-medium text-slate-500 underline-offset-4 hover:text-slate-950 hover:underline dark:hover:text-slate-100"
                >
                  Binders
                </Link>
              ) : null}
            </div>
          }
        />
        <div className="gv-vault-summary mt-7">
          {valueSummary.totalGroupedCount > 0 || (sealedTotals?.active_copy_count ?? 0) > 0 ? (
          <div className="gv-vault-value py-5 md:py-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0 space-y-2.5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-400/90">
                  {sealedOwnershipEnabled && !sealedTotals ? "Card subtotal" : "Estimated Vault Value"}
                </p>
                <div className="space-y-1">
                  <p
                    className="text-[2.15rem] font-semibold text-slate-950 sm:text-[2.7rem]"
                    data-pricing-proof="vault-exact-total"
                    data-pricing-scope="vault_total"
                    data-vault-market-value-usd={
                      combinedValue ?? undefined
                    }
                    data-priced-copy-count={valueSummary.pricedCopyCount + (sealedTotals?.priced_copy_count ?? 0)}
                    data-unpriced-copy-count={valueSummary.unpricedCopyCount + (sealedTotals?.unpriced_copy_count ?? 0)}
                    data-total-raw-copy-count={valueSummary.totalRawCopyCount}
                    data-total-owned-copy-count={valueSummary.totalRawCopyCount + (sealedTotals?.active_copy_count ?? 0)}
                    data-sealed-total-loaded={!sealedOwnershipEnabled || sealedTotals != null}
                    data-published-at={
                      valueSummary.latestPricingUpdateAt ?? undefined
                    }
                    data-source-name="tcgplayer"
                    data-source-label="TCGPlayer Market"
                  >
                    {formattedVaultValue ?? "No estimate yet"}
                  </p>
                  {sealedOwnershipEnabled && !sealedTotals ? (
                    <p className="text-sm" role="status">Card subtotal shown. Sealed value not available yet.</p>
                  ) : null}
                  {sealedTotals ? (
                    <>
                      <p className="text-sm">
                        Cards {valueSummary.totalEstimatedValue == null ? "unpriced" : formatVaultCurrency(valueSummary.totalEstimatedValue)} + Sealed {sealedTotals.active_copy_count === 0 ? formatVaultCurrency(0) : sealedTotals.totals_by_currency.USD == null ? "unpriced" : formatVaultCurrency(sealedTotals.totals_by_currency.USD)}
                      </p>
                      <p className="text-sm">{sealedTotals.active_copy_count} sealed copies / {sealedTotals.unpriced_copy_count} unpriced</p>
                      {Object.entries(sealedTotals.totals_by_currency)
                        .filter(([currency]) => currency !== "USD")
                        .map(([currency, value]) => (
                          <p key={currency} className="text-sm">Sealed {currency} {value.toFixed(2)} (separate from USD total)</p>
                        ))}
                    </>
                  ) : null}
                  <p className="text-xs text-slate-400">TCGPlayer Market for eligible exact printings and sealed products.</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400 md:justify-end">
                <span>
                  Priced copies <span className="font-medium text-slate-600">{coverageLabel}</span>
                </span>
                <span className="hidden text-slate-300 sm:inline">•</span>
                <span>{freshnessLabel}</span>
              </div>
            </div>
          </div>
          ) : null}
        <div className="gv-vault-stats grid grid-cols-2 divide-x divide-slate-200/70 text-sm text-slate-500 dark:divide-slate-700/70 sm:grid-cols-4">
          <span className="px-4 py-2 font-medium text-slate-700 first:pl-0">
            {summary.cards} {summary.cards === 1 ? "card" : "cards"}
          </span>
          <span className="px-4 py-2">
            {summary.uniqueCards} unique
          </span>
          <span className="px-4 py-2">
            {summary.sets} {summary.sets === 1 ? "set" : "sets"}
          </span>
          <span className="px-4 py-2 text-slate-400">
            Last added {summary.lastAdded}
          </span>
        </div>
        </div>
      </section>

      {itemsError ? (
        <ProductState
          tone="error"
          eyebrow="Could not load your Vault"
          title="Your collection was not changed"
          description="Try this page again, or return to Search while the collection refreshes."
          action={<button type="button" className="gv-primary-button" onClick={() => window.location.reload()}>Try again</button>}
          secondaryAction={<Link href="/explore" className="gv-secondary-button">Search cards</Link>}
        />
      ) : items.length === 0 ? (sealedTotals?.active_copy_count ? null : (
        <ProductState
          eyebrow="No cards yet"
          title="Your Vault is ready"
          description="Add an exact card version from Search, or import an existing collection."
          action={<Link href="/explore" className="gv-primary-button">Search cards</Link>}
          secondaryAction={<Link href="/vault/import" className="gv-secondary-button">Import collection</Link>}
        />
      )) : (
        <PageSection spacing="default" className="space-y-6">
          <div id="vault-cards" className="scroll-mt-32">
            <SectionHeader
              title="Vault Cards"
              description="Cards currently in your collection."
            />
          </div>

          <div className="gv-command-surface hidden md:flex md:flex-row md:items-center md:justify-between md:gap-4 md:p-3.5">
            <SearchToolbar className="w-full sm:max-w-md">
              <SearchToolbarInput
                type="search"
                name="vault-search"
                placeholder="Search your Vault…"
                aria-label="Search your Vault"
                autoComplete="off"
                value={searchQuery}
                onChange={(event) => handleSearchChange(event.target.value)}
                tone="default"
              />
            </SearchToolbar>
            <div className="flex items-center gap-3">
              {searchQuery.trim().length > 0 ? (
                <SearchToolbarButton
                  type="button"
                  tone="secondary"
                  onClick={() => handleSearchChange("")}
                >
                  Clear search
                </SearchToolbarButton>
              ) : null}
              <ViewDensityToggle value={density} onChange={setDensity} />
            </div>
          </div>

          <VaultMobileToolbar
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            onClearSearch={() => handleSearchChange("")}
            mode={mobileViewMode}
            onModeChange={setMobileViewMode}
          />

          <PageSection
            spacing="compact"
            className="gv-command-surface p-2.5 md:p-3"
          >
            <div className="flex gap-1.5 overflow-x-auto md:flex-wrap">
              {smartViews.map((view) => (
                <SmartViewButton
                  key={view.key}
                  label={view.label}
                  count={view.count}
                  selected={activeView === view.key}
                  onClick={() => handleViewChange(view.key)}
                />
              ))}
            </div>
          </PageSection>

          <div data-vault-page-items>
            <div className="md:hidden">{mobileVaultContent}</div>
            <div className="hidden md:block">{vaultContent}</div>
          </div>
          <VaultPagination
            page={renderedPage}
            totalPages={activePageCount}
            totalItems={activeResultCount}
            onPageChange={handlePageChange}
          />
          {collectorPageActivationVariant ? (
            <CollectorPageActivationCard
              variant={collectorPageActivationVariant}
              href={collectorPageActivationHref}
            />
          ) : null}
        </PageSection>
      )}

      <OwnedSealedPanel onTotals={setSealedTotals} />

      <PageSection spacing="compact">
        <SectionHeader
          title="Recently Added"
          description="Recent additions to your collection."
          actions={
            <Link href="/wall" className="text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline">
              View wall
            </Link>
          }
        />

        {recentError ? (
          <ProductState
            compact
            tone="error"
            eyebrow="Recent activity unavailable"
            title="Your Vault cards are unaffected"
            description="Recent additions could not be refreshed right now."
          />
        ) : recent.length === 0 ? (
          <ProductState compact title="No recent additions" description="New cards will appear here after you import or add them." />
        ) : (
          <div className="flex gap-4 overflow-x-auto pt-0.5 pb-2">
            {recent.map((item) => (
              <PokemonCardGridTile
                key={item.id}
                className="min-w-[220px] max-w-[220px] flex-none rounded-[1.5rem] border-slate-200/80 bg-white/95 shadow-[0_20px_42px_-34px_rgba(15,23,42,0.28)]"
                imageSrc={item.image_url}
                imageAlt={item.display_name}
                imageHref={addCardReturnPath(`/card/${item.gv_id}`, vaultReturnPath)}
                imagePrefetch={false}
                imageFallbackLabel={item.display_name}
                imageClassName="drop-shadow-[0_14px_24px_rgba(15,23,42,0.14)]"
                title={
                  <Link href={addCardReturnPath(`/card/${item.gv_id}`, vaultReturnPath)} prefetch={false} className="line-clamp-2 block transition hover:text-slate-700">
                    {item.display_name}
                  </Link>
                }
                subtitle={
                  <span className="line-clamp-1 block">
                    {[item.set_name || item.set_code, item.number !== "—" ? `#${item.number}` : undefined]
                      .filter(Boolean)
                      .join(" • ")}
                  </span>
                }
                meta={<span>Added {formatTimeAgo(item.created_at)}</span>}
                footer={<span className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-slate-300">{item.gv_id}</span>}
              />
            ))}
          </div>
        )}
      </PageSection>
    </div>
  );
}
