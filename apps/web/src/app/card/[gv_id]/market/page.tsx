import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import MarketHistoryChart from "@/components/pricing/MarketHistoryChart";
import { formatUsdPrice } from "@/lib/cards/formatUsdPrice";
import { getPublicCardByGvId } from "@/lib/getPublicCardByGvId";
import {
  getJustTcgPriceHistory,
  normalizeJustTcgHistoryDuration,
} from "@/lib/pricing/getJustTcgPriceHistory";
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

const HISTORY_TIMEFRAMES = ["7d", "30d", "90d", "180d"] as const;

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

export default async function MarketAnalysisPage({
  params,
  searchParams,
}: {
  params: { gv_id: string };
  searchParams?: { duration?: string };
}) {
  const marketPath = `/card/${encodeURIComponent(params.gv_id)}/market`;
  const selectedDuration = normalizeJustTcgHistoryDuration(searchParams?.duration);
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

  const [insights, history] = card.id
    ? await Promise.all([
        getMarketInsights(card.id),
        getJustTcgPriceHistory({
          cardPrintId: card.id,
          duration: selectedDuration,
        }),
      ])
    : [null, null];
  const freshnessLabel = formatTimeAgo(history?.updatedAt ?? insights?.updatedAt ?? null);
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
  const spread = insights?.spread ?? null;
  const trend = insights?.trend ?? null;
  const printingPremium = typeof insights?.printingPremium === "number" ? insights.printingPremium : null;
  const historyPoints = history?.points ?? [];
  const latestHistoryPoint = historyPoints.length > 0 ? historyPoints[historyPoints.length - 1] : null;
  const heroPrice =
    typeof history?.currentPrice === "number"
      ? history.currentPrice
      : latestHistoryPoint?.price ?? null;
  const hasInsightCards =
    sortedConditions.length > 0 ||
    typeof printingPremium === "number" ||
    Boolean(trend) ||
    Boolean(spread);
  const hasHistoryCard = Boolean(history) || Boolean(insights);

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

      {!hasHistoryCard && !hasInsightCards ? (
        <section className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">Market Analysis</h2>
            <p className="text-sm text-slate-600">No market insights are available for this card yet.</p>
          </div>
        </section>
      ) : (
        <>
          {history && historyPoints.length > 0 ? (
            <section className="space-y-6 rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Market reference
                  </p>
                  <p className="text-sm font-medium text-slate-700">
                    {history.condition} · {history.printing}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {HISTORY_TIMEFRAMES.map((duration) => {
                    const isActive = duration === selectedDuration;
                    const href =
                      duration === "30d" ? marketPath : `${marketPath}?duration=${encodeURIComponent(duration)}`;

                    return (
                      <Link
                        key={duration}
                        href={href}
                        className={`inline-flex rounded-full px-3 py-1.5 text-xs font-medium transition ${
                          isActive
                            ? "bg-slate-950 text-white"
                            : "border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-950"
                        }`}
                      >
                        {duration.toUpperCase()}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                {typeof heroPrice === "number" ? (
                  <p className="text-5xl font-semibold tracking-tight text-slate-950">{formatUsdPrice(heroPrice)}</p>
                ) : null}
                <MarketHistoryChart points={historyPoints} />
                {freshnessLabel ? <p className="text-sm text-slate-400">Updated {freshnessLabel}</p> : null}
              </div>
            </section>
          ) : hasHistoryCard ? (
            <section className="space-y-5 rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Market reference
                  </p>
                  {history ? (
                    <p className="text-sm font-medium text-slate-700">
                      {history.condition} · {history.printing}
                    </p>
                  ) : null}
                </div>

                {history ? (
                  <div className="flex flex-wrap gap-2">
                    {HISTORY_TIMEFRAMES.map((duration) => {
                      const isActive = duration === selectedDuration;
                      const href =
                        duration === "30d" ? marketPath : `${marketPath}?duration=${encodeURIComponent(duration)}`;

                      return (
                        <Link
                          key={duration}
                          href={href}
                          className={`inline-flex rounded-full px-3 py-1.5 text-xs font-medium transition ${
                            isActive
                              ? "bg-slate-950 text-white"
                              : "border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-950"
                          }`}
                        >
                          {duration.toUpperCase()}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Price history unavailable</h2>
                <p className="text-sm text-slate-600">
                  Historical chart data is not available for this market slice yet.
                </p>
                {typeof heroPrice === "number" ? (
                  <p className="pt-2 text-lg font-medium text-slate-950">{formatUsdPrice(heroPrice)}</p>
                ) : null}
                {freshnessLabel ? <p className="text-sm text-slate-400">Updated {freshnessLabel}</p> : null}
              </div>
            </section>
          ) : null}

          {hasInsightCards ? (
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

              {typeof printingPremium === "number" ? (
                <MarketInsightCard
                  title="Printing Premium"
                  subtitle="Based on available active market references."
                >
                  <p className="text-lg font-medium text-slate-950">
                    Reverse holo is {printingPremium}x normal
                  </p>
                </MarketInsightCard>
              ) : null}

              {trend ? (
                <MarketInsightCard title="7 Day Trend">
                  <div className="space-y-2">
                    <p className="text-lg font-medium text-slate-950">
                      {trend.direction === "up"
                        ? "Trending up"
                        : trend.direction === "down"
                          ? "Trending down"
                          : "Flat"}
                    </p>
                    <p className="text-sm font-medium text-slate-700">
                      {trend.percent > 0 ? "+" : ""}
                      {trend.percent}%
                    </p>
                  </div>
                </MarketInsightCard>
              ) : null}

              {spread ? (
                <MarketInsightCard
                  title="Market Width"
                  subtitle="Based on the current low-to-high spread for Near Mint normal."
                >
                  <p className="text-lg font-medium text-slate-950">
                    {spread.width.charAt(0).toUpperCase()}
                    {spread.width.slice(1)}
                  </p>
                </MarketInsightCard>
              ) : null}
            </div>
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
