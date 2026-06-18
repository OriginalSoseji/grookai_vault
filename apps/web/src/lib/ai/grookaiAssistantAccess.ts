import type { User } from "@supabase/supabase-js";

import type { GrookaiAiEntitlementTier, GrookaiAssistantMode } from "@/lib/ai/grookaiAiProductBoundaries";
import type { GrookaiUserEntitlement } from "../entitlements/grookaiUserEntitlements";

export type GrookaiAssistantAccessDecision = {
  allowed: boolean;
  tier: GrookaiAiEntitlementTier;
  reason:
    | "assistant_disabled"
    | "anonymous_not_allowed"
    | "free_account_not_allowed"
    | "free_trial_enabled"
    | "premium_entitlement"
    | "founder_admin_entitlement"
    | "vendor_entitlement";
  dailyLimit: number;
  mode: GrookaiAssistantMode;
};

export function resolveGrookaiAssistantAccess(input: {
  user: User | null;
  mode: GrookaiAssistantMode;
  entitlement?: GrookaiUserEntitlement;
}): GrookaiAssistantAccessDecision {
  const assistantEnabled = process.env.GROOKAI_ASSISTANT_ENABLED === "true";
  const freeTrialEnabled = process.env.GROOKAI_ASSISTANT_FREE_TRIAL_ENABLED === "true";
  const entitlement = input.entitlement ?? {
    tier: input.user ? "free" : "anonymous",
    capabilities: {
      canUseFounderTools: false,
      canUseVendorTools: false,
      canUseAssistant: false,
    },
  };

  if (!assistantEnabled) {
    return {
      allowed: false,
      tier: entitlement.tier,
      reason: "assistant_disabled",
      dailyLimit: 0,
      mode: input.mode,
    };
  }

  if (!input.user) {
    return {
      allowed: false,
      tier: "anonymous",
      reason: "anonymous_not_allowed",
      dailyLimit: 0,
      mode: input.mode,
    };
  }

  if (entitlement.tier === "founder_admin" || entitlement.capabilities.canUseFounderTools) {
    return {
      allowed: true,
      tier: "founder_admin",
      reason: "founder_admin_entitlement",
      dailyLimit: 100,
      mode: input.mode,
    };
  }

  if (entitlement.tier === "vendor" || entitlement.capabilities.canUseVendorTools) {
    return {
      allowed: true,
      tier: "vendor",
      reason: "vendor_entitlement",
      dailyLimit: 100,
      mode: input.mode,
    };
  }

  if (entitlement.tier === "premium" || entitlement.capabilities.canUseAssistant) {
    return {
      allowed: true,
      tier: "premium",
      reason: "premium_entitlement",
      dailyLimit: 25,
      mode: input.mode,
    };
  }

  if (freeTrialEnabled) {
    return {
      allowed: true,
      tier: "free",
      reason: "free_trial_enabled",
      dailyLimit: 3,
      mode: input.mode,
    };
  }

  return {
    allowed: false,
    tier: "free",
    reason: "free_account_not_allowed",
    dailyLimit: 0,
    mode: input.mode,
  };
}
