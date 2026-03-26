"use client";

import Link from "next/link";
import PokemonCardGridTile from "@/components/cards/PokemonCardGridTile";
import PublicCardImage from "@/components/PublicCardImage";
import type { VaultCardData } from "@/components/vault/VaultCardTile";
import {
  formatVaultCopyDate,
  formatVaultCopyIdentityLabel,
  formatVaultCardValue,
  formatVaultSecondaryContext,
  getVaultCardMetaLine,
  getVaultCopyIntentBadgeClassName,
  getVaultCopyVisibilityBadgeClassName,
  getVaultCopyVisibilityLabel,
  getVaultMessageSignalLabel,
  getVaultPrimaryActionLabel,
  VaultDetailPanel,
  VaultFieldLabel,
  VaultInsetCard,
  VaultPrimaryStateBadge,
  VaultStatPill,
} from "@/components/vault/VaultCardPrimitives";
import { type VaultMobileViewMode } from "@/hooks/useVaultMobileViewMode";
import { getVaultIntentLabel } from "@/lib/network/intent";

type VaultMobileCommonProps = {
  items: VaultCardData[];
  mode: VaultMobileViewMode;
  expandedCardId: string | null;
  onExpansionToggle: (item: VaultCardData) => void;
};

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
  const secondaryContext = formatVaultSecondaryContext(item);
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
      badges={<VaultPrimaryStateBadge item={item} />}
      meta={
        <div className="space-y-1">
          {secondaryContext ? <span className="text-slate-600">{secondaryContext}</span> : null}
        </div>
      }
      summary={
        <div className="space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            {cardValue ? <p className="text-sm font-semibold tracking-tight text-slate-950">{cardValue}</p> : null}
            {messageSignal ? (
              <VaultStatPill tone={item.unread_message_count > 0 ? "attention" : "default"}>{messageSignal}</VaultStatPill>
            ) : null}
          </div>
        </div>
      }
    />
  );
}

function MobileCompactRow({ item }: { item: VaultCardData }) {
  const cardValue = formatVaultCardValue(item.effective_price);
  const secondaryContext = formatVaultSecondaryContext(item);
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
            <VaultPrimaryStateBadge item={item} size="sm" />
          </div>
          <div className="shrink-0 text-right">
            {cardValue ? <p className="text-sm font-semibold text-slate-900">{cardValue}</p> : null}
          </div>
        </div>
        {secondaryContext ? <p className="line-clamp-1 text-xs text-slate-600">{secondaryContext}</p> : null}
        {messageSignal ? (
          <p className={`text-xs font-medium ${item.unread_message_count > 0 ? "text-emerald-700" : "text-slate-500"}`}>
            {messageSignal}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

function MobileDetailRow({
  item,
  expandedCardId,
  onExpansionToggle,
}: Omit<VaultMobileCommonProps, "items" | "mode"> & { item: VaultCardData }) {
  const rowKey = getRowKey(item);
  const isExpanded = expandedCardId === rowKey;
  const intentMixSummary = formatIntentMixSummary(item);
  const manageCardHref = `/vault/card/${encodeURIComponent(item.card_id)}`;
  const cardValue = formatVaultCardValue(item.effective_price);
  const secondaryContext = formatVaultSecondaryContext(item);
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
              <VaultPrimaryStateBadge item={item} />

              {secondaryContext ? <p className="text-sm font-medium text-slate-700">{secondaryContext}</p> : null}

              {messageSignal ? (
                <VaultStatPill tone={item.unread_message_count > 0 ? "attention" : "default"}>{messageSignal}</VaultStatPill>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
          {isExpanded ? (
            <span className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-slate-300">{item.gv_id}</span>
          ) : (
            <span />
          )}
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
                <VaultStatPill tone="muted">{formatCopyMixSummary(item)}</VaultStatPill>
              </div>

              {intentMixSummary ? <p className="text-xs text-slate-500">{intentMixSummary}</p> : null}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link
                  href={primaryActionHref}
                  className="inline-flex items-center justify-center rounded-full border border-slate-950 bg-slate-950 px-3 py-1.5 text-xs font-medium text-white shadow-[0_12px_26px_-18px_rgba(15,23,42,0.55)] transition hover:bg-slate-800"
                >
                  {primaryActionLabel}
                </Link>

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

            <VaultDetailPanel>
              <div className="space-y-3">
                <div className="space-y-1">
                  <VaultFieldLabel>Copies</VaultFieldLabel>
                  <p className="text-xs leading-5 text-slate-500">
                    Open an exact copy when you want deep edits. Use Manage Card for grouped settings and the full copy list.
                  </p>
                </div>

                <div className="space-y-2">
                  {previewCopies.map((copy) => {
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
