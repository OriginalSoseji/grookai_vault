import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import MarketHistoryChart from "@/components/pricing/MarketHistoryChart";
import { formatUsdPrice } from "@/lib/cards/formatUsdPrice";
import { getPublicCardByGvId } from "@/lib/getPublicCardByGvId";
import {
  CARD_MARKET_ANALYSIS_DURATIONS,
  getCardMarketAnalysisModel,
} from "@/lib/pricing/getCardMarketAnalysisModel";
import { createServerComponentClient } from "@/lib/supabase/server";

export const revalidate = 0;
export const dynamic = "force-dynamic";

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

export default async function MarketAnalysisPage({
  params,
  searchParams,
}: {
  params: { gv_id: string };
  searchParams?: { duration?: string };
}) {
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

  const model = await getCardMarketAnalysisModel(card.id, searchParams?.duration);
  const historyPoints = model.history?.points ?? [];
  const freshnessLabel = formatTimeAgo(model.heroUpdatedAt);

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

      {model.uiFlags.showEmptyState ? (
        <section className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">Market Analysis</h2>
            <p className="text-sm text-slate-600">No market insights are available for this card yet.</p>
          </div>
        </section>
      ) : (
        <>
          {model.uiFlags.showChart ? (
            <section className="space-y-6 rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Market reference
                  </p>
                  {model.selectedSlice ? (
                    <p className="text-sm font-medium text-slate-700">
                      {model.selectedSlice.condition} · {model.selectedSlice.printing}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  {CARD_MARKET_ANALYSIS_DURATIONS.map((duration) => {
                    const isActive = duration === model.duration;
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
                {typeof model.heroPrice === "number" ? (
                  <p className="text-5xl font-semibold tracking-tight text-slate-950">{formatUsdPrice(model.heroPrice)}</p>
                ) : null}
                <MarketHistoryChart points={historyPoints} />
                {freshnessLabel ? <p className="text-sm text-slate-400">Updated {freshnessLabel}</p> : null}
              </div>
            </section>
          ) : null}

          {model.uiFlags.showEmptyHistory ? (
            <section className="space-y-5 rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Market reference
                  </p>
                  {model.selectedSlice ? (
                    <p className="text-sm font-medium text-slate-700">
                      {model.selectedSlice.condition} · {model.selectedSlice.printing}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  {CARD_MARKET_ANALYSIS_DURATIONS.map((duration) => {
                    const isActive = duration === model.duration;
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

              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Price history unavailable</h2>
                <p className="text-sm text-slate-600">
                  Historical chart data is not available for this market slice yet.
                </p>
                {typeof model.heroPrice === "number" ? (
                  <p className="pt-2 text-lg font-medium text-slate-950">{formatUsdPrice(model.heroPrice)}</p>
                ) : null}
                {freshnessLabel ? <p className="text-sm text-slate-400">Updated {freshnessLabel}</p> : null}
              </div>
            </section>
          ) : null}

          {model.uiFlags.showInsights && model.insights ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {model.insights.conditionRows.length > 0 ? (
                <MarketInsightCard title="Condition Pricing">
                  <div className="space-y-3">
                    {model.insights.conditionRows.map((row) => (
                      <MarketMetricRow key={row.condition} label={row.condition} value={formatUsdPrice(row.price)} />
                    ))}
                  </div>
                </MarketInsightCard>
              ) : null}

              {typeof model.insights.printingPremium === "number" ? (
                <MarketInsightCard
                  title="Printing Premium"
                  subtitle="Based on available active market references."
                >
                  <p className="text-lg font-medium text-slate-950">
                    Reverse holo is {model.insights.printingPremium}x normal
                  </p>
                </MarketInsightCard>
              ) : null}

              {model.insights.trend ? (
                <MarketInsightCard title="7 Day Trend">
                  <div className="space-y-2">
                    <p className="text-lg font-medium text-slate-950">
                      {model.insights.trend.direction === "up"
                        ? "Trending up"
                        : model.insights.trend.direction === "down"
                          ? "Trending down"
                          : "Flat"}
                    </p>
                    <p className="text-sm font-medium text-slate-700">
                      {model.insights.trend.percent > 0 ? "+" : ""}
                      {model.insights.trend.percent}%
                    </p>
                  </div>
                </MarketInsightCard>
              ) : null}

              {model.insights.spread ? (
                <MarketInsightCard
                  title="Market Width"
                  subtitle="Based on the current low-to-high spread for Near Mint normal."
                >
                  <p className="text-lg font-medium text-slate-950">
                    {model.insights.spread.width.charAt(0).toUpperCase()}
                    {model.insights.spread.width.slice(1)}
                  </p>
                </MarketInsightCard>
              ) : null}
            </div>
          ) : null}
        </>
      )}

      {model.uiFlags.showDisclosure ? (
        <section className="mt-4 border-t border-slate-200 pt-6 text-sm text-slate-500">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Pricing &amp; Data Sources
          </h2>
          <p className="mb-2">
            Market insights are derived from third-party pricing data and summarized by Grookai for easier interpretation.
          </p>
          <p>Data may be delayed and should not be treated as a guaranteed real-time market quote.</p>
        </section>
      ) : null}
    </div>
  );
}
