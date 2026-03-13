"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import PublicCardImage from "@/components/PublicCardImage";
import { VaultCardTile, type VaultCardData } from "@/components/vault/VaultCardTile";
import {
  changeVaultItemQuantityAction,
  type VaultQuantityMutationInput,
} from "@/lib/vault/changeVaultItemQuantityAction";
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

type SmartViewKey = "all" | "duplicates" | "recent" | "by-set" | "pokemon";

type SetGroup = {
  setCode: string;
  setName: string;
  items: VaultCardData[];
};

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

function MetricBlock({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200/90 bg-white px-5 py-5">
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2.5 text-[2rem] font-semibold tracking-tight text-slate-950 sm:text-[2.2rem]">{value}</p>
    </div>
  );
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

function renderVaultGrid(
  items: VaultCardData[],
  pendingItemId: string | null,
  itemErrors: Record<string, string>,
  onQuantityChange: (itemId: string, type: VaultQuantityMutationInput["type"]) => void,
  onConditionChange: (item: VaultCardData, condition: string) => void,
) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <VaultCardTile
          key={item.id}
          item={item}
          isPending={pendingItemId === item.vault_item_id}
          error={itemErrors[item.vault_item_id]}
          onQuantityChange={onQuantityChange}
          onConditionChange={(condition) => onConditionChange(item, condition)}
        />
      ))}
    </div>
  );
}

function applyOptimisticQuantityChange(
  items: VaultCardData[],
  itemId: string,
  type: VaultQuantityMutationInput["type"],
) {
  return items.flatMap((item) => {
    if (item.vault_item_id !== itemId) {
      return [item];
    }

    const nextQuantity = type === "increment" ? item.quantity + 1 : item.quantity - 1;
    if (nextQuantity <= 0) {
      return [];
    }

    return [{ ...item, quantity: nextQuantity }];
  });
}

function reconcileQuantityResult(
  items: VaultCardData[],
  itemId: string,
  result:
    | { status: "incremented" | "decremented"; itemId: string; quantity: number }
    | { status: "removed"; itemId: string },
) {
  if (result.status === "removed") {
    return items.filter((item) => item.vault_item_id !== itemId);
  }

  return items.map((item) =>
    item.vault_item_id === itemId
      ? {
          ...item,
          quantity: result.quantity,
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

type VaultCollectionViewProps = {
  initialItems: VaultCardData[];
  recent: RecentCardData[];
  itemsError?: string | null;
  recentError?: string | null;
};

export function VaultCollectionView({
  initialItems,
  recent,
  itemsError,
  recentError,
}: VaultCollectionViewProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [searchQuery, setSearchQuery] = useState("");
  const [pokemonQuery, setPokemonQuery] = useState("");
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [confirmRemovalItemId, setConfirmRemovalItemId] = useState<string | null>(null);
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const [activeView, setActiveView] = useState<SmartViewKey>("all");
  const [, startTransition] = useTransition();

  useEffect(() => {
    setItems(initialItems);
    setPokemonQuery("");
    setPendingItemId(null);
    setConfirmRemovalItemId(null);
    setItemErrors({});
  }, [initialItems]);

  const summary = useMemo(() => {
    const cards = items.reduce((sum, item) => sum + item.quantity, 0);
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

  const recentItems = useMemo(
    () =>
      [...items].sort((left, right) => {
        const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0;
        const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0;
        return rightTime - leftTime;
      }),
    [items],
  );

  const duplicateItems = useMemo(() => items.filter((item) => item.quantity > 1), [items]);
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
    itemId: string,
    type: VaultQuantityMutationInput["type"],
    currentItems: VaultCardData[],
  ) {
    setItemErrors((current) => {
      const next = { ...current };
      delete next[itemId];
      return next;
    });
    setPendingItemId(itemId);
    setItems(applyOptimisticQuantityChange(currentItems, itemId, type));

    startTransition(async () => {
      try {
        // The canonical vault quantity mutation deletes the owned row when a decrement hits zero.
        const result = await changeVaultItemQuantityAction({ itemId, type });
        setItems((current) => reconcileQuantityResult(current, itemId, result));
        router.refresh();
      } catch (error) {
        setItems(currentItems);
        setItemErrors((current) => ({
          ...current,
          [itemId]: "Couldn’t update quantity.",
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

    if (type === "decrement" && targetItem.quantity === 1) {
      setConfirmRemovalItemId(itemId);
      return;
    }

    runQuantityChange(itemId, type, currentItems);
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
    const targetItem = currentItems.find((item) => item.vault_item_id === confirmRemovalItemId);
    if (!targetItem || targetItem.quantity !== 1) {
      setConfirmRemovalItemId(null);
      return;
    }

    setConfirmRemovalItemId(null);
    runQuantityChange(confirmRemovalItemId, "decrement", currentItems);
  }

  function changeCondition(item: VaultCardData, newCondition: string) {
    if (pendingItemId || item.condition_label === newCondition) {
      return;
    }

    const currentItems = items;
    setItemErrors((current) => {
      const next = { ...current };
      delete next[item.vault_item_id];
      return next;
    });
    setPendingItemId(item.vault_item_id);
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
          [item.vault_item_id]:
            error instanceof Error && error.message === "Condition edits are currently disabled"
              ? "Condition edits are currently disabled."
              : "Couldn’t update condition.",
        }));
      } finally {
        setPendingItemId(null);
      }
    });
  }

  let vaultContent: ReactNode;

  if (activeView === "duplicates") {
    const filteredDuplicateItems = applySearch(duplicateItems);
    vaultContent =
      filteredDuplicateItems.length > 0
        ? renderVaultGrid(filteredDuplicateItems, pendingItemId, itemErrors, handleQuantityChange, changeCondition)
        : searchQuery.trim().length > 0
          ? <ViewEmptyState title="No cards found in your vault." body="Try a different search or clear the current query." />
        : (
            <ViewEmptyState title="No duplicates yet." body="Cards with extra copies will appear here." />
          );
  } else if (activeView === "recent") {
    const filteredRecentItems = applySearch(recentItems);
    vaultContent =
      filteredRecentItems.length > 0
        ? renderVaultGrid(filteredRecentItems, pendingItemId, itemErrors, handleQuantityChange, changeCondition)
        : searchQuery.trim().length > 0
          ? <ViewEmptyState title="No cards found in your vault." body="Try a different search or clear the current query." />
        : (
            <ViewEmptyState title="No recent cards to show." body="New additions will appear here." />
          );
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
                {renderVaultGrid(group.items, pendingItemId, itemErrors, handleQuantityChange, changeCondition)}
              </div>
            </section>
          ))}
        </div>
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
          renderVaultGrid(filteredPokemonItems, pendingItemId, itemErrors, handleQuantityChange, changeCondition)
        ) : (
          <ViewEmptyState title="No matching cards" body="Try a different Pokémon name." />
        )}
      </div>
    );
  } else {
    const filteredItems = applySearch(items);
    vaultContent =
      filteredItems.length > 0 ? (
        renderVaultGrid(filteredItems, pendingItemId, itemErrors, handleQuantityChange, changeCondition)
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

      <div className="space-y-10 py-7">
      <section className="space-y-8 rounded-[2rem] border border-slate-200 bg-white px-6 py-8 shadow-sm shadow-slate-200/60 md:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-2.5">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">Web Vault</p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-[2.8rem]">Your vault. At a glance.</h1>
            <p className="max-w-xl text-base leading-7 text-slate-600">A clear view of the cards you own, organized and ready.</p>
          </div>
          <div className="flex shrink-0 items-start">
            <Link
              href="/vault/import"
              className="inline-flex rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Import Collection
            </Link>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-3.5 sm:p-4">
          <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
            <MetricBlock label="Cards" value={summary.cards} />
            <MetricBlock label="Unique Cards" value={summary.uniqueCards} />
            <MetricBlock label="Sets" value={summary.sets} />
            <MetricBlock label="Last Added" value={summary.lastAdded} />
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
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Vault Cards</h2>
            <p className="text-sm text-slate-600">Cards currently in your collection.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-2">
            <div className="flex flex-wrap gap-1.5">
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

          {vaultContent}
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
              <Link
                key={item.id}
                href={`/card/${item.gv_id}`}
                className="min-w-[220px] max-w-[220px] flex-none overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_28px_rgba(15,23,42,0.06)]"
              >
                <PublicCardImage
                  src={item.image_url}
                  alt={item.name}
                  imageClassName="aspect-[3/4] w-full bg-slate-50 object-contain p-5"
                  fallbackClassName="flex aspect-[3/4] w-full items-center justify-center bg-slate-100 px-4 text-center text-sm text-slate-500"
                  fallbackLabel={item.name}
                />
                <div className="space-y-2.5 border-t border-slate-200 px-4 py-4">
                  <p className="line-clamp-2 text-base font-medium text-slate-950">{item.name}</p>
                  <p className="text-sm text-slate-600">
                    {[item.set_name || item.set_code, item.number !== "—" ? `#${item.number}` : undefined].filter(Boolean).join(" • ")}
                  </p>
                  <div className="space-y-1">
                    <p className="text-xs font-medium tracking-[0.08em] text-slate-500">{item.gv_id}</p>
                    <p className="text-xs text-slate-500">{formatTimeAgo(item.created_at)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
      </div>
    </>
  );
}
