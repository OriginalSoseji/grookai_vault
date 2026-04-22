"use client";

import Link from "next/link";
import PokemonCardGridTile from "@/components/cards/PokemonCardGridTile";
import {
  resolveDisplayIdentity,
  resolveDisplayIdentitySubtitleForContext,
} from "@/lib/cards/resolveDisplayIdentity";
import {
  formatVaultCopyDate,
  formatVaultCopyIdentityLabel,
  formatVaultCardValue,
  formatVaultSecondaryContext,
  getVaultMessageSignalLabel,
  getVaultPrimaryActionLabel,
  getVaultCopyIntentBadgeClassName,
  getVaultCopyVisibilityBadgeClassName,
  getVaultCopyVisibilityLabel,
  VaultDetailPanel,
  VaultFieldLabel,
  VaultInsetCard,
  VaultPrimaryStateBadge,
  VaultStatPill,
} from "@/components/vault/VaultCardPrimitives";
import type { ViewDensity } from "@/hooks/useViewDensity";
import { getVaultIntentLabel, type VaultIntent } from "@/lib/network/intent";
import type { WallCategory } from "@/lib/sharedCards/wallCategories";

type VaultCardSlabItemData = {
  instance_id: string;
  grader: string | null;
  grade: string | null;
  cert_number?: string | null;
};

export type VaultCardInstanceData = {
  instance_id: string;
  gv_vi_id: string | null;
  intent: VaultIntent;
  condition_label: string | null;
  is_graded: boolean;
  grader: string | null;
  grade: string | null;
  cert_number: string | null;
  notes: string | null;
  created_at: string | null;
};

export type VaultCardData = {
  id: string;
  vault_item_id: string;
  gv_vi_id: string | null;
  card_id: string;
  gv_id: string;
  name: string;
  variant_key?: string;
  printed_identity_modifier?: string;
  set_identity_model?: string;
  set_code: string;
  set_name: string;
  number: string;
  condition_label: string;
  intent: VaultIntent;
  primary_intent: VaultIntent | null;
  hold_count: number;
  trade_count: number;
  sell_count: number;
  showcase_count: number;
  in_play_count: number;
  owned_count: number;
  raw_count: number;
  slab_count: number;
  removable_raw_instance_id: string | null;
  slab_items: VaultCardSlabItemData[];
  copy_items: VaultCardInstanceData[];
  effective_price: number | null;
  image_url?: string;
  canonical_image_url?: string;
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
  active_message_count: number;
  unread_message_count: number;
  messages_href: string | null;
};

type VaultCardTileProps = {
  item: VaultCardData;
  density?: ViewDensity;
  isExpanded: boolean;
  logoPath?: string;
  onExpansionToggle: (item: VaultCardData) => void;
};

function formatCopyMixSummary(item: Pick<VaultCardData, "raw_count" | "slab_count">) {
  const parts = [];

  if (item.raw_count > 0) {
    parts.push(`${item.raw_count} raw`);
  }

  if (item.slab_count > 0) {
    parts.push(`${item.slab_count} slab`);
  }

  return parts.length > 0 ? parts.join(" • ") : "No active copies";
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

function getSingleCopyHref(item: Pick<VaultCardData, "copy_items">) {
  if (item.copy_items.length !== 1) {
    return null;
  }

  const gvviId = item.copy_items[0]?.gv_vi_id;
  return gvviId ? `/vault/gvvi/${encodeURIComponent(gvviId)}` : null;
}

export function VaultCardTile({
  item,
  density = "default",
  isExpanded,
  onExpansionToggle,
}: VaultCardTileProps) {
  const displayIdentity = resolveDisplayIdentity(item);
  const setLabel = [item.set_name || item.set_code, item.number !== "—" ? `#${item.number}` : undefined]
    .filter(Boolean)
    .join(" • ");
  const identitySubtitle = resolveDisplayIdentitySubtitleForContext({
    identitySubtitle: displayIdentity.suffix,
    visibleSetLabel: setLabel,
  });
  const tileDensity = density === "compact" ? "compact" : density === "large" ? "large" : "default";
  const secondaryContext = formatVaultSecondaryContext(item);
  const intentMixSummary = formatIntentMixSummary(item);
  const manageCardHref = `/vault/card/${encodeURIComponent(item.card_id)}`;
  const cardValue = formatVaultCardValue(item.effective_price);
  const messageSignal = getVaultMessageSignalLabel({
    activeMessageCount: item.active_message_count,
    unreadMessageCount: item.unread_message_count,
  });
  const primaryActionHref =
    (item.active_message_count > 0 ? item.messages_href : null) ?? getSingleCopyHref(item) ?? manageCardHref;
  const primaryActionLabel = getVaultPrimaryActionLabel({
    inPlayCount: item.in_play_count,
    activeMessageCount: item.active_message_count,
  });
  const previewCopies = item.copy_items.slice(0, 2);

  const closedSummary = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {cardValue ? <p className="text-base font-semibold tracking-tight text-slate-950">{cardValue}</p> : null}
        {messageSignal ? (
          <VaultStatPill tone={item.unread_message_count > 0 ? "attention" : "default"}>{messageSignal}</VaultStatPill>
        ) : null}
      </div>
    </div>
  );

  const expandedSummary = isExpanded ? (
    <div className="space-y-4 border-t border-slate-100 pt-4">
      <div className="flex flex-wrap gap-2 text-xs text-slate-700">
        <VaultStatPill>
          <span className="font-semibold text-slate-900">{item.owned_count}</span>
          <span>total</span>
        </VaultStatPill>
        <VaultStatPill tone={item.in_play_count > 0 ? "default" : "muted"}>
          <span className="font-semibold text-slate-900">{item.in_play_count}</span>
          <span>visible</span>
        </VaultStatPill>
        <VaultStatPill tone="muted">{formatCopyMixSummary(item)}</VaultStatPill>
      </div>

      {intentMixSummary ? <p className="text-xs leading-5 text-slate-500">{intentMixSummary}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={primaryActionHref}
            className="inline-flex items-center justify-center rounded-full border border-slate-950 bg-slate-950 px-3 py-1.5 text-xs font-medium text-white shadow-[0_12px_26px_-18px_rgba(15,23,42,0.55)] transition hover:bg-slate-800"
          >
            {primaryActionLabel}
          </Link>
        </div>

        {primaryActionHref !== manageCardHref ? (
          <Link
            href={manageCardHref}
            className="text-xs font-medium text-slate-500 underline-offset-4 transition hover:text-slate-900 hover:underline"
          >
            Manage card
          </Link>
        ) : null}
      </div>
    </div>
  ) : null;

  const details = isExpanded ? (
    <div className="space-y-4">
      {expandedSummary}

      <VaultDetailPanel>
        <div className="space-y-3">
          <div className="space-y-1">
            <VaultFieldLabel>Copies</VaultFieldLabel>
            <p className="text-xs leading-5 text-slate-500">
              Open an exact copy when you want to edit deep details. Use Manage Card for grouped settings and the full copy list.
            </p>
          </div>

          <div className="space-y-2">
            {previewCopies.map((copy) => {
              const copyHref = copy.gv_vi_id ? `/vault/gvvi/${encodeURIComponent(copy.gv_vi_id)}` : null;
              const createdAt = formatVaultCopyDate(copy.created_at);

              return (
                <VaultInsetCard key={copy.instance_id} className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 space-y-2">
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
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{copy.gv_vi_id ?? "GVVI pending"}</span>
                        {createdAt ? <span>{createdAt}</span> : null}
                      </div>
                      {copy.notes ? <p className="text-xs leading-5 text-slate-500">{copy.notes}</p> : null}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
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
                    </div>
                  </div>
                </VaultInsetCard>
              );
            })}
          </div>

          <div className="border-t border-slate-200 pt-3">
            <Link
              href={manageCardHref}
              className="text-sm font-medium text-slate-600 underline-offset-4 transition hover:text-slate-950 hover:underline"
            >
              {item.copy_items.length > previewCopies.length
                ? `View all ${item.copy_items.length} copies and grouped settings`
                : "Open grouped settings"}
            </Link>
          </div>
        </div>
      </VaultDetailPanel>
    </div>
  ) : null;

  return (
    <PokemonCardGridTile
      density={tileDensity}
      className="h-full rounded-[1.6rem] border-slate-200/80 bg-white/95 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.3)]"
      imageSrc={item.image_url}
      imageFallbackSrc={item.canonical_image_url}
      imageAlt={displayIdentity.display_name}
      imageHref={`/card/${item.gv_id}`}
      imageFallbackLabel={displayIdentity.display_name}
      imageClassName={[
        tileDensity === "large" ? "max-w-[260px]" : undefined,
        "drop-shadow-[0_16px_28px_rgba(15,23,42,0.14)]",
      ]
        .filter(Boolean)
        .join(" ")}
      title={
        <Link href={`/card/${item.gv_id}`} className="block transition hover:text-slate-700">
          <span className="block line-clamp-2">{displayIdentity.base_name}</span>
          {identitySubtitle ? (
            <span className="block truncate text-xs font-medium text-slate-500">{identitySubtitle}</span>
          ) : null}
        </Link>
      }
      subtitle={
        <span className="line-clamp-1 block">{setLabel}</span>
      }
      badges={<VaultPrimaryStateBadge item={item} />}
      meta={secondaryContext ? <span className="line-clamp-1 text-sm text-slate-600">{secondaryContext}</span> : undefined}
      summary={closedSummary}
      details={details}
      footer={
        <div className={`flex items-center gap-3 ${isExpanded ? "justify-between" : "justify-end"}`}>
          {isExpanded ? (
            <span className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-slate-300">{item.gv_id}</span>
          ) : null}
          <button
            type="button"
            onClick={() => onExpansionToggle(item)}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            {isExpanded ? "Hide details" : "Details"}
          </button>
        </div>
      }
    />
  );
}
