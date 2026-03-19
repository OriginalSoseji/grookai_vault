import '../env.mjs';

import { createBackendClient } from '../supabase_backend_client.mjs';

export const DEFAULT_EBAY_BROWSE_DAILY_BUDGET = 4200;
export const DEFAULT_EBAY_BROWSE_ACTIVE_LISTINGS_LIMIT = 3;
export const DEFAULT_PRICING_JOB_MIN_START_DELAY_MS = 45_000;
export const EBAY_BROWSE_BUDGET_PROVIDER = 'ebay_browse';
export const EBAY_BROWSE_BUDGET_EXHAUSTED_CODE = 'EBAY_BROWSE_DAILY_BUDGET_EXHAUSTED';

let cachedSupabase = null;
let hasLoggedBudgetConfig = false;

function getBackendClient() {
  if (!cachedSupabase) {
    cachedSupabase = createBackendClient();
  }
  return cachedSupabase;
}

function logBudgetEvent(event, payload = {}) {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    scope: 'ebay_browse_budget_v1',
    event,
    ...payload,
  }));
}

export function getEbayBrowseDailyBudget() {
  const raw = Number.parseInt(process.env.EBAY_BROWSE_DAILY_BUDGET ?? '', 10);
  if (Number.isFinite(raw) && raw >= 0) {
    return raw;
  }
  return DEFAULT_EBAY_BROWSE_DAILY_BUDGET;
}

export function getEbayBrowseActiveListingsLimit() {
  const raw = Number.parseInt(process.env.EBAY_BROWSE_ACTIVE_LISTINGS_LIMIT ?? '', 10);
  if (Number.isFinite(raw) && raw > 0) {
    return raw;
  }
  return DEFAULT_EBAY_BROWSE_ACTIVE_LISTINGS_LIMIT;
}

export function getPricingJobMinStartDelayMs() {
  const raw = Number.parseInt(process.env.PRICING_JOB_MIN_START_DELAY_MS ?? '', 10);
  if (Number.isFinite(raw) && raw >= 0) {
    return raw;
  }
  return DEFAULT_PRICING_JOB_MIN_START_DELAY_MS;
}

export function getEstimatedBrowseCallsPerPricingJob() {
  return 1 + getEbayBrowseActiveListingsLimit();
}

export function getNextUtcDayStartMs(nowMs = Date.now()) {
  const now = new Date(nowMs);
  return Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0,
    0,
    0,
    0,
  );
}

export function logEbayBrowseBudgetConfig(scope) {
  if (hasLoggedBudgetConfig) {
    return;
  }
  hasLoggedBudgetConfig = true;
  logBudgetEvent('budget_config', {
    scope_hint: scope,
    provider: EBAY_BROWSE_BUDGET_PROVIDER,
    daily_budget: getEbayBrowseDailyBudget(),
    active_listings_limit: getEbayBrowseActiveListingsLimit(),
    min_job_start_delay_ms: getPricingJobMinStartDelayMs(),
    estimated_calls_per_job: getEstimatedBrowseCallsPerPricingJob(),
  });
}

export class EbayBrowseBudgetExceededError extends Error {
  constructor(snapshot, payload = {}) {
    super('[ebay-browse-budget] daily budget exhausted');
    this.name = 'EbayBrowseBudgetExceededError';
    this.code = EBAY_BROWSE_BUDGET_EXHAUSTED_CODE;
    this.snapshot = snapshot;
    Object.assign(this, payload);
  }
}

export function isEbayBrowseBudgetExceededError(error) {
  return error?.code === EBAY_BROWSE_BUDGET_EXHAUSTED_CODE;
}

export async function getEbayBrowseBudgetSnapshot({ supabase } = {}) {
  const client = supabase ?? getBackendClient();
  const dailyBudget = getEbayBrowseDailyBudget();
  const { data, error } = await client.rpc('get_ebay_browse_daily_budget_snapshot_v1', {
    p_provider: EBAY_BROWSE_BUDGET_PROVIDER,
    p_daily_budget: dailyBudget,
  });

  if (error) {
    throw new Error(`[ebay-browse-budget] snapshot failed: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return {
      provider: EBAY_BROWSE_BUDGET_PROVIDER,
      usage_date: null,
      daily_budget: dailyBudget,
      consumed_calls: 0,
      remaining_calls: dailyBudget,
      exhausted: dailyBudget <= 0,
    };
  }

  return {
    provider: row.provider,
    usage_date: row.usage_date,
    daily_budget: Number(row.daily_budget ?? dailyBudget),
    consumed_calls: Number(row.consumed_calls ?? 0),
    remaining_calls: Number(row.remaining_calls ?? dailyBudget),
    exhausted: Boolean(row.exhausted),
  };
}

export async function consumeEbayBrowseBudget({ units = 1, operation = 'browse_call', supabase } = {}) {
  const client = supabase ?? getBackendClient();
  const dailyBudget = getEbayBrowseDailyBudget();
  const callUnits = Math.max(0, Number.parseInt(String(units), 10) || 0);
  const { data, error } = await client.rpc('consume_ebay_browse_daily_budget_v1', {
    p_provider: EBAY_BROWSE_BUDGET_PROVIDER,
    p_daily_budget: dailyBudget,
    p_call_units: callUnits,
  });

  if (error) {
    throw new Error(`[ebay-browse-budget] consume failed: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    throw new Error('[ebay-browse-budget] consume failed: missing snapshot row');
  }

  const snapshot = {
    provider: row.provider,
    usage_date: row.usage_date,
    daily_budget: Number(row.daily_budget ?? dailyBudget),
    requested_units: Number(row.requested_units ?? callUnits),
    consumed_before: Number(row.consumed_before ?? 0),
    consumed_after: Number(row.consumed_after ?? 0),
    remaining_calls: Number(row.remaining_calls ?? 0),
    allowed: Boolean(row.allowed),
  };

  if (!snapshot.allowed) {
    logBudgetEvent('browse_call_blocked', {
      operation,
      provider: snapshot.provider,
      usage_date: snapshot.usage_date,
      daily_budget: snapshot.daily_budget,
      remaining_calls: snapshot.remaining_calls,
      requested_units: snapshot.requested_units,
    });
  }

  return snapshot;
}

export async function consumeEbayBrowseBudgetOrThrow({ units = 1, operation = 'browse_call', supabase } = {}) {
  const snapshot = await consumeEbayBrowseBudget({ units, operation, supabase });
  if (!snapshot.allowed) {
    throw new EbayBrowseBudgetExceededError(snapshot, {
      operation,
      provider: snapshot.provider,
      usage_date: snapshot.usage_date,
    });
  }
  return snapshot;
}
