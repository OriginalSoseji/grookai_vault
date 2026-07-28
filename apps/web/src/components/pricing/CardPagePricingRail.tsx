"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatUsdPrice } from "@/lib/cards/formatUsdPrice";
import { useClientViewer } from "@/lib/auth/useClientViewer";
import { supabase } from "@/lib/supabaseClient";
import type { CardPricingUiRecord } from "@/lib/pricing/getCardPricingUiByCardPrintId";

type CardPagePricingRailProps = {
  isAuthenticated: boolean;
  loginHref: string;
  gvId: string;
  cardPrintId?: string | null;
  pricing: CardPricingUiRecord | null;
  pricingRecords?: CardPricingUiRecord[];
  selectedCardPrintingId?: string | null;
  selectedPrintingGvId?: string | null;
};

function formatObservedAt(value: string) {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function SourceRange({ pricing }: { pricing: CardPricingUiRecord }) {
  const values = [
    ["Low", pricing.low_price],
    ["Mid", pricing.mid_price],
    ["High", pricing.high_price],
  ] as const;
  if (values.some(([, value]) => typeof value !== "number")) {
    return null;
  }

  return (
    <div className="mt-3 grid grid-cols-3 gap-3 border-t border-slate-200/70 pt-3 dark:border-slate-800">
      {values.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <p className="text-[11px] font-semibold uppercase text-slate-400">
            {label}
          </p>
          <p className="mt-1 truncate text-sm font-medium text-slate-900 dark:text-slate-100">
            {formatUsdPrice(value as number)}
          </p>
        </div>
      ))}
    </div>
  );
}

function PricingEmptyState() {
  return (
    <div
      className="space-y-1.5"
      data-pricing-proof="tcgplayer-market"
      data-pricing-status="unavailable"
    >
      <p className="text-base font-semibold text-slate-950 dark:text-slate-100">
        No qualified market price
      </p>
      <p className="text-xs leading-5 text-slate-500">
        This printing does not yet have a fresh, exact TCGPlayer mapping.
      </p>
    </div>
  );
}

function MarketPriceBlock({
  pricing,
}: {
  pricing: CardPricingUiRecord | null;
}) {
  if (!pricing) return <PricingEmptyState />;

  const observedAt = formatObservedAt(pricing.observed_at);
  const context =
    pricing.pricing_scope === "card_printing"
      ? pricing.finish_key
        ? `${pricing.finish_key.replace(/_/g, " ")} printing`
        : "Exact printing"
      : pricing.is_from_price
        ? `${pricing.eligible_printing_count} exact printings`
        : "Exact printing";

  return (
    <div
      className="space-y-1"
      data-pricing-proof="tcgplayer-market"
      data-pricing-status={pricing.status}
      data-pricing-scope={pricing.pricing_scope}
      data-card-print-id={pricing.card_print_id}
      data-card-printing-id={pricing.card_printing_id}
      data-printing-gv-id={pricing.printing_gv_id}
      data-market-close-usd={pricing.market_close}
      data-currency={pricing.currency}
      data-source-name={pricing.source_name}
      data-source-label={pricing.source_label}
      data-observed-at={pricing.observed_at}
      data-published-at={pricing.published_at}
      data-provenance-id={pricing.provenance_id}
      data-is-from-price={pricing.is_from_price ? "true" : "false"}
    >
      <p className="text-3xl font-semibold text-slate-950 dark:text-slate-100">
        {pricing.is_from_price ? "From " : ""}
        {formatUsdPrice(pricing.market_close)}
      </p>
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {pricing.source_label}
      </p>
      <p className="text-xs text-slate-500">
        {context}
        {observedAt ? ` · Updated ${observedAt}` : ""}
      </p>
      <SourceRange pricing={pricing} />
    </div>
  );
}

function ActiveAskBlock({
  pricing,
}: {
  pricing: CardPricingUiRecord | null;
}) {
  return (
    <div className="space-y-1.5 border-t border-slate-200/70 pt-4 dark:border-slate-800">
      <p className="text-[11px] font-semibold uppercase text-slate-500">
        Available Today
      </p>
      {pricing && typeof pricing.lowest_active_ask === "number" ? (
        <>
          <p className="text-2xl font-semibold text-slate-950 dark:text-slate-100">
            {formatUsdPrice(pricing.lowest_active_ask)}
          </p>
          <p className="text-xs leading-5 text-slate-500">
            Lowest exact-printing eBay active ask
            {pricing.active_ask_listing_count
              ? ` · ${pricing.active_ask_listing_count} listings`
              : ""}
          </p>
          <p className="text-[11px] leading-5 text-slate-400">
            Asking-price evidence, not a sale or market close.
          </p>
        </>
      ) : (
        <p className="text-xs leading-5 text-slate-500">
          No exact-printing active ask is available.
        </p>
      )}
    </div>
  );
}

function LockedPricingState({ loginHref }: { loginHref: string }) {
  return (
    <div className="gv-card-pricing-panel px-1 py-1">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase text-slate-500">
            Pricing
          </p>
          <p className="text-xl font-semibold text-slate-950 dark:text-slate-100">
            Sign in to view pricing
          </p>
          <p className="text-xs leading-5 text-slate-500">
            Exact-printing TCGPlayer Market data is in signed-in canary.
          </p>
        </div>
        <Link
          href={loginHref}
          className="inline-flex bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}

function AuthenticatedPricingState({
  gvId,
  pricing,
  isLoading,
}: {
  gvId: string;
  pricing: CardPricingUiRecord | null;
  isLoading: boolean;
}) {
  return (
    <div className="gv-card-pricing-panel px-1 py-1">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase text-slate-500">
            Pricing
          </p>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading market data...</p>
          ) : (
            <MarketPriceBlock pricing={pricing} />
          )}
        </div>
        {!isLoading ? <ActiveAskBlock pricing={pricing} /> : null}
        {!isLoading ? (
          <Link
            href={`/card/${encodeURIComponent(gvId)}/market`}
            className="inline-flex text-sm text-slate-500 transition hover:text-slate-950"
          >
            View market history
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function selectPricingRecord({
  records,
  selectedCardPrintingId,
  selectedPrintingGvId,
  fallbackPricing,
}: {
  records: CardPricingUiRecord[];
  selectedCardPrintingId?: string | null;
  selectedPrintingGvId?: string | null;
  fallbackPricing: CardPricingUiRecord | null;
}) {
  if (selectedCardPrintingId) {
    const exact = records.find(
      (record) =>
        record.pricing_scope === "card_printing" &&
        record.card_printing_id === selectedCardPrintingId,
    );
    if (exact) return exact;
  }
  if (selectedPrintingGvId) {
    const exact = records.find(
      (record) =>
        record.pricing_scope === "card_printing" &&
        record.printing_gv_id === selectedPrintingGvId,
    );
    if (exact) return exact;
  }
  return (
    records.find((record) => record.pricing_scope === "parent") ??
    fallbackPricing ??
    records[0] ??
    null
  );
}

export default function CardPagePricingRail({
  isAuthenticated,
  loginHref,
  gvId,
  cardPrintId = null,
  pricing,
  pricingRecords = [],
  selectedCardPrintingId = null,
  selectedPrintingGvId = null,
}: CardPagePricingRailProps) {
  const viewer = useClientViewer(null);
  const effectiveIsAuthenticated = isAuthenticated || viewer.isAuthenticated;
  const [clientPricingRecords, setClientPricingRecords] =
    useState<CardPricingUiRecord[]>(pricingRecords);
  const [isLoadingPricing, setIsLoadingPricing] = useState(
    effectiveIsAuthenticated && pricingRecords.length === 0 && Boolean(cardPrintId),
  );
  const selectedPricing = selectPricingRecord({
    records: clientPricingRecords,
    selectedCardPrintingId,
    selectedPrintingGvId,
    fallbackPricing: pricing,
  });

  useEffect(() => {
    if (
      !effectiveIsAuthenticated ||
      clientPricingRecords.length > 0 ||
      !cardPrintId
    ) {
      return;
    }

    const controller = new AbortController();
    setIsLoadingPricing(true);

    async function loadPricing() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const response = await fetch(
        `/api/card-pricing?${new URLSearchParams({ card_print_id: cardPrintId! })}`,
        {
          cache: "no-store",
          credentials: "same-origin",
          headers: session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : undefined,
          signal: controller.signal,
        },
      );
      const payload = response.ok
        ? ((await response.json()) as {
            pricing?: CardPricingUiRecord | null;
            pricingRecords?: CardPricingUiRecord[];
          })
        : null;
      setClientPricingRecords(
        payload?.pricingRecords ??
          (payload?.pricing ? [payload.pricing] : []),
      );
      setIsLoadingPricing(false);
    }

    loadPricing().catch(() => setIsLoadingPricing(false));
    return () => controller.abort();
  }, [cardPrintId, clientPricingRecords.length, effectiveIsAuthenticated]);

  if (!effectiveIsAuthenticated) {
    return <LockedPricingState loginHref={loginHref} />;
  }
  return (
    <AuthenticatedPricingState
      gvId={gvId}
      pricing={selectedPricing}
      isLoading={isLoadingPricing && !selectedPricing}
    />
  );
}
