"use client";

import Link from "next/link";
import PokemonCardGridTile from "@/components/cards/PokemonCardGridTile";
import VisiblePrice from "@/components/pricing/VisiblePrice";
import ShareCardButton from "@/components/ShareCardButton";
import OwnedObjectRemoveAction from "@/components/vault/OwnedObjectRemoveAction";
import {
  formatVaultObjectLevelSlabSummary,
  getVaultOwnershipSummary,
  VaultActionButton,
  VaultDetailPanel,
  VaultFieldLabel,
  VaultInsetCard,
  VaultQuantityStepper,
  VaultStatusBadges,
} from "@/components/vault/VaultCardPrimitives";
import type { ViewDensity } from "@/hooks/useViewDensity";
import {
  WALL_CATEGORY_OPTIONS,
  type WallCategory,
} from "@/lib/sharedCards/wallCategories";
import {
  DISCOVERABLE_VAULT_INTENT_VALUES,
  getVaultIntentLabel,
  type VaultIntent,
} from "@/lib/network/intent";

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
  intent: VaultIntent;
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

type VaultCardTileProps = {
  item: VaultCardData;
  density?: ViewDensity;
  isPending: boolean;
  isSharePending: boolean;
  isIntentPending: boolean;
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
  onIntentChange: (item: VaultCardData, intent: VaultIntent) => void;
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
  isIntentPending,
  isWallCategoryPending,
  isPublicFrontImagePending,
  isPublicBackImagePending,
  isSharedControlsExpanded,
  error,
  shareError,
  publicCollectionHref,
  onQuantityChange,
  onConditionChange,
  onIntentChange,
  onShareToggle,
  onWallCategoryChange,
  onSharedControlsToggle,
  onPublicNoteEdit,
  onPublicImageToggle,
}: VaultCardTileProps) {
  const hasRemovableRaw = Boolean(item.removable_raw_instance_id && item.raw_count > 0);
  const canManagePublicImages = !item.is_slab;
  const tileDensity = density === "compact" ? "compact" : density === "large" ? "large" : "default";
  const ownershipSummary = getVaultOwnershipSummary(item);

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
            <VaultQuantityStepper item={item} isPending={isPending} onQuantityChange={onQuantityChange} />
          </div>
        ) : (
          <p className="text-xs font-medium text-slate-500">Owned {item.owned_count}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <VaultActionButton
          onClick={() => onShareToggle(item)}
          disabled={isSharePending}
          tone={item.is_shared ? "strong" : "default"}
        >
          {isSharePending ? "Saving..." : item.is_shared ? "Remove from Wall" : "Add to Wall"}
        </VaultActionButton>
        <VaultActionButton onClick={() => onSharedControlsToggle(item)} tone="quiet">
          {isSharedControlsExpanded ? "Hide controls" : "Manage card"}
        </VaultActionButton>
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
    <VaultDetailPanel>
      <div className="space-y-1">
        <VaultFieldLabel>Manage</VaultFieldLabel>
        <p className="text-xs text-slate-500">
          Set discovery intent for the collector network, then manage wall settings and ownership controls.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor={`vault-intent-${item.card_id}`} className="block">
          <VaultFieldLabel>Network Intent</VaultFieldLabel>
        </label>
        <select
          id={`vault-intent-${item.card_id}`}
          value={item.intent}
          disabled={isIntentPending}
          onChange={(event) => onIntentChange(item, event.target.value as VaultIntent)}
          className="w-full rounded-[12px] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="hold">{getVaultIntentLabel("hold")} - hidden from network</option>
          {DISCOVERABLE_VAULT_INTENT_VALUES.map((intent) => (
            <option key={intent} value={intent}>
              {getVaultIntentLabel(intent)}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-500">
          Trade, sell, and showcase cards appear in the collector network when your public profile sharing is enabled.
        </p>
      </div>

      {item.is_shared ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <label
              htmlFor={`wall-category-${item.card_id}`}
              className="block"
            >
              <VaultFieldLabel>Wall Category</VaultFieldLabel>
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

          <VaultInsetCard className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-900">{item.public_note ? "Wall note added" : "Wall note"}</p>
              <p className="text-xs text-slate-500">
                {item.public_note ? "Edit the collector-facing note on this wall item." : "Add a note collectors can see on your wall."}
              </p>
            </div>
            <VaultActionButton
              type="button"
              onClick={() => onPublicNoteEdit(item)}
              tone="default"
            >
              {item.public_note ? "Edit note" : "Add note"}
            </VaultActionButton>
          </VaultInsetCard>

          {canManagePublicImages ? (
            <div className="space-y-2">
              <VaultFieldLabel>Public Images</VaultFieldLabel>

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
          <VaultFieldLabel>Owned Objects</VaultFieldLabel>
          {hasRemovableRaw ? (
            <VaultInsetCard className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-700">
                <span className="font-medium text-slate-900">{item.raw_count}</span> Raw
              </p>
              <OwnedObjectRemoveAction mode="raw" instanceId={item.removable_raw_instance_id!} label="Remove Raw" />
            </VaultInsetCard>
          ) : null}
          {item.slab_items.map((slabItem) => (
            <VaultInsetCard key={slabItem.instance_id} className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm text-slate-700">{formatVaultObjectLevelSlabSummary(slabItem) || "Graded slab"}</p>
                {slabItem.cert_number ? <p className="text-xs text-slate-500">Cert {slabItem.cert_number}</p> : null}
              </div>
              <OwnedObjectRemoveAction mode="slab" instanceId={slabItem.instance_id} label="Remove Slab" />
            </VaultInsetCard>
          ))}
        </div>
      ) : null}
    </VaultDetailPanel>
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
        <VaultStatusBadges item={item} />
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
