const PROMOTION_TRANSITION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// LOCK: Transition note is temporary historical context.
// LOCK: Fail closed when promotion timestamp is unavailable or invalid.
export function shouldShowPromotionTransitionNote(input: {
  promotedAt?: string | null;
  now?: Date;
}): boolean {
  if (!input.promotedAt) {
    return false;
  }

  const promotedAtMs = Date.parse(input.promotedAt);
  if (!Number.isFinite(promotedAtMs)) {
    return false;
  }

  const nowMs = input.now?.getTime() ?? Date.now();
  if (!Number.isFinite(nowMs)) {
    return false;
  }

  const ageMs = nowMs - promotedAtMs;
  return ageMs >= 0 && ageMs <= PROMOTION_TRANSITION_TTL_MS;
}
