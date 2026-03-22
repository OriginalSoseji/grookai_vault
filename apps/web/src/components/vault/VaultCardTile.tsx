"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import PokemonCardGridTile, { PokemonCardGridBadge } from "@/components/cards/PokemonCardGridTile";
import VisiblePrice from "@/components/pricing/VisiblePrice";
import ShareCardButton from "@/components/ShareCardButton";
import OwnedObjectRemoveAction from "@/components/vault/OwnedObjectRemoveAction";
import type { ViewDensity } from "@/hooks/useViewDensity";
import {
  getWallCategoryLabel,
  WALL_CATEGORY_OPTIONS,
  type WallCategory,
} from "@/lib/sharedCards/wallCategories";

type VaultCardSlabItemData = {
  instance_id: string;
  grader: string | null;
  grade: string | null;
  cert_number?: string | null;
};

export type VaultCardData = {
  id: string;
  vault_item_id: string;
  gv_vi_id: string | null;
  card_id: string;
  gv_id: string;
  name: string;
  set_code: string;
  set_name: string;
  number: string;
  condition_label: string;
  owned_count: number;
  raw_count: number;
  slab_count: number;
  removable_raw_instance_id: string | null;
  slab_items: VaultCardSlabItemData[];
  effective_price: number | null;
  image_url?: string;
  created_at: string | null;
  is_slab: boolean;
  grader: string | null;
  grade: string | null;
  cert_number: string | null;
  is_shared: boolean;
  wall_category: WallCategory | null;
  public_note: string | null;
  show_personal_front: boolean;
  show_personal_back: boolean;
  has_front_photo: boolean;
  has_back_photo: boolean;
};

const CONDITION_OPTIONS = ["NM", "LP", "MP", "HP", "DMG"];

function formatSlabSummary(item: Pick<VaultCardData, "grader" | "grade">) {
  return [item.grader, item.grade].filter((value): value is string => typeof value === "string" && value.length > 0).join(" ");
}

function formatObjectLevelSlabSummary(item: Pick<VaultCardSlabItemData, "grader" | "grade">) {
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

function CompactActionButton({
  children,
  onClick,
  disabled = false,
  tone = "default",
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "strong";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-medium transition ${
        tone === "strong"
          ? "border border-slate-300 bg-slate-950 text-white hover:bg-slate-800"
          : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
      } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {children}
    </button>
  );
}

function QuantityStepper({
  item,
  isPending,
  onQuantityChange,
}: {
  item: VaultCardData;
  isPending: boolean;
  onQuantityChange: (itemId: string, type: "increment" | "decrement") => void;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50/90 p-1">
      <button
        type="button"
        onClick={() => onQuantityChange(item.vault_item_id, "decrement")}
        disabled={isPending}
        className="flex h-7 w-7 items-center justify-center rounded-full text-[15px] font-medium text-slate-600 transition hover:bg-white hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={`Decrease quantity for ${item.name}`}
      >
        −
      </button>
      <span className="min-w-[2rem] px-1.5 text-center text-sm font-medium text-slate-900">{item.owned_count}</span>
      <button
        type="button"
        onClick={() => onQuantityChange(item.vault_item_id, "increment")}
        disabled={isPending}
        className="flex h-7 w-7 items-center justify-center rounded-full text-[15px] font-medium text-slate-600 transition hover:bg-white hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={`Increase quantity for ${item.name}`}
      >
        +
      </button>
    </div>
  );
}

type VaultCardTileProps = {
  item: VaultCardData;
  density?: ViewDensity;
  isPending: boolean;
  isSharePending: boolean;
  isWallCategoryPending: boolean;
  isPublicFrontImagePending: boolean;
  isPublicBackImagePending: boolean;
  isSharedControlsExpanded: boolean;
  error?: string;
  shareError?: string;
  publicCollectionHref?: string | null;
  logoPath?: string;
  onQuantityChange: (itemId: string, type: "increment" | "decrement") => void;
  onConditionChange: (condition: string) => void;
  onShareToggle: (item: VaultCardData) => void;
  onWallCategoryChange: (item: VaultCardData, wallCategory: WallCategory | null) => void;
  onSharedControlsToggle: (item: VaultCardData) => void;
  onPublicNoteEdit: (item: VaultCardData) => void;
  onPublicImageToggle: (item: VaultCardData, side: "front" | "back", enabled: boolean) => void;
};

export function VaultCardTile({
  item,
  density = "default",
  isPending,
  isSharePending,
  isWallCategoryPending,
  isPublicFrontImagePending,
  isPublicBackImagePending,
  isSharedControlsExpanded,
  error,
  shareError,
  publicCollectionHref,
  onQuantityChange,
  onConditionChange,
  onShareToggle,
  onWallCategoryChange,
  onSharedControlsToggle,
  onPublicNoteEdit,
  onPublicImageToggle,
}: VaultCardTileProps) {
  const slabSummary = formatSlabSummary(item);
  const mixedOwnershipSummary = formatMixedOwnershipSummary(item);
  const hasRemovableRaw = Boolean(item.removable_raw_instance_id && item.raw_count > 0);
  const wallCategoryLabel = getWallCategoryLabel(item.wall_category);
  const canManagePublicImages = !item.is_slab;
  const tileDensity = density === "compact" ? "compact" : density === "large" ? "large" : "default";
  const ownershipSummary =
    mixedOwnershipSummary ??
    (item.is_slab
      ? slabSummary || `${item.slab_count || item.owned_count} Slab`
      : `Condition ${item.condition_label || "NM"}`);

  const summaryRow = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <VisiblePrice value={item.effective_price} size="dense" />
        {!item.is_slab ? (
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
              <span className="sr-only">Condition</span>
              <select
                value={item.condition_label || "NM"}
                onChange={(event) => onConditionChange(event.target.value)}
                disabled={isPending}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {CONDITION_OPTIONS.map((condition) => (
                  <option key={condition} value={condition}>
                    {condition}
                  </option>
                ))}
              </select>
            </label>
            <QuantityStepper item={item} isPending={isPending} onQuantityChange={onQuantityChange} />
          </div>
        ) : (
          <p className="text-xs font-medium text-slate-500">Owned {item.owned_count}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <CompactActionButton
          onClick={() => onShareToggle(item)}
          disabled={isSharePending}
          tone={item.is_shared ? "strong" : "default"}
        >
          {isSharePending ? "Saving..." : item.is_shared ? "Remove from Wall" : "Add to Wall"}
        </CompactActionButton>
        <CompactActionButton onClick={() => onSharedControlsToggle(item)}>
          {isSharedControlsExpanded ? "Hide controls" : "Manage card"}
        </CompactActionButton>
        {item.is_shared && publicCollectionHref ? (
          <Link
            href={publicCollectionHref}
            className="text-xs font-medium text-slate-600 underline-offset-4 transition hover:text-slate-950 hover:underline"
          >
            View wall
          </Link>
        ) : null}
      </div>

      {error ? <p className="text-xs text-slate-500">{error}</p> : null}
      {shareError ? <p className="text-xs text-slate-500">{shareError}</p> : null}
    </div>
  );

  const details = isSharedControlsExpanded ? (
    <div className="space-y-4 rounded-[14px] border border-slate-200 bg-slate-50/80 p-3">
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Manage</p>
        <p className="text-xs text-slate-500">
          {item.is_shared
            ? "Adjust wall settings and ownership controls."
            : "Wall settings become available after adding this card to your wall."}
        </p>
      </div>

      {item.is_shared ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <label
              htmlFor={`wall-category-${item.card_id}`}
              className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400"
            >
              Wall Category
            </label>
            <select
              id={`wall-category-${item.card_id}`}
              value={item.wall_category ?? ""}
              disabled={isWallCategoryPending}
              onChange={(event) =>
                onWallCategoryChange(item, event.target.value ? (event.target.value as WallCategory) : null)
              }
              className="w-full rounded-[12px] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">No category</option>
              {WALL_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-slate-200 bg-white px-3 py-2.5">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-900">{item.public_note ? "Wall note added" : "Wall note"}</p>
              <p className="text-xs text-slate-500">
                {item.public_note ? "Edit the collector-facing note on this wall item." : "Add a note collectors can see on your wall."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onPublicNoteEdit(item)}
              className="inline-flex rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              {item.public_note ? "Edit note" : "Add note"}
            </button>
          </div>

          {canManagePublicImages ? (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Public Images</p>

              <label className="flex items-start gap-3 rounded-[12px] border border-slate-200 bg-white px-3 py-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={item.show_personal_front}
                  disabled={!item.has_front_photo || isPublicFrontImagePending}
                  onChange={(event) => onPublicImageToggle(item, "front", event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <span className="min-w-0">
                  <span className="block font-medium text-slate-800">Show front photo</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {item.has_front_photo ? "Collectors will see your uploaded front photo." : "Upload a front photo in your vault to enable this."}
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-[12px] border border-slate-200 bg-white px-3 py-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={item.show_personal_back}
                  disabled={!item.has_back_photo || isPublicBackImagePending}
                  onChange={(event) => onPublicImageToggle(item, "back", event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <span className="min-w-0">
                  <span className="block font-medium text-slate-800">Show back photo</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {item.has_back_photo ? "Collectors will see your uploaded back photo." : "Upload a back photo in your vault to enable this."}
                  </span>
                </span>
              </label>
            </div>
          ) : null}
        </div>
      ) : null}

      {hasRemovableRaw || item.slab_items.length > 0 ? (
        <div className="space-y-2 border-t border-slate-200 pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Owned Objects</p>
          {hasRemovableRaw ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-slate-200 bg-white px-3 py-2.5">
              <p className="text-sm text-slate-700">
                <span className="font-medium text-slate-900">{item.raw_count}</span> Raw
              </p>
              <OwnedObjectRemoveAction mode="raw" instanceId={item.removable_raw_instance_id!} label="Remove Raw" />
            </div>
          ) : null}
          {item.slab_items.map((slabItem) => (
            <div
              key={slabItem.instance_id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-slate-200 bg-white px-3 py-2.5"
            >
              <div className="space-y-1">
                <p className="text-sm text-slate-700">{formatObjectLevelSlabSummary(slabItem) || "Graded slab"}</p>
                {slabItem.cert_number ? <p className="text-xs text-slate-500">Cert {slabItem.cert_number}</p> : null}
              </div>
              <OwnedObjectRemoveAction mode="slab" instanceId={slabItem.instance_id} label="Remove Slab" />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <PokemonCardGridTile
      density={tileDensity}
      imageSrc={item.image_url}
      imageAlt={item.name}
      imageHref={`/card/${item.gv_id}`}
      imageFallbackLabel={item.name}
      imageClassName={tileDensity === "large" ? "max-w-[260px]" : undefined}
      title={
        <Link href={`/card/${item.gv_id}`} className="line-clamp-2 block transition hover:text-slate-700">
          {item.name}
        </Link>
      }
      subtitle={
        <span className="line-clamp-1 block">
          {[item.set_name || item.set_code, item.number !== "—" ? `#${item.number}` : undefined].filter(Boolean).join(" • ")}
        </span>
      }
      badges={
        <>
          <PokemonCardGridBadge tone="neutral">Qty {item.owned_count}</PokemonCardGridBadge>
          <PokemonCardGridBadge tone={item.is_slab ? "warm" : "default"}>
            {item.is_slab ? "Slab" : "Raw"}
          </PokemonCardGridBadge>
          {item.is_shared ? <PokemonCardGridBadge tone="positive">On Wall</PokemonCardGridBadge> : null}
          {wallCategoryLabel ? <PokemonCardGridBadge tone="accent">{wallCategoryLabel}</PokemonCardGridBadge> : null}
        </>
      }
      meta={<span>{ownershipSummary}</span>}
      summary={summaryRow}
      details={details}
      footer={
        <div className="flex items-center justify-between gap-3">
          <span>{item.gv_id}</span>
          <ShareCardButton gvId={item.gv_id} />
        </div>
      }
    />
  );
}
