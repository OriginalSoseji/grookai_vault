import type { GrookaiAssistantAccessDecision } from "@/lib/ai/grookaiAssistantAccess";
import type { GrookaiAssistantCapability } from "@/lib/ai/grookaiAssistantCapabilities";
import type {
  GrookaiAiOutputType,
  GrookaiAiProductLane,
} from "@/lib/ai/grookaiAiProductBoundaries";

export type GrookaiAiRuntimeDecision = {
  modelCallAllowed: boolean;
  reason:
    | "model_calls_disabled"
    | "entitlement_denied"
    | "capability_not_model_eligible"
    | "unsupported_product_lane"
    | "unsupported_output_type"
    | "daily_limit_missing"
    | "model_call_allowed";
  modelTier: "none" | "low_cost" | "reasoning";
  productLane: GrookaiAiProductLane;
  outputType: GrookaiAiOutputType;
  capability?: GrookaiAssistantCapability;
};

const ASSISTANT_OUTPUTS = new Set<GrookaiAiOutputType>([
  "typed_filter_proposal",
  "grounded_explanation",
  "collection_gap_summary",
  "chase_list_proposal",
]);

const INTELLIGENCE_OUTPUTS = new Set<GrookaiAiOutputType>([
  "vendor_intelligence_report",
]);

export function resolveGrookaiAiRuntimeGuard(input: {
  productLane: GrookaiAiProductLane;
  outputType: GrookaiAiOutputType;
  entitlement: GrookaiAssistantAccessDecision;
  capability?: GrookaiAssistantCapability;
}): GrookaiAiRuntimeDecision {
  if (process.env.GROOKAI_AI_MODEL_CALLS_ENABLED !== "true") {
    return {
      modelCallAllowed: false,
      reason: "model_calls_disabled",
      modelTier: "none",
      productLane: input.productLane,
      outputType: input.outputType,
      capability: input.capability,
    };
  }

  if (!input.entitlement.allowed) {
    return {
      modelCallAllowed: false,
      reason: "entitlement_denied",
      modelTier: "none",
      productLane: input.productLane,
      outputType: input.outputType,
      capability: input.capability,
    };
  }

  if (input.entitlement.dailyLimit <= 0) {
    return {
      modelCallAllowed: false,
      reason: "daily_limit_missing",
      modelTier: "none",
      productLane: input.productLane,
      outputType: input.outputType,
      capability: input.capability,
    };
  }

  if (input.productLane === "search") {
    return {
      modelCallAllowed: false,
      reason: "unsupported_product_lane",
      modelTier: "none",
      productLane: input.productLane,
      outputType: input.outputType,
      capability: input.capability,
    };
  }

  if (input.productLane === "assistant" && !input.capability?.modelEligible) {
    return {
      modelCallAllowed: false,
      reason: "capability_not_model_eligible",
      modelTier: "none",
      productLane: input.productLane,
      outputType: input.outputType,
      capability: input.capability,
    };
  }

  if (input.productLane === "assistant" && !ASSISTANT_OUTPUTS.has(input.outputType)) {
    return {
      modelCallAllowed: false,
      reason: "unsupported_output_type",
      modelTier: "none",
      productLane: input.productLane,
      outputType: input.outputType,
      capability: input.capability,
    };
  }

  if (input.productLane === "intelligence" && !INTELLIGENCE_OUTPUTS.has(input.outputType)) {
    return {
      modelCallAllowed: false,
      reason: "unsupported_output_type",
      modelTier: "none",
      productLane: input.productLane,
      outputType: input.outputType,
      capability: input.capability,
    };
  }

  return {
    modelCallAllowed: true,
    reason: "model_call_allowed",
    modelTier: input.productLane === "intelligence" ? "reasoning" : "low_cost",
    productLane: input.productLane,
    outputType: input.outputType,
    capability: input.capability,
  };
}
