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

function PricingLowMidHigh({
  low,
  mid,
  high,
  lowLabel = "Low",
  midLabel = "Mid",
  highLabel = "High",
}: {
  low: number;
  mid: number;
  high: number;
  lowLabel?: string;
  midLabel?: string;
  highLabel?: string;
}) {
  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex justify-between gap-3 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
        <span>{lowLabel}</span>
        <span>{midLabel}</span>
        <span>{highLabel}</span>
      </div>
      <div className="flex justify-between gap-3 text-sm font-medium text-slate-900 dark:text-slate-100">
        <span>{formatUsdPrice(low)}</span>
        <span>{formatUsdPrice(mid)}</span>
        <span>{formatUsdPrice(high)}</span>
      </div>
    </div>
  );
}

function formatPricingLabel(value?: string) {
  const normalized = value?.trim().replace(/_/g, " ");
  if (!normalized) return null;
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatMarketPressure(pricing: CardPricingUiRecord) {
  const status = pricing.market_pressure_status;
  if (!status) return null;

  if (status === "active_listings_above_reference") {
    return typeof pricing.market_pressure_pct === "number"
      ? `Active asks are ${Math.round(pricing.market_pressure_pct)}% above reference`
      : "Active asks are above reference";
  }
  if (status === "active_listings_below_reference") {
    return typeof pricing.market_pressure_pct === "number"
      ? `Active asks are ${Math.abs(Math.round(pricing.market_pressure_pct))}% below reference`
      : "Active asks are below reference";
  }
  if (status === "active_listings_aligned_with_reference") {
    return "Active asks are aligned with reference";
  }
  if (status === "reference_only_no_active_ask") {
    return "No active ask signal available";
  }
  if (status === "active_listing_only_no_reference_anchor") {
    return "No reference market anchor available";
  }

  return formatPricingLabel(status);
}

function PricingEmptyState() {
  return (
    <div className="space-y-1.5">
      <p className="text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">No pricing data available</p>
      <p className="text-xs leading-5 text-slate-500">Pricing for this card is not available yet.</p>
    </div>
  );
}

function GrookaiValueBlock({ pricing }: { pricing: CardPricingUiRecord | null }) {
  if (!pricing) {
    return <PricingEmptyState />;
  }

  const lowPrice = typeof pricing.grookai_value_low === "number" ? pricing.grookai_value_low : null;
  const midPrice = typeof pricing.grookai_value_mid === "number" ? pricing.grookai_value_mid : null;
  const highPrice = typeof pricing.grookai_value_high === "number" ? pricing.grookai_value_high : null;
  const hasLowMidHigh =
    typeof lowPrice === "number" &&
    typeof midPrice === "number" &&
    typeof highPrice === "number";

  if (typeof midPrice !== "number") {
    const noValuationAnchor = pricing.grookai_value_block_reason === "blocked_no_valuation_anchor";
    const referenceRequiresReview = pricing.grookai_value_block_reason === "blocked_reference_requires_review";

    return (
      <div className="space-y-1.5">
        <p className="text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
          {noValuationAnchor || referenceRequiresReview ? "Building confidence..." : "Insufficient valuation evidence"}
        </p>
        <p className="text-xs leading-5 text-slate-500">
          {noValuationAnchor
            ? "No trusted valuation exists yet. Current market is shown below."
            : referenceRequiresReview
              ? "Reference evidence is under review before Grookai Value can be shown. Current market is shown below if available."
            : formatPricingLabel(pricing.grookai_value_block_reason) ??
              "More evidence is required before showing Grookai Value. Current market is shown below if available."}
        </p>
      </div>
    );
  }

  const conditionLabel = pricing.grookai_value_condition_label && pricing.grookai_value_condition_label !== "unknown"
    ? formatPricingLabel(pricing.grookai_value_condition_label)
    : "Condition unknown";
  const referenceCount = typeof pricing.reference_source_count === "number" ? pricing.reference_source_count : null;

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <p className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">{formatUsdPrice(midPrice)}</p>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Evidence-anchored Grookai Value
        </p>
        <p className="text-xs text-slate-500">
          {conditionLabel}
          {referenceCount ? ` · ${referenceCount} reference ${referenceCount === 1 ? "source" : "sources"}` : ""}
          {pricing.confidence_label ? ` · ${pricing.confidence_label} confidence` : ""}
        </p>
      </div>
      {hasLowMidHigh ? (
        <PricingLowMidHigh low={lowPrice} mid={midPrice} high={highPrice} />
      ) : null}
    </div>
  );
}

function ActiveAskBlock({ pricing }: { pricing: CardPricingUiRecord | null }) {
  if (!pricing || typeof pricing.active_ask_mid !== "number") {
    return (
      <div className="space-y-1.5 border-t border-slate-200/70 pt-4 dark:border-slate-800">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Lowest Available Today</p>
        <p className="text-xs leading-5 text-slate-500">No active ask signal available.</p>
      </div>
    );
  }

  const lowPrice = typeof pricing.active_ask_low === "number" ? pricing.active_ask_low : null;
  const midPrice = pricing.active_ask_mid;
  const highPrice = typeof pricing.active_ask_high === "number" ? pricing.active_ask_high : null;
  const minimumPrice = typeof pricing.active_ask_minimum === "number" ? pricing.active_ask_minimum : null;
  const maximumPrice = typeof pricing.active_ask_maximum === "number" ? pricing.active_ask_maximum : null;
  const headlinePrice = minimumPrice ?? lowPrice ?? midPrice;
  const hasLowMidHigh =
    typeof lowPrice === "number" &&
    typeof midPrice === "number" &&
    typeof highPrice === "number";
  const hasAskRange = typeof minimumPrice === "number" && typeof maximumPrice === "number";
  const marketPressure = formatMarketPressure(pricing);

  return (
    <div className="space-y-2 border-t border-slate-200/70 pt-4 dark:border-slate-800">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Lowest Available Today</p>
        <p className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">{formatUsdPrice(headlinePrice)}</p>
        <p className="text-xs leading-5 text-slate-500">
          {pricing.pricing_scope === "card_printing" ? "eBay active ask for selected variant" : "eBay active ask"}
          {pricing.active_ask_listing_count ? ` · ${pricing.active_ask_listing_count} listings` : ""}
          {pricing.active_ask_seller_count ? ` · ${pricing.active_ask_seller_count} sellers` : ""}
        </p>
        <p className="text-xs leading-5 text-slate-500">
          Median active ask {formatUsdPrice(midPrice)}
          {hasAskRange ? ` · Ask Range ${formatUsdPrice(minimumPrice)} - ${formatUsdPrice(maximumPrice)}` : ""}
        </p>
        {marketPressure ? <p className="text-xs leading-5 text-slate-500">{marketPressure}</p> : null}
      </div>
      {hasLowMidHigh ? (
        <PricingLowMidHigh low={lowPrice} mid={midPrice} high={highPrice} lowLabel="Ask low" midLabel="Ask mid" highLabel="Ask high" />
      ) : null}
      <p className="text-[11px] leading-5 text-slate-400">Active asks are asking-price evidence, not sold comps.</p>
    </div>
  );
}

function LockedPricingState({ loginHref }: { loginHref: string }) {
  return (
    <div className="gv-card-pricing-panel px-1 py-1">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Pricing</p>
          <div className="space-y-1.5">
            <p className="text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">Sign in to view pricing</p>
            <p className="text-xs leading-5 text-slate-500">
              Reference pricing and market insights available for signed-in collectors.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={loginHref}
            className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Sign in
          </Link>
          <Link
            href={loginHref}
          className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
          >
            Create account
          </Link>
        </div>
        <p className="text-xs text-slate-500">Pricing available for registered collectors</p>
      </div>
    </div>
  );
}

function AuthenticatedPricingState({ gvId, pricing }: { gvId: string; pricing: CardPricingUiRecord | null }) {
  return (
    <div className="gv-card-pricing-panel px-1 py-1">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Pricing</p>
          <GrookaiValueBlock pricing={pricing} />
        </div>
        <ActiveAskBlock pricing={pricing} />
        <Link
          href={`/card/${encodeURIComponent(gvId)}/market`}
          className="inline-flex text-sm text-slate-500 transition hover:text-slate-950"
        >
          View market analysis →
        </Link>
      </div>
    </div>
  );
}

function selectPricingRecord(args: {
  records: CardPricingUiRecord[];
  selectedCardPrintingId?: string | null;
  selectedPrintingGvId?: string | null;
  fallbackPricing: CardPricingUiRecord | null;
}) {
  const selectedCardPrintingId = args.selectedCardPrintingId?.trim();
  const selectedPrintingGvId = args.selectedPrintingGvId?.trim();

  if (selectedCardPrintingId) {
    const byCardPrintingId = args.records.find((record) => record.card_printing_id === selectedCardPrintingId);
    if (byCardPrintingId) return byCardPrintingId;
  }

  if (selectedPrintingGvId) {
    const byPrintingGvId = args.records.find((record) => record.printing_gv_id === selectedPrintingGvId);
    if (byPrintingGvId) return byPrintingGvId;
  }

  return args.records.find((record) => record.pricing_scope === "parent") ?? args.fallbackPricing ?? args.records[0] ?? null;
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
  const [clientPricingRecords, setClientPricingRecords] = useState<CardPricingUiRecord[]>(pricingRecords);
  const selectedPricing = selectPricingRecord({
    records: clientPricingRecords,
    selectedCardPrintingId,
    selectedPrintingGvId,
    fallbackPricing: pricing,
  });

  useEffect(() => {
    if (!effectiveIsAuthenticated || clientPricingRecords.length > 0 || !cardPrintId) {
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({ card_print_id: cardPrintId });

    async function loadPricing() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : undefined;
      const response = await fetch(`/api/card-pricing?${params.toString()}`, {
        cache: "no-store",
        credentials: "same-origin",
        headers,
        signal: controller.signal,
      });
      const payload = response.ok
        ? ((await response.json()) as { pricing?: CardPricingUiRecord | null; pricingRecords?: CardPricingUiRecord[] })
        : null;

      if (payload && "pricingRecords" in payload) {
        setClientPricingRecords(payload.pricingRecords ?? (payload.pricing ? [payload.pricing] : []));
      }
    }

    loadPricing()
      .then(() => undefined)
      .catch(() => undefined);

    return () => controller.abort();
  }, [cardPrintId, clientPricingRecords.length, effectiveIsAuthenticated]);

  if (!effectiveIsAuthenticated) {
    return <LockedPricingState loginHref={loginHref} />;
  }

  return <AuthenticatedPricingState gvId={gvId} pricing={selectedPricing} />;
}
