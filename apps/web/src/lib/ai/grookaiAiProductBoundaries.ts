export const GROOKAI_AI_BOUNDARY_VERSION = "GROOKAI_AI_PRODUCT_BOUNDARIES_V1";

export type GrookaiAiProductLane = "search" | "assistant" | "intelligence";

export type GrookaiAiEntitlementTier =
  | "anonymous"
  | "free_account"
  | "paid_subscriber"
  | "founder_admin"
  | "vendor_power_user";

export type GrookaiAssistantMode =
  | "search_interpretation"
  | "variant_explanation"
  | "collection_gap_summary"
  | "chase_list_proposal";

export type GrookaiAiOutputType =
  | "typed_filter_proposal"
  | "grounded_explanation"
  | "collection_gap_summary"
  | "chase_list_proposal"
  | "vendor_intelligence_report";

export const GROOKAI_AI_SAFETY_FLAGS = {
  searchUsesModelByDefault: false,
  assistantRequiresExplicitInvocation: true,
  intelligenceRequiresExplicitInvocation: true,
  dbWritesAllowed: false,
  arbitrarySqlAllowed: false,
  canonicalTruthMutationAllowed: false,
  pricingClaimsWithoutSourceAllowed: false,
} as const;

export const GROOKAI_ASSISTANT_ALLOWED_OUTPUTS: GrookaiAiOutputType[] = [
  "typed_filter_proposal",
  "grounded_explanation",
  "collection_gap_summary",
  "chase_list_proposal",
];

export function normalizeAssistantPrompt(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 1000);
}
