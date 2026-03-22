"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import PokemonCardGridTile from "@/components/cards/PokemonCardGridTile";
import { getPokemonCardCollectionGridClassName } from "@/components/cards/pokemonCardGridLayout";
import { ViewDensityToggle } from "@/components/collection/ViewDensityToggle";
import { CollectorPageActivationCard } from "@/components/vault/CollectorPageActivationCard";
import { VaultMobileToolbar } from "@/components/vault/VaultMobileToolbar";
import { VaultMobileViews } from "@/components/vault/VaultMobileViews";
import { VaultCardTile, type VaultCardData } from "@/components/vault/VaultCardTile";
import { useVaultMobileViewMode } from "@/hooks/useVaultMobileViewMode";
import { useViewDensity, type ViewDensity } from "@/hooks/useViewDensity";
import {
  changeVaultItemQuantityAction,
  type VaultQuantityMutationInput,
} from "@/lib/vault/changeVaultItemQuantityAction";
import { toggleSharedCardPublicImageAction } from "@/lib/sharedCards/toggleSharedCardPublicImageAction";
import { saveSharedCardPublicNoteAction } from "@/lib/sharedCards/saveSharedCardPublicNoteAction";
import { saveSharedCardWallCategoryAction } from "@/lib/sharedCards/saveSharedCardWallCategoryAction";
import { toggleSharedCardAction } from "@/lib/sharedCards/toggleSharedCardAction";
import type { WallCategory } from "@/lib/sharedCards/wallCategories";
import type { ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";

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

type SetGroup = {
  setCode: string;
  setName: string;
  items: VaultCardData[];
};

const COLLECTOR_PAGE_ACTIVATION_MIN_UNIQUE_CARDS = 6;

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
          ? "border border-slate-300 bg-white text-slate-950 shadow-sm"
          : "border border-transparent text-slate-500 hover:border-slate-200 hover:bg-white/70 hover:text-slate-900"
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
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
      <div className="mx-auto max-w-xl space-y-3">
        <h3 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h3>
        <p className="text-sm leading-7 text-slate-600">{body}</p>
      </div>
    </div>
  );
}

function ConfirmRemovalModal({
  isOpen,
  isPending,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) {
        onCancel();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, isPending, onCancel]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vault-remove-title"
      aria-describedby="vault-remove-body"
      onClick={() => {
        if (!isPending) {
          onCancel();
        }
      }}
    >
      <div
        className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-3">
          <h3 id="vault-remove-title" className="text-2xl font-semibold tracking-tight text-slate-950">
            Remove card?
          </h3>
          <p id="vault-remove-body" className="text-sm leading-7 text-slate-600">
            This will remove the card from your vault.
          </p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isPending ? "Removing..." : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PublicNoteModal({
  isOpen,
  isPending,
  noteValue,
  error,
  onNoteChange,
  onCancel,
  onSave,
}: {
  isOpen: boolean;
  isPending: boolean;
  noteValue: string;
  error?: string | null;
  onNoteChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) {
        onCancel();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, isPending, onCancel]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vault-public-note-title"
      onClick={() => {
        if (!isPending) {
          onCancel();
        }
      }}
    >
      <div
        className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-3">
          <h3 id="vault-public-note-title" className="text-2xl font-semibold tracking-tight text-slate-950">
            Wall note
          </h3>
          <p className="text-sm leading-7 text-slate-600">This note appears on your public wall item.</p>
        </div>

        <div className="mt-5 space-y-3">
          <textarea
            value={noteValue}
            onChange={(event) => onNoteChange(event.target.value)}
            rows={5}
            disabled={isPending}
            placeholder="Add a note collectors can see on your wall."
            className="w-full rounded-[1.25rem] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          />
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isPending ? "Saving..." : "Save note"}
          </button>
        </div>
      </div>
    </div>
  );
}

function renderVaultGrid(
  items: VaultCardData[],
  density: ViewDensity,
  setLogoPathByCode: Record<string, string>,
  pendingItemId: string | null,
  pendingShareItemId: string | null,
  pendingWallCategoryItemId: string | null,
  pendingPublicImageKey: string | null,
  expandedSharedItemIds: Set<string>,
  itemErrors: Record<string, string>,
  shareErrors: Record<string, string>,
  publicCollectionHref: string | null,
  onQuantityChange: (itemId: string, type: VaultQuantityMutationInput["type"]) => void,
  onConditionChange: (item: VaultCardData, condition: string) => void,
  onShareToggle: (item: VaultCardData) => void,
  onWallCategoryChange: (item: VaultCardData, wallCategory: WallCategory | null) => void,
  onSharedControlsToggle: (item: VaultCardData) => void,
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
          isPending={pendingItemId === rowKey}
          isSharePending={pendingShareItemId === rowKey}
          isWallCategoryPending={pendingWallCategoryItemId === rowKey}
          isPublicFrontImagePending={pendingPublicImageKey === `${rowKey}:front`}
          isPublicBackImagePending={pendingPublicImageKey === `${rowKey}:back`}
          isSharedControlsExpanded={expandedSharedItemIds.has(rowKey)}
          error={itemErrors[rowKey]}
          shareError={shareErrors[rowKey]}
          publicCollectionHref={item.is_shared ? publicCollectionHref : null}
          onQuantityChange={onQuantityChange}
          onConditionChange={(condition) => onConditionChange(item, condition)}
          onShareToggle={onShareToggle}
          onWallCategoryChange={onWallCategoryChange}
          onSharedControlsToggle={onSharedControlsToggle}
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

function applyOptimisticQuantityChange(
  items: VaultCardData[],
  rowKey: string,
  type: VaultQuantityMutationInput["type"],
) {
  return items.flatMap((item) => {
    if (getVaultRowRuntimeKey(item) !== rowKey) {
      return [item];
    }

    const nextOwnedCount = type === "increment" ? item.owned_count + 1 : item.owned_count - 1;
    if (nextOwnedCount <= 0) {
      return [];
    }

    return [{ ...item, owned_count: nextOwnedCount }];
  });
}

function reconcileQuantityResult(
  items: VaultCardData[],
  rowKey: string,
  result:
    | { status: "incremented" | "decremented"; itemId: string; quantity: number }
    | { status: "removed"; itemId: string },
) {
  if (result.status === "removed") {
    return items.filter((item) => getVaultRowRuntimeKey(item) !== rowKey);
  }

  return items.map((item) =>
    getVaultRowRuntimeKey(item) === rowKey
      ? {
          ...item,
          owned_count: result.quantity,
        }
      : item,
  );
}

function applyOptimisticConditionChange(items: VaultCardData[], itemId: string, condition: string) {
  return items.map((item) =>
    item.id === itemId
      ? {
          ...item,
          condition_label: condition,
        }
      : item,
  );
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
  publicProfileHref?: string | null;
  publicCollectionHref?: string | null;
  setLogoPathByCode?: Record<string, string>;
};

export function VaultCollectionView({
  initialItems,
  recent,
  itemsError,
  recentError,
  publicProfileHref = null,
  publicCollectionHref = null,
  setLogoPathByCode = {},
}: VaultCollectionViewProps) {
  const router = useRouter();
  const { density, setDensity } = useViewDensity();
  const { mode: mobileViewMode, setMode: setMobileViewMode } = useVaultMobileViewMode();
  const [items, setItems] = useState(initialItems);
  const [expandedSharedItemIds, setExpandedSharedItemIds] = useState<Set<string>>(() => new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [pokemonQuery, setPokemonQuery] = useState("");
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [pendingShareItemId, setPendingShareItemId] = useState<string | null>(null);
  const [pendingWallCategoryItemId, setPendingWallCategoryItemId] = useState<string | null>(null);
  const [pendingPublicImageKey, setPendingPublicImageKey] = useState<string | null>(null);
  const [pendingPublicNoteItemId, setPendingPublicNoteItemId] = useState<string | null>(null);
  const [confirmRemovalItemId, setConfirmRemovalItemId] = useState<string | null>(null);
  const [publicNoteItemId, setPublicNoteItemId] = useState<string | null>(null);
  const [publicNoteDraft, setPublicNoteDraft] = useState("");
  const [publicNoteError, setPublicNoteError] = useState<string | null>(null);
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const [shareErrors, setShareErrors] = useState<Record<string, string>>({});
  const [activeView, setActiveView] = useState<SmartViewKey>("all");
  const [, startTransition] = useTransition();
  const refreshPinnedSharedItemIdRef = useRef<string | null>(null);

  useEffect(() => {
    setItems(initialItems);
    setPokemonQuery("");
    setPendingItemId(null);
    setPendingShareItemId(null);
    setPendingWallCategoryItemId(null);
    setPendingPublicImageKey(null);
    setPendingPublicNoteItemId(null);
    setConfirmRemovalItemId(null);
    setPublicNoteItemId(null);
    setPublicNoteDraft("");
    setPublicNoteError(null);
    setItemErrors({});
    setShareErrors({});
  }, [initialItems]);

  useEffect(() => {
    const nextItemIds = new Set(initialItems.map((item) => getVaultRowRuntimeKey(item)));
    const pinnedItemId = refreshPinnedSharedItemIdRef.current;
    setExpandedSharedItemIds((current) => {
      const next = new Set<string>();
      for (const id of current) {
        if (nextItemIds.has(id) || id === pinnedItemId) {
          next.add(id);
        }
      }
      return next;
    });
    if (pinnedItemId && nextItemIds.has(pinnedItemId)) {
      refreshPinnedSharedItemIdRef.current = null;
    }
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

  function runQuantityChange(
    rowKey: string,
    itemId: string,
    type: VaultQuantityMutationInput["type"],
    currentItems: VaultCardData[],
  ) {
    setItemErrors((current) => {
      const next = { ...current };
      delete next[rowKey];
      return next;
    });
    setPendingItemId(rowKey);
    setItems(applyOptimisticQuantityChange(currentItems, rowKey, type));

    startTransition(async () => {
      try {
        // The canonical vault quantity mutation deletes the owned row when a decrement hits zero.
        const result = await changeVaultItemQuantityAction({ itemId, type });
        setItems((current) => reconcileQuantityResult(current, rowKey, result));
        router.refresh();
      } catch (error) {
        setItems(currentItems);
        setItemErrors((current) => ({
          ...current,
          [rowKey]: "Couldn’t update quantity.",
        }));
      } finally {
        setPendingItemId(null);
      }
    });
  }

  function handleQuantityChange(itemId: string, type: VaultQuantityMutationInput["type"]) {
    if (pendingItemId) {
      return;
    }

    const currentItems = items;
    const targetItem = currentItems.find((item) => item.vault_item_id === itemId);
    if (!targetItem) {
      return;
    }
    const rowKey = getVaultRowRuntimeKey(targetItem);

    if (type === "decrement" && targetItem.owned_count === 1) {
      setConfirmRemovalItemId(rowKey);
      return;
    }

    runQuantityChange(rowKey, itemId, type, currentItems);
  }

  function handleCancelRemoval() {
    if (pendingItemId) {
      return;
    }

    setConfirmRemovalItemId(null);
  }

  function handleConfirmRemoval() {
    if (!confirmRemovalItemId || pendingItemId) {
      return;
    }

    const currentItems = items;
    const targetItem = findItemByRowRuntimeKey(currentItems, confirmRemovalItemId);
    if (!targetItem || targetItem.owned_count !== 1) {
      setConfirmRemovalItemId(null);
      return;
    }

    setConfirmRemovalItemId(null);
    runQuantityChange(confirmRemovalItemId, targetItem.vault_item_id, "decrement", currentItems);
  }

  function changeCondition(item: VaultCardData, newCondition: string) {
    if (pendingItemId || item.condition_label === newCondition) {
      return;
    }

    const currentItems = items;
    const rowKey = getVaultRowRuntimeKey(item);
    setItemErrors((current) => {
      const next = { ...current };
      delete next[rowKey];
      return next;
    });
    setPendingItemId(rowKey);
    setItems(applyOptimisticConditionChange(currentItems, item.id, newCondition));

    startTransition(async () => {
      try {
        const { error } = await supabase.rpc("rpc_set_item_condition", {
          p_vault_item_id: item.vault_item_id,
          p_condition_label: newCondition,
          p_card_id: item.card_id,
          p_market_price: null,
        });

        if (error) {
          throw error;
        }

        router.refresh();
      } catch (error) {
        console.error("Condition update failed:", error);
        setItems(currentItems);
        setItemErrors((current) => ({
          ...current,
          [rowKey]:
            error instanceof Error && error.message === "Condition edits are currently disabled"
              ? "Condition edits are currently disabled."
              : "Couldn’t update condition.",
        }));
      } finally {
        setPendingItemId(null);
      }
    });
  }

  function handleShareToggle(item: VaultCardData) {
    if (pendingShareItemId || pendingWallCategoryItemId || pendingItemId || pendingPublicImageKey) {
      return;
    }

    const currentItems = items;
    const rowKey = getVaultRowRuntimeKey(item);
    const nextShared = !item.is_shared;
    const wasExpanded = expandedSharedItemIds.has(rowKey);

    setShareErrors((current) => {
      const next = { ...current };
      delete next[rowKey];
      return next;
    });
    setPendingShareItemId(rowKey);
    refreshPinnedSharedItemIdRef.current = nextShared ? rowKey : null;
    setExpandedSharedItemIds((current) => {
      const next = new Set(current);
      if (nextShared) {
        next.add(rowKey);
      } else {
        next.delete(rowKey);
      }
      return next;
    });
    setItems(applyOptimisticShareChange(currentItems, rowKey, nextShared));

    startTransition(async () => {
      try {
        const result = await toggleSharedCardAction({
          itemId: item.vault_item_id,
          gvViId: item.gv_vi_id,
          nextShared,
        });

        if (!result.ok) {
          refreshPinnedSharedItemIdRef.current = null;
          setItems(currentItems);
          setExpandedSharedItemIds((current) => {
            const next = new Set(current);
            if (wasExpanded) {
              next.add(rowKey);
            } else {
              next.delete(rowKey);
            }
            return next;
          });
          setShareErrors((current) => ({
            ...current,
            [rowKey]: result.message,
          }));
          return;
        }

        setItems((current) => applyOptimisticShareChange(current, rowKey, result.status === "shared"));
        setExpandedSharedItemIds((current) => {
          const next = new Set(current);
          if (result.status === "shared") {
            next.add(rowKey);
          } else {
            next.delete(rowKey);
          }
          return next;
        });
        if (result.status !== "shared") {
          refreshPinnedSharedItemIdRef.current = null;
        }
        router.refresh();
      } catch (error) {
        refreshPinnedSharedItemIdRef.current = null;
        setItems(currentItems);
        setExpandedSharedItemIds((current) => {
          const next = new Set(current);
          if (wasExpanded) {
            next.add(rowKey);
          } else {
            next.delete(rowKey);
          }
          return next;
        });
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
    if (!item.is_shared || pendingWallCategoryItemId || pendingShareItemId || pendingItemId || pendingPublicImageKey) {
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

  function handleSharedControlsToggle(item: VaultCardData) {
    if (!item.is_shared) {
      return;
    }
    const rowKey = getVaultRowRuntimeKey(item);

    setExpandedSharedItemIds((current) => {
      const next = new Set(current);
      if (next.has(rowKey)) {
        next.delete(rowKey);
        if (refreshPinnedSharedItemIdRef.current === rowKey) {
          refreshPinnedSharedItemIdRef.current = null;
        }
      } else {
        next.add(rowKey);
      }
      return next;
    });
  }

  function handlePublicImageToggle(item: VaultCardData, side: "front" | "back", enabled: boolean) {
    if (!item.is_shared || pendingPublicImageKey || pendingWallCategoryItemId || pendingShareItemId || pendingItemId) {
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
        pendingItemId={pendingItemId}
        pendingShareItemId={pendingShareItemId}
        pendingWallCategoryItemId={pendingWallCategoryItemId}
        pendingPublicImageKey={pendingPublicImageKey}
        expandedSharedItemIds={expandedSharedItemIds}
        itemErrors={itemErrors}
        shareErrors={shareErrors}
        publicCollectionHref={publicCollectionHref}
        onQuantityChange={handleQuantityChange}
        onConditionChange={changeCondition}
        onShareToggle={handleShareToggle}
        onWallCategoryChange={handleWallCategoryChange}
        onSharedControlsToggle={handleSharedControlsToggle}
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
            <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="space-y-1">
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Set</p>
                <div className="flex items-end justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold tracking-tight text-slate-950">{group.setName}</h3>
                    <p className="text-xs text-slate-500">{group.setCode}</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    {group.items.length} {group.items.length === 1 ? "card" : "cards"}
                  </p>
                </div>
              </div>
            </div>
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
            pendingItemId,
            pendingShareItemId,
            pendingWallCategoryItemId,
            pendingPublicImageKey,
            expandedSharedItemIds,
            itemErrors,
            shareErrors,
            publicCollectionHref,
            handleQuantityChange,
            changeCondition,
            handleShareToggle,
            handleWallCategoryChange,
            handleSharedControlsToggle,
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
            pendingItemId,
            pendingShareItemId,
            pendingWallCategoryItemId,
            pendingPublicImageKey,
            expandedSharedItemIds,
            itemErrors,
            shareErrors,
            publicCollectionHref,
            handleQuantityChange,
            changeCondition,
            handleShareToggle,
            handleWallCategoryChange,
            handleSharedControlsToggle,
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
            pendingItemId,
            pendingShareItemId,
            pendingWallCategoryItemId,
            pendingPublicImageKey,
            expandedSharedItemIds,
            itemErrors,
            shareErrors,
            publicCollectionHref,
            handleQuantityChange,
            changeCondition,
            handleShareToggle,
            handleWallCategoryChange,
            handleSharedControlsToggle,
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
              <div className="space-y-2 rounded-[1.5rem] border border-slate-200 bg-slate-50/55 px-5 py-4">
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Set</p>
                <div className="flex items-end justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold tracking-tight text-slate-950">{group.setName}</h3>
                    <p className="text-sm text-slate-500">{group.setCode}</p>
                  </div>
                  <p className="text-sm text-slate-500">
                    {group.items.length} {group.items.length === 1 ? "card" : "cards"}
                  </p>
                </div>
              </div>
              <div className="pt-1">
                {renderVaultGrid(
                  group.items,
                  density,
                  setLogoPathByCode,
                  pendingItemId,
                  pendingShareItemId,
                  pendingWallCategoryItemId,
                  pendingPublicImageKey,
                  expandedSharedItemIds,
                  itemErrors,
                  shareErrors,
                  publicCollectionHref,
                  handleQuantityChange,
                  changeCondition,
                  handleShareToggle,
                  handleWallCategoryChange,
                  handleSharedControlsToggle,
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
        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 px-4 py-4">
          <label
            htmlFor="pokemon-name-filter"
            className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400"
          >
            Pokémon Name
          </label>
          <input
            id="pokemon-name-filter"
            type="text"
            placeholder="Search Pokémon name..."
            value={pokemonQuery}
            onChange={(event) => setPokemonQuery(event.target.value)}
            className="mt-3 w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300"
          />

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
        </div>

        {filteredPokemonItems.length > 0 ? (
          renderVaultGrid(
            filteredPokemonItems,
            density,
            setLogoPathByCode,
            pendingItemId,
            pendingShareItemId,
            pendingWallCategoryItemId,
            pendingPublicImageKey,
            expandedSharedItemIds,
            itemErrors,
            shareErrors,
            publicCollectionHref,
            handleQuantityChange,
            changeCondition,
            handleShareToggle,
            handleWallCategoryChange,
            handleSharedControlsToggle,
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
        <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
          <label
            htmlFor="pokemon-name-filter-mobile"
            className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400"
          >
            Pokémon Name
          </label>
          <input
            id="pokemon-name-filter-mobile"
            type="text"
            placeholder="Search Pokémon name..."
            value={pokemonQuery}
            onChange={(event) => setPokemonQuery(event.target.value)}
            className="mt-3 w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300"
          />

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
        </div>

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
          pendingItemId,
          pendingShareItemId,
          pendingWallCategoryItemId,
          pendingPublicImageKey,
          expandedSharedItemIds,
          itemErrors,
          shareErrors,
          publicCollectionHref,
          handleQuantityChange,
          changeCondition,
          handleShareToggle,
          handleWallCategoryChange,
          handleSharedControlsToggle,
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
      <ConfirmRemovalModal
        isOpen={confirmRemovalItemId !== null}
        isPending={pendingItemId !== null}
        onCancel={handleCancelRemoval}
        onConfirm={handleConfirmRemoval}
      />
      <PublicNoteModal
        isOpen={publicNoteItemId !== null}
        isPending={pendingPublicNoteItemId !== null}
        noteValue={publicNoteDraft}
        error={publicNoteError}
        onNoteChange={setPublicNoteDraft}
        onCancel={handleCancelPublicNote}
        onSave={handleSavePublicNote}
      />

      <div className="space-y-8 py-6 md:space-y-10 md:py-7">
      <section className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 shadow-sm shadow-slate-200/60 sm:px-5 md:rounded-[2rem] md:px-7 md:py-5">
        <div className="flex flex-col gap-3 md:gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Vault</p>
              <h1 className="text-[1.75rem] font-semibold tracking-tight text-slate-950 sm:text-[2rem]">Your Vault</h1>
              <p className="hidden text-sm text-slate-600 md:block">A clear view of the cards you own.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 sm:text-sm">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-800">
                {summary.cards} {summary.cards === 1 ? "card" : "cards"}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                {summary.uniqueCards} unique
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                {summary.sets} {summary.sets === 1 ? "set" : "sets"}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                Updated {summary.lastAdded}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-start lg:justify-end">
            <Link
              href="/vault/import"
              className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 md:px-5"
            >
              Import Collection
            </Link>
          </div>
        </div>
      </section>

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
        <section className="space-y-4">
          {collectorPageActivationVariant ? (
            <CollectorPageActivationCard
              variant={collectorPageActivationVariant}
              href={collectorPageActivationHref}
            />
          ) : null}

          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Vault Cards</h2>
            <p className="text-sm text-slate-600">Cards currently in your collection.</p>
          </div>

          <div className="hidden md:flex md:flex-row md:items-center md:justify-between md:gap-3">
            <input
              type="text"
              placeholder="Search your vault..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 sm:max-w-md"
            />
            {searchQuery.trim().length > 0 ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="inline-flex shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                Clear search
              </button>
            ) : null}
          </div>

          <div className="hidden items-center justify-end md:flex">
            <ViewDensityToggle value={density} onChange={setDensity} />
          </div>

          <VaultMobileToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onClearSearch={() => setSearchQuery("")}
            mode={mobileViewMode}
            onModeChange={setMobileViewMode}
          />

          <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50/70 p-2 md:rounded-[1.5rem]">
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
          </div>

          <div className="md:hidden">{mobileVaultContent}</div>
          <div className="hidden md:block">{vaultContent}</div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Recently Added</h2>
            <p className="text-sm text-slate-600">Recent additions to your collection.</p>
          </div>
          <Link href="/wall" className="text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline">
            View wall
          </Link>
        </div>

        {recentError ? (
          <div className="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-700">
            Recently added feed could not be loaded right now: {recentError}
          </div>
        ) : recent.length === 0 ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 text-sm text-slate-600 shadow-sm">
            No recently added items yet.
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pt-0.5 pb-2">
            {recent.map((item) => (
              <PokemonCardGridTile
                key={item.id}
                className="min-w-[220px] max-w-[220px] flex-none"
                imageSrc={item.image_url}
                imageAlt={item.name}
                imageHref={`/card/${item.gv_id}`}
                imageFallbackLabel={item.name}
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
                footer={<span>{item.gv_id}</span>}
              />
            ))}
          </div>
        )}
      </section>
      </div>
    </>
  );
}
