import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

type AdminClient = ReturnType<typeof createClient>;

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
};

type WeeklyBreakdownRow = {
  week_start: string;
  metric_name: string;
  dimension_name: string;
  dimension_value: string;
  metric_value: number | string;
  row_count: number;
};

type DeliveryRecommendationRow = {
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
};

type LabeledMetric = {
  key: string;
  label: string;
  value: number;
  row_count: number;
};

type TapThroughMetric = LabeledMetric & {
  sent_count: number;
};

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function labelize(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function rowsFor(
  rows: WeeklyBreakdownRow[],
  weekStart: string | null,
  metricName: string,
  dimensionName?: string,
): WeeklyBreakdownRow[] {
  if (!weekStart) return [];
  return rows
    .filter((row) =>
      row.week_start === weekStart &&
      row.metric_name === metricName &&
      (!dimensionName || row.dimension_name === dimensionName)
    )
    .sort((left, right) =>
      toNumber(right.metric_value) - toNumber(left.metric_value) ||
      right.row_count - left.row_count
    );
}

function mapLabeled(rows: WeeklyBreakdownRow[]): LabeledMetric[] {
  return rows.map((row) => ({
    key: row.dimension_value,
    label: labelize(row.dimension_value),
    value: toNumber(row.metric_value),
    row_count: row.row_count,
  }));
}

function mapTapThrough(rows: WeeklyBreakdownRow[]): TapThroughMetric[] {
  return rows.map((row) => ({
    key: row.dimension_value,
    label: labelize(row.dimension_value),
    value: toNumber(row.metric_value),
    row_count: row.row_count,
    sent_count: row.row_count,
  }));
}

export async function loadFounderMetrics(admin: AdminClient) {
  const [rollupsResponse, breakdownsResponse, recommendationsResponse] =
    await Promise.all([
      admin
        .from("north_star_weekly_rollups")
        .select("week_start,week_end,generated_at,source_window_start,source_window_end,wau_count,meaningful_interaction_count,meaningful_interactions_per_wau,active_unmuted_watches_count,watches_per_wau,watch_matched_event_count,events_per_watch,ladder_started_count,ladder_owned_count,ladder_wanted_count,ladder_followed_count,ladder_completed_count")
        .order("week_start", { ascending: false })
        .limit(12),
      admin
        .from("north_star_weekly_breakdowns")
        .select("week_start,metric_name,dimension_name,dimension_value,metric_value,row_count")
        .order("week_start", { ascending: false })
        .limit(600),
      admin
        .from("notification_type_delivery_recommendations")
        .select("week_start,event_type,tier,sent_count,tap_count,tap_through_rate,recommendation,threshold,reason,requires_founder_approval,founder_approved_at")
        .order("week_start", { ascending: false })
        .limit(100),
    ]);

  if (rollupsResponse.error) throw rollupsResponse.error;
  if (breakdownsResponse.error) throw breakdownsResponse.error;
  if (recommendationsResponse.error) throw recommendationsResponse.error;

  const rollups = (rollupsResponse.data ?? []) as WeeklyRollupRow[];
  const breakdowns = (breakdownsResponse.data ?? []) as WeeklyBreakdownRow[];
  const recommendations =
    (recommendationsResponse.data ?? []) as DeliveryRecommendationRow[];
  const latest = rollups[0] ?? null;
  const previous = rollups[1] ?? null;
  const latestWeekStart = latest?.week_start ?? null;
  const latestRecommendations = latestWeekStart
    ? recommendations.filter((row) => row.week_start === latestWeekStart)
    : [];

  return {
    generated_at: new Date().toISOString(),
    latest_week: latest,
    previous_week: previous,
    interaction_breakdown: mapLabeled(
      rowsFor(breakdowns, latestWeekStart, "meaningful_interactions", "kind"),
    ),
    watches_by_subject: mapLabeled(
      rowsFor(breakdowns, latestWeekStart, "watches", "subject_type"),
    ),
    notification_by_event_type: mapTapThrough(
      rowsFor(breakdowns, latestWeekStart, "notification_tap_through", "event_type"),
    ),
    notification_by_tier: mapTapThrough(
      rowsFor(breakdowns, latestWeekStart, "notification_tap_through", "tier"),
    ),
    onboarding_ladder: mapLabeled(
      rowsFor(breakdowns, latestWeekStart, "onboarding_ladder_conversion", "rung"),
    ),
    recommendations: latestRecommendations,
    flagged_recommendations: recommendations
      .filter((row) => row.recommendation === "digest_only_candidate")
      .slice(0, 12),
    recent_weeks: rollups,
  };
}
