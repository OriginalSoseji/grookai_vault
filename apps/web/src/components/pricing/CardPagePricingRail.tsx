import Link from "next/link";
import { formatUsdPrice } from "@/lib/cards/formatUsdPrice";
import type { CardPricingUiRecord } from "@/lib/pricing/getCardPricingUiByCardPrintId";

type CardPagePricingRailProps = {
  isAuthenticated: boolean;
  loginHref: string;
  gvId: string;
  pricing: CardPricingUiRecord | null;
};

function PricingSourceLabel() {
  return <p className="text-[11px] text-slate-400">* Market reference</p>;
}

function PricingLowMidHigh({
  low,
  mid,
  high,
}: {
  low: number;
  mid: number;
  high: number;
}) {
  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex justify-between gap-3 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
        <span>Low</span>
        <span>Mid</span>
        <span>High</span>
      </div>
      <div className="flex justify-between gap-3 text-sm font-medium text-slate-900">
        <span>{formatUsdPrice(low)}</span>
        <span>{formatUsdPrice(mid)}</span>
        <span>{formatUsdPrice(high)}</span>
      </div>
    </div>
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

  const lowPrice = typeof pricing.min_price === "number" ? pricing.min_price : null;
  const midPrice = pricing.primary_price;
  const highPrice = typeof pricing.max_price === "number" ? pricing.max_price : null;
  const hasLowMidHigh =
    typeof lowPrice === "number" &&
    typeof midPrice === "number" &&
    typeof highPrice === "number";

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <p className="text-3xl font-semibold tracking-tight text-slate-950">{formatUsdPrice(midPrice)}</p>
        <p className="text-sm font-medium text-slate-700">Near Mint</p>
      </div>
      {hasLowMidHigh ? (
        <PricingLowMidHigh low={lowPrice} mid={midPrice} high={highPrice} />
      ) : null}
    </div>
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

function AuthenticatedPricingState({ gvId, pricing }: { gvId: string; pricing: CardPricingUiRecord | null }) {
  const hasPrimaryPrice = Boolean(pricing?.primary_source && typeof pricing.primary_price === "number");

  return (
    <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Pricing</p>
          <PrimaryPricingBlock pricing={pricing} />
        </div>
        <Link
          href={`/card/${encodeURIComponent(gvId)}/market`}
          className="inline-flex text-sm text-slate-500 transition hover:text-slate-950"
        >
          View market analysis →
        </Link>
        {hasPrimaryPrice ? <PricingSourceLabel /> : null}
      </div>
    </div>
  );
}

export default function CardPagePricingRail({ isAuthenticated, loginHref, gvId, pricing }: CardPagePricingRailProps) {
  if (!isAuthenticated) {
    return <LockedPricingState loginHref={loginHref} />;
  }

  return <AuthenticatedPricingState gvId={gvId} pricing={pricing} />;
}
