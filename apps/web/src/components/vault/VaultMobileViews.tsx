"use client";

import Link from "next/link";
import { useState } from "react";
import PokemonCardGridTile from "@/components/cards/PokemonCardGridTile";
import PublicCardImage from "@/components/PublicCardImage";
import ShareCardButton from "@/components/ShareCardButton";
import OwnedObjectRemoveAction from "@/components/vault/OwnedObjectRemoveAction";
import type { VaultCardData } from "@/components/vault/VaultCardTile";
import {
  formatVaultCurrency,
  formatVaultMixedOwnershipSummary,
  formatVaultObjectLevelSlabSummary,
  formatVaultSlabSummary,
  getVaultCardMetaLine,
  getVaultOwnershipSummary,
  VaultActionButton,
  VaultDetailPanel,
  VaultFieldLabel,
  VaultInsetCard,
  VaultQuantityStepper,
  VaultStatusBadges,
} from "@/components/vault/VaultCardPrimitives";
import { type VaultMobileViewMode } from "@/hooks/useVaultMobileViewMode";
import {
  getWallCategoryLabel,
  WALL_CATEGORY_OPTIONS,
  type WallCategory,
} from "@/lib/sharedCards/wallCategories";
import {
  DISCOVERABLE_VAULT_INTENT_VALUES,
  getVaultIntentLabel,
  type VaultIntent,
} from "@/lib/network/intent";

type VaultMobileCommonProps = {
  items: VaultCardData[];
  mode: VaultMobileViewMode;
  pendingItemId: string | null;
  pendingShareItemId: string | null;
  pendingIntentItemId: string | null;
  pendingWallCategoryItemId: string | null;
  pendingPublicImageKey: string | null;
  expandedSharedItemIds: Set<string>;
  itemErrors: Record<string, string>;
  shareErrors: Record<string, string>;
  publicCollectionHref: string | null;
  onQuantityChange: (itemId: string, type: "increment" | "decrement") => void;
  onConditionChange: (item: VaultCardData, condition: string) => void;
  onIntentChange: (item: VaultCardData, intent: VaultIntent) => void;
  onShareToggle: (item: VaultCardData) => void;
  onWallCategoryChange: (item: VaultCardData, wallCategory: WallCategory | null) => void;
  onSharedControlsToggle: (item: VaultCardData) => void;
  onPublicNoteEdit: (item: VaultCardData) => void;
  onPublicImageToggle: (item: VaultCardData, side: "front" | "back", enabled: boolean) => void;
};

const CONDITION_OPTIONS = ["NM", "LP", "MP", "HP", "DMG"];

function formatMixedOwnershipHeadline(item: VaultCardData) {
  const mixedSummary = formatVaultMixedOwnershipSummary(item);
  if (mixedSummary) {
    return mixedSummary;
  }

  if (item.is_slab) {
    return formatVaultSlabSummary(item) || "Graded slab";
  }

  return `${item.condition_label} • Qty ${item.owned_count}`;
}

function getRowKey(item: VaultCardData) {
  return item.card_id;
}

function MobileGridCard({ item }: { item: VaultCardData }) {
  return (
    <PokemonCardGridTile
      density="compact"
      className="h-full"
      imageSrc={item.image_url}
      imageAlt={item.name}
      imageHref={`/card/${item.gv_id}`}
      imageFallbackLabel={item.name}
      title={
        <Link href={`/card/${item.gv_id}`} className="line-clamp-2 block transition hover:text-slate-700">
          {item.name}
        </Link>
      }
      subtitle={<span className="line-clamp-2 block">{getVaultCardMetaLine(item)}</span>}
      badges={<VaultStatusBadges item={item} includeQuantity={false} />}
      meta={<span>{formatMixedOwnershipHeadline(item)}</span>}
      footer={
        <div className="flex items-center justify-between gap-2">
          <span>{formatVaultCurrency(item.effective_price)}</span>
          <span>Qty {item.owned_count}</span>
        </div>
      }
    />
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
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-3">
          <p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950">{item.name}</p>
          <p className="shrink-0 text-xs font-medium text-slate-700">{item.owned_count}</p>
        </div>
        <p className="line-clamp-1 text-xs text-slate-500">{getVaultCardMetaLine(item)}</p>
        <div className="flex items-center justify-between gap-3">
          <p className="line-clamp-1 text-xs text-slate-600">{getVaultOwnershipSummary(item)}</p>
          <p className="shrink-0 text-xs text-slate-500">{formatVaultCurrency(item.effective_price)}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <VaultStatusBadges item={item} includeQuantity={false} size="sm" />
        </div>
      </div>
    </Link>
  );
}

function MobileDetailRow({
  item,
  pendingItemId,
  pendingShareItemId,
  pendingIntentItemId,
  pendingWallCategoryItemId,
  pendingPublicImageKey,
  expandedSharedItemIds,
  itemErrors,
  shareErrors,
  publicCollectionHref,
  onQuantityChange,
  onConditionChange,
  onIntentChange,
  onShareToggle,
  onWallCategoryChange,
  onSharedControlsToggle,
  onPublicNoteEdit,
  onPublicImageToggle,
}: Omit<VaultMobileCommonProps, "items" | "mode"> & { item: VaultCardData }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const rowKey = getRowKey(item);
  const canAdjustRaw = item.raw_count > 0;
  const isPending = pendingItemId === rowKey;
  const isSharePending = pendingShareItemId === rowKey;
  const isIntentPending = pendingIntentItemId === rowKey;
  const isWallCategoryPending = pendingWallCategoryItemId === rowKey;
  const isPublicFrontImagePending = pendingPublicImageKey === `${rowKey}:front`;
  const isPublicBackImagePending = pendingPublicImageKey === `${rowKey}:back`;
  const isSharedControlsExpanded = expandedSharedItemIds.has(rowKey);
  const wallCategoryLabel = getWallCategoryLabel(item.wall_category);
  const hasRemovableRaw = Boolean(item.removable_raw_instance_id && item.raw_count > 0);

  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="space-y-4">
        <div className="flex gap-4">
          <Link
            href={`/card/${item.gv_id}`}
            className="flex w-24 shrink-0 items-center justify-center overflow-hidden rounded-[1rem] border border-slate-200 bg-slate-50 p-3"
          >
            <PublicCardImage
              src={item.image_url}
              alt={item.name}
              imageClassName="aspect-[3/4] w-full object-contain"
              fallbackClassName="flex aspect-[3/4] w-full items-center justify-center bg-slate-100 px-2 text-center text-[10px] text-slate-500"
              fallbackLabel={item.name}
            />
          </Link>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <Link href={`/card/${item.gv_id}`} className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-lg font-semibold tracking-tight text-slate-950">{item.name}</h3>
                </Link>
                {wallCategoryLabel ? <VaultStatusBadges item={item} includeQuantity={false} /> : null}
              </div>

              <p className="text-sm text-slate-500">{getVaultCardMetaLine(item)}</p>

              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-700">{formatMixedOwnershipHeadline(item)}</p>
                <p className="text-sm font-medium text-slate-900">{formatVaultCurrency(item.effective_price)}</p>
              </div>

              {!wallCategoryLabel ? (
                <div className="flex flex-wrap gap-1.5">
                  <VaultStatusBadges item={item} includeQuantity />
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canAdjustRaw ? (
                <VaultQuantityStepper item={item} isPending={isPending} onQuantityChange={onQuantityChange} />
              ) : null}
              <VaultActionButton
                type="button"
                onClick={() => onShareToggle(item)}
                disabled={isSharePending}
                tone={item.is_shared ? "strong" : "default"}
              >
                {isSharePending ? "Saving..." : item.is_shared ? "Remove from Wall" : "Add to Wall"}
              </VaultActionButton>
              <VaultActionButton type="button" onClick={() => setDetailsOpen((current) => !current)} tone="quiet">
                {detailsOpen ? "Hide details" : "Details"}
              </VaultActionButton>
              <ShareCardButton gvId={item.gv_id} />
            </div>
          </div>
        </div>

        {detailsOpen ? (
          <VaultDetailPanel>
            {!item.is_slab ? (
              <div className="space-y-2">
                <label htmlFor={`mobile-condition-${rowKey}`} className="block">
                  <VaultFieldLabel>Condition</VaultFieldLabel>
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
                <VaultInsetCard>
                  <VaultFieldLabel>Grader</VaultFieldLabel>
                  <p className="mt-1 text-sm font-medium text-slate-900">{item.grader ?? "—"}</p>
                </VaultInsetCard>
                <VaultInsetCard>
                  <VaultFieldLabel>Grade</VaultFieldLabel>
                  <p className="mt-1 text-sm font-medium text-slate-900">{item.grade ?? "—"}</p>
                </VaultInsetCard>
                <VaultInsetCard>
                  <VaultFieldLabel>Cert</VaultFieldLabel>
                  <p className="mt-1 break-all text-sm font-medium text-slate-900">{item.cert_number ?? "—"}</p>
                </VaultInsetCard>
              </div>
            ) : null}

            <div className="space-y-2">
              <label htmlFor={`mobile-intent-${rowKey}`} className="block">
                <VaultFieldLabel>Network Intent</VaultFieldLabel>
              </label>
              <select
                id={`mobile-intent-${rowKey}`}
                value={item.intent}
                disabled={isIntentPending}
                onChange={(event) => onIntentChange(item, event.target.value as VaultIntent)}
                className="w-full rounded-[1rem] border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
              >
                <option value="hold">{getVaultIntentLabel("hold")} - hidden from network</option>
                {DISCOVERABLE_VAULT_INTENT_VALUES.map((intent) => (
                  <option key={intent} value={intent}>
                    {getVaultIntentLabel(intent)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">
                Trade, sell, and showcase cards appear in the collector network when profile sharing is enabled.
              </p>
            </div>

            {(hasRemovableRaw || item.slab_items.length > 0) ? (
              <div className="space-y-2 border-t border-slate-200 pt-3">
                <VaultFieldLabel>Owned Objects</VaultFieldLabel>
                {hasRemovableRaw ? (
                  <VaultInsetCard className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-700">
                      <span className="font-medium text-slate-900">{item.raw_count}</span> Raw
                    </p>
                    <OwnedObjectRemoveAction mode="raw" instanceId={item.removable_raw_instance_id!} label="Remove Raw" />
                  </VaultInsetCard>
                ) : null}
                {item.slab_items.map((slabItem) => (
                  <VaultInsetCard
                    key={slabItem.instance_id}
                    className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <p className="text-sm text-slate-700">
                        <span className="font-medium text-slate-900">1</span>{" "}
                        {formatVaultObjectLevelSlabSummary(slabItem) || "Graded slab"}
                      </p>
                      {slabItem.cert_number ? <p className="text-xs text-slate-500">Cert {slabItem.cert_number}</p> : null}
                    </div>
                    <OwnedObjectRemoveAction mode="slab" instanceId={slabItem.instance_id} label="Remove Slab" />
                  </VaultInsetCard>
                ))}
              </div>
            ) : null}

            <div className="border-t border-slate-200 pt-3">
              <VaultActionButton
                type="button"
                onClick={() => onSharedControlsToggle(item)}
                disabled={!item.is_shared}
                tone="quiet"
              >
                {isSharedControlsExpanded ? "Hide wall controls" : "Manage wall item"}
              </VaultActionButton>

              {isSharedControlsExpanded ? (
                <div className="mt-3 space-y-3">
                  <div className="space-y-2">
                    <label htmlFor={`mobile-wall-category-${rowKey}`} className="block">
                      <VaultFieldLabel>Wall Category</VaultFieldLabel>
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

                  <VaultInsetCard className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-900">
                          {item.public_note ? "Wall note added" : "Wall note"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.public_note ? "Edit the collector-facing note on this wall item." : "Add a note collectors can see on your wall."}
                        </p>
                      </div>
                      <VaultActionButton type="button" onClick={() => onPublicNoteEdit(item)}>
                        {item.public_note ? "Edit note" : "Add note"}
                      </VaultActionButton>
                    </div>
                    {item.is_shared && publicCollectionHref ? (
                      <Link
                        href={publicCollectionHref}
                        className="text-xs font-medium text-slate-700 underline-offset-4 transition hover:text-slate-950 hover:underline"
                      >
                        View wall
                      </Link>
                    ) : null}
                  </VaultInsetCard>

                  {!item.is_slab ? (
                    <div className="space-y-2">
                      <VaultFieldLabel>Public Images</VaultFieldLabel>
                      <label
                        className={`flex items-start gap-3 rounded-[1rem] border px-3 py-2.5 text-sm ${
                          item.has_front_photo ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-100/80"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={item.show_personal_front}
                          disabled={!item.is_shared || !item.has_front_photo || isPublicFrontImagePending}
                          onChange={(event) => onPublicImageToggle(item, "front", event.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 disabled:opacity-50"
                        />
                        <span className="min-w-0">
                          <span className="block font-medium text-slate-800">Show front photo</span>
                          {!item.has_front_photo ? (
                            <span className="mt-1 block text-xs text-slate-500">
                              Upload a card photo in your vault to enable this.
                            </span>
                          ) : null}
                        </span>
                      </label>
                      <label
                        className={`flex items-start gap-3 rounded-[1rem] border px-3 py-2.5 text-sm ${
                          item.has_back_photo ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-100/80"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={item.show_personal_back}
                          disabled={!item.is_shared || !item.has_back_photo || isPublicBackImagePending}
                          onChange={(event) => onPublicImageToggle(item, "back", event.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 disabled:opacity-50"
                        />
                        <span className="min-w-0">
                          <span className="block font-medium text-slate-800">Show back photo</span>
                          {!item.has_back_photo ? (
                            <span className="mt-1 block text-xs text-slate-500">
                              Upload a card photo in your vault to enable this.
                            </span>
                          ) : null}
                        </span>
                      </label>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </VaultDetailPanel>
        ) : null}

        {itemErrors[rowKey] ? <p className="text-xs text-slate-500">{itemErrors[rowKey]}</p> : null}
        {shareErrors[rowKey] ? <p className="text-xs text-slate-500">{shareErrors[rowKey]}</p> : null}
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
