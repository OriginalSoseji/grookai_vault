"use server";

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { revalidatePath } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";
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
  | "STAGE_BLOCKED"
  | "STAGE_UNAVAILABLE"
  | "MUTATION_FAILED";

type PromotionStageCandidateResult = {
  candidateId: string;
  status: string;
  reason?: string;
  staging_id?: string | null;
  execution_status?: string | null;
  missing_requirements?: string[];
};

type PromotionStageRunSummary = {
  mode: string;
  results: PromotionStageCandidateResult[];
};

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

function resolveRepoRoot() {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd(), "../.."),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "backend", "warehouse", "promotion_stage_worker_v1.mjs"))) {
      return candidate;
    }
  }

  throw new Error("Unable to resolve repository root for promotion stage worker.");
}

async function loadPromotionStageRunner() {
  const repoRoot = resolveRepoRoot();
  const envLocalPath = path.join(repoRoot, ".env.local");
  const envPath = path.join(repoRoot, ".env");

  if (!process.env.DOTENV_CONFIG_PATH) {
    process.env.DOTENV_CONFIG_PATH = fs.existsSync(envLocalPath) ? envLocalPath : envPath;
  }

  const moduleUrl = pathToFileURL(
    path.join(repoRoot, "backend", "warehouse", "promotion_stage_worker_v1.mjs"),
  ).href;
  const stageModule = (await import(/* webpackIgnore: true */ moduleUrl)) as {
    runPromotionStageWorkerV1?: (input: {
      candidateId: string;
      dryRun?: boolean;
      apply?: boolean;
      emitLogs?: boolean;
    }) => Promise<PromotionStageRunSummary>;
  };

  if (typeof stageModule.runPromotionStageWorkerV1 !== "function") {
    throw new Error("Promotion stage worker reusable entrypoint is unavailable.");
  }

  return stageModule.runPromotionStageWorkerV1;
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

function buildStageBlockedMessage(result: PromotionStageCandidateResult) {
  const missing = Array.isArray(result.missing_requirements)
    ? result.missing_requirements.filter((value) => typeof value === "string" && value.trim().length > 0)
    : [];

  if (missing.length === 0) {
    return result.reason
      ? `Staging blocked: ${result.reason}.`
      : "Staging blocked by the governed promotion worker.";
  }

  return `${result.reason ? `Staging blocked: ${result.reason}. ` : "Staging blocked. "}Missing: ${missing.join(", ")}.`;
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

    try {
      const runPromotionStageWorkerV1 = await loadPromotionStageRunner();
      const stageRun = await runPromotionStageWorkerV1({
        candidateId,
        apply: true,
        emitLogs: false,
      });
      const result = stageRun.results[0];

      if (!result) {
        return {
          ok: false,
          submissionKey,
          action,
          candidateId,
          errorCode: "STAGE_UNAVAILABLE",
          message: "Stage worker returned no result for the requested candidate.",
        };
      }

      if (result.status === "applied") {
        revalidateWarehouseFounderPaths(candidateId);
        return {
          ok: true,
          submissionKey,
          action,
          candidateId,
          stagingId: result.staging_id ?? null,
          message: "Candidate staged for promotion. Frozen payload created; no canon mutation was executed.",
        };
      }

      if (result.status === "skipped") {
        const refreshableReasons = new Set([
          "identical_staging_exists",
          "already_staged_for_promotion",
        ]);
        if (result.reason && refreshableReasons.has(result.reason)) {
          revalidateWarehouseFounderPaths(candidateId);
          return {
            ok: true,
            submissionKey,
            action,
            candidateId,
            stagingId: result.staging_id ?? null,
            message:
              result.reason === "already_staged_for_promotion"
                ? "Candidate is already linked to a staging row. No duplicate stage was created."
                : "An identical frozen staging payload already exists. No duplicate stage was created.",
          };
        }

        return {
          ok: false,
          submissionKey,
          action,
          candidateId,
          errorCode: "STAGE_BLOCKED",
          message: result.reason
            ? `Stage did not run: ${result.reason}.`
            : "Stage did not run for the requested candidate.",
        };
      }

      if (result.status === "blocked") {
        return {
          ok: false,
          submissionKey,
          action,
          candidateId,
          errorCode: "STAGE_BLOCKED",
          message: buildStageBlockedMessage(result),
        };
      }

      return {
        ok: false,
        submissionKey,
        action,
        candidateId,
        errorCode: "MUTATION_FAILED",
        message: result.reason
          ? `stage failed: ${result.reason}`
          : "stage failed: promotion stage worker did not complete successfully.",
      };
    } catch (error) {
      return {
        ok: false,
        submissionKey,
        action,
        candidateId,
        errorCode: "STAGE_UNAVAILABLE",
        message: `stage failed: ${mapMutationError(error as Error)}`,
      };
    }
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
