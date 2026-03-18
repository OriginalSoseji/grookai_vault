"use client";

import Link from "next/link";
import { useState } from "react";
import PublicCardImage from "@/components/PublicCardImage";
import ShareCardButton from "@/components/ShareCardButton";
import OwnedObjectRemoveAction from "@/components/vault/OwnedObjectRemoveAction";
import type { VaultCardData } from "@/components/vault/VaultCardTile";
import { type VaultMobileViewMode } from "@/hooks/useVaultMobileViewMode";
import {
  getWallCategoryLabel,
  WALL_CATEGORY_OPTIONS,
  type WallCategory,
} from "@/lib/sharedCards/wallCategories";

type VaultMobileCommonProps = {
  items: VaultCardData[];
  mode: VaultMobileViewMode;
  pendingItemId: string | null;
  pendingShareItemId: string | null;
  pendingWallCategoryItemId: string | null;
  pendingPublicImageKey: string | null;
  expandedSharedItemIds: Set<string>;
  itemErrors: Record<string, string>;
  shareErrors: Record<string, string>;
  publicCollectionHref: string | null;
  onQuantityChange: (itemId: string, type: "increment" | "decrement") => void;
  onConditionChange: (item: VaultCardData, condition: string) => void;
  onShareToggle: (item: VaultCardData) => void;
  onWallCategoryChange: (item: VaultCardData, wallCategory: WallCategory | null) => void;
  onSharedControlsToggle: (item: VaultCardData) => void;
  onPublicNoteEdit: (item: VaultCardData) => void;
  onPublicImageToggle: (item: VaultCardData, side: "front" | "back", enabled: boolean) => void;
};

const CONDITION_OPTIONS = ["NM", "LP", "MP", "HP", "DMG"];

function formatCurrency(value: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "Value unavailable";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatSlabSummary(item: Pick<VaultCardData, "grader" | "grade">) {
  return [item.grader, item.grade].filter((value): value is string => typeof value === "string" && value.length > 0).join(" ");
}

function formatObjectLevelSlabSummary(item: { grader: string | null; grade: string | null }) {
  return [item.grader, item.grade].filter((value): value is string => typeof value === "string" && value.length > 0).join(" ");
}

function formatMixedOwnershipSummary(item: Pick<VaultCardData, "raw_count" | "slab_count" | "grader" | "grade">) {
  if (!(item.raw_count > 0 && item.slab_count > 0)) {
    return null;
  }

  const slabSummary = formatSlabSummary(item);
  const rawLabel = `${item.raw_count} Raw`;

  if (item.slab_count === 1 && slabSummary) {
    return `${rawLabel} + 1 ${slabSummary}`;
  }

  return `${rawLabel} + ${item.slab_count} Slab`;
}

function getRowKey(item: VaultCardData) {
  return item.card_id;
}

function getCompactSummary(item: VaultCardData) {
  const mixedSummary = formatMixedOwnershipSummary(item);
  if (mixedSummary) {
    return mixedSummary;
  }

  if (item.is_slab) {
    return formatSlabSummary(item) || "Graded slab";
  }

  return `${item.condition_label} • Qty ${item.owned_count}`;
}

function getStateChips(item: VaultCardData) {
  return [
    item.is_slab ? "Slab" : null,
    item.is_shared ? "On Wall" : null,
    getWallCategoryLabel(item.wall_category),
  ].filter((value): value is string => Boolean(value));
}

function MobileStatusChip({ label, tone = "default" }: { label: string; tone?: "default" | "slab" | "wall" }) {
  const toneClassName =
    tone === "slab"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : tone === "wall"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-slate-100 text-slate-600";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${toneClassName}`}>
      {label}
    </span>
  );
}

function MobileGridCard({ item }: { item: VaultCardData }) {
  const mixedSummary = formatMixedOwnershipSummary(item);
  const slabSummary = formatSlabSummary(item);

  return (
    <Link
      href={`/card/${item.gv_id}`}
      className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300"
    >
      <div className="flex items-center justify-center rounded-t-[1.4rem] bg-slate-50 p-3">
        <PublicCardImage
          src={item.image_url}
          alt={item.name}
          imageClassName="aspect-[3/4] w-full object-contain"
          fallbackClassName="flex aspect-[3/4] w-full items-center justify-center rounded-[1rem] bg-slate-100 px-3 text-center text-xs text-slate-500"
          fallbackLabel={item.name}
        />
      </div>
      <div className="space-y-2 border-t border-slate-200 px-3 py-3">
        <p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950">{item.name}</p>
        <p className="line-clamp-2 text-xs text-slate-500">
          {[item.set_name || item.set_code, item.number !== "—" ? `#${item.number}` : undefined].filter(Boolean).join(" • ")}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {item.is_slab ? <MobileStatusChip label="Slab" tone="slab" /> : null}
          {item.is_shared ? <MobileStatusChip label="On Wall" tone="wall" /> : null}
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-700">
            {mixedSummary ?? (item.is_slab ? slabSummary || "Graded slab" : `Qty ${item.owned_count}`)}
          </p>
          <p className="text-xs text-slate-500">{formatCurrency(item.effective_price)}</p>
        </div>
      </div>
    </Link>
  );
}

function MobileCompactRow({ item }: { item: VaultCardData }) {
  return (
    <Link
      href={`/card/${item.gv_id}`}
      className="flex items-center gap-3 rounded-[1.25rem] border border-slate-200 bg-white px-3 py-3 shadow-sm transition hover:border-slate-300"
    >
      <div className="h-16 w-12 shrink-0 overflow-hidden rounded-[0.8rem] border border-slate-200 bg-slate-50">
        <PublicCardImage
          src={item.image_url}
          alt={item.name}
          imageClassName="h-full w-full object-contain p-1.5"
          fallbackClassName="flex h-full w-full items-center justify-center bg-slate-100 px-1 text-center text-[10px] text-slate-500"
          fallbackLabel={item.name}
        />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-3">
          <p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950">{item.name}</p>
          <p className="shrink-0 text-xs font-medium text-slate-700">{item.raw_count > 0 && item.slab_count > 0 ? `${item.raw_count}/${item.slab_count}` : item.owned_count}</p>
        </div>
        <p className="line-clamp-1 text-xs text-slate-500">
          {[item.set_name || item.set_code, item.number !== "—" ? `#${item.number}` : undefined].filter(Boolean).join(" • ")}
        </p>
        <div className="flex items-center justify-between gap-3">
          <p className="line-clamp-1 text-xs text-slate-600">{getCompactSummary(item)}</p>
          <p className="shrink-0 text-xs text-slate-500">{formatCurrency(item.effective_price)}</p>
        </div>
      </div>
    </Link>
  );
}

function MobileDetailRow({
  item,
  pendingItemId,
  pendingShareItemId,
  pendingWallCategoryItemId,
  pendingPublicImageKey,
  expandedSharedItemIds,
  itemErrors,
  shareErrors,
  publicCollectionHref,
  onQuantityChange,
  onConditionChange,
  onShareToggle,
  onWallCategoryChange,
  onSharedControlsToggle,
  onPublicNoteEdit,
  onPublicImageToggle,
}: Omit<VaultMobileCommonProps, "items" | "mode"> & { item: VaultCardData }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const rowKey = getRowKey(item);
  const mixedSummary = formatMixedOwnershipSummary(item);
  const slabSummary = formatSlabSummary(item);
  const canAdjustRaw = item.raw_count > 0;
  const isPending = pendingItemId === rowKey;
  const isSharePending = pendingShareItemId === rowKey;
  const isWallCategoryPending = pendingWallCategoryItemId === rowKey;
  const isPublicFrontImagePending = pendingPublicImageKey === `${rowKey}:front`;
  const isPublicBackImagePending = pendingPublicImageKey === `${rowKey}:back`;
  const isSharedControlsExpanded = expandedSharedItemIds.has(rowKey);
  const wallCategoryLabel = getWallCategoryLabel(item.wall_category);
  const hasRemovableRaw = Boolean(item.removable_raw_instance_id && item.raw_count > 0);

  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex gap-4">
        <Link href={`/card/${item.gv_id}`} className="h-28 w-20 shrink-0 overflow-hidden rounded-[1rem] border border-slate-200 bg-slate-50">
          <PublicCardImage
            src={item.image_url}
            alt={item.name}
            imageClassName="h-full w-full object-contain p-2"
            fallbackClassName="flex h-full w-full items-center justify-center bg-slate-100 px-2 text-center text-[10px] text-slate-500"
            fallbackLabel={item.name}
          />
        </Link>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <Link href={`/card/${item.gv_id}`} className="min-w-0 flex-1">
                <h3 className="line-clamp-2 text-lg font-semibold tracking-tight text-slate-950">{item.name}</h3>
              </Link>
              <div className="flex flex-wrap justify-end gap-1.5">
                {item.is_slab ? <MobileStatusChip label="Slab" tone="slab" /> : null}
                {item.is_shared ? <MobileStatusChip label="On Wall" tone="wall" /> : null}
                {wallCategoryLabel ? <MobileStatusChip label={wallCategoryLabel} /> : null}
              </div>
            </div>
            <p className="text-sm text-slate-500">
              {[item.set_name || item.set_code, item.number !== "—" ? `#${item.number}` : undefined].filter(Boolean).join(" • ")}
            </p>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-700">
                {mixedSummary ?? (item.is_slab ? slabSummary || "Graded slab" : `${item.condition_label} • Qty ${item.owned_count}`)}
              </p>
              <p className="text-sm font-medium text-slate-900">{formatCurrency(item.effective_price)}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canAdjustRaw ? (
              <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => onQuantityChange(item.vault_item_id, "decrement")}
                  disabled={isPending}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[15px] font-medium text-slate-600 transition hover:bg-white hover:text-slate-900 disabled:opacity-40"
                  aria-label={`Decrease raw quantity for ${item.name}`}
                >
                  −
                </button>
                <span className="min-w-[2.5rem] px-1.5 text-center text-sm font-medium text-slate-900">
                  {item.raw_count > 0 && item.slab_count > 0 ? item.raw_count : item.owned_count}
                </span>
                <button
                  type="button"
                  onClick={() => onQuantityChange(item.vault_item_id, "increment")}
                  disabled={isPending}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[15px] font-medium text-slate-600 transition hover:bg-white hover:text-slate-900 disabled:opacity-40"
                  aria-label={`Increase raw quantity for ${item.name}`}
                >
                  +
                </button>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => onShareToggle(item)}
              disabled={isSharePending}
              className={`rounded-full px-3 py-2 text-xs font-medium transition ${
                item.is_shared
                  ? "border border-slate-300 bg-slate-950 text-white hover:bg-slate-800"
                  : "border border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
              } disabled:opacity-60`}
            >
              {isSharePending ? "Saving..." : item.is_shared ? "Remove from Wall" : "Add to Wall"}
            </button>
            <button
              type="button"
              onClick={() => setDetailsOpen((current) => !current)}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
            >
              {detailsOpen ? "Hide details" : "Details"}
            </button>
            <ShareCardButton gvId={item.gv_id} />
          </div>

          {detailsOpen ? (
            <div className="space-y-3 border-t border-slate-200 pt-3">
              {!item.is_slab ? (
                <div className="space-y-2">
                  <label htmlFor={`mobile-condition-${rowKey}`} className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
                    Condition
                  </label>
                  <select
                    id={`mobile-condition-${rowKey}`}
                    value={item.condition_label || "NM"}
                    onChange={(event) => onConditionChange(item, event.target.value)}
                    disabled={isPending}
                    className="w-full rounded-[1rem] border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
                  >
                    {CONDITION_OPTIONS.map((condition) => (
                      <option key={condition} value={condition}>
                        {condition}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {item.is_slab ? (
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Grader</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{item.grader ?? "—"}</p>
                  </div>
                  <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Grade</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{item.grade ?? "—"}</p>
                  </div>
                  <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Cert</p>
                    <p className="mt-1 break-all text-sm font-medium text-slate-900">{item.cert_number ?? "—"}</p>
                  </div>
                </div>
              ) : null}

              {(hasRemovableRaw || item.slab_items.length > 0) ? (
                <div className="space-y-2 border-t border-slate-200 pt-3">
                  <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Remove owned objects</p>
                  {hasRemovableRaw ? (
                    <div className="flex flex-col gap-2 rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-3">
                      <p className="text-sm text-slate-700">
                        <span className="font-medium text-slate-900">{item.raw_count}</span> Raw
                      </p>
                      <OwnedObjectRemoveAction mode="raw" instanceId={item.removable_raw_instance_id!} label="Remove Raw" />
                    </div>
                  ) : null}
                  {item.slab_items.map((slabItem) => (
                    <div key={slabItem.instance_id} className="flex flex-col gap-2 rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-3">
                      <div className="space-y-1">
                        <p className="text-sm text-slate-700">
                          <span className="font-medium text-slate-900">1</span>{" "}
                          {formatObjectLevelSlabSummary(slabItem) || "Graded slab"}
                        </p>
                        {slabItem.cert_number ? <p className="text-xs text-slate-500">Cert {slabItem.cert_number}</p> : null}
                      </div>
                      <OwnedObjectRemoveAction mode="slab" instanceId={slabItem.instance_id} label="Remove Slab" />
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="border-t border-slate-200 pt-3">
                <button
                  type="button"
                  onClick={() => onSharedControlsToggle(item)}
                  disabled={!item.is_shared}
                  className="text-xs font-medium text-slate-700 underline-offset-4 transition hover:text-slate-950 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isSharedControlsExpanded ? "Hide wall controls" : "Manage wall item"}
                </button>

                {isSharedControlsExpanded ? (
                  <div className="mt-3 space-y-3">
                    <div className="space-y-2">
                      <label htmlFor={`mobile-wall-category-${rowKey}`} className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
                        Category
                      </label>
                      <select
                        id={`mobile-wall-category-${rowKey}`}
                        value={item.wall_category ?? ""}
                        disabled={!item.is_shared || isWallCategoryPending}
                        onChange={(event) =>
                          onWallCategoryChange(item, event.target.value ? (event.target.value as WallCategory) : null)
                        }
                        className="w-full rounded-[1rem] border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
                      >
                        <option value="">No category</option>
                        {WALL_CATEGORY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => onPublicNoteEdit(item)}
                        disabled={!item.is_shared}
                        className="text-xs font-medium text-slate-700 underline-offset-4 transition hover:text-slate-950 hover:underline disabled:opacity-40"
                      >
                        {item.public_note ? "Edit wall note" : "Add wall note"}
                      </button>
                      {item.is_shared && publicCollectionHref ? (
                        <Link href={publicCollectionHref} className="text-xs font-medium text-slate-700 underline-offset-4 transition hover:text-slate-950 hover:underline">
                          View Wall
                        </Link>
                      ) : null}
                    </div>

                    {!item.is_slab ? (
                      <div className="space-y-2">
                        <label className={`flex items-start gap-3 rounded-[1rem] border px-3 py-2.5 text-sm ${item.has_front_photo ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-100/80"}`}>
                          <input
                            type="checkbox"
                            checked={item.show_personal_front}
                            disabled={!item.is_shared || !item.has_front_photo || isPublicFrontImagePending}
                            onChange={(event) => onPublicImageToggle(item, "front", event.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 disabled:opacity-50"
                          />
                          <span className="min-w-0">
                            <span className="block font-medium text-slate-800">Show front photo</span>
                            {!item.has_front_photo ? <span className="mt-1 block text-xs text-slate-500">Upload a card photo in your vault to enable this.</span> : null}
                          </span>
                        </label>
                        <label className={`flex items-start gap-3 rounded-[1rem] border px-3 py-2.5 text-sm ${item.has_back_photo ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-100/80"}`}>
                          <input
                            type="checkbox"
                            checked={item.show_personal_back}
                            disabled={!item.is_shared || !item.has_back_photo || isPublicBackImagePending}
                            onChange={(event) => onPublicImageToggle(item, "back", event.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 disabled:opacity-50"
                          />
                          <span className="min-w-0">
                            <span className="block font-medium text-slate-800">Show back photo</span>
                            {!item.has_back_photo ? <span className="mt-1 block text-xs text-slate-500">Upload a card photo in your vault to enable this.</span> : null}
                          </span>
                        </label>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {itemErrors[rowKey] ? <p className="text-xs text-slate-500">{itemErrors[rowKey]}</p> : null}
          {shareErrors[rowKey] ? <p className="text-xs text-slate-500">{shareErrors[rowKey]}</p> : null}
        </div>
      </div>
    </article>
  );
}

export function VaultMobileViews(props: VaultMobileCommonProps) {
  const { items, mode } = props;

  if (mode === "compact") {
    return (
      <div className="space-y-2.5 md:hidden">
        {items.map((item) => (
          <MobileCompactRow key={item.id} item={item} />
        ))}
      </div>
    );
  }

  if (mode === "detail") {
    return (
      <div className="space-y-3 md:hidden">
        {items.map((item) => (
          <MobileDetailRow key={item.id} item={item} {...props} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:hidden">
      {items.map((item) => (
        <MobileGridCard key={item.id} item={item} />
      ))}
    </div>
  );
}
