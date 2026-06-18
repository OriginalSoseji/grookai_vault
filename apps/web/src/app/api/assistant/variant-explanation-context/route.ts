import { NextRequest, NextResponse } from "next/server";

import { resolveGrookaiAssistantAccess } from "@/lib/ai/grookaiAssistantAccess";
import { resolveGrookaiAssistantCapability } from "@/lib/ai/grookaiAssistantCapabilities";
import { resolveGrookaiAiRuntimeGuard } from "@/lib/ai/grookaiAiRuntimeGuard";
import { buildGrookaiVariantExplanation } from "@/lib/ai/grookaiVariantExplanationBuilder";
import {
  GROOKAI_AI_BOUNDARY_VERSION,
  GROOKAI_AI_SAFETY_FLAGS,
} from "@/lib/ai/grookaiAiProductBoundaries";
import type { GrookaiAssistantVariantExplanationContextResponse } from "@/lib/ai/grookaiAssistantSchemas";
import {
  getPrintedIdentityModifierDisplayLabel,
  getVariantDisplayLabel,
} from "@/lib/cards/displayDiscriminator";
import { getVariantOriginPublicCopy } from "@/lib/cards/variantOriginPublicCopy";
import { resolveCardImagePresentation } from "@/lib/cards/resolveCardImagePresentation";
import { getPublicCardByGvId } from "@/lib/getPublicCardByGvId";
import { createServerComponentClient } from "@/lib/supabase/server";
import { getOwnedCountsByCardPrintIds } from "@/lib/vault/getOwnedCountsByCardPrintIds";

export const runtime = "nodejs";

type VariantExplanationPayload = {
  gv_id?: unknown;
  printing_gv_id?: unknown;
  finish_key?: unknown;
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function getOwnedCountForCardPrint(userId: string | undefined, cardPrintId: string) {
  if (!userId) {
    return {
      checked: false,
      owned_count: null,
      error: null,
    };
  }

  try {
    const counts = await getOwnedCountsByCardPrintIds(userId, [cardPrintId]);
    return {
      checked: true,
      owned_count: counts.get(cardPrintId) ?? 0,
      error: null,
    };
  } catch (error) {
    return {
      checked: false,
      owned_count: null,
      error: error instanceof Error ? error.message : "ownership_lookup_failed",
    };
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as VariantExplanationPayload | null;
  const gvId = cleanText(body?.gv_id);
  const printingGvId = cleanText(body?.printing_gv_id);
  const finishKey = cleanText(body?.finish_key);

  if (!gvId) {
    return NextResponse.json(
      {
        ok: false,
        error: "gv_id_required",
        message: "A canonical Grookai card ID is required.",
      },
      { status: 400 },
    );
  }

  const supabase = createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const mode = "variant_explanation";
  const capability = resolveGrookaiAssistantCapability(mode);
  const entitlement = resolveGrookaiAssistantAccess({ user, mode });
  const runtimeGuard = resolveGrookaiAiRuntimeGuard({
    productLane: "assistant",
    outputType: "grounded_explanation",
    entitlement,
    capability,
  });

  const card = await getPublicCardByGvId(gvId);
  if (!card) {
    return NextResponse.json(
      {
        ok: false,
        error: "card_not_found",
        message: "No canonical card was found for that Grookai ID.",
      },
      { status: 404 },
    );
  }

  const selectedPrinting =
    card.printings?.find((printing) => printingGvId && printing.printing_gv_id === printingGvId) ??
    card.printings?.find((printing) => finishKey && printing.finish_key === finishKey) ??
    null;
  const variantOrigin = getVariantOriginPublicCopy({
    cardPrintId: card.id,
    gvId: card.gv_id,
  });
  const imagePresentation = resolveCardImagePresentation(card);
  const ownership = await getOwnedCountForCardPrint(user?.id, card.id);
  const limitations = [
    variantOrigin ? "" : "No public special-variant origin copy is available for this row yet.",
    selectedPrinting ? "" : "No exact child printing was selected for this context.",
    runtimeGuard.modelCallAllowed ? "" : `Model summary is blocked: ${runtimeGuard.reason}.`,
  ].filter(Boolean);

  const responseWithoutExplanation = {
    ok: true,
    boundary_version: GROOKAI_AI_BOUNDARY_VERSION,
    product_lane: "assistant",
    mode,
    output_type: "grounded_explanation",
    assistant_available: entitlement.allowed,
    entitlement,
    runtime_guard: runtimeGuard,
    context_status: variantOrigin ? "ready" : "not_enough_context",
    card: {
      card_print_id: card.id,
      gv_id: card.gv_id,
      name: card.name,
      set_name: card.set_name ?? null,
      set_code: card.set_code ?? null,
      printed_number: card.active_identity?.printed_number ?? card.number ?? null,
      printed_total: card.printed_total ?? null,
      rarity: card.rarity ?? null,
      release_year: card.release_year ?? null,
      artist: card.artist ?? null,
      variant_key: card.variant_key ?? null,
      variant_label: getVariantDisplayLabel(card.variant_key),
      printed_identity_modifier: card.printed_identity_modifier ?? null,
      printed_identity_modifier_label: getPrintedIdentityModifierDisplayLabel(card.printed_identity_modifier),
      active_identity: card.active_identity ?? null,
    },
    selected_printing: selectedPrinting
      ? {
          card_printing_id: selectedPrinting.id,
          printing_gv_id: selectedPrinting.printing_gv_id ?? null,
          finish_key: selectedPrinting.finish_key ?? null,
          finish_name: selectedPrinting.finish_name ?? null,
          display_image_kind: selectedPrinting.display_image_kind ?? null,
          image_source: selectedPrinting.image_source ?? null,
          image_note: selectedPrinting.image_note ?? null,
        }
      : null,
    image_truth: {
      display_image_kind: card.display_image_kind ?? null,
      image_status: card.image_status ?? null,
      image_note: card.image_note ?? null,
      image_source: card.image_source ?? null,
      presentation_note: imagePresentation.detailNote,
    },
    ownership,
    variant_origin: variantOrigin,
    limitations,
    safety: {
      db_writes_allowed: GROOKAI_AI_SAFETY_FLAGS.dbWritesAllowed,
      arbitrary_sql_allowed: GROOKAI_AI_SAFETY_FLAGS.arbitrarySqlAllowed,
      canonical_truth_mutation_allowed: GROOKAI_AI_SAFETY_FLAGS.canonicalTruthMutationAllowed,
      model_call_performed: false,
      search_model_default: GROOKAI_AI_SAFETY_FLAGS.searchUsesModelByDefault,
    },
  } satisfies Omit<GrookaiAssistantVariantExplanationContextResponse, "explanation">;

  const response: GrookaiAssistantVariantExplanationContextResponse = {
    ...responseWithoutExplanation,
    explanation: buildGrookaiVariantExplanation(responseWithoutExplanation),
  };

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}
