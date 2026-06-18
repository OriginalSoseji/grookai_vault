import type {
  GrookaiAiOutputType,
  GrookaiAssistantMode,
} from "@/lib/ai/grookaiAiProductBoundaries";

export type GrookaiAssistantCapabilityStatus =
  | "implemented_no_model_preview"
  | "planned_grounding_required";

export type GrookaiAssistantCapability = {
  mode: GrookaiAssistantMode;
  outputType: GrookaiAiOutputType;
  status: GrookaiAssistantCapabilityStatus;
  modelEligible: boolean;
  groundingRequired: boolean;
};

const CAPABILITIES: Record<GrookaiAssistantMode, GrookaiAssistantCapability> = {
  search_interpretation: {
    mode: "search_interpretation",
    outputType: "typed_filter_proposal",
    status: "implemented_no_model_preview",
    modelEligible: false,
    groundingRequired: false,
  },
  variant_explanation: {
    mode: "variant_explanation",
    outputType: "grounded_explanation",
    status: "planned_grounding_required",
    modelEligible: false,
    groundingRequired: true,
  },
  collection_gap_summary: {
    mode: "collection_gap_summary",
    outputType: "collection_gap_summary",
    status: "planned_grounding_required",
    modelEligible: false,
    groundingRequired: true,
  },
  chase_list_proposal: {
    mode: "chase_list_proposal",
    outputType: "chase_list_proposal",
    status: "planned_grounding_required",
    modelEligible: false,
    groundingRequired: true,
  },
};

export function resolveGrookaiAssistantCapability(mode: GrookaiAssistantMode) {
  return CAPABILITIES[mode];
}

export function getGrookaiAssistantCapabilities() {
  return Object.values(CAPABILITIES);
}
