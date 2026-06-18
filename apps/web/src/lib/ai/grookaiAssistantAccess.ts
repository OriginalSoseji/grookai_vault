import type { User } from "@supabase/supabase-js";

import type { GrookaiAiEntitlementTier, GrookaiAssistantMode } from "@/lib/ai/grookaiAiProductBoundaries";

export type GrookaiAssistantAccessDecision = {
  allowed: boolean;
  tier: GrookaiAiEntitlementTier;
  reason:
    | "assistant_disabled"
    | "anonymous_not_allowed"
    | "free_account_not_allowed"
    | "free_trial_enabled"
    | "founder_admin_allowlist"
    | "vendor_power_user_allowlist";
  dailyLimit: number;
  mode: GrookaiAssistantMode;
};

function splitEnvList(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

function resolveUserEmail(user: User | null) {
  return (user?.email ?? "").trim().toLowerCase();
}

export function resolveGrookaiAssistantAccess(input: {
  user: User | null;
  mode: GrookaiAssistantMode;
}): GrookaiAssistantAccessDecision {
  const assistantEnabled = process.env.GROOKAI_ASSISTANT_ENABLED === "true";
  const freeTrialEnabled = process.env.GROOKAI_ASSISTANT_FREE_TRIAL_ENABLED === "true";
  const founderEmails = splitEnvList(process.env.GROOKAI_ASSISTANT_FOUNDER_EMAILS);
  const vendorEmails = splitEnvList(process.env.GROOKAI_INTELLIGENCE_VENDOR_EMAILS);
  const email = resolveUserEmail(input.user);

  if (!assistantEnabled) {
    return {
      allowed: false,
      tier: input.user ? "free_account" : "anonymous",
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

  if (email && vendorEmails.has(email)) {
    return {
      allowed: true,
      tier: "vendor_power_user",
      reason: "vendor_power_user_allowlist",
      dailyLimit: 100,
      mode: input.mode,
    };
  }

  if (email && founderEmails.has(email)) {
    return {
      allowed: true,
      tier: "founder_admin",
      reason: "founder_admin_allowlist",
      dailyLimit: 100,
      mode: input.mode,
    };
  }

  if (freeTrialEnabled) {
    return {
      allowed: true,
      tier: "free_account",
      reason: "free_trial_enabled",
      dailyLimit: 3,
      mode: input.mode,
    };
  }

  return {
    allowed: false,
    tier: "free_account",
    reason: "free_account_not_allowed",
    dailyLimit: 0,
    mode: input.mode,
  };
}
