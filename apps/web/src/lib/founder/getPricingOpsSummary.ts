import "server-only";

import { createServerAdminClient } from "@/lib/supabase/admin";

const DEFAULT_EBAY_BROWSE_DAILY_BUDGET = 4200;
const DEFAULT_EBAY_BROWSE_ACTIVE_LISTINGS_LIMIT = 3;
const DEFAULT_PRICING_JOB_MIN_START_DELAY_MS = 45_000;
const PRICING_JOB_RUNNING_STALE_TTL_MS = 10 * 60 * 1000;
const RECENT_COMPLETED_WINDOW_HOURS = 24;
const RECENT_FAILED_WINDOW_HOURS = 24;
const RECENT_RETRY_WINDOW_HOURS = 24;
const RECENT_ACTIVITY_WINDOW_HOURS = 1;
const THROUGHPUT_BUCKET_MINUTES = 5;
const RETRY_ERROR_FILTER = "error.ilike.*429*,error.ilike.*rate_limit*,error.ilike.*rate-limited*";

type AdminClient = ReturnType<typeof createServerAdminClient>;

type BudgetSnapshotRpcRow = {
  provider: string | null;
  usage_date: string | null;
  daily_budget: number | null;
  consumed_calls: number | null;
  remaining_calls: number | null;
  exhausted: boolean | null;
};

type PricingJobRetryRow = {
  id: string;
  card_print_id: string | null;
  status: string | null;
  attempts: number | null;
  error: string | null;
  requested_at: string | null;
  started_at: string | null;
  completed_at: string | null;
};

type CardPrintRetryMetadataRow = {
  id: string;
  gv_id: string | null;
  name: string | null;
  set_code: string | null;
  number: string | null;
};

export type FounderPricingOpsConfig = {
  dailyBudget: number;
  activeListingsLimit: number;
  minJobStartDelayMs: number;
  budgetSource: "env" | "default";
  activeListingsLimitSource: "env" | "default";
  minJobStartDelaySource: "env" | "default";
};

export type FounderPricingBudgetCard = {
  provider: string;
  usageDate: string | null;
  consumedCalls: number;
  dailyBudget: number;
  remainingCalls: number;
  pctUsed: number;
  exhausted: boolean;
};

export type FounderPricingQueueHealth = {
  pendingCount: number;
  runningCount: number;
  done24hCount: number;
  failed24hCount: number;
  retryable429Count: number;
  staleRunningCount: number;
  requestedLastHourCount: number;
  startedLastHourCount: number;
  backlogGrowing: boolean;
};

export type FounderPricingThroughputBucket = {
  bucketStartIso: string;
  startedCount: number;
};

export type FounderPricingRetryRow = {
  id: string;
  cardPrintId: string | null;
  gvId: string | null;
  name: string | null;
  setCode: string | null;
  number: string | null;
  status: string;
  attempts: number;
  error: string | null;
  requestedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
};

export type FounderPricingOpsSummary = {
  budget: FounderPricingBudgetCard | null;
  queueHealth: FounderPricingQueueHealth | null;
  throughputBuckets: FounderPricingThroughputBucket[];
  retryRows: FounderPricingRetryRow[];
  config: FounderPricingOpsConfig;
  errors: {
    budget?: string;
    queueHealth?: string;
    throughput?: string;
    retryPressure?: string;
  };
};

function parseNumberWithSource(
  raw: string | undefined,
  fallback: number,
  minimum: number,
): { value: number; source: "env" | "default" } {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (Number.isFinite(parsed) && parsed >= minimum) {
    return { value: parsed, source: "env" };
  }

  return { value: fallback, source: "default" };
}

function getRecentIso(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function floorToBucketMinutes(timestampIso: string, bucketMinutes: number) {
  const date = new Date(timestampIso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const bucketMs = bucketMinutes * 60 * 1000;
  const flooredMs = Math.floor(date.getTime() / bucketMs) * bucketMs;
  return new Date(flooredMs).toISOString();
}

function mapConfig(): FounderPricingOpsConfig {
  const dailyBudget = parseNumberWithSource(
    process.env.EBAY_BROWSE_DAILY_BUDGET,
    DEFAULT_EBAY_BROWSE_DAILY_BUDGET,
    0,
  );
  const activeListingsLimit = parseNumberWithSource(
    process.env.EBAY_BROWSE_ACTIVE_LISTINGS_LIMIT,
    DEFAULT_EBAY_BROWSE_ACTIVE_LISTINGS_LIMIT,
    1,
  );
  const minJobStartDelayMs = parseNumberWithSource(
    process.env.PRICING_JOB_MIN_START_DELAY_MS,
    DEFAULT_PRICING_JOB_MIN_START_DELAY_MS,
    0,
  );

  return {
    dailyBudget: dailyBudget.value,
    activeListingsLimit: activeListingsLimit.value,
    minJobStartDelayMs: minJobStartDelayMs.value,
    budgetSource: dailyBudget.source,
    activeListingsLimitSource: activeListingsLimit.source,
    minJobStartDelaySource: minJobStartDelayMs.source,
  };
}

async function countRows(
  queryPromise: PromiseLike<{ count: number | null; error: { message: string } | null }>,
  label: string,
) {
  const { count, error } = await queryPromise;
  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }

  return count ?? 0;
}

async function fetchBudgetCard(
  admin: AdminClient,
  config: FounderPricingOpsConfig,
): Promise<FounderPricingBudgetCard> {
  const { data, error } = await admin.rpc("get_ebay_browse_daily_budget_snapshot_v1", {
    p_provider: "ebay_browse",
    p_daily_budget: config.dailyBudget,
  });

  if (error) {
    throw new Error(`Founder pricing budget snapshot failed: ${error.message}`);
  }

  const row = (Array.isArray(data) ? data[0] : data) as BudgetSnapshotRpcRow | null;
  const consumedCalls = Number(row?.consumed_calls ?? 0);
  const dailyBudget = Number(row?.daily_budget ?? config.dailyBudget);
  const remainingCalls = Number(row?.remaining_calls ?? Math.max(dailyBudget - consumedCalls, 0));
  const pctUsed = dailyBudget > 0 ? Math.min(consumedCalls / dailyBudget, 1) : 0;

  return {
    provider: row?.provider?.trim() || "ebay_browse",
    usageDate: row?.usage_date ?? null,
    consumedCalls,
    dailyBudget,
    remainingCalls,
    pctUsed,
    exhausted: Boolean(row?.exhausted),
  };
}

async function fetchQueueHealth(admin: AdminClient): Promise<FounderPricingQueueHealth> {
  const staleRunningCutoffIso = new Date(Date.now() - PRICING_JOB_RUNNING_STALE_TTL_MS).toISOString();
  const recentDoneIso = getRecentIso(RECENT_COMPLETED_WINDOW_HOURS);
  const recentFailedIso = getRecentIso(RECENT_FAILED_WINDOW_HOURS);
  const recentActivityIso = getRecentIso(RECENT_ACTIVITY_WINDOW_HOURS);

  const [
    pendingCount,
    runningCount,
    done24hCount,
    failed24hCount,
    retryable429Count,
    staleRunningCount,
    requestedLastHourCount,
    startedLastHourCount,
  ] = await Promise.all([
    countRows(
      admin.from("pricing_jobs").select("*", { count: "exact", head: true }).eq("status", "pending"),
      "Founder pending pricing_jobs count failed",
    ),
    countRows(
      admin.from("pricing_jobs").select("*", { count: "exact", head: true }).eq("status", "running"),
      "Founder running pricing_jobs count failed",
    ),
    countRows(
      admin
        .from("pricing_jobs")
        .select("*", { count: "exact", head: true })
        .eq("status", "done")
        .gte("completed_at", recentDoneIso),
      "Founder done pricing_jobs count failed",
    ),
    countRows(
      admin
        .from("pricing_jobs")
        .select("*", { count: "exact", head: true })
        .eq("status", "failed")
        .gte("completed_at", recentFailedIso),
      "Founder failed pricing_jobs count failed",
    ),
    countRows(
      admin
        .from("pricing_jobs")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
        .ilike("error", "retryable_429:%"),
      "Founder retryable_429 pricing_jobs count failed",
    ),
    countRows(
      admin
        .from("pricing_jobs")
        .select("*", { count: "exact", head: true })
        .eq("status", "running")
        .lt("started_at", staleRunningCutoffIso),
      "Founder stale running pricing_jobs count failed",
    ),
    countRows(
      admin
        .from("pricing_jobs")
        .select("*", { count: "exact", head: true })
        .gte("requested_at", recentActivityIso),
      "Founder requested pricing_jobs count failed",
    ),
    countRows(
      admin
        .from("pricing_jobs")
        .select("*", { count: "exact", head: true })
        .not("started_at", "is", null)
        .gte("started_at", recentActivityIso),
      "Founder started pricing_jobs count failed",
    ),
  ]);

  return {
    pendingCount,
    runningCount,
    done24hCount,
    failed24hCount,
    retryable429Count,
    staleRunningCount,
    requestedLastHourCount,
    startedLastHourCount,
    backlogGrowing: pendingCount > 0 && requestedLastHourCount > startedLastHourCount,
  };
}

async function fetchThroughputBuckets(admin: AdminClient): Promise<FounderPricingThroughputBucket[]> {
  const recentActivityIso = getRecentIso(RECENT_ACTIVITY_WINDOW_HOURS);
  const { data, error } = await admin
    .from("pricing_jobs")
    .select("id,started_at")
    .not("started_at", "is", null)
    .gte("started_at", recentActivityIso)
    .order("started_at", { ascending: true })
    .limit(1000);

  if (error) {
    throw new Error(`Founder pricing throughput query failed: ${error.message}`);
  }

  const buckets = new Map<string, number>();
  for (const row of (data ?? []) as Array<{ id: string; started_at: string | null }>) {
    if (!row.started_at) {
      continue;
    }

    const bucketStartIso = floorToBucketMinutes(row.started_at, THROUGHPUT_BUCKET_MINUTES);
    if (!bucketStartIso) {
      continue;
    }

    buckets.set(bucketStartIso, (buckets.get(bucketStartIso) ?? 0) + 1);
  }

  return Array.from(buckets.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([bucketStartIso, startedCount]) => ({
      bucketStartIso,
      startedCount,
    }));
}

async function fetchRetryRows(admin: AdminClient): Promise<FounderPricingRetryRow[]> {
  const recentRetryIso = getRecentIso(RECENT_RETRY_WINDOW_HOURS);
  const { data, error } = await admin
    .from("pricing_jobs")
    .select("id,card_print_id,status,attempts,error,requested_at,started_at,completed_at")
    .gte("requested_at", recentRetryIso)
    .or(RETRY_ERROR_FILTER)
    .order("requested_at", { ascending: false })
    .limit(12);

  if (error) {
    throw new Error(`Founder pricing retry query failed: ${error.message}`);
  }

  const retryRows = ((data ?? []) as PricingJobRetryRow[]) ?? [];
  const cardPrintIds = Array.from(
    new Set(
      retryRows
        .map((row) => row.card_print_id)
        .filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  );

  const cardMetadataById = new Map<string, CardPrintRetryMetadataRow>();
  if (cardPrintIds.length > 0) {
    const { data: cardMetadataRows, error: cardMetadataError } = await admin
      .from("card_prints")
      .select("id,gv_id,name,set_code,number")
      .in("id", cardPrintIds);

    if (cardMetadataError) {
      throw new Error(`Founder retry card metadata query failed: ${cardMetadataError.message}`);
    }

    for (const row of ((cardMetadataRows ?? []) as CardPrintRetryMetadataRow[]) ?? []) {
      if (row.id) {
        cardMetadataById.set(row.id, row);
      }
    }
  }

  return retryRows.map((row) => {
    const metadata = row.card_print_id ? cardMetadataById.get(row.card_print_id) : undefined;
    return {
      id: row.id,
      cardPrintId: row.card_print_id ?? null,
      gvId: metadata?.gv_id ?? null,
      name: metadata?.name ?? null,
      setCode: metadata?.set_code ?? null,
      number: metadata?.number ?? null,
      status: row.status?.trim() || "unknown",
      attempts: Number(row.attempts ?? 0),
      error: row.error ?? null,
      requestedAt: row.requested_at ?? null,
      startedAt: row.started_at ?? null,
      completedAt: row.completed_at ?? null,
    };
  });
}

export async function getFounderPricingOpsSummary(
  admin: AdminClient,
): Promise<FounderPricingOpsSummary> {
  const config = mapConfig();
  const errors: FounderPricingOpsSummary["errors"] = {};

  const [budgetResult, queueHealthResult, throughputResult, retryRowsResult] = await Promise.allSettled([
    fetchBudgetCard(admin, config),
    fetchQueueHealth(admin),
    fetchThroughputBuckets(admin),
    fetchRetryRows(admin),
  ]);

  const budget = budgetResult.status === "fulfilled" ? budgetResult.value : null;
  if (budgetResult.status === "rejected") {
    errors.budget = budgetResult.reason instanceof Error ? budgetResult.reason.message : "Unknown pricing budget error";
  }

  const queueHealth = queueHealthResult.status === "fulfilled" ? queueHealthResult.value : null;
  if (queueHealthResult.status === "rejected") {
    errors.queueHealth =
      queueHealthResult.reason instanceof Error ? queueHealthResult.reason.message : "Unknown queue health error";
  }

  const throughputBuckets = throughputResult.status === "fulfilled" ? throughputResult.value : [];
  if (throughputResult.status === "rejected") {
    errors.throughput =
      throughputResult.reason instanceof Error ? throughputResult.reason.message : "Unknown throughput error";
  }

  const retryRows = retryRowsResult.status === "fulfilled" ? retryRowsResult.value : [];
  if (retryRowsResult.status === "rejected") {
    errors.retryPressure =
      retryRowsResult.reason instanceof Error ? retryRowsResult.reason.message : "Unknown retry pressure error";
  }

  return {
    budget,
    queueHealth,
    throughputBuckets,
    retryRows,
    config,
    errors,
  };
}
