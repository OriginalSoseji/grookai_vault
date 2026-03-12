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

function applyOptimisticQuantityChange(
  items: VaultCardData[],
  itemId: string,
  type: VaultQuantityMutationInput["type"],
) {
  return items.flatMap((item) => {
    if (item.id !== itemId) {
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
    return items.filter((item) => item.id !== itemId);
  }

  return items.map((item) =>
    item.id === itemId
      ? {
          ...item,
          quantity: result.quantity,
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
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const [, startTransition] = useTransition();

  useEffect(() => {
    setItems(initialItems);
    setPendingItemId(null);
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

  function handleQuantityChange(itemId: string, type: VaultQuantityMutationInput["type"]) {
    if (pendingItemId) {
      return;
    }

    const currentItems = items;
    const targetItem = currentItems.find((item) => item.id === itemId);
    if (!targetItem) {
      return;
    }

    setItemErrors((current) => {
      const next = { ...current };
      delete next[itemId];
      return next;
    });
    setPendingItemId(itemId);
    setItems(applyOptimisticQuantityChange(currentItems, itemId, type));

    startTransition(async () => {
      try {
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

  return (
    <div className="space-y-10 py-7">
      <section className="space-y-8 rounded-[2rem] border border-slate-200 bg-white px-6 py-8 shadow-sm shadow-slate-200/60 md:px-8">
        <div className="max-w-2xl space-y-2.5">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">Web Vault</p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-[2.8rem]">Your vault. At a glance.</h1>
          <p className="max-w-xl text-base leading-7 text-slate-600">A clear view of the cards you own, organized and ready.</p>
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
            <div className="flex justify-center pt-2">
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

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <VaultCardTile
                key={item.id}
                item={item}
                isPending={pendingItemId === item.id}
                error={itemErrors[item.id]}
                onQuantityChange={handleQuantityChange}
              />
            ))}
          </div>
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
                    {[item.set_code || item.set_name, item.number !== "—" ? `#${item.number}` : undefined].filter(Boolean).join(" • ")}
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
  );
}
