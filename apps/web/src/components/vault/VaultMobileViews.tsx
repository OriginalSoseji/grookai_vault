"use client";

import Link from "next/link";
import PokemonCardGridTile from "@/components/cards/PokemonCardGridTile";
import OwnedObjectRemoveAction from "@/components/vault/OwnedObjectRemoveAction";
import PublicCardImage from "@/components/PublicCardImage";
import ShareCardButton from "@/components/ShareCardButton";
import type { VaultCardData } from "@/components/vault/VaultCardTile";
import {
  formatVaultCopyDate,
  formatVaultCopyIdentityLabel,
  formatVaultCardValue,
  formatVaultMixedOwnershipSummary,
  formatVaultSlabSummary,
  getVaultCardMetaLine,
  getVaultCopyIntentBadgeClassName,
  getVaultCopyVisibilityBadgeClassName,
  getVaultCopyVisibilityLabel,
  getVaultMessageSignalLabel,
  getVaultOwnershipSummary,
  getVaultPrimaryActionLabel,
  VaultActionButton,
  VaultDetailPanel,
  VaultFieldLabel,
  VaultInsetCard,
  VaultStatPill,
  VaultStatusBadges,
} from "@/components/vault/VaultCardPrimitives";
import { type VaultMobileViewMode } from "@/hooks/useVaultMobileViewMode";
import {
  WALL_CATEGORY_OPTIONS,
  type WallCategory,
} from "@/lib/sharedCards/wallCategories";
import { getVaultIntentLabel } from "@/lib/network/intent";

type VaultMobileCommonProps = {
  items: VaultCardData[];
  mode: VaultMobileViewMode;
  expandedCardId: string | null;
  pendingShareItemId: string | null;
  pendingWallCategoryItemId: string | null;
  pendingPublicImageKey: string | null;
  shareErrors: Record<string, string>;
  publicCollectionHref: string | null;
  onExpansionToggle: (item: VaultCardData) => void;
  onShareToggle: (item: VaultCardData) => void;
  onWallCategoryChange: (item: VaultCardData, wallCategory: WallCategory | null) => void;
  onPublicNoteEdit: (item: VaultCardData) => void;
  onPublicImageToggle: (item: VaultCardData, side: "front" | "back", enabled: boolean) => void;
};

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

function formatIntentMixSummary(item: Pick<VaultCardData, "sell_count" | "trade_count" | "showcase_count">) {
  const parts = [];

  if (item.sell_count > 0) {
    parts.push(`${item.sell_count} sell`);
  }

  if (item.trade_count > 0) {
    parts.push(`${item.trade_count} trade`);
  }

  if (item.showcase_count > 0) {
    parts.push(`${item.showcase_count} showcase`);
  }

  return parts.join(" • ");
}

function getRowKey(item: VaultCardData) {
  return item.card_id;
}

function getSingleCopyHref(item: Pick<VaultCardData, "copy_items">) {
  if (item.copy_items.length !== 1) {
    return null;
  }

  const gvviId = item.copy_items[0]?.gv_vi_id;
  return gvviId ? `/vault/gvvi/${encodeURIComponent(gvviId)}` : null;
}

function MobileGridCard({ item }: { item: VaultCardData }) {
  const cardValue = formatVaultCardValue(item.effective_price);
  const messageSignal = getVaultMessageSignalLabel({
    activeMessageCount: item.active_message_count,
    unreadMessageCount: item.unread_message_count,
  });

  return (
    <PokemonCardGridTile
      density="compact"
      className="h-full rounded-[1.5rem] border-slate-200/80 bg-white/95 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.28)]"
      imageSrc={item.image_url}
      imageFallbackSrc={item.canonical_image_url}
      imageAlt={item.name}
      imageHref={`/card/${item.gv_id}`}
      imageFallbackLabel={item.name}
      imageClassName="drop-shadow-[0_14px_24px_rgba(15,23,42,0.14)]"
      title={
        <Link href={`/card/${item.gv_id}`} className="line-clamp-2 block transition hover:text-slate-700">
          {item.name}
        </Link>
      }
      subtitle={<span className="line-clamp-2 block">{getVaultCardMetaLine(item)}</span>}
      badges={<VaultStatusBadges item={item} includeQuantity={false} />}
      meta={
        <div className="space-y-1">
          <span className="text-slate-600">{formatMixedOwnershipHeadline(item)}</span>
          {messageSignal ? (
            <p className={`text-xs font-medium ${item.unread_message_count > 0 ? "text-emerald-700" : "text-slate-500"}`}>
              {messageSignal}
            </p>
          ) : null}
        </div>
      }
      footer={
        <div className={`flex items-center gap-2 ${cardValue ? "justify-between" : "justify-end"}`}>
          {cardValue ? <span className="text-sm font-semibold text-slate-900">{cardValue}</span> : null}
          <VaultStatPill className="shrink-0">
            <span className="font-semibold text-slate-900">{item.owned_count}</span>
            <span>total</span>
          </VaultStatPill>
        </div>
      }
    />
  );
}

function MobileCompactRow({ item }: { item: VaultCardData }) {
  const cardValue = formatVaultCardValue(item.effective_price);
  const messageSignal = getVaultMessageSignalLabel({
    activeMessageCount: item.active_message_count,
    unreadMessageCount: item.unread_message_count,
  });

  return (
    <Link
      href={`/card/${item.gv_id}`}
      className="flex items-center gap-3.5 rounded-[1.4rem] border border-slate-200/80 bg-white/95 px-3.5 py-3.5 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.26)] transition hover:border-slate-300"
    >
      <div className="h-16 w-12 shrink-0 overflow-hidden rounded-[0.95rem] border border-slate-200 bg-slate-50">
        <PublicCardImage
          src={item.image_url}
          fallbackSrc={item.canonical_image_url}
          alt={item.name}
          imageClassName="h-full w-full object-contain p-1.5"
          fallbackClassName="flex h-full w-full items-center justify-center bg-slate-100 px-1 text-center text-[10px] text-slate-500"
          fallbackLabel={item.name}
        />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950">{item.name}</p>
            <p className="line-clamp-1 text-xs text-slate-500">{getVaultCardMetaLine(item)}</p>
          </div>
          <div className="shrink-0 space-y-1 text-right">
            {cardValue ? <p className="text-sm font-semibold text-slate-900">{cardValue}</p> : null}
            <VaultStatPill className="justify-center">
              <span className="font-semibold text-slate-900">{item.owned_count}</span>
              <span>total</span>
            </VaultStatPill>
          </div>
        </div>
        <p className="line-clamp-1 text-xs text-slate-600">{getVaultOwnershipSummary(item)}</p>
        {messageSignal ? (
          <p className={`text-xs font-medium ${item.unread_message_count > 0 ? "text-emerald-700" : "text-slate-500"}`}>
            {messageSignal}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-1.5">
          <VaultStatusBadges item={item} includeQuantity={false} size="sm" />
        </div>
      </div>
    </Link>
  );
}

function MobileDetailRow({
  item,
  expandedCardId,
  pendingShareItemId,
  pendingWallCategoryItemId,
  pendingPublicImageKey,
  shareErrors,
  publicCollectionHref,
  onExpansionToggle,
  onShareToggle,
  onWallCategoryChange,
  onPublicNoteEdit,
  onPublicImageToggle,
}: Omit<VaultMobileCommonProps, "items" | "mode"> & { item: VaultCardData }) {
  const rowKey = getRowKey(item);
  const isExpanded = expandedCardId === rowKey;
  const isSharePending = pendingShareItemId === rowKey;
  const isWallCategoryPending = pendingWallCategoryItemId === rowKey;
  const isPublicFrontImagePending = pendingPublicImageKey === `${rowKey}:front`;
  const isPublicBackImagePending = pendingPublicImageKey === `${rowKey}:back`;
  const intentMixSummary = formatIntentMixSummary(item);
  const copiesSectionId = `vault-card-copies-mobile-${rowKey}`;
  const cardValue = formatVaultCardValue(item.effective_price);
  const messageSignal = getVaultMessageSignalLabel({
    activeMessageCount: item.active_message_count,
    unreadMessageCount: item.unread_message_count,
  });
  const primaryActionHref =
    item.active_message_count > 0 ? item.messages_href : getSingleCopyHref(item);
  const primaryActionLabel = getVaultPrimaryActionLabel({
    inPlayCount: item.in_play_count,
    activeMessageCount: item.active_message_count,
  });

  function handlePrimaryActionClick() {
    if (typeof document === "undefined") {
      return;
    }

    document.getElementById(copiesSectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }

  return (
    <article className="rounded-[1.65rem] border border-slate-200/80 bg-white/95 p-4 shadow-[0_24px_48px_-36px_rgba(15,23,42,0.3)]">
      <div className="space-y-4">
        <div className="flex gap-4">
          <Link
            href={`/card/${item.gv_id}`}
            className="flex w-24 shrink-0 items-center justify-center overflow-hidden rounded-[1.1rem] border border-slate-200 bg-slate-50 p-3"
          >
            <PublicCardImage
              src={item.image_url}
              fallbackSrc={item.canonical_image_url}
              alt={item.name}
              imageClassName="aspect-[3/4] w-full object-contain drop-shadow-[0_16px_28px_rgba(15,23,42,0.14)]"
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
                {cardValue ? <p className="text-base font-semibold tracking-tight text-slate-950">{cardValue}</p> : null}
              </div>

              <p className="text-sm text-slate-500">{getVaultCardMetaLine(item)}</p>
              <p className="text-sm font-medium text-slate-700">{formatMixedOwnershipHeadline(item)}</p>

              <div className="flex flex-wrap gap-1.5">
                <VaultStatusBadges item={item} includeQuantity={false} />
              </div>

              {messageSignal ? (
                <VaultStatPill tone={item.unread_message_count > 0 ? "attention" : "default"}>{messageSignal}</VaultStatPill>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
          {isExpanded ? <span className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-slate-300">{item.gv_id}</span> : <span />}
          <button
            type="button"
            onClick={() => onExpansionToggle(item)}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            {isExpanded ? "Hide details" : "Details"}
          </button>
        </div>

        {isExpanded ? (
          <div className="space-y-4">
            <div className="space-y-4 border-t border-slate-100 pt-4">
              <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                <VaultStatPill>
                  <span className="font-semibold text-slate-900">{item.owned_count}</span>
                  <span>total</span>
                </VaultStatPill>
                <VaultStatPill tone={item.in_play_count > 0 ? "default" : "muted"}>
                  <span className="font-semibold text-slate-900">{item.in_play_count}</span>
                  <span>in play</span>
                </VaultStatPill>
                <VaultStatPill tone="muted">
                  {item.raw_count > 0 && item.slab_count > 0
                    ? `${item.raw_count} raw • ${item.slab_count} slab`
                    : item.is_slab
                      ? `${item.slab_count || item.owned_count} slab`
                      : `${item.raw_count || item.owned_count} raw`}
                </VaultStatPill>
              </div>

              {intentMixSummary ? <p className="text-xs text-slate-500">{intentMixSummary}</p> : null}

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {primaryActionHref ? (
                    <Link
                      href={primaryActionHref}
                      className="inline-flex items-center justify-center rounded-full border border-slate-950 bg-slate-950 px-3 py-1.5 text-xs font-medium text-white shadow-[0_12px_26px_-18px_rgba(15,23,42,0.55)] transition hover:bg-slate-800"
                    >
                      {primaryActionLabel}
                    </Link>
                  ) : (
                    <VaultActionButton type="button" onClick={handlePrimaryActionClick} tone="strong">
                      {primaryActionLabel}
                    </VaultActionButton>
                  )}
                  <VaultActionButton
                    type="button"
                    onClick={() => onShareToggle(item)}
                    disabled={isSharePending}
                    tone="quiet"
                  >
                    {isSharePending ? "Saving..." : item.is_shared ? "Remove from Wall" : "Add to Wall"}
                  </VaultActionButton>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  {item.is_shared && publicCollectionHref ? (
                    <Link
                      href={publicCollectionHref}
                      className="font-medium text-slate-500 underline-offset-4 transition hover:text-slate-900 hover:underline"
                    >
                      View wall
                    </Link>
                  ) : null}
                  <ShareCardButton gvId={item.gv_id} />
                </div>

                {shareErrors[rowKey] ? <p className="text-xs text-slate-500">{shareErrors[rowKey]}</p> : null}
              </div>
            </div>

            <VaultDetailPanel>
              <div id={copiesSectionId} className="space-y-3">
                <div className="space-y-1">
                  <VaultFieldLabel>Copies</VaultFieldLabel>
                  <p className="text-xs leading-5 text-slate-500">Open an exact copy when you want to edit details or remove it from your vault.</p>
                </div>

                <div className="space-y-2">
                  {item.copy_items.map((copy) => {
                    const copyHref = copy.gv_vi_id ? `/vault/gvvi/${encodeURIComponent(copy.gv_vi_id)}` : null;
                    const createdAt = formatVaultCopyDate(copy.created_at);

                    return (
                      <VaultInsetCard key={copy.instance_id} className="space-y-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-slate-900">{formatVaultCopyIdentityLabel(copy)}</p>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
                              <span
                                className={`inline-flex rounded-full border px-2 py-0.5 ${getVaultCopyIntentBadgeClassName(copy.intent)}`}
                              >
                                {getVaultIntentLabel(copy.intent)}
                              </span>
                              <span
                                className={`inline-flex rounded-full border px-2 py-0.5 ${getVaultCopyVisibilityBadgeClassName(copy.intent)}`}
                              >
                                {getVaultCopyVisibilityLabel(copy.intent)}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                              <span>{copy.gv_vi_id ?? "GVVI pending"}</span>
                              {createdAt ? <span>{createdAt}</span> : null}
                            </div>
                            {copy.notes ? <p className="text-xs leading-5 text-slate-500">{copy.notes}</p> : null}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {copyHref ? (
                              <Link
                                href={copyHref}
                                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                              >
                                Open copy
                              </Link>
                            ) : (
                              <span className="text-xs font-medium text-slate-400">Copy unavailable</span>
                            )}
                            <OwnedObjectRemoveAction
                              instanceId={copy.instance_id}
                              label={copy.is_graded ? "Remove slab" : "Remove copy"}
                              buttonClassName="inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                            />
                          </div>
                        </div>
                      </VaultInsetCard>
                    );
                  })}
                </div>
              </div>

              {item.is_shared ? (
                <div className="space-y-3 border-t border-slate-200 pt-3">
                  <div className="space-y-1">
                    <VaultFieldLabel>Wall</VaultFieldLabel>
                    <p className="text-xs leading-5 text-slate-500">Public wall settings stay grouped at the card level.</p>
                  </div>

                  <div className="space-y-3">
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
                          className="text-xs font-medium text-slate-500 underline-offset-4 transition hover:text-slate-900 hover:underline"
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
                </div>
              ) : null}
            </VaultDetailPanel>
          </div>
        ) : null}

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
