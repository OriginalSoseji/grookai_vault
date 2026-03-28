"use server";

import { revalidatePath } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";
import { buildWarehouseStagingPayload } from "@/lib/founder/buildWarehouseStagingPayload";
import { getFounderAuthUser, isFounderUser } from "@/lib/founder/requireFounderAccess";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { getFounderWarehouseCandidateById } from "@/lib/warehouse/getFounderWarehouseCandidateById";

type FounderWarehouseOperation = "approve" | "reject" | "archive" | "stage";

type FounderWarehouseActionErrorCode =
  | "UNAUTHORIZED"
  | "CANDIDATE_ID_REQUIRED"
  | "CANDIDATE_NOT_FOUND"
  | "INVALID_ACTION"
  | "INVALID_STATE"
  | "ACTIVE_STAGING_EXISTS"
  | "INVALID_APPROVED_ACTION"
  | "MUTATION_FAILED";

export type FounderWarehouseActionResult =
  | {
      ok: true;
      submissionKey: number;
      action: FounderWarehouseOperation;
      candidateId: string;
      stagingId?: string | null;
      message: string;
    }
  | {
      ok: false;
      submissionKey: number;
      action: FounderWarehouseOperation | null;
      candidateId: string | null;
      errorCode: FounderWarehouseActionErrorCode;
      message: string;
    };

const APPROVAL_ALLOWED_STATES = new Set(["REVIEW_READY"]);
const REJECTION_ALLOWED_STATES = new Set(["REVIEW_READY", "APPROVED_BY_FOUNDER"]);
const ARCHIVE_ALLOWED_STATES = new Set([
  "REVIEW_READY",
  "APPROVED_BY_FOUNDER",
  "REJECTED",
  "CLASSIFIED",
]);
const STAGE_ALLOWED_STATES = new Set(["APPROVED_BY_FOUNDER"]);

function normalizeOptionalText(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function parseOperation(value: FormDataEntryValue | null): FounderWarehouseOperation | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  switch (normalized) {
    case "approve":
    case "reject":
    case "archive":
    case "stage":
      return normalized;
    default:
      return null;
  }
}

function mapMutationError(error: PostgrestError | Error | null | undefined) {
  const structuredError = error as { message?: string } | null | undefined;
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof structuredError?.message === "string"
        ? structuredError.message
        : "";
  const message = rawMessage.trim();

  switch (message) {
    case "illegal_candidate_state_transition":
      return "The candidate state changed underneath this action. Refresh and try again.";
    case "founder_approval_required":
      return "Founder approval fields are incomplete for this transition.";
    case "current_staging_id_required":
      return "Candidate staging linkage is incomplete.";
    case "invalid_current_staging_id":
      return "The linked staging record is invalid for this candidate.";
    case "Cannot modify SUCCEEDED staging row":
      return "Successful staging history is immutable.";
    case "duplicate key value violates unique constraint \"uq_staging_active\"":
      return "An active staging row already exists for this candidate.";
    case "invalid_approved_action_type":
      return "This candidate does not have a stageable approved action type.";
    default:
      return message || "Warehouse mutation failed.";
  }
}

function getActionLabel(action: FounderWarehouseOperation) {
  switch (action) {
    case "approve":
      return "approve";
    case "reject":
      return "reject";
    case "archive":
      return "archive";
    case "stage":
      return "stage";
    default:
      return action;
  }
}

async function appendWarehouseEvent(params: {
  candidateId: string;
  stagingId?: string | null;
  eventType: string;
  action: string;
  previousState: string | null;
  nextState: string | null;
  actorUserId: string;
  metadata?: Record<string, unknown>;
}) {
  const admin = createServerAdminClient();
  const { error } = await admin.from("canon_warehouse_candidate_events").insert({
    candidate_id: params.candidateId,
    staging_id: params.stagingId ?? null,
    event_type: params.eventType,
    action: params.action,
    previous_state: params.previousState,
    next_state: params.nextState,
    actor_user_id: params.actorUserId,
    actor_type: "FOUNDER",
    metadata: params.metadata ?? {},
    created_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(mapMutationError(error));
  }
}

function revalidateWarehouseFounderPaths(candidateId: string) {
  revalidatePath("/founder");
  revalidatePath("/founder/warehouse");
  revalidatePath(`/founder/warehouse/${candidateId}`);
  revalidatePath("/founder/staging");
}

export async function runFounderWarehouseAction(
  _previousState: FounderWarehouseActionResult | null,
  formData: FormData,
): Promise<FounderWarehouseActionResult> {
  const submissionKey = Date.now();
  const action = parseOperation(formData.get("operation"));
  const candidateId = normalizeOptionalText(formData.get("candidate_id"));
  const note = normalizeOptionalText(formData.get("note"));
  const founderUser = await getFounderAuthUser();

  if (!founderUser || !isFounderUser(founderUser)) {
    return {
      ok: false,
      submissionKey,
      action,
      candidateId,
      errorCode: "UNAUTHORIZED",
      message: "Founder access is required.",
    };
  }

  if (!candidateId) {
    return {
      ok: false,
      submissionKey,
      action,
      candidateId: null,
      errorCode: "CANDIDATE_ID_REQUIRED",
      message: "Candidate id is required.",
    };
  }

  if (!action) {
    return {
      ok: false,
      submissionKey,
      action: null,
      candidateId,
      errorCode: "INVALID_ACTION",
      message: "Unknown founder warehouse action.",
    };
  }

  const detail = await getFounderWarehouseCandidateById(candidateId);
  if (!detail.candidate) {
    return {
      ok: false,
      submissionKey,
      action,
      candidateId,
      errorCode: "CANDIDATE_NOT_FOUND",
      message: "Warehouse candidate could not be found.",
    };
  }

  const candidate = detail.candidate;
  const admin = createServerAdminClient();
  const actorUserId = founderUser.id;
  const now = new Date().toISOString();

  try {
    if (action === "approve") {
      if (!APPROVAL_ALLOWED_STATES.has(candidate.state)) {
        return {
          ok: false,
          submissionKey,
          action,
          candidateId,
          errorCode: "INVALID_STATE",
          message: `Approve is only allowed from REVIEW_READY. Current state is ${candidate.state}.`,
        };
      }

      const { data: approvedCandidate, error } = await admin
        .from("canon_warehouse_candidates")
        .update({
          state: "APPROVED_BY_FOUNDER",
          founder_approved_by_user_id: actorUserId,
          founder_approved_at: now,
          founder_approval_notes: note,
          current_review_hold_reason: null,
        })
        .eq("id", candidateId)
        .eq("state", "REVIEW_READY")
        .select("id")
        .maybeSingle();

      if (error) {
        throw error;
      }
      if (!approvedCandidate?.id) {
        throw new Error("illegal_candidate_state_transition");
      }

      await appendWarehouseEvent({
        candidateId,
        eventType: "FOUNDER_APPROVED",
        action: "APPROVE",
        previousState: "REVIEW_READY",
        nextState: "APPROVED_BY_FOUNDER",
        actorUserId,
        metadata: {
          founder_note: note,
        },
      });

      revalidateWarehouseFounderPaths(candidateId);
      return {
        ok: true,
        submissionKey,
        action,
        candidateId,
        message: "Candidate approved and moved to APPROVED_BY_FOUNDER.",
      };
    }

    if (action === "reject") {
      if (!REJECTION_ALLOWED_STATES.has(candidate.state)) {
        return {
          ok: false,
          submissionKey,
          action,
          candidateId,
          errorCode: "INVALID_STATE",
          message: `Reject is allowed only from REVIEW_READY or APPROVED_BY_FOUNDER. Current state is ${candidate.state}.`,
        };
      }

      const { data: rejectedCandidate, error } = await admin
        .from("canon_warehouse_candidates")
        .update({
          state: "REJECTED",
          rejected_by_user_id: actorUserId,
          rejected_at: now,
          rejection_notes: note,
          current_review_hold_reason: null,
        })
        .eq("id", candidateId)
        .eq("state", candidate.state)
        .select("id")
        .maybeSingle();

      if (error) {
        throw error;
      }
      if (!rejectedCandidate?.id) {
        throw new Error("illegal_candidate_state_transition");
      }

      await appendWarehouseEvent({
        candidateId,
        eventType: "FOUNDER_REJECTED",
        action: "REJECT",
        previousState: candidate.state,
        nextState: "REJECTED",
        actorUserId,
        metadata: {
          founder_note: note,
        },
      });

      revalidateWarehouseFounderPaths(candidateId);
      return {
        ok: true,
        submissionKey,
        action,
        candidateId,
        message: "Candidate rejected and moved to REJECTED.",
      };
    }

    if (action === "archive") {
      if (!ARCHIVE_ALLOWED_STATES.has(candidate.state)) {
        return {
          ok: false,
          submissionKey,
          action,
          candidateId,
          errorCode: "INVALID_STATE",
          message: `Archive is not allowed from ${candidate.state}.`,
        };
      }

      const { data: archivedCandidate, error } = await admin
        .from("canon_warehouse_candidates")
        .update({
          state: "ARCHIVED",
          archived_by_user_id: actorUserId,
          archived_at: now,
          archive_notes: note,
          current_review_hold_reason: null,
        })
        .eq("id", candidateId)
        .eq("state", candidate.state)
        .select("id")
        .maybeSingle();

      if (error) {
        throw error;
      }
      if (!archivedCandidate?.id) {
        throw new Error("illegal_candidate_state_transition");
      }

      await appendWarehouseEvent({
        candidateId,
        eventType: "FOUNDER_ARCHIVED",
        action: "ARCHIVE",
        previousState: candidate.state,
        nextState: "ARCHIVED",
        actorUserId,
        metadata: {
          founder_note: note,
        },
      });

      revalidateWarehouseFounderPaths(candidateId);
      return {
        ok: true,
        submissionKey,
        action,
        candidateId,
        message: "Candidate archived.",
      };
    }

    if (!STAGE_ALLOWED_STATES.has(candidate.state)) {
      return {
        ok: false,
        submissionKey,
        action,
        candidateId,
        errorCode: "INVALID_STATE",
        message: `Stage is only allowed from APPROVED_BY_FOUNDER. Current state is ${candidate.state}.`,
      };
    }

    const approvedActionType = candidate.proposed_action_type?.trim() ?? null;
    if (!approvedActionType || !["CREATE_CARD_PRINT", "CREATE_CARD_PRINTING", "ENRICH_CANON_IMAGE"].includes(approvedActionType)) {
      return {
        ok: false,
        submissionKey,
        action,
        candidateId,
        errorCode: "INVALID_APPROVED_ACTION",
        message: "This candidate does not have a stageable approved action type.",
      };
    }

    const { data: activeStagingRows, error: activeStagingError } = await admin
      .from("canon_warehouse_promotion_staging")
      .select("id,execution_status")
      .eq("candidate_id", candidateId)
      .in("execution_status", ["PENDING", "RUNNING"])
      .limit(1);

    if (activeStagingError) {
      throw activeStagingError;
    }

    if ((activeStagingRows ?? []).length > 0) {
      return {
        ok: false,
        submissionKey,
        action,
        candidateId,
        errorCode: "ACTIVE_STAGING_EXISTS",
        message: "An active staging row already exists for this candidate.",
      };
    }

    const frozenPayload = buildWarehouseStagingPayload(detail, now);

    const { data: stagingRow, error: stagingInsertError } = await admin
      .from("canon_warehouse_promotion_staging")
      .insert({
        candidate_id: candidateId,
        approved_action_type: approvedActionType,
        frozen_payload: frozenPayload,
        founder_approved_by_user_id: candidate.founder_approved_by_user_id,
        founder_approved_at: candidate.founder_approved_at,
        staged_by_user_id: actorUserId,
        staged_at: now,
        execution_status: "PENDING",
        execution_attempts: 0,
      })
      .select("id")
      .single();

    if (stagingInsertError || !stagingRow?.id) {
      throw stagingInsertError ?? new Error("staging_insert_failed");
    }

    const stagingId = stagingRow.id as string;

    try {
      const { data: stagedCandidate, error: candidateUpdateError } = await admin
        .from("canon_warehouse_candidates")
        .update({
          current_staging_id: stagingId,
          state: "STAGED_FOR_PROMOTION",
          current_review_hold_reason: null,
        })
        .eq("id", candidateId)
        .eq("state", "APPROVED_BY_FOUNDER")
        .select("id")
        .maybeSingle();

      if (candidateUpdateError) {
        throw candidateUpdateError;
      }
      if (!stagedCandidate?.id) {
        throw new Error("illegal_candidate_state_transition");
      }

      await appendWarehouseEvent({
        candidateId,
        stagingId,
        eventType: "FOUNDER_STAGED",
        action: "STAGE",
        previousState: "APPROVED_BY_FOUNDER",
        nextState: "STAGED_FOR_PROMOTION",
        actorUserId,
        metadata: {
          staging_id: stagingId,
          approved_action_type: approvedActionType,
        },
      });
    } catch (error) {
      await admin
        .from("canon_warehouse_promotion_staging")
        .update({
          execution_status: "FAILED",
          last_error: `staging_link_failed:${mapMutationError(error as Error)}`,
          last_attempted_at: now,
        })
        .eq("id", stagingId)
        .neq("execution_status", "SUCCEEDED");

      throw error;
    }

    revalidateWarehouseFounderPaths(candidateId);
    return {
      ok: true,
      submissionKey,
      action,
      candidateId,
      stagingId,
      message: "Candidate staged for promotion. No canon mutation was executed.",
    };
  } catch (error) {
    return {
      ok: false,
      submissionKey,
      action,
      candidateId,
      errorCode: action === "stage" ? "MUTATION_FAILED" : "MUTATION_FAILED",
      message: `${getActionLabel(action)} failed: ${mapMutationError(error as Error)}`,
    };
  }
}
