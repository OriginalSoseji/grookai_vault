import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatUsdPrice } from "@/lib/cards/formatUsdPrice";
import { getPublicCardByGvId } from "@/lib/getPublicCardByGvId";
import { getMarketInsights } from "@/lib/pricing/getMarketInsights";
import { createServerComponentClient } from "@/lib/supabase/server";

export const revalidate = 0;
export const dynamic = "force-dynamic";

const CONDITION_ORDER = [
  "Near Mint",
  "Lightly Played",
  "Moderately Played",
  "Heavily Played",
  "Damaged",
] as const;

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
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function MarketMetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="text-right font-medium text-slate-950">{value}</span>
    </div>
  );
}

function MarketInsightCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
        {subtitle ? <p className="text-sm text-slate-600">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function getConditionRank(condition: string) {
  const exactIndex = CONDITION_ORDER.indexOf(condition as (typeof CONDITION_ORDER)[number]);
  if (exactIndex >= 0) {
    return exactIndex;
  }

  return CONDITION_ORDER.length;
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

  const insights = card.id ? await getMarketInsights(card.id) : null;
  const freshnessLabel = formatTimeAgo(insights?.updatedAt ?? null);
  const sortedConditions = insights
    ? Object.entries(insights.conditionCurve).sort(([left], [right]) => {
        const leftRank = getConditionRank(left);
        const rightRank = getConditionRank(right);

        if (leftRank !== rightRank) {
          return leftRank - rightRank;
        }

        return left.localeCompare(right);
      })
    : [];

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-8">
      <section className="space-y-3 rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm">
        <Link
          href={`/card/${encodeURIComponent(card.gv_id)}`}
          className="inline-flex text-sm font-medium text-slate-500 transition hover:text-slate-950"
        >
          ← Back to card
        </Link>
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Market Analysis</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Market Analysis</h1>
          <p className="text-sm text-slate-600">A deeper look at this card&apos;s active market signals.</p>
        </div>
      </section>

      {!insights ? (
        <section className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">Market Analysis</h2>
            <p className="text-sm text-slate-600">No market insights are available for this card yet.</p>
          </div>
        </section>
      ) : (
        <>
          {insights.spread ? (
            <section className="space-y-5 rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Market reference</p>
                <p className="text-sm font-medium text-slate-700">Near Mint · Normal</p>
              </div>

              <div className="space-y-4">
                <p className="text-5xl font-semibold tracking-tight text-slate-950">{formatUsdPrice(insights.spread.mid)}</p>

                <div className="max-w-md space-y-1.5">
                  <div className="flex justify-between gap-3 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                    <span>Low</span>
                    <span>Mid</span>
                    <span>High</span>
                  </div>
                  <div className="flex justify-between gap-3 text-sm font-medium text-slate-900">
                    <span>{formatUsdPrice(insights.spread.low)}</span>
                    <span>{formatUsdPrice(insights.spread.mid)}</span>
                    <span>{formatUsdPrice(insights.spread.high)}</span>
                  </div>
                </div>

                {freshnessLabel ? <p className="text-sm text-slate-400">Updated {freshnessLabel}</p> : null}
              </div>
            </section>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            {sortedConditions.length > 0 ? (
              <MarketInsightCard title="Condition Pricing">
                <div className="space-y-3">
                  {sortedConditions.map(([condition, value]) => (
                    <MarketMetricRow key={condition} label={condition} value={formatUsdPrice(value)} />
                  ))}
                </div>
              </MarketInsightCard>
            ) : null}

            {typeof insights.printingPremium === "number" ? (
              <MarketInsightCard
                title="Printing Premium"
                subtitle="Based on available active market references."
              >
                <p className="text-lg font-medium text-slate-950">
                  Reverse holo is {insights.printingPremium}x normal
                </p>
              </MarketInsightCard>
            ) : null}

            {insights.trend ? (
              <MarketInsightCard title="7 Day Trend">
                <div className="space-y-2">
                  <p className="text-lg font-medium text-slate-950">
                    {insights.trend.direction === "up"
                      ? "Trending up"
                      : insights.trend.direction === "down"
                        ? "Trending down"
                        : "Flat"}
                  </p>
                  <p className="text-sm font-medium text-slate-700">
                    {insights.trend.percent > 0 ? "+" : ""}
                    {insights.trend.percent}%
                  </p>
                </div>
              </MarketInsightCard>
            ) : null}

            {insights.spread ? (
              <MarketInsightCard
                title="Market Width"
                subtitle="Based on the current low-to-high spread for Near Mint normal."
              >
                <p className="text-lg font-medium text-slate-950">
                  {insights.spread.width.charAt(0).toUpperCase()}
                  {insights.spread.width.slice(1)}
                </p>
              </MarketInsightCard>
            ) : null}
          </div>

          {sortedConditions.length === 0 &&
          !insights.spread &&
          typeof insights.printingPremium !== "number" &&
          !insights.trend ? (
            <section className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-600">No market insights are available for this card yet.</p>
            </section>
          ) : null}
        </>
      )}

      <section className="mt-4 border-t border-slate-200 pt-6 text-sm text-slate-500">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Pricing &amp; Data Sources</h2>
        <p className="mb-2">
          Market insights are derived from third-party pricing data and summarized by Grookai for easier interpretation.
        </p>
        <p>Data may be delayed and should not be treated as a guaranteed real-time market quote.</p>
      </section>
    </div>
  );
}
