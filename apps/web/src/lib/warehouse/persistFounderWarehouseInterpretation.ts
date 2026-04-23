import "server-only";

import type {
  WarehouseInterpreterCandidateSummary,
  WarehouseInterpreterPackage,
} from "@/lib/warehouse/buildWarehouseInterpreterV1";
import { createServerAdminClient } from "@/lib/supabase/admin";

type JsonRecord = Record<string, unknown>;

type FounderWarehouseInterpreterCandidate = {
  id: string;
  state: string;
  current_staging_id: string | null;
  interpreter_decision: string | null;
  interpreter_reason_code: string | null;
  interpreter_explanation: string | null;
  interpreter_resolved_finish_key: string | null;
  needs_promotion_review: boolean | null;
  proposed_action_type: string | null;
  current_review_hold_reason: string | null;
};

export type FounderWarehouseInterpretationPersistenceInput = {
  candidate: FounderWarehouseInterpreterCandidate;
  summary: WarehouseInterpreterCandidateSummary;
  interpreterPackage: WarehouseInterpreterPackage;
  latestInterpreterPackage: JsonRecord | null;
};

function normalizeTextOrNull(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function shouldPersistInterpreterSummary(candidate: FounderWarehouseInterpreterCandidate) {
  return new Set(["RAW", "NORMALIZED", "CLASSIFIED", "REVIEW_READY", "APPROVED_BY_FOUNDER"]).has(
    candidate.state,
  );
}

function sameJson(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isSameCandidateSummary(
  candidate: FounderWarehouseInterpreterCandidate,
  summary: WarehouseInterpreterCandidateSummary,
) {
  return (
    candidate.interpreter_decision === summary.interpreter_decision &&
    candidate.interpreter_reason_code === summary.interpreter_reason_code &&
    candidate.interpreter_explanation === summary.interpreter_explanation &&
    candidate.interpreter_resolved_finish_key === summary.interpreter_resolved_finish_key &&
    Boolean(candidate.needs_promotion_review) === summary.needs_promotion_review &&
    candidate.proposed_action_type === summary.proposed_action_type &&
    candidate.current_review_hold_reason === summary.current_review_hold_reason
  );
}

/**
 * FOUNDER AUTHORITY WRITE
 * This function performs explicit founder-controlled mutation.
 * Not part of automatic runtime execution.
 */
export async function persistFounderWarehouseInterpretation(params: {
  candidateId: string;
  interpretation: FounderWarehouseInterpretationPersistenceInput;
  actorId: string;
  admin?: ReturnType<typeof createServerAdminClient>;
}) {
  const candidateId = normalizeTextOrNull(params.candidateId);
  const actorId = normalizeTextOrNull(params.actorId);

  if (!candidateId) {
    throw new Error("persistFounderWarehouseInterpretation requires candidateId.");
  }
  if (!actorId) {
    throw new Error("persistFounderWarehouseInterpretation requires actorId.");
  }

  const candidate = params.interpretation.candidate;
  if (candidate.id !== candidateId) {
    throw new Error(
      `persistFounderWarehouseInterpretation candidate mismatch: ${candidate.id} !== ${candidateId}`,
    );
  }

  if (!shouldPersistInterpreterSummary(candidate)) {
    return { updatedCandidate: false, insertedEvent: false };
  }

  const summaryChanged = !isSameCandidateSummary(candidate, params.interpretation.summary);
  const packageChanged = !sameJson(
    params.interpretation.latestInterpreterPackage,
    params.interpretation.interpreterPackage,
  );

  if (!summaryChanged && !packageChanged) {
    return { updatedCandidate: false, insertedEvent: false };
  }

  const admin = params.admin ?? createServerAdminClient();

  try {
    if (summaryChanged) {
      const { error } = await admin
        .from("canon_warehouse_candidates")
        .update({
          interpreter_decision: params.interpretation.summary.interpreter_decision,
          interpreter_reason_code: params.interpretation.summary.interpreter_reason_code,
          interpreter_explanation: params.interpretation.summary.interpreter_explanation,
          interpreter_resolved_finish_key: params.interpretation.summary.interpreter_resolved_finish_key,
          needs_promotion_review: params.interpretation.summary.needs_promotion_review,
          proposed_action_type: params.interpretation.summary.proposed_action_type,
          current_review_hold_reason: params.interpretation.summary.current_review_hold_reason,
        })
        .eq("id", candidate.id);

      if (error) {
        throw new Error(`Interpreter summary update failed: ${error.message}`);
      }
    }

    if (packageChanged) {
      const { error } = await admin.from("canon_warehouse_candidate_events").insert({
        candidate_id: candidate.id,
        staging_id: candidate.current_staging_id,
        event_type: "INTERPRETER_V1_REFRESHED",
        action: "INTERPRET",
        previous_state: candidate.state,
        next_state: candidate.state,
        actor_user_id: null,
        actor_type: "SYSTEM",
        metadata: {
          interpreter_package: params.interpretation.interpreterPackage,
          candidate_summary: params.interpretation.summary,
        },
        created_at: new Date().toISOString(),
      });

      if (error) {
        throw new Error(`Interpreter event append failed: ${error.message}`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_interpreter_persist_error";
    console.error(`[warehouse-interpreter-v1] ${candidate.id} requested_by=${actorId}: ${message}`);
  }

  return {
    updatedCandidate: summaryChanged,
    insertedEvent: packageChanged,
  };
}
