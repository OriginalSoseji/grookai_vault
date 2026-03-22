import Link from "next/link";
import { formatUsdPrice } from "@/lib/cards/formatUsdPrice";
import type { CardPricingUiRecord } from "@/lib/pricing/getCardPricingUiByCardPrintId";

type CardPagePricingRailProps = {
  isAuthenticated: boolean;
  loginHref: string;
  pricing: CardPricingUiRecord | null;
};

function formatRange(minPrice?: number, maxPrice?: number) {
  if (typeof minPrice !== "number" || typeof maxPrice !== "number") {
    return null;
  }

  return `${formatUsdPrice(minPrice)} – ${formatUsdPrice(maxPrice)}`;
}

function formatCountLabel(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function PricingSourceLabel({ source }: { source: "justtcg" | "ebay" }) {
  return (
    <p className="text-xs font-medium text-slate-500">
      {source === "justtcg" ? "Market reference" : "Market data: eBay"}
    </p>
  );
}

function PricingEmptyState() {
  return (
    <div className="space-y-1.5">
      <p className="text-xl font-semibold tracking-tight text-slate-950">No pricing data available</p>
      <p className="text-xs leading-5 text-slate-500">Pricing for this card is not available yet.</p>
    </div>
  );
}

function PrimaryPricingBlock({ pricing }: { pricing: CardPricingUiRecord | null }) {
  if (!pricing?.primary_source || typeof pricing.primary_price !== "number") {
    return <PricingEmptyState />;
  }

  const priceRange = formatRange(pricing.min_price, pricing.max_price);

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <p className="text-3xl font-semibold tracking-tight text-slate-950">{formatUsdPrice(pricing.primary_price)}</p>
        <p className="text-sm font-medium text-slate-700">Near Mint</p>
      </div>
      <PricingSourceLabel source={pricing.primary_source} />
      {priceRange ? <p className="text-sm text-slate-600">{priceRange}</p> : null}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}

function PricingDetailsPanel({ pricing }: { pricing: CardPricingUiRecord }) {
  const justTcgRange = formatRange(pricing.min_price, pricing.max_price);
  const justTcgPrice = pricing.primary_source === "justtcg" && typeof pricing.primary_price === "number" ? pricing.primary_price : undefined;
  const eBayPrice = typeof pricing.ebay_median_price === "number" ? pricing.ebay_median_price : undefined;
  const grookaiValue = typeof pricing.grookai_value === "number" ? pricing.grookai_value : undefined;

  const hasJustTcgDetails =
    typeof justTcgPrice === "number" || Boolean(justTcgRange) || typeof pricing.variant_count === "number";
  const hasEbayDetails = typeof eBayPrice === "number" || typeof pricing.ebay_listing_count === "number";
  const hasGrookaiValue = typeof grookaiValue === "number";

  if (!hasJustTcgDetails && !hasEbayDetails && !hasGrookaiValue) {
    return null;
  }

  return (
    <details className="group rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-4">
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
        View details
        <span className="ml-2 text-xs font-medium text-slate-500 group-open:hidden">Reference and fallback context</span>
      </summary>
      <div className="mt-4 space-y-4">
        {hasJustTcgDetails ? (
          <div className="space-y-3 rounded-[14px] border border-slate-200 bg-white px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Reference Details</p>
            <div className="space-y-2">
              {typeof justTcgPrice === "number" ? <DetailRow label="Price" value={formatUsdPrice(justTcgPrice)} /> : null}
              {justTcgRange ? <DetailRow label="Range" value={justTcgRange} /> : null}
              {typeof pricing.variant_count === "number" ? (
                <DetailRow label="Variants" value={formatCountLabel(pricing.variant_count, "variant", "variants")} />
              ) : null}
            </div>
          </div>
        ) : null}

        {hasEbayDetails ? (
          <div className="space-y-3 rounded-[14px] border border-slate-200 bg-white px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">eBay Market</p>
            <div className="space-y-2">
              {typeof eBayPrice === "number" ? <DetailRow label="Median" value={formatUsdPrice(eBayPrice)} /> : null}
              {typeof pricing.ebay_listing_count === "number" ? (
                <DetailRow label="Listings" value={formatCountLabel(pricing.ebay_listing_count, "listing", "listings")} />
              ) : null}
            </div>
          </div>
        ) : null}

        {hasGrookaiValue ? (
          <div className="space-y-3 rounded-[14px] border border-slate-200 bg-white px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Grookai Value (Beta)</p>
            <DetailRow label="Beta value" value={formatUsdPrice(grookaiValue)} />
          </div>
        ) : null}
      </div>
    </details>
  );
}

function LockedPricingState({ loginHref }: { loginHref: string }) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Pricing</p>
          <div className="space-y-1.5">
            <p className="text-xl font-semibold tracking-tight text-slate-950">Sign in to view pricing</p>
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

function AuthenticatedPricingState({ pricing }: { pricing: CardPricingUiRecord | null }) {
  const hasPrimaryPrice = Boolean(pricing?.primary_source && typeof pricing.primary_price === "number");

  return (
    <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Pricing</p>
          <PrimaryPricingBlock pricing={pricing} />
        </div>
        {pricing && hasPrimaryPrice ? <PricingDetailsPanel pricing={pricing} /> : null}
      </div>
    </div>
  );
}

export default function CardPagePricingRail({ isAuthenticated, loginHref, pricing }: CardPagePricingRailProps) {
  if (!isAuthenticated) {
    return <LockedPricingState loginHref={loginHref} />;
  }

  return <AuthenticatedPricingState pricing={pricing} />;
}
