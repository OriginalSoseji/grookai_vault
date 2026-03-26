"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import PokemonCardGridTile from "@/components/cards/PokemonCardGridTile";
import { getPokemonCardCollectionGridClassName } from "@/components/cards/pokemonCardGridLayout";
import { SearchToolbar, SearchToolbarButton, SearchToolbarInput } from "@/components/common/SearchToolbar";
import { ViewDensityToggle } from "@/components/collection/ViewDensityToggle";
import PageIntro from "@/components/layout/PageIntro";
import PageSection from "@/components/layout/PageSection";
import SectionHeader from "@/components/layout/SectionHeader";
import { PublicCollectionEmptyState } from "@/components/public/PublicCollectionEmptyState";
import { CollectorPageActivationCard } from "@/components/vault/CollectorPageActivationCard";
import { formatVaultCurrency } from "@/components/vault/VaultCardPrimitives";
import { VaultMobileToolbar } from "@/components/vault/VaultMobileToolbar";
import { VaultMobileViews } from "@/components/vault/VaultMobileViews";
import { VaultCardTile, type VaultCardData } from "@/components/vault/VaultCardTile";
import { useVaultMobileViewMode } from "@/hooks/useVaultMobileViewMode";
import { useViewDensity, type ViewDensity } from "@/hooks/useViewDensity";
import { toggleSharedCardPublicImageAction } from "@/lib/sharedCards/toggleSharedCardPublicImageAction";
import { saveSharedCardPublicNoteAction } from "@/lib/sharedCards/saveSharedCardPublicNoteAction";
import { saveSharedCardWallCategoryAction } from "@/lib/sharedCards/saveSharedCardWallCategoryAction";
import { toggleSharedCardAction } from "@/lib/sharedCards/toggleSharedCardAction";
import type { WallCategory } from "@/lib/sharedCards/wallCategories";
import type { ReactNode } from "react";

export type RecentCardData = {
  id: string;
  gv_id: string;
  name: string;
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
  latestPricingUpdateAt: string | null;
};

type SetGroup = {
  setCode: string;
  setName: string;
  items: VaultCardData[];
};

const COLLECTOR_PAGE_ACTIVATION_MIN_UNIQUE_CARDS = 6;
const PublicNoteModal = dynamic(
  () => import("@/components/vault/VaultDialogs").then((mod) => mod.PublicNoteModal),
  { ssr: false },
);

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

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
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

  return `Updated ${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  })}`;
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
          ? "border border-slate-200 bg-white text-slate-950 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.35)]"
          : "border border-transparent text-slate-500 hover:bg-white/80 hover:text-slate-900"
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
  return <PublicCollectionEmptyState title={title} body={body} />;
}

function renderVaultGrid(
  items: VaultCardData[],
  density: ViewDensity,
  setLogoPathByCode: Record<string, string>,
  pendingShareItemId: string | null,
  pendingWallCategoryItemId: string | null,
  pendingPublicImageKey: string | null,
  expandedCardId: string | null,
  shareErrors: Record<string, string>,
  publicCollectionHref: string | null,
  onShareToggle: (item: VaultCardData) => void,
  onWallCategoryChange: (item: VaultCardData, wallCategory: WallCategory | null) => void,
  onExpansionToggle: (item: VaultCardData) => void,
  onPublicNoteEdit: (item: VaultCardData) => void,
  onPublicImageToggle: (item: VaultCardData, side: "front" | "back", enabled: boolean) => void,
) {
  return (
    <div className={getPokemonCardCollectionGridClassName(density)}>
      {items.map((item) => {
        const rowKey = getVaultRowRuntimeKey(item);
        return (
        <VaultCardTile
          key={item.id}
          item={item}
          density={density}
          logoPath={setLogoPathByCode[item.set_code.trim().toLowerCase()] ?? undefined}
          isSharePending={pendingShareItemId === rowKey}
          isWallCategoryPending={pendingWallCategoryItemId === rowKey}
          isPublicFrontImagePending={pendingPublicImageKey === `${rowKey}:front`}
          isPublicBackImagePending={pendingPublicImageKey === `${rowKey}:back`}
          isExpanded={expandedCardId === rowKey}
          shareError={shareErrors[rowKey]}
          publicCollectionHref={item.is_shared ? publicCollectionHref : null}
          onShareToggle={onShareToggle}
          onWallCategoryChange={onWallCategoryChange}
          onExpansionToggle={onExpansionToggle}
          onPublicNoteEdit={onPublicNoteEdit}
          onPublicImageToggle={onPublicImageToggle}
        />
        );
      })}
    </div>
  );
}

function getVaultRowRuntimeKey(item: Pick<VaultCardData, "card_id">) {
  return item.card_id;
}

function applyOptimisticShareChange(items: VaultCardData[], rowKey: string, nextShared: boolean) {
  return items.map((item) =>
    getVaultRowRuntimeKey(item) === rowKey
      ? {
          ...item,
          is_shared: nextShared,
          wall_category: nextShared ? item.wall_category : null,
          public_note: nextShared ? item.public_note : null,
          show_personal_front: nextShared ? item.show_personal_front : false,
          show_personal_back: nextShared ? item.show_personal_back : false,
        }
      : item,
  );
}

function applyOptimisticPublicNoteChange(items: VaultCardData[], rowKey: string, publicNote: string | null) {
  return items.map((item) =>
    getVaultRowRuntimeKey(item) === rowKey
      ? {
          ...item,
          public_note: publicNote,
        }
      : item,
  );
}

function applyOptimisticWallCategoryChange(
  items: VaultCardData[],
  rowKey: string,
  wallCategory: WallCategory | null,
) {
  return items.map((item) =>
    getVaultRowRuntimeKey(item) === rowKey
      ? {
          ...item,
          wall_category: wallCategory,
        }
      : item,
  );
}

function findItemByRowRuntimeKey(items: VaultCardData[], rowKey: string) {
  return items.find((item) => getVaultRowRuntimeKey(item) === rowKey);
}

function applyOptimisticPublicImageChange(
  items: VaultCardData[],
  rowKey: string,
  side: "front" | "back",
  enabled: boolean,
) {
  return items.map((item) =>
    getVaultRowRuntimeKey(item) === rowKey
      ? {
          ...item,
          show_personal_front: side === "front" ? enabled : item.show_personal_front,
          show_personal_back: side === "back" ? enabled : item.show_personal_back,
        }
      : item,
  );
}

type VaultCollectionViewProps = {
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
  initialItems,
  recent,
  itemsError,
  recentError,
  valueSummary,
  publicProfileHref = null,
  publicCollectionHref = null,
  setLogoPathByCode = {},
}: VaultCollectionViewProps) {
  const router = useRouter();
  const { density, setDensity } = useViewDensity();
  const { mode: mobileViewMode, setMode: setMobileViewMode } = useVaultMobileViewMode();
  const [items, setItems] = useState(initialItems);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pokemonQuery, setPokemonQuery] = useState("");
  const [pendingShareItemId, setPendingShareItemId] = useState<string | null>(null);
  const [pendingWallCategoryItemId, setPendingWallCategoryItemId] = useState<string | null>(null);
  const [pendingPublicImageKey, setPendingPublicImageKey] = useState<string | null>(null);
  const [pendingPublicNoteItemId, setPendingPublicNoteItemId] = useState<string | null>(null);
  const [publicNoteItemId, setPublicNoteItemId] = useState<string | null>(null);
  const [publicNoteDraft, setPublicNoteDraft] = useState("");
  const [publicNoteError, setPublicNoteError] = useState<string | null>(null);
  const [shareErrors, setShareErrors] = useState<Record<string, string>>({});
  const [activeView, setActiveView] = useState<SmartViewKey>("all");
  const [, startTransition] = useTransition();

  useEffect(() => {
    setItems(initialItems);
    setExpandedCardId((current) => {
      if (!current) {
        return null;
      }

      return initialItems.some((item) => getVaultRowRuntimeKey(item) === current) ? current : null;
    });
    setPokemonQuery("");
    setPendingShareItemId(null);
    setPendingWallCategoryItemId(null);
    setPendingPublicImageKey(null);
    setPendingPublicNoteItemId(null);
    setPublicNoteItemId(null);
    setPublicNoteDraft("");
    setPublicNoteError(null);
    setShareErrors({});
  }, [initialItems]);

  const summary = useMemo(() => {
    const cards = items.reduce((sum, item) => sum + item.owned_count, 0);
    const uniqueCards = items.length;
    const sets = new Set(items.map((item) => item.set_code.trim() || "Unknown set")).size;
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
  const formattedVaultValue =
    typeof valueSummary.totalEstimatedValue === "number"
      ? formatVaultCurrency(valueSummary.totalEstimatedValue)
      : null;
  const coverageLabel = `${valueSummary.pricedGroupedCount} / ${valueSummary.totalGroupedCount}`;
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
  const sharedItems = useMemo(() => items.filter((item) => item.is_shared), [items]);
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
    { key: "shared", label: "On Wall", count: sharedItems.length },
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

  function handleShareToggle(item: VaultCardData) {
    if (pendingShareItemId || pendingWallCategoryItemId || pendingPublicImageKey) {
      return;
    }

    const currentItems = items;
    const rowKey = getVaultRowRuntimeKey(item);
    const nextShared = !item.is_shared;

    setShareErrors((current) => {
      const next = { ...current };
      delete next[rowKey];
      return next;
    });
    setPendingShareItemId(rowKey);
    setItems(applyOptimisticShareChange(currentItems, rowKey, nextShared));

    startTransition(async () => {
      try {
        const result = await toggleSharedCardAction({
          itemId: item.vault_item_id,
          gvViId: item.gv_vi_id,
          nextShared,
        });

        if (!result.ok) {
          setItems(currentItems);
          setShareErrors((current) => ({
            ...current,
            [rowKey]: result.message,
          }));
          return;
        }

        setItems((current) => applyOptimisticShareChange(current, rowKey, result.status === "shared"));
        router.refresh();
      } catch (error) {
        setItems(currentItems);
        setShareErrors((current) => ({
          ...current,
          [rowKey]: "Couldn’t update wall state.",
        }));
      } finally {
        setPendingShareItemId(null);
      }
    });
  }

  function handleWallCategoryChange(item: VaultCardData, wallCategory: WallCategory | null) {
    if (!item.is_shared || pendingWallCategoryItemId || pendingShareItemId || pendingPublicImageKey) {
      return;
    }

    const rowKey = getVaultRowRuntimeKey(item);
    const currentItems = items;

    setShareErrors((current) => {
      const next = { ...current };
      delete next[rowKey];
      return next;
    });
    setPendingWallCategoryItemId(rowKey);
    setItems(applyOptimisticWallCategoryChange(currentItems, rowKey, wallCategory));

    startTransition(async () => {
      try {
        const result = await saveSharedCardWallCategoryAction({
          itemId: item.vault_item_id,
          gvViId: item.gv_vi_id,
          wallCategory,
        });

        if (!result.ok) {
          setItems(currentItems);
          setShareErrors((current) => ({
            ...current,
            [rowKey]: result.message,
          }));
          return;
        }

        setItems((current) => applyOptimisticWallCategoryChange(current, rowKey, result.wallCategory));
        router.refresh();
      } catch (error) {
        setItems(currentItems);
        setShareErrors((current) => ({
          ...current,
          [rowKey]: "Couldn’t save wall category.",
        }));
      } finally {
        setPendingWallCategoryItemId(null);
      }
    });
  }

  function handleExpansionToggle(item: VaultCardData) {
    const rowKey = getVaultRowRuntimeKey(item);
    setExpandedCardId((current) => (current === rowKey ? null : rowKey));
  }

  function handlePublicImageToggle(item: VaultCardData, side: "front" | "back", enabled: boolean) {
    if (!item.is_shared || pendingPublicImageKey || pendingWallCategoryItemId || pendingShareItemId) {
      return;
    }

    const hasPhoto = side === "front" ? item.has_front_photo : item.has_back_photo;
    const rowKey = getVaultRowRuntimeKey(item);
    if (enabled && !hasPhoto) {
      setShareErrors((current) => ({
        ...current,
        [rowKey]: "Upload a card photo in your vault to enable this.",
      }));
      return;
    }

    const currentItems = items;
    const pendingKey = `${rowKey}:${side}`;

    setShareErrors((current) => {
      const next = { ...current };
      delete next[rowKey];
      return next;
    });
    setPendingPublicImageKey(pendingKey);
    setItems(applyOptimisticPublicImageChange(currentItems, rowKey, side, enabled));

    startTransition(async () => {
      try {
        const result = await toggleSharedCardPublicImageAction({
          cardId: item.card_id,
          side,
          enabled,
        });

        if (!result.ok) {
          setItems(currentItems);
          setShareErrors((current) => ({
            ...current,
            [rowKey]: result.message,
          }));
          return;
        }

        setItems((current) => applyOptimisticPublicImageChange(current, rowKey, side, result.enabled));
        router.refresh();
      } catch (error) {
        setItems(currentItems);
        setShareErrors((current) => ({
          ...current,
          [rowKey]: "Couldn’t update public image settings.",
        }));
      } finally {
        setPendingPublicImageKey(null);
      }
    });
  }

  function handleOpenPublicNote(item: VaultCardData) {
    if (!item.is_shared || pendingPublicNoteItemId || pendingWallCategoryItemId || pendingShareItemId || pendingPublicImageKey) {
      return;
    }

    setPublicNoteItemId(getVaultRowRuntimeKey(item));
    setPublicNoteDraft(item.public_note ?? "");
    setPublicNoteError(null);
  }

  function handleCancelPublicNote() {
    if (pendingPublicNoteItemId) {
      return;
    }

    setPublicNoteItemId(null);
    setPublicNoteDraft("");
    setPublicNoteError(null);
  }

  function handleSavePublicNote() {
    if (!publicNoteItemId || pendingPublicNoteItemId || pendingWallCategoryItemId) {
      return;
    }

    const currentItems = items;
    const targetItem = findItemByRowRuntimeKey(currentItems, publicNoteItemId);
    const nextPublicNote = publicNoteDraft.trim().length > 0 ? publicNoteDraft.trim() : null;

    setPendingPublicNoteItemId(publicNoteItemId);
    setPublicNoteError(null);
    setItems(applyOptimisticPublicNoteChange(currentItems, publicNoteItemId, nextPublicNote));

    startTransition(async () => {
      try {
        const result = await saveSharedCardPublicNoteAction({
          itemId: targetItem?.vault_item_id,
          gvViId: targetItem?.gv_vi_id ?? null,
          note: publicNoteDraft,
        });

        if (!result.ok) {
          setItems(currentItems);
          setPublicNoteError(result.message);
          return;
        }

        setItems((current) => applyOptimisticPublicNoteChange(current, publicNoteItemId, result.publicNote));
        setPublicNoteItemId(null);
        setPublicNoteDraft("");
        router.refresh();
      } catch (error) {
        setItems(currentItems);
        setPublicNoteError("Couldn’t save public note.");
      } finally {
        setPendingPublicNoteItemId(null);
      }
    });
  }

  function renderMobileVaultItems(sourceItems: VaultCardData[]) {
    return (
      <VaultMobileViews
        items={sourceItems}
        mode={mobileViewMode}
        pendingShareItemId={pendingShareItemId}
        pendingWallCategoryItemId={pendingWallCategoryItemId}
        pendingPublicImageKey={pendingPublicImageKey}
        expandedCardId={expandedCardId}
        shareErrors={shareErrors}
        publicCollectionHref={publicCollectionHref}
        onExpansionToggle={handleExpansionToggle}
        onShareToggle={handleShareToggle}
        onWallCategoryChange={handleWallCategoryChange}
        onPublicNoteEdit={handleOpenPublicNote}
        onPublicImageToggle={handlePublicImageToggle}
      />
    );
  }

  function renderMobileBySetGroups(sourceGroups: SetGroup[]) {
    return (
      <div className="space-y-5 md:hidden">
        {sourceGroups.map((group) => (
          <section key={group.setCode} className="space-y-3">
            <PageSection surface="subtle" spacing="compact" className="px-4 py-3">
              <div className="space-y-1">
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Set</p>
                <SectionHeader
                  title={<span className="text-base">{group.setName}</span>}
                  description={<span className="text-xs">{group.setCode}</span>}
                  actions={
                    <span className="text-xs text-slate-500">
                      {group.items.length} {group.items.length === 1 ? "card" : "cards"}
                    </span>
                  }
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

  let vaultContent: ReactNode;
  let mobileVaultContent: ReactNode;

  if (activeView === "duplicates") {
    const filteredDuplicateItems = applySearch(duplicateItems);
    vaultContent =
      filteredDuplicateItems.length > 0
        ? renderVaultGrid(
            filteredDuplicateItems,
            density,
            setLogoPathByCode,
            pendingShareItemId,
            pendingWallCategoryItemId,
            pendingPublicImageKey,
            expandedCardId,
            shareErrors,
            publicCollectionHref,
            handleShareToggle,
            handleWallCategoryChange,
            handleExpansionToggle,
            handleOpenPublicNote,
            handlePublicImageToggle,
          )
        : searchQuery.trim().length > 0
        ? <ViewEmptyState title="No cards found in your vault." body="Try a different search or clear the current query." />
        : (
            <ViewEmptyState title="No duplicates yet." body="Cards with extra copies will appear here." />
          );
    mobileVaultContent =
      filteredDuplicateItems.length > 0
        ? renderMobileVaultItems(filteredDuplicateItems)
        : searchQuery.trim().length > 0
          ? <ViewEmptyState title="No cards found in your vault." body="Try a different search or clear the current query." />
          : <ViewEmptyState title="No duplicates yet." body="Cards with extra copies will appear here." />;
  } else if (activeView === "recent") {
    const filteredRecentItems = applySearch(recentItems);
    vaultContent =
      filteredRecentItems.length > 0
        ? renderVaultGrid(
            filteredRecentItems,
            density,
            setLogoPathByCode,
            pendingShareItemId,
            pendingWallCategoryItemId,
            pendingPublicImageKey,
            expandedCardId,
            shareErrors,
            publicCollectionHref,
            handleShareToggle,
            handleWallCategoryChange,
            handleExpansionToggle,
            handleOpenPublicNote,
            handlePublicImageToggle,
          )
        : searchQuery.trim().length > 0
        ? <ViewEmptyState title="No cards found in your vault." body="Try a different search or clear the current query." />
        : (
            <ViewEmptyState title="No recent cards to show." body="New additions will appear here." />
          );
    mobileVaultContent =
      filteredRecentItems.length > 0
        ? renderMobileVaultItems(filteredRecentItems)
        : searchQuery.trim().length > 0
          ? <ViewEmptyState title="No cards found in your vault." body="Try a different search or clear the current query." />
          : <ViewEmptyState title="No recent cards to show." body="New additions will appear here." />;
  } else if (activeView === "shared") {
    const filteredSharedItems = applySearch(sharedItems);
    vaultContent =
      filteredSharedItems.length > 0
        ? renderVaultGrid(
            filteredSharedItems,
            density,
            setLogoPathByCode,
            pendingShareItemId,
            pendingWallCategoryItemId,
            pendingPublicImageKey,
            expandedCardId,
            shareErrors,
            publicCollectionHref,
            handleShareToggle,
            handleWallCategoryChange,
            handleExpansionToggle,
            handleOpenPublicNote,
            handlePublicImageToggle,
          )
        : searchQuery.trim().length > 0
        ? <ViewEmptyState title="No cards found in your vault." body="Try a different search or clear the current query." />
        : (
            <ViewEmptyState title="No wall items yet" body="Cards you add to your wall will appear here." />
          );
    mobileVaultContent =
      filteredSharedItems.length > 0
        ? renderMobileVaultItems(filteredSharedItems)
        : searchQuery.trim().length > 0
          ? <ViewEmptyState title="No cards found in your vault." body="Try a different search or clear the current query." />
          : <ViewEmptyState title="No wall items yet" body="Cards you add to your wall will appear here." />;
  } else if (activeView === "by-set") {
    const filteredBySetGroups = bySetGroups
      .map((group) => ({
        ...group,
        items: applySearch(group.items),
      }))
      .filter((group) => group.items.length > 0);

    vaultContent =
      filteredBySetGroups.length > 0 ? (
        <div className="space-y-8">
          {filteredBySetGroups.map((group) => (
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
                {renderVaultGrid(
                  group.items,
                  density,
                  setLogoPathByCode,
                  pendingShareItemId,
                  pendingWallCategoryItemId,
                  pendingPublicImageKey,
                  expandedCardId,
                  shareErrors,
                  publicCollectionHref,
                  handleShareToggle,
                  handleWallCategoryChange,
                  handleExpansionToggle,
                  handleOpenPublicNote,
                  handlePublicImageToggle,
                )}
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
        renderMobileBySetGroups(filteredBySetGroups)
      ) : searchQuery.trim().length > 0 ? (
        <ViewEmptyState title="No cards found in your vault." body="Try a different search or clear the current query." />
      ) : (
        <ViewEmptyState title="No cards found for this view." body="Set groups will appear as your collection grows." />
      );
  } else if (activeView === "pokemon") {
    const filteredPokemonItems = applyPokemonNameFilter(items);
    vaultContent = (
      <div className="space-y-4">
        <PageSection surface="subtle" spacing="compact" className="px-4 py-4">
          <div className="space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Pokémon Name</p>
            <SearchToolbar>
              <SearchToolbarInput
                id="pokemon-name-filter"
                type="text"
                placeholder="Search Pokémon name..."
                value={pokemonQuery}
                onChange={(event) => setPokemonQuery(event.target.value)}
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
                    onClick={() => setPokemonQuery(name)}
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
          renderVaultGrid(
            filteredPokemonItems,
            density,
            setLogoPathByCode,
            pendingShareItemId,
            pendingWallCategoryItemId,
            pendingPublicImageKey,
            expandedCardId,
            shareErrors,
            publicCollectionHref,
            handleShareToggle,
            handleWallCategoryChange,
            handleExpansionToggle,
            handleOpenPublicNote,
            handlePublicImageToggle,
          )
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
                type="text"
                placeholder="Search Pokémon name..."
                value={pokemonQuery}
                onChange={(event) => setPokemonQuery(event.target.value)}
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
                    onClick={() => setPokemonQuery(name)}
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
          renderMobileVaultItems(filteredPokemonItems)
        ) : (
          <ViewEmptyState title="No matching cards" body="Try a different Pokémon name." />
        )}
      </div>
    );
  } else {
    const filteredItems = applySearch(items);
    vaultContent =
      filteredItems.length > 0 ? (
        renderVaultGrid(
          filteredItems,
          density,
          setLogoPathByCode,
          pendingShareItemId,
          pendingWallCategoryItemId,
          pendingPublicImageKey,
          expandedCardId,
          shareErrors,
          publicCollectionHref,
          handleShareToggle,
          handleWallCategoryChange,
          handleExpansionToggle,
          handleOpenPublicNote,
          handlePublicImageToggle,
        )
      ) : (
        <ViewEmptyState title="No cards found in your vault." body="Try a different search or clear the current query." />
      );
    mobileVaultContent =
      filteredItems.length > 0 ? (
        renderMobileVaultItems(filteredItems)
      ) : (
        <ViewEmptyState title="No cards found in your vault." body="Try a different search or clear the current query." />
      );
  }

  return (
    <>
      <PublicNoteModal
        isOpen={publicNoteItemId !== null}
        isPending={pendingPublicNoteItemId !== null}
        noteValue={publicNoteDraft}
        error={publicNoteError}
        onNoteChange={setPublicNoteDraft}
        onCancel={handleCancelPublicNote}
        onSave={handleSavePublicNote}
      />

      <div className="space-y-10 py-7 md:space-y-12 md:py-9">
        <PageSection
          surface="card"
          spacing="default"
          className="overflow-hidden rounded-[2rem] border-slate-200/80 bg-[linear-gradient(180deg,_rgba(255,255,255,1)_0%,_rgba(248,250,252,0.94)_100%)] px-5 py-6 shadow-[0_34px_76px_-52px_rgba(15,23,42,0.34)] sm:px-6 md:px-8 md:py-7"
        >
          <PageIntro
            title="Your Vault"
            eyebrow="Vault"
            description="A clear, focused view of the cards you own."
            size="compact"
            actions={
              <div className="flex flex-wrap items-center gap-2.5">
                <Link
                  href="/network"
                  className="inline-flex rounded-full bg-slate-950 px-4 py-2.5 text-sm font-medium text-white shadow-[0_16px_30px_-22px_rgba(15,23,42,0.6)] transition hover:bg-slate-800 md:px-5"
                >
                  Browse Network
                </Link>
                <Link
                  href="/vault/import"
                  className="inline-flex rounded-full border border-slate-200 bg-white/95 px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:border-slate-300 hover:bg-white md:px-5"
                >
                  Import Collection
                </Link>
              </div>
            }
          />
          {valueSummary.totalGroupedCount > 0 ? (
            <div className="rounded-[1.9rem] border border-slate-200/75 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(248,250,252,0.88)_100%)] px-5 py-5 shadow-[0_26px_56px_-40px_rgba(15,23,42,0.28)] md:px-6 md:py-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="min-w-0 space-y-2.5">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-400/90">
                    Estimated Vault Value
                  </p>
                  <div className="space-y-1">
                    <p className="text-[2.15rem] font-semibold tracking-[-0.045em] text-slate-950 sm:text-[2.7rem]">
                      {formattedVaultValue ?? "No estimate yet"}
                    </p>
                    <p className="text-xs text-slate-400">Best available pricing across your vault.</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400 md:justify-end">
                  <span>
                    Priced cards{" "}
                    <span className="font-medium text-slate-600">{coverageLabel}</span>
                  </span>
                  <span className="hidden text-slate-300 sm:inline">•</span>
                  <span>{freshnessLabel}</span>
                </div>
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span className="rounded-full border border-slate-200/75 bg-white/80 px-4 py-2 font-medium text-slate-700 shadow-[0_14px_26px_-24px_rgba(15,23,42,0.22)]">
              {summary.cards} {summary.cards === 1 ? "card" : "cards"}
            </span>
            <span className="rounded-full border border-slate-200/75 bg-white/70 px-4 py-2">
              {summary.uniqueCards} unique
            </span>
            <span className="rounded-full border border-slate-200/75 bg-white/70 px-4 py-2">
              {summary.sets} {summary.sets === 1 ? "set" : "sets"}
            </span>
            <span className="rounded-full border border-slate-200/70 bg-white/60 px-4 py-2 text-slate-400">
              Last added {summary.lastAdded}
            </span>
          </div>
        </PageSection>

      {itemsError ? (
        <section className="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-700">
          Vault could not be loaded right now: {itemsError}
        </section>
      ) : items.length === 0 ? (
        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <div className="mx-auto max-w-xl space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Your vault is empty.</h2>
            <p className="text-sm leading-7 text-slate-600">Start building your collection one card at a time.</p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link
                href="/vault/import"
                className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Import Collection
              </Link>
              <Link
                href="/explore"
                className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Browse Cards
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <PageSection spacing="default">
          {collectorPageActivationVariant ? (
            <CollectorPageActivationCard
              variant={collectorPageActivationVariant}
              href={collectorPageActivationHref}
            />
          ) : null}

          <SectionHeader
            title="Vault Cards"
            description="Cards currently in your collection."
          />

          <div className="hidden md:flex md:flex-row md:items-center md:justify-between md:gap-4 md:rounded-[1.5rem] md:border md:border-slate-200/80 md:bg-slate-50/70 md:p-3.5">
            <SearchToolbar className="w-full sm:max-w-md">
              <SearchToolbarInput
                type="text"
                placeholder="Search your vault..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                tone="default"
              />
            </SearchToolbar>
            <div className="flex items-center gap-3">
              {searchQuery.trim().length > 0 ? (
                <SearchToolbarButton
                  type="button"
                  tone="secondary"
                  onClick={() => setSearchQuery("")}
                >
                  Clear search
                </SearchToolbarButton>
              ) : null}
              <ViewDensityToggle value={density} onChange={setDensity} />
            </div>
          </div>

          <VaultMobileToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onClearSearch={() => setSearchQuery("")}
            mode={mobileViewMode}
            onModeChange={setMobileViewMode}
          />

          <PageSection
            surface="subtle"
            spacing="compact"
            className="rounded-[1.5rem] border-slate-200/80 bg-slate-50/70 p-2.5 md:p-3"
          >
            <div className="flex gap-1.5 overflow-x-auto md:flex-wrap">
              {smartViews.map((view) => (
                <SmartViewButton
                  key={view.key}
                  label={view.label}
                  count={view.count}
                  selected={activeView === view.key}
                  onClick={() => setActiveView(view.key)}
                />
              ))}
            </div>
          </PageSection>

          <div className="md:hidden">{mobileVaultContent}</div>
          <div className="hidden md:block">{vaultContent}</div>
        </PageSection>
      )}

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
          <div className="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-700">
            Recently added feed could not be loaded right now: {recentError}
          </div>
        ) : recent.length === 0 ? (
          <PublicCollectionEmptyState
            title="No recently added items yet."
            body="New additions will appear here after you import or add cards."
          />
        ) : (
          <div className="flex gap-4 overflow-x-auto pt-0.5 pb-2">
            {recent.map((item) => (
              <PokemonCardGridTile
                key={item.id}
                className="min-w-[220px] max-w-[220px] flex-none rounded-[1.5rem] border-slate-200/80 bg-white/95 shadow-[0_20px_42px_-34px_rgba(15,23,42,0.28)]"
                imageSrc={item.image_url}
                imageAlt={item.name}
                imageHref={`/card/${item.gv_id}`}
                imageFallbackLabel={item.name}
                imageClassName="drop-shadow-[0_14px_24px_rgba(15,23,42,0.14)]"
                title={
                  <Link href={`/card/${item.gv_id}`} className="line-clamp-2 block transition hover:text-slate-700">
                    {item.name}
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
    </>
  );
}
