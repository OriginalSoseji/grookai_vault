import type { Metadata } from "next";
import Link from "next/link";
import PageContainer from "@/components/layout/PageContainer";
import PageIntro from "@/components/layout/PageIntro";
import PageSection from "@/components/layout/PageSection";
import SectionHeader from "@/components/layout/SectionHeader";
import { WarehouseBadge } from "@/components/founder/WarehouseReviewPrimitives";
import { requireFounderAccess } from "@/lib/founder/requireFounderAccess";
import { createServerAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: "Founder Metrics",
  robots: {
    index: false,
    follow: false,
  },
};

type WeeklyRollupRow = {
  week_start: string;
  week_end: string;
  generated_at: string | null;
  source_window_start: string;
  source_window_end: string;
  wau_count: number;
  meaningful_interaction_count: number;
  meaningful_interactions_per_wau: number | string;
  active_unmuted_watches_count: number;
  watches_per_wau: number | string;
  watch_matched_event_count: number;
  events_per_watch: number | string;
  ladder_started_count: number;
  ladder_owned_count: number;
  ladder_wanted_count: number;
  ladder_followed_count: number;
  ladder_completed_count: number;
  input_row_counts: Record<string, unknown> | null;
};

type WeeklyBreakdownRow = {
  id: string;
  week_start: string;
  metric_name: string;
  dimension_name: string;
  dimension_value: string;
  metric_value: number | string;
  row_count: number;
};

type DeliveryRecommendationRow = {
  id: string;
  week_start: string;
  event_type: string;
  tier: string;
  sent_count: number;
  tap_count: number;
  tap_through_rate: number | string;
  recommendation: string;
  threshold: number | string;
  reason: string;
  requires_founder_approval: boolean;
  founder_approved_at: string | null;
  created_at: string | null;
};

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDecimal(value: number | string | null | undefined, digits = 2) {
  return toNumber(value).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatInteger(value: number | string | null | undefined) {
  return Math.round(toNumber(value)).toLocaleString("en-US");
}

function formatPercent(value: number | string | null | undefined) {
  return `${(toNumber(value) * 100).toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function formatSignedPercent(value: number) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function labelize(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function trendPercent(current: number, previous: number) {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

function rowsFor(
  rows: WeeklyBreakdownRow[],
  weekStart: string | null,
  metricName: string,
  dimensionName?: string,
) {
  if (!weekStart) {
    return [];
  }
  return rows
    .filter((row) => (
      row.week_start === weekStart &&
      row.metric_name === metricName &&
      (!dimensionName || row.dimension_name === dimensionName)
    ))
    .sort((left, right) => toNumber(right.metric_value) - toNumber(left.metric_value) || right.row_count - left.row_count);
}

function MetricCard({
  label,
  value,
  detail,
  trend,
}: {
  label: string;
  value: string | number;
  detail?: string;
  trend?: number | null;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
        {typeof trend === "number" ? (
          <span className={trend >= 0 ? "text-xs font-semibold text-emerald-700" : "text-xs font-semibold text-rose-700"}>
            {formatSignedPercent(trend)}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      {detail ? <p className="mt-2 text-xs leading-5 text-slate-600">{detail}</p> : null}
    </div>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-sm leading-7 text-slate-600">
      {message}
    </div>
  );
}

function BarList({
  rows,
  valueFormatter = formatInteger,
  emptyMessage,
}: {
  rows: Array<{ label: string; value: number; detail?: string }>;
  valueFormatter?: (value: number) => string;
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return <EmptyPanel message={emptyMessage} />;
  }

  const maxValue = Math.max(...rows.map((row) => row.value), 1);

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-baseline justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">{row.label}</p>
              {row.detail ? <p className="mt-1 text-xs text-slate-500">{row.detail}</p> : null}
            </div>
            <p className="shrink-0 text-sm font-semibold text-slate-900">{valueFormatter(row.value)}</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-950"
              style={{ width: `${Math.max(4, Math.min(100, (row.value / maxValue) * 100))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function DataTable({
  columns,
  rows,
  emptyMessage,
}: {
  columns: string[];
  rows: Array<Array<string | number>>;
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return <EmptyPanel message={emptyMessage} />;
  }

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {rows.map((row, rowIndex) => (
              <tr key={row.join("|") || rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={`${rowIndex}-${cellIndex}`} className={cellIndex === 0 ? "px-4 py-3 font-medium text-slate-950" : "px-4 py-3"}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function FounderMetricsPage() {
  await requireFounderAccess("/founder/metrics");
  const admin = createServerAdminClient();

  const [rollupsResponse, breakdownsResponse, recommendationsResponse] = await Promise.all([
    admin
      .from("north_star_weekly_rollups")
      .select("week_start,week_end,generated_at,source_window_start,source_window_end,wau_count,meaningful_interaction_count,meaningful_interactions_per_wau,active_unmuted_watches_count,watches_per_wau,watch_matched_event_count,events_per_watch,ladder_started_count,ladder_owned_count,ladder_wanted_count,ladder_followed_count,ladder_completed_count,input_row_counts")
      .order("week_start", { ascending: false })
      .limit(12),
    admin
      .from("north_star_weekly_breakdowns")
      .select("id,week_start,metric_name,dimension_name,dimension_value,metric_value,row_count")
      .order("week_start", { ascending: false })
      .limit(600),
    admin
      .from("notification_type_delivery_recommendations")
      .select("id,week_start,event_type,tier,sent_count,tap_count,tap_through_rate,recommendation,threshold,reason,requires_founder_approval,founder_approved_at,created_at")
      .order("week_start", { ascending: false })
      .limit(100),
  ]);

  const rollups = ((rollupsResponse.data ?? []) as WeeklyRollupRow[]) ?? [];
  const breakdowns = ((breakdownsResponse.data ?? []) as WeeklyBreakdownRow[]) ?? [];
  const recommendations = ((recommendationsResponse.data ?? []) as DeliveryRecommendationRow[]) ?? [];
  const latest = rollups[0] ?? null;
  const previous = rollups[1] ?? null;
  const latestWeekStart = latest?.week_start ?? null;
  const latestRecommendations = latestWeekStart
    ? recommendations.filter((row) => row.week_start === latestWeekStart)
    : [];
  const flaggedRecommendations = recommendations
    .filter((row) => row.recommendation === "digest_only_candidate")
    .slice(0, 12);
  const interactionRows = rowsFor(breakdowns, latestWeekStart, "meaningful_interactions", "kind")
    .map((row) => ({
      label: labelize(row.dimension_value),
      value: toNumber(row.metric_value),
      detail: `${formatInteger(row.row_count)} source rows`,
    }));
  const notificationByEventType = rowsFor(breakdowns, latestWeekStart, "notification_tap_through", "event_type")
    .map((row) => ({
      label: labelize(row.dimension_value),
      value: toNumber(row.metric_value),
      detail: `${formatInteger(row.row_count)} sent notifications`,
    }));
  const notificationByTier = rowsFor(breakdowns, latestWeekStart, "notification_tap_through", "tier")
    .map((row) => ({
      label: labelize(row.dimension_value),
      value: toNumber(row.metric_value),
      detail: `${formatInteger(row.row_count)} sent notifications`,
    }));
  const onboardingRows = rowsFor(breakdowns, latestWeekStart, "onboarding_ladder_conversion", "rung")
    .map((row) => [
      labelize(row.dimension_value),
      formatInteger(row.metric_value),
      `${formatInteger(row.row_count)} events`,
    ]);
  const watchRows = rowsFor(breakdowns, latestWeekStart, "watches", "subject_type")
    .map((row) => [
      labelize(row.dimension_value),
      formatInteger(row.metric_value),
      `${formatInteger(row.row_count)} active watches`,
    ]);

  return (
    <PageContainer className="space-y-8 py-8">
      <section className="gv-collector-panel px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
        <PageIntro
          eyebrow="Founder Metrics"
          title="North Star Metrics"
          description="Founder-only weekly operating view built from durable product events. This route reads rollup tables only; it does not expose raw behavior rows or mutate dispatcher behavior."
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/founder" className="gv-secondary-button">
                Back to Founder
              </Link>
              {latest ? (
                <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
                  Latest week: {formatDate(latest.week_start)}
                </span>
              ) : null}
            </div>
          }
        />
      </section>

      {rollupsResponse.error || breakdownsResponse.error || recommendationsResponse.error ? (
        <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-6 py-5 text-sm leading-7 text-rose-700">
          Founder metrics could not be fully loaded.
          {rollupsResponse.error ? ` Rollups: ${rollupsResponse.error.message}` : ""}
          {breakdownsResponse.error ? ` Breakdowns: ${breakdownsResponse.error.message}` : ""}
          {recommendationsResponse.error ? ` Recommendations: ${recommendationsResponse.error.message}` : ""}
        </div>
      ) : null}

      {latest ? (
        <>
          <PageSection spacing="default">
            <SectionHeader
              title="North Star"
              description={`Completed UTC week ${formatDate(latest.source_window_start)} through ${formatDate(latest.source_window_end)}. App-observed WAU is derived from durable app actions, not passive analytics.`}
            />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Meaningful / WAU"
                value={formatDecimal(latest.meaningful_interactions_per_wau)}
                detail={`${formatInteger(latest.meaningful_interaction_count)} meaningful interactions / ${formatInteger(latest.wau_count)} app-observed WAU`}
                trend={previous ? trendPercent(toNumber(latest.meaningful_interactions_per_wau), toNumber(previous.meaningful_interactions_per_wau)) : null}
              />
              <MetricCard
                label="Raw Interactions"
                value={formatInteger(latest.meaningful_interaction_count)}
                detail="Shared E7 meaningful interaction enum"
                trend={previous ? trendPercent(latest.meaningful_interaction_count, previous.meaningful_interaction_count) : null}
              />
              <MetricCard
                label="Active Watches / WAU"
                value={formatDecimal(latest.watches_per_wau)}
                detail={`${formatInteger(latest.active_unmuted_watches_count)} active unmuted watches`}
                trend={previous ? trendPercent(toNumber(latest.watches_per_wau), toNumber(previous.watches_per_wau)) : null}
              />
              <MetricCard
                label="Events / Watch"
                value={formatDecimal(latest.events_per_watch)}
                detail={`${formatInteger(latest.watch_matched_event_count)} watched events matched`}
                trend={previous ? trendPercent(toNumber(latest.events_per_watch), toNumber(previous.events_per_watch)) : null}
              />
            </div>
          </PageSection>

          <div className="grid gap-8 xl:grid-cols-2">
            <PageSection spacing="default">
              <SectionHeader
                title="Interaction Breakdown"
                description="One source row maps to one meaningful kind. Showcase-only replies and third-plus replies stay out of the count."
              />
              <BarList
                rows={interactionRows}
                emptyMessage="No meaningful interactions were recorded in the latest completed week."
              />
            </PageSection>

            <PageSection spacing="default">
              <SectionHeader
                title="Watches And Match Density"
                description="Active unmuted watches by subject type plus weekly event density."
              />
              <div className="space-y-4">
                <DataTable
                  columns={["Subject", "Active Watches", "Rows"]}
                  rows={watchRows}
                  emptyMessage="No active unmuted watches are present in the latest rollup."
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <MetricCard
                    label="Watches / WAU"
                    value={formatDecimal(latest.watches_per_wau)}
                    detail="Active unmuted watch count normalized by app-observed WAU"
                  />
                  <MetricCard
                    label="Events / Watch"
                    value={formatDecimal(latest.events_per_watch)}
                    detail="Watch-matched event count normalized by active watches"
                  />
                </div>
              </div>
            </PageSection>
          </div>

          <PageSection spacing="default">
            <SectionHeader
              title="Notification Tap-Through"
              description="Completed-week delivery health by event type and tier. These panels are observational; the dispatcher ignores E7 recommendations until founder approval."
            />
            <div className="grid gap-6 xl:grid-cols-2">
              <BarList
                rows={notificationByEventType}
                valueFormatter={formatPercent}
                emptyMessage="No sent notifications were recorded by event type in the latest completed week."
              />
              <BarList
                rows={notificationByTier}
                valueFormatter={formatPercent}
                emptyMessage="No sent notifications were recorded by tier in the latest completed week."
              />
            </div>
          </PageSection>

          <PageSection spacing="default">
            <SectionHeader
              title="Onboarding Ladder"
              description="Distinct users by ladder rung, sourced from onboarding_ladder_events."
            />
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <DataTable
                columns={["Rung", "Users", "Rows"]}
                rows={onboardingRows}
                emptyMessage="No onboarding ladder rows were recorded in the latest completed week."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <MetricCard label="Started" value={formatInteger(latest.ladder_started_count)} />
                <MetricCard label="Owned" value={formatInteger(latest.ladder_owned_count)} />
                <MetricCard label="Wanted" value={formatInteger(latest.ladder_wanted_count)} />
                <MetricCard label="Followed" value={formatInteger(latest.ladder_followed_count)} />
                <MetricCard label="Completed" value={formatInteger(latest.ladder_completed_count)} />
              </div>
            </div>
          </PageSection>

          <PageSection spacing="default">
            <SectionHeader
              title="Delivery Recommendations"
              description="Advisory flags only. A notification type is flagged after two completed weeks below 6% tap-through with at least 20 sends per week."
            />
            {flaggedRecommendations.length > 0 ? (
              <div className="space-y-4">
                {flaggedRecommendations.map((row) => (
                  <div key={row.id} className="rounded-[1.75rem] border border-amber-200 bg-amber-50 px-5 py-5 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <WarehouseBadge value={row.recommendation} tone="warning" />
                          <WarehouseBadge value={row.tier} tone="default" />
                          <WarehouseBadge value={row.requires_founder_approval ? "founder approval required" : "display only"} tone={row.requires_founder_approval ? "warning" : "muted"} />
                        </div>
                        <h2 className="text-lg font-semibold tracking-tight text-slate-950">{labelize(row.event_type)}</h2>
                        <p className="text-sm leading-6 text-slate-700">{row.reason}</p>
                      </div>
                      <dl className="grid shrink-0 grid-cols-3 gap-3 text-sm md:min-w-[20rem]">
                        <div>
                          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Sent</dt>
                          <dd className="mt-1 font-semibold text-slate-950">{formatInteger(row.sent_count)}</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Tapped</dt>
                          <dd className="mt-1 font-semibold text-slate-950">{formatInteger(row.tap_count)}</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Rate</dt>
                          <dd className="mt-1 font-semibold text-slate-950">{formatPercent(row.tap_through_rate)}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <DataTable
                columns={["Event Type", "Tier", "Sent", "Tapped", "Rate", "Recommendation"]}
                rows={latestRecommendations.map((row) => [
                  labelize(row.event_type),
                  labelize(row.tier),
                  formatInteger(row.sent_count),
                  formatInteger(row.tap_count),
                  formatPercent(row.tap_through_rate),
                  labelize(row.recommendation),
                ])}
                emptyMessage="No delivery recommendation rows exist for the latest completed week."
              />
            )}
          </PageSection>

          <PageSection spacing="default">
            <SectionHeader
              title="Rollup History"
              description="Recent completed weeks from north_star_weekly_rollups. Use this for sanity checks before approving any notification-tier change."
            />
            <DataTable
              columns={["Week", "WAU", "Meaningful", "Meaningful / WAU", "Watches / WAU", "Events / Watch", "Generated"]}
              rows={rollups.map((row) => [
                formatDate(row.week_start),
                formatInteger(row.wau_count),
                formatInteger(row.meaningful_interaction_count),
                formatDecimal(row.meaningful_interactions_per_wau),
                formatDecimal(row.watches_per_wau),
                formatDecimal(row.events_per_watch),
                formatDate(row.generated_at),
              ])}
              emptyMessage="No weekly rollups are available yet."
            />
          </PageSection>
        </>
      ) : (
        <EmptyPanel message="No E7 weekly rollups are available yet. Run run_north_star_weekly_rollup_v1 for a completed UTC week, then reload this founder-only page." />
      )}
    </PageContainer>
  );
}
