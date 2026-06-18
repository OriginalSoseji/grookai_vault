import type { SmartSearchIntent } from "@/lib/search/smartSearchIntent";
import type { VariantOriginPublicCopy } from "@/lib/cards/variantOriginPublicCopy";
import type {
  GrookaiAiOutputType,
  GrookaiAssistantMode,
} from "@/lib/ai/grookaiAiProductBoundaries";
import type { GrookaiAssistantAccessDecision } from "@/lib/ai/grookaiAssistantAccess";
import type { GrookaiAiRuntimeDecision } from "@/lib/ai/grookaiAiRuntimeGuard";
import type { GrookaiVariantExplanationViewModel } from "@/lib/ai/grookaiVariantExplanationBuilder";

export type GrookaiAssistantSafetyEnvelope = {
  db_writes_allowed: false;
  arbitrary_sql_allowed: false;
  canonical_truth_mutation_allowed: false;
  model_call_performed: boolean;
  search_model_default: false;
};

export type GrookaiAssistantSearchInterpretationResponse = {
  ok: true;
  boundary_version: "GROOKAI_AI_PRODUCT_BOUNDARIES_V1";
  product_lane: "assistant";
  mode: GrookaiAssistantMode;
  output_type: GrookaiAiOutputType;
  assistant_available: boolean;
  assistant_result: null;
  entitlement: GrookaiAssistantAccessDecision;
  runtime_guard: GrookaiAiRuntimeDecision;
  deterministic_interpretation: SmartSearchIntent;
  cache_key: string;
  safety: GrookaiAssistantSafetyEnvelope;
  notes: string[];
};

export type GrookaiAssistantVariantExplanationContextResponse = {
  ok: true;
  boundary_version: "GROOKAI_AI_PRODUCT_BOUNDARIES_V1";
  product_lane: "assistant";
  mode: "variant_explanation";
  output_type: "grounded_explanation";
  assistant_available: boolean;
  entitlement: GrookaiAssistantAccessDecision;
  runtime_guard: GrookaiAiRuntimeDecision;
  context_status: "ready" | "not_enough_context";
  card: {
    card_print_id: string;
    gv_id: string;
    name: string;
    set_name: string | null;
    set_code: string | null;
    printed_number: string | null;
    printed_total: number | null;
    rarity: string | null;
    release_year: number | null;
    artist: string | null;
    variant_key: string | null;
    variant_label: string | null;
    printed_identity_modifier: string | null;
    printed_identity_modifier_label: string | null;
    active_identity: unknown;
  };
  selected_printing: {
    card_printing_id: string;
    printing_gv_id: string | null;
    finish_key: string | null;
    finish_name: string | null;
    display_image_kind: string | null;
    image_source: string | null;
    image_note: string | null;
  } | null;
  image_truth: {
    display_image_kind: string | null;
    image_status: string | null;
    image_note: string | null;
    image_source: string | null;
    presentation_note: string | null;
  };
  ownership: {
    checked: boolean;
    owned_count: number | null;
    error: string | null;
  };
  variant_origin: VariantOriginPublicCopy | null;
  explanation: GrookaiVariantExplanationViewModel;
  limitations: string[];
  safety: GrookaiAssistantSafetyEnvelope;
};
