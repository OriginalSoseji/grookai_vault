import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { resolveGrookaiAssistantAccess } from "@/lib/ai/grookaiAssistantAccess";
import { resolveGrookaiAssistantCapability } from "@/lib/ai/grookaiAssistantCapabilities";
import { resolveGrookaiAiRuntimeGuard } from "@/lib/ai/grookaiAiRuntimeGuard";
import {
  GROOKAI_AI_BOUNDARY_VERSION,
  GROOKAI_AI_SAFETY_FLAGS,
  normalizeAssistantPrompt,
  type GrookaiAssistantMode,
} from "@/lib/ai/grookaiAiProductBoundaries";
import type { GrookaiAssistantSearchInterpretationResponse } from "@/lib/ai/grookaiAssistantSchemas";
import { resolveServerUserEntitlement } from "@/lib/entitlements/resolveServerUserEntitlement";
import { buildSmartSearchIntent } from "@/lib/search/smartSearchIntent";
import { createServerComponentClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type AssistantSearchInterpretationPayload = {
  prompt?: unknown;
  mode?: unknown;
};

function isAssistantMode(value: unknown): value is GrookaiAssistantMode {
  return (
    value === "search_interpretation" ||
    value === "variant_explanation" ||
    value === "collection_gap_summary" ||
    value === "chase_list_proposal"
  );
}

function createCacheKey(input: { prompt: string; tier: string; mode: GrookaiAssistantMode }) {
  return createHash("sha256")
    .update(`${input.mode}\n${input.tier}\n${input.prompt}`)
    .digest("hex");
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as AssistantSearchInterpretationPayload | null;
  const prompt = normalizeAssistantPrompt(typeof body?.prompt === "string" ? body.prompt : "");
  const mode = isAssistantMode(body?.mode) ? body.mode : "search_interpretation";

  if (prompt.length < 2) {
    return NextResponse.json(
      {
        ok: false,
        error: "prompt_required",
        message: "Enter a collector question or search phrase.",
      },
      { status: 400 },
    );
  }

  const supabase = createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userEntitlement = await resolveServerUserEntitlement(user);
  const entitlement = resolveGrookaiAssistantAccess({ user, mode, entitlement: userEntitlement });
  const deterministicInterpretation = buildSmartSearchIntent(prompt);
  const capability = resolveGrookaiAssistantCapability(mode);
  const runtimeGuard = resolveGrookaiAiRuntimeGuard({
    productLane: "assistant",
    outputType: capability.outputType,
    entitlement,
    capability,
  });

  const response: GrookaiAssistantSearchInterpretationResponse = {
    ok: true,
    boundary_version: GROOKAI_AI_BOUNDARY_VERSION,
    product_lane: "assistant",
    mode,
    output_type: capability.outputType,
    assistant_available: entitlement.allowed,
    assistant_result: null,
    entitlement,
    runtime_guard: runtimeGuard,
    deterministic_interpretation: deterministicInterpretation,
    cache_key: createCacheKey({ prompt, tier: entitlement.tier, mode }),
    safety: {
      db_writes_allowed: GROOKAI_AI_SAFETY_FLAGS.dbWritesAllowed,
      arbitrary_sql_allowed: GROOKAI_AI_SAFETY_FLAGS.arbitrarySqlAllowed,
      canonical_truth_mutation_allowed: GROOKAI_AI_SAFETY_FLAGS.canonicalTruthMutationAllowed,
      model_call_performed: false,
      search_model_default: GROOKAI_AI_SAFETY_FLAGS.searchUsesModelByDefault,
    },
    notes: [
      "Grookai Search remains deterministic and free.",
      runtimeGuard.modelCallAllowed
        ? "Runtime gates allow a future model call, but this endpoint still performed no model call."
        : `No AI model call was performed: ${runtimeGuard.reason}.`,
      capability.groundingRequired
        ? "This Assistant mode needs grounded Grookai data before implementation."
        : "This Assistant mode is implemented as a no-model deterministic preview.",
      "Assistant reasoning is gated behind entitlement and runtime enablement.",
    ],
  };

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}
