import "server-only";

import { normalizeRequestedPublicGvId } from "@/lib/gvIdAlias";
import {
  getPublicProvisionalCardById,
  isPublicProvisionalCandidateId,
} from "@/lib/provisional/getPublicProvisionalCards";
import { createPublicServerClient } from "@/lib/supabase/publicServer";
import type { PublicProvisionalCard } from "@/lib/provisional/publicProvisionalTypes";

export type ProvisionalPromotionContinuity =
  | {
      kind: "provisional";
      candidate: PublicProvisionalCard;
    }
  | {
      kind: "redirect";
      gv_id: string;
    }
  | {
      kind: "not_found";
    };

type PromotionLinkRow = {
  promoted_card_print_id: string | null;
};

type CanonicalDestinationRow = {
  id: string | null;
  gv_id: string | null;
};

function createPublicSupabase() {
  return createPublicServerClient(120);
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function normalizeCanonicalGvId(value: unknown) {
  const normalized = normalizeRequestedPublicGvId(normalizeText(value));
  return normalized.startsWith("GV-") ? normalized : "";
}

export function resolveProvisionalPromotionContinuity(input: {
  candidate?: PublicProvisionalCard | null;
  promoted_card_print_id?: unknown;
  canonical_gv_id?: unknown;
}): ProvisionalPromotionContinuity {
  if (input.candidate) {
    return {
      kind: "provisional",
      candidate: input.candidate,
    };
  }

  const promotedCardPrintId = normalizeText(input.promoted_card_print_id);
  const canonicalGvId = normalizeCanonicalGvId(input.canonical_gv_id);

  if (promotedCardPrintId && canonicalGvId) {
    return {
      kind: "redirect",
      gv_id: canonicalGvId,
    };
  }

  return { kind: "not_found" };
}

export function buildProvisionalContinuityRedirectHref(outcome: ProvisionalPromotionContinuity) {
  return outcome.kind === "redirect" ? `/card/${encodeURIComponent(outcome.gv_id)}` : null;
}

// LOCK: Promotion continuity must use explicit promotion linkage only.
// LOCK: Never infer canonical identity from provisional data.
export async function getProvisionalPromotionContinuity(
  candidateId: string,
): Promise<ProvisionalPromotionContinuity> {
  const normalizedCandidateId = normalizeText(candidateId);
  if (!normalizedCandidateId || !isPublicProvisionalCandidateId(normalizedCandidateId)) {
    return { kind: "not_found" };
  }

  const candidate = await getPublicProvisionalCardById(normalizedCandidateId);
  if (candidate) {
    return resolveProvisionalPromotionContinuity({ candidate });
  }

  const supabase = createPublicSupabase();
  const { data: promotionData, error: promotionError } = await supabase
    .from("canon_warehouse_candidates")
    .select("promoted_card_print_id")
    .eq("id", normalizedCandidateId)
    .maybeSingle();

  if (promotionError) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[provisional-continuity] promotion linkage lookup failed closed", {
        message: promotionError.message,
      });
    }

    return { kind: "not_found" };
  }

  const promotedCardPrintId = normalizeText((promotionData as PromotionLinkRow | null)?.promoted_card_print_id);
  if (!promotedCardPrintId) {
    return { kind: "not_found" };
  }

  const { data: canonicalData, error: canonicalError } = await supabase
    .from("card_prints")
    .select("id,gv_id")
    .eq("id", promotedCardPrintId)
    .maybeSingle();

  if (canonicalError) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[provisional-continuity] canonical destination lookup failed closed", {
        message: canonicalError.message,
      });
    }

    return { kind: "not_found" };
  }

  const canonicalRow = canonicalData as CanonicalDestinationRow | null;
  return resolveProvisionalPromotionContinuity({
    promoted_card_print_id: promotedCardPrintId,
    canonical_gv_id: canonicalRow?.gv_id,
  });
}

export const provisionalPromotionContinuityTestInternals = {
  normalizeCanonicalGvId,
};
