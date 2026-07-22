import "server-only";

import type { User } from "@supabase/supabase-js";

import { resolveServerUserEntitlement } from "@/lib/entitlements/resolveServerUserEntitlement";

const POKEJAVI_AUTH_USER_ID = "c177a180-e36b-44cc-93f8-ee104717a389";

function configuredReviewerIds() {
  return new Set(
    (process.env.GROOKAI_VISUAL_SEARCH_REVIEWER_USER_IDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

export type VisualSearchReviewerAccess = {
  allowed: boolean;
  reviewerKey: string | null;
  reason: "built_in_reviewer" | "configured_reviewer" | "founder" | "not_authorized";
};

export async function resolveVisualSearchReviewerAccess(
  user: User,
): Promise<VisualSearchReviewerAccess> {
  if (user.id === POKEJAVI_AUTH_USER_ID) {
    return { allowed: true, reviewerKey: "PokeJavi", reason: "built_in_reviewer" };
  }

  if (configuredReviewerIds().has(user.id)) {
    return { allowed: true, reviewerKey: "reviewer", reason: "configured_reviewer" };
  }

  const entitlement = await resolveServerUserEntitlement(user);
  if (entitlement.capabilities.canUseFounderTools) {
    return { allowed: true, reviewerKey: "founder", reason: "founder" };
  }

  return { allowed: false, reviewerKey: null, reason: "not_authorized" };
}
