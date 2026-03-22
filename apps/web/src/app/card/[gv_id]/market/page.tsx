import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PricingDisclosure from "@/components/common/PricingDisclosure";
import { formatUsdPrice } from "@/lib/cards/formatUsdPrice";
import { getPublicCardByGvId } from "@/lib/getPublicCardByGvId";
import { getMarketInsights } from "@/lib/pricing/getMarketInsights";
import { getCardPricingUiByCardPrintId } from "@/lib/pricing/getCardPricingUiByCardPrintId";
import { createServerComponentClient } from "@/lib/supabase/server";

export const revalidate = 0;
export const dynamic = "force-dynamic";

function formatRange(minPrice?: number, maxPrice?: number) {
  if (typeof minPrice !== "number" || typeof maxPrice !== "number") {
    return null;
  }

  return `${formatUsdPrice(minPrice)} – ${formatUsdPrice(maxPrice)}`;
}

function formatCountLabel(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function formatTimeAgo(value: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const diffMs = Date.now() - date.getTime();
  const diffSeconds = Math.max(1, Math.floor(diffMs / 1000));

  if (diffSeconds < 60) return `${diffSeconds}s ago`;

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}

function AnalysisCard({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</p>
        <h2 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default async function MarketAnalysisPage({ params }: { params: { gv_id: string } }) {
  const marketPath = `/card/${encodeURIComponent(params.gv_id)}/market`;
  const supabase = createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(marketPath)}`);
  }

  const card = await getPublicCardByGvId(params.gv_id);
  if (!card) {
    notFound();
  }

  const pricing = card.id ? await getCardPricingUiByCardPrintId(card.id) : null;
  const insights = card.id ? await getMarketInsights(card.id) : null;
  const referenceRange = formatRange(pricing?.min_price, pricing?.max_price);
  const hasJustTcgSection =
    Boolean(referenceRange) ||
    typeof pricing?.variant_count === "number" ||
    (pricing?.primary_source === "justtcg" && typeof pricing.primary_price === "number");
  const hasEbaySection =
    typeof pricing?.ebay_median_price === "number" || typeof pricing?.ebay_listing_count === "number";
  const hasGrookaiValue = typeof pricing?.grookai_value === "number";
  const hasConditionCurve = Boolean(insights && Object.keys(insights.conditionCurve).length > 0);
  const freshnessLabel = formatTimeAgo(insights?.updatedAt ?? null);

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-8">
      <section className="space-y-3 rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm">
        <Link
          href={`/card/${encodeURIComponent(card.gv_id)}`}
          className="inline-flex text-sm font-medium text-slate-500 transition hover:text-slate-950"
        >
          ← Back to card
        </Link>
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Market Analysis</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{card.name}</h1>
          <p className="text-sm text-slate-600">Reference pricing, market context, and experimental Grookai signals.</p>
        </div>
      </section>

      <section className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Primary Price</p>
          {pricing?.primary_source && typeof pricing.primary_price === "number" ? (
            <>
              <p className="text-4xl font-semibold tracking-tight text-slate-950">{formatUsdPrice(pricing.primary_price)}</p>
              <p className="text-sm font-medium text-slate-700">Near Mint</p>
              <p className="text-xs font-medium text-slate-500">Market reference</p>
              {referenceRange ? <p className="text-sm text-slate-600">{referenceRange}</p> : null}
              {freshnessLabel ? <p className="text-sm text-slate-400">Updated {freshnessLabel}</p> : null}
            </>
          ) : (
            <>
              <p className="text-xl font-semibold tracking-tight text-slate-950">No pricing data available</p>
              <p className="text-sm text-slate-600">Pricing for this card is not available yet.</p>
            </>
          )}
        </div>
      </section>

      {hasJustTcgSection ? (
        <AnalysisCard eyebrow="Reference" title="JustTCG">
          <div className="space-y-2">
            {pricing?.primary_source === "justtcg" && typeof pricing.primary_price === "number" ? (
              <DetailRow label="Reference price" value={formatUsdPrice(pricing.primary_price)} />
            ) : null}
            {referenceRange ? <DetailRow label="Range" value={referenceRange} /> : null}
            {typeof pricing?.variant_count === "number" ? (
              <DetailRow label="Variants" value={formatCountLabel(pricing.variant_count, "variant", "variants")} />
            ) : null}
          </div>
        </AnalysisCard>
      ) : null}

      {hasConditionCurve ? (
        <AnalysisCard eyebrow="Condition Curve" title="Condition Pricing">
          <div className="space-y-2">
            {Object.entries(insights!.conditionCurve)
              .sort(([left], [right]) => left.localeCompare(right))
              .map(([condition, value]) => (
                <DetailRow key={condition} label={condition} value={formatUsdPrice(value)} />
              ))}
          </div>
        </AnalysisCard>
      ) : null}

      {insights?.spread ? (
        <AnalysisCard eyebrow="Range" title="Market Range">
          <div className="space-y-2">
            <DetailRow label="Low" value={formatUsdPrice(insights.spread.low)} />
            <DetailRow label="Mid" value={formatUsdPrice(insights.spread.mid)} />
            <DetailRow label="High" value={formatUsdPrice(insights.spread.high)} />
            <DetailRow label="Width" value={insights.spread.width} />
          </div>
        </AnalysisCard>
      ) : null}

      {typeof insights?.printingPremium === "number" ? (
        <AnalysisCard eyebrow="Printing" title="Printing Premium">
          <div className="space-y-2">
            <DetailRow label="Reverse holofoil vs normal" value={`${insights.printingPremium}x`} />
          </div>
        </AnalysisCard>
      ) : null}

      {insights?.trend ? (
        <AnalysisCard eyebrow="Momentum" title="7 Day Trend">
          <div className="space-y-2">
            <DetailRow
              label="Direction"
              value={`${insights.trend.direction === "up" ? "↑" : insights.trend.direction === "down" ? "↓" : "→"} ${insights.trend.direction}`}
            />
            <DetailRow label="Change" value={`${insights.trend.percent}%`} />
          </div>
        </AnalysisCard>
      ) : null}

      {hasEbaySection ? (
        <AnalysisCard eyebrow="Fallback Context" title="eBay">
          <div className="space-y-2">
            {typeof pricing?.ebay_median_price === "number" ? (
              <DetailRow label="Median price" value={formatUsdPrice(pricing.ebay_median_price)} />
            ) : null}
            {typeof pricing?.ebay_listing_count === "number" ? (
              <DetailRow label="Listing count" value={formatCountLabel(pricing.ebay_listing_count, "listing", "listings")} />
            ) : null}
          </div>
        </AnalysisCard>
      ) : null}

      {hasGrookaiValue ? (
        <AnalysisCard eyebrow="Experimental" title="Grookai Value (Beta)">
          <div className="space-y-2">
            <DetailRow label="Beta estimate" value={formatUsdPrice(pricing?.grookai_value)} />
            <p className="text-sm text-slate-600">
              Grookai Value is an experimental estimate derived from multiple signals and remains secondary to the market
              reference.
            </p>
          </div>
        </AnalysisCard>
      ) : null}

      {!hasJustTcgSection && !hasConditionCurve && !insights?.spread && typeof insights?.printingPremium !== "number" && !insights?.trend && !hasEbaySection && !hasGrookaiValue ? (
        <section className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">No additional market analysis is available for this card yet.</p>
        </section>
      ) : null}

      <PricingDisclosure />
    </div>
  );
}
