import { getNextUtcDayStartMs } from '../clients/ebay_browse_budget_v1.mjs';
import {
  getPricingPriorityScore,
  normalizePricingPriority,
} from './pricing_queue_priority_contract.mjs';

export const PRICING_QUEUE_VAULT_RETRY_COOLDOWN_MS = 24 * 60 * 60 * 1000;
export const PRICING_QUEUE_NON_VAULT_RETRY_COOLDOWN_MS = 4 * 24 * 60 * 60 * 1000;
export const PRICING_QUEUE_TRANSIENT_RETRY_DELAY_MS = 60 * 60 * 1000;

function parseTimestampMs(value) {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toIso(ms) {
  return new Date(ms).toISOString();
}

function getCooldownAnchorMs(job, nowMs = Date.now()) {
  return (
    parseTimestampMs(job?.last_meaningful_attempt_at) ??
    parseTimestampMs(job?.requested_at) ??
    nowMs
  );
}

export function isBroadPricingQueueEnabled() {
  return process.env.PRICING_ENABLE_BROAD_BACKFILL === '1';
}

export function isVaultPricingJob(job) {
  const priority = normalizePricingPriority(job?.priority);
  return priority === 'vault';
}

export function getRetryCooldownMs(job) {
  return isVaultPricingJob(job)
    ? PRICING_QUEUE_VAULT_RETRY_COOLDOWN_MS
    : PRICING_QUEUE_NON_VAULT_RETRY_COOLDOWN_MS;
}

export function getJobEligibilityMs(job) {
  return (
    parseTimestampMs(job?.next_eligible_at) ??
    parseTimestampMs(job?.requested_at) ??
    0
  );
}

export function isJobEligible(job, nowMs = Date.now()) {
  return getJobEligibilityMs(job) <= nowMs;
}

export function isDemandDrivenPriority(priority) {
  const normalized = normalizePricingPriority(priority);
  return normalized === 'vault' || normalized === 'user';
}

export function sortPricingClaimCandidates(jobs) {
  return [...jobs].sort((left, right) => {
    const priorityDiff =
      getPricingPriorityScore(left?.priority) -
      getPricingPriorityScore(right?.priority);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    const leftEligibleMs = getJobEligibilityMs(left);
    const rightEligibleMs = getJobEligibilityMs(right);
    if (leftEligibleMs !== rightEligibleMs) {
      return leftEligibleMs - rightEligibleMs;
    }

    const leftRequestedMs = parseTimestampMs(left?.requested_at) ?? 0;
    const rightRequestedMs = parseTimestampMs(right?.requested_at) ?? 0;
    if (leftRequestedMs !== rightRequestedMs) {
      return leftRequestedMs - rightRequestedMs;
    }

    return String(left?.id ?? '').localeCompare(String(right?.id ?? ''));
  });
}

export function classifyPricingRunOutcome({
  exitCode = null,
  stage = null,
} = {}) {
  if (stage === 'budget_exhausted_before_start') {
    return 'budget_blocked';
  }

  if (stage === 'budget_snapshot_retryable') {
    return 'transient_failure';
  }

  if (exitCode === 0) {
    return 'success';
  }

  if (exitCode === 42) {
    return 'throttle_blocked';
  }

  if (exitCode === 43) {
    return 'budget_blocked';
  }

  return 'attempted_failure';
}

export function isMeaningfulAttempt(outcome) {
  return outcome === 'success' || outcome === 'attempted_failure';
}

export function getLastMeaningfulAttemptMs(job) {
  return parseTimestampMs(job?.last_meaningful_attempt_at);
}

export function getNextEligibleAt(job, { outcome, nowMs = Date.now() } = {}) {
  if (outcome === 'budget_blocked') {
    return toIso(getNextUtcDayStartMs(nowMs));
  }

  if (outcome === 'transient_failure') {
    const existingEligibleMs = parseTimestampMs(job?.next_eligible_at) ?? 0;
    return toIso(Math.max(existingEligibleMs, nowMs + PRICING_QUEUE_TRANSIENT_RETRY_DELAY_MS));
  }

  if (outcome === 'throttle_blocked') {
    const existingEligibleMs = parseTimestampMs(job?.next_eligible_at) ?? 0;
    const cooldownEligibleMs = getCooldownAnchorMs(job, nowMs) + getRetryCooldownMs(job);
    return toIso(Math.max(existingEligibleMs, cooldownEligibleMs));
  }

  const cooldownMs = getRetryCooldownMs(job);
  return toIso(nowMs + cooldownMs);
}

export function buildPricingJobOutcomePatch(
  job,
  {
    outcome,
    errorClass = null,
    errorMessage = null,
    nowMs = Date.now(),
    keepPending = false,
  } = {},
) {
  const nowIso = toIso(nowMs);
  const nextEligibleAt = getNextEligibleAt(job, { outcome, nowMs });
  const status = outcome === 'success' ? 'done' : keepPending ? 'pending' : 'failed';

  return {
    status,
    started_at: keepPending ? null : job?.started_at ?? nowIso,
    completed_at: keepPending ? null : nowIso,
    error: errorMessage ? String(errorMessage).slice(0, 500) : null,
    last_outcome: outcome,
    last_error_class: errorClass,
    next_eligible_at: nextEligibleAt,
    last_meaningful_attempt_at: isMeaningfulAttempt(outcome)
      ? nowIso
      : job?.last_meaningful_attempt_at ?? null,
  };
}
