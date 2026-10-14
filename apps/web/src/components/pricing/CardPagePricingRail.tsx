"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatUsdPrice } from "@/lib/cards/formatUsdPrice";
import { useClientViewer } from "@/lib/auth/useClientViewer";
import { supabase } from "@/lib/supabaseClient";
import type { CardPricingUiRecord } from "@/lib/pricing/getCardPricingUiByCardPrintId";
import type { MarketIntelligenceRecordV1 } from "@/lib/pricing/marketIntelligenceReadModelV1";

type CardPagePricingRailProps = {
  isAuthenticated: boolean;
  loginHref: string;
  gvId: string;
  cardPrintId?: string | null;
  pricing: CardPricingUiRecord | null;
  pricingRecords?: CardPricingUiRecord[];
  initialMarketIntelligenceRecords?: MarketIntelligenceRecordV1[];
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
      data-pricing-proof-role="primary"
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
      data-pricing-proof-role="primary"
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
    </div>
  );
}

function ActiveAskBlock({
  marketIntelligence,
  isLoading,
}: {
  marketIntelligence: MarketIntelligenceRecordV1 | null;
  isLoading: boolean;
}) {
  const observedAt = marketIntelligence
    ? formatObservedAt(marketIntelligence.observed_at)
    : null;

  return (
    <div
      className="space-y-1.5"
      data-market-intelligence-proof="exact-printing-active-asks"
      data-market-intelligence-status={marketIntelligence ? "available" : "unavailable"}
      data-card-printing-id={marketIntelligence?.card_printing_id}
      data-printing-gv-id={marketIntelligence?.printing_gv_id}
      data-source-name={marketIntelligence?.source_name}
      data-evidence-strength={marketIntelligence?.evidence_strength}
      data-is-market-value={marketIntelligence?.is_market_value ? "true" : "false"}
      data-is-completed-sale={marketIntelligence?.is_completed_sale ? "true" : "false"}
    >
      <p className="text-[11px] font-semibold uppercase text-slate-500">
        Available Today
      </p>
      {isLoading ? (
        <div className="space-y-2" role="status" aria-label="Loading active asking prices">
          <div className="h-7 w-24 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-52 animate-pulse rounded-md bg-slate-100 dark:bg-slate-900" />
        </div>
      ) : marketIntelligence ? (
        <>
          <p className="text-2xl font-semibold text-slate-950 dark:text-slate-100">
            {formatUsdPrice(marketIntelligence.lowest_active_ask)}
          </p>
          <p className="text-xs leading-5 text-slate-500">
            Lowest exact-printing eBay active ask
            {observedAt ? ` · Updated ${observedAt}` : ""}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-200/70 pt-3 dark:border-slate-800">
            <div>
              <p className="text-[11px] font-semibold uppercase text-slate-400">
                Median ask
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                {formatUsdPrice(marketIntelligence.median_active_ask)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase text-slate-400">
                Coverage
              </p>
              <p className="mt-1 text-sm font-medium capitalize text-slate-900 dark:text-slate-100">
                {marketIntelligence.evidence_strength}
              </p>
            </div>
          </div>
          <p className="text-xs leading-5 text-slate-500">
            {marketIntelligence.listing_count} active{" "}
            {marketIntelligence.listing_count === 1 ? "listing" : "listings"}{" "}
            across{" "}
            {marketIntelligence.seller_count}{" "}
            {marketIntelligence.seller_count === 1 ? "seller" : "sellers"}{" "}
            · Lowest-to-median spread{" "}
            {formatUsdPrice(marketIntelligence.ask_spread)} ({marketIntelligence.ask_spread_pct.toFixed(2)}%)
          </p>
          <p className="text-[11px] leading-5 text-slate-400">
            Asking-price evidence, not a sale or market close. It is not a market value.
          </p>
        </>
      ) : (
        <p className="text-xs leading-5 text-slate-500">
          No fresh exact-printing active asks are available.
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
            Exact-printing TCGPlayer Market data is available to signed-in collectors.
          </p>
        </div>
        <Link
          href={loginHref}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
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
  marketIntelligence,
  isLoading,
  isLoadingMarketIntelligence,
  error,
  onRetry,
}: {
  gvId: string;
  pricing: CardPricingUiRecord | null;
  marketIntelligence: MarketIntelligenceRecordV1 | null;
  isLoading: boolean;
  isLoadingMarketIntelligence: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="gv-card-pricing-panel px-1 py-1">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase text-slate-500">
            Pricing
          </p>
          {isLoading ? (
            <div className="space-y-3" role="status" aria-label="Loading market data">
              <div className="h-9 w-32 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-44 animate-pulse rounded-md bg-slate-100 dark:bg-slate-900" />
              <div className="h-4 w-56 animate-pulse rounded-md bg-slate-100 dark:bg-slate-900" />
            </div>
          ) : (
            <MarketPriceBlock pricing={pricing} />
          )}
        </div>
        {error ? (
          <div className="flex flex-col gap-3 border-t border-amber-200 pt-4 text-sm dark:border-amber-900/70 sm:flex-row sm:items-center sm:justify-between" role="status">
            <p className="text-amber-800 dark:text-amber-200">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-amber-300 px-4 py-2 font-medium text-amber-900 transition-colors hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 dark:border-amber-700 dark:text-amber-100 dark:hover:bg-amber-950/40"
            >
              Retry Pricing
            </button>
          </div>
        ) : null}
        {!isLoading ? (
          <details className="group border-t border-slate-200/70 pt-1 dark:border-slate-800" data-market-evidence-disclosure>
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 dark:text-slate-300 dark:hover:text-white">
              Market Evidence
              <span aria-hidden="true" className="text-slate-400 group-open:hidden">+</span>
              <span aria-hidden="true" className="hidden text-slate-400 group-open:inline">−</span>
            </summary>
            <div className="space-y-4 pb-1 pt-3">
              {pricing ? <SourceRange pricing={pricing} /> : null}
              <ActiveAskBlock
                marketIntelligence={marketIntelligence}
                isLoading={isLoadingMarketIntelligence}
              />
              <Link
                href={`/card/${encodeURIComponent(gvId)}/market`}
                className="inline-flex min-h-11 items-center text-sm font-medium text-slate-600 underline-offset-4 transition-colors hover:text-slate-950 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 dark:text-slate-300 dark:hover:text-white"
              >
                View Market History
              </Link>
            </div>
          </details>
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

function selectMarketIntelligenceRecord({
  records,
  selectedCardPrintingId,
  selectedPrintingGvId,
}: {
  records: MarketIntelligenceRecordV1[];
  selectedCardPrintingId?: string | null;
  selectedPrintingGvId?: string | null;
}) {
  if (selectedCardPrintingId) {
    return records.find(
      (record) => record.card_printing_id === selectedCardPrintingId,
    ) ?? null;
  }
  if (selectedPrintingGvId) {
    return records.find(
      (record) => record.printing_gv_id === selectedPrintingGvId,
    ) ?? null;
  }
  return records[0] ?? null;
}

export default function CardPagePricingRail({
  isAuthenticated,
  loginHref,
  gvId,
  cardPrintId = null,
  pricing,
  pricingRecords = [],
  initialMarketIntelligenceRecords = [],
  selectedCardPrintingId = null,
  selectedPrintingGvId = null,
}: CardPagePricingRailProps) {
  const viewer = useClientViewer(null);
  const effectiveIsAuthenticated = isAuthenticated || viewer.isAuthenticated;
  const [clientPricingRecords, setClientPricingRecords] =
    useState<CardPricingUiRecord[]>(pricingRecords);
  const [clientMarketIntelligenceRecords, setClientMarketIntelligenceRecords] =
    useState<MarketIntelligenceRecordV1[]>(initialMarketIntelligenceRecords);
  const [hasLoadedPricingBundle, setHasLoadedPricingBundle] = useState(
    !cardPrintId,
  );
  const [isLoadingPricing, setIsLoadingPricing] = useState(
    effectiveIsAuthenticated && Boolean(cardPrintId),
  );
  const [pricingError, setPricingError] = useState<string | null>(null);
  const selectedPricing = selectPricingRecord({
    records: clientPricingRecords,
    selectedCardPrintingId,
    selectedPrintingGvId,
    fallbackPricing: pricing,
  });
  const selectedMarketIntelligence = selectMarketIntelligenceRecord({
    records: clientMarketIntelligenceRecords,
    selectedCardPrintingId,
    selectedPrintingGvId,
  });

  useEffect(() => {
    if (
      !effectiveIsAuthenticated ||
      hasLoadedPricingBundle ||
      !cardPrintId
    ) {
      return;
    }

    const controller = new AbortController();
    setIsLoadingPricing(true);
    setPricingError(null);

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
      if (!response.ok) {
        throw new Error(`Pricing request failed with ${response.status}`);
      }
      const payload = (await response.json()) as {
        pricing?: CardPricingUiRecord | null;
        pricingRecords?: CardPricingUiRecord[];
        marketIntelligenceRecords?: MarketIntelligenceRecordV1[];
      };
      setClientPricingRecords(
        payload.pricingRecords ??
          (payload.pricing ? [payload.pricing] : []),
      );
      setClientMarketIntelligenceRecords(
        payload.marketIntelligenceRecords ?? [],
      );
    }

    loadPricing()
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setPricingError("Pricing couldn’t refresh. Check your connection, then try again.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setHasLoadedPricingBundle(true);
          setIsLoadingPricing(false);
        }
      });
    return () => controller.abort();
  }, [cardPrintId, effectiveIsAuthenticated, hasLoadedPricingBundle]);

  if (!effectiveIsAuthenticated) {
    return <LockedPricingState loginHref={loginHref} />;
  }
  return (
    <AuthenticatedPricingState
      gvId={gvId}
      pricing={selectedPricing}
      marketIntelligence={selectedMarketIntelligence}
      isLoading={isLoadingPricing && !selectedPricing}
      isLoadingMarketIntelligence={isLoadingPricing}
      error={pricingError}
      onRetry={() => setHasLoadedPricingBundle(false)}
    />
  );
}
