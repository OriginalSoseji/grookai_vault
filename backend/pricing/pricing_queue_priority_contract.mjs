export const AUTHORITATIVE_PRICING_RUNNER = 'pricing_job_runner_v1';
export const AUTHORITATIVE_PRICING_CLAIM_STRATEGY = 'priority_then_eligibility_then_requested_at';

export const PRICING_QUEUE_PRIORITY_ORDER = Object.freeze({
  vault: 0,
  user: 1,
  scheduled: 2,
  backfill: 3,
  rarity_auto: 4,
  hot: 5,
  normal: 6,
});

export function normalizePricingPriority(priority) {
  const normalized = typeof priority === 'string' ? priority.trim().toLowerCase() : '';
  return normalized || 'normal';
}

export function isKnownPricingPriority(priority) {
  return Object.prototype.hasOwnProperty.call(
    PRICING_QUEUE_PRIORITY_ORDER,
    normalizePricingPriority(priority),
  );
}

export function getPricingPriorityScore(priority) {
  const normalized = normalizePricingPriority(priority);
  if (isKnownPricingPriority(normalized)) {
    return PRICING_QUEUE_PRIORITY_ORDER[normalized];
  }

  return PRICING_QUEUE_PRIORITY_ORDER.normal;
}
