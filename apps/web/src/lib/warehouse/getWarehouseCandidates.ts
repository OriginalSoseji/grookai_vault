import "server-only";

import { createServerAdminClient } from "@/lib/supabase/admin";

export const WAREHOUSE_QUEUE_STATES = [
  "RAW",
  "NORMALIZED",
  "CLASSIFIED",
  "REVIEW_READY",
  "APPROVED_BY_FOUNDER",
  "STAGED_FOR_PROMOTION",
  "REJECTED",
  "ARCHIVED",
] as const;

export const WAREHOUSE_SUBMISSION_INTENTS = [
  "MISSING_CARD",
  "MISSING_IMAGE",
] as const;

export type WarehouseQueueState = (typeof WAREHOUSE_QUEUE_STATES)[number];
export type WarehouseSubmissionIntent = (typeof WAREHOUSE_SUBMISSION_INTENTS)[number];
export type WarehouseQueueStateFilter = WarehouseQueueState | "all";
export type WarehouseSubmissionIntentFilter = WarehouseSubmissionIntent | "all";

export type WarehouseCandidateQueueRow = {
  id: string;
  state: string;
  submission_intent: string;
  notes: string;
  notes_preview: string;
  proposed_action_type: string | null;
  interpreter_decision: string | null;
  interpreter_reason_code: string | null;
  needs_promotion_review: boolean;
  current_review_hold_reason: string | null;
  submitted_by_user_id: string;
  created_at: string;
  updated_at: string;
};

type WarehouseCandidateSummaryRow = {
  id: string;
  state: string;
  submission_intent: string;
  notes: string;
  proposed_action_type: string | null;
  interpreter_decision: string | null;
  interpreter_reason_code: string | null;
  needs_promotion_review: boolean | null;
  current_review_hold_reason: string | null;
  submitted_by_user_id: string;
  created_at: string;
  updated_at: string;
};

export type WarehouseCandidatesListResult = {
  rows: WarehouseCandidateQueueRow[];
  stateFilter: WarehouseQueueStateFilter;
  submissionIntentFilter: WarehouseSubmissionIntentFilter;
};

function isQueueState(value: string): value is WarehouseQueueState {
  return WAREHOUSE_QUEUE_STATES.includes(value as WarehouseQueueState);
}

function isSubmissionIntent(value: string): value is WarehouseSubmissionIntent {
  return WAREHOUSE_SUBMISSION_INTENTS.includes(value as WarehouseSubmissionIntent);
}

export function normalizeWarehouseQueueStateFilter(value?: string | null): WarehouseQueueStateFilter {
  const normalized = (value ?? "").trim().toUpperCase();
  if (!normalized || normalized === "ALL") {
    return "all";
  }
  return isQueueState(normalized) ? normalized : "all";
}

export function normalizeWarehouseSubmissionIntentFilter(value?: string | null): WarehouseSubmissionIntentFilter {
  const normalized = (value ?? "").trim().toUpperCase();
  if (!normalized || normalized === "ALL") {
    return "all";
  }
  return isSubmissionIntent(normalized) ? normalized : "all";
}

function buildNotesPreview(notes: string) {
  const normalized = notes.trim().replace(/\s+/g, " ");
  if (normalized.length <= 160) {
    return normalized;
  }
  return `${normalized.slice(0, 157)}...`;
}

export async function getWarehouseCandidates(input?: {
  state?: string | null;
  submissionIntent?: string | null;
  limit?: number;
}): Promise<WarehouseCandidatesListResult> {
  const admin = createServerAdminClient();
  const stateFilter = normalizeWarehouseQueueStateFilter(input?.state);
  const submissionIntentFilter = normalizeWarehouseSubmissionIntentFilter(input?.submissionIntent);
  const limit = typeof input?.limit === "number" && Number.isFinite(input.limit) && input.limit > 0
    ? Math.min(Math.trunc(input.limit), 200)
    : 100;

  let query = admin
    .from("canon_warehouse_candidates")
    .select(
      "id,state,submission_intent,notes,proposed_action_type,interpreter_decision,interpreter_reason_code,needs_promotion_review,current_review_hold_reason,submitted_by_user_id,created_at,updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (stateFilter === "all") {
    query = query.in("state", [...WAREHOUSE_QUEUE_STATES]);
  } else {
    query = query.eq("state", stateFilter);
  }

  if (submissionIntentFilter !== "all") {
    query = query.eq("submission_intent", submissionIntentFilter);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Warehouse queue query failed: ${error.message}`);
  }

  const rows = ((data ?? []) as WarehouseCandidateSummaryRow[])
    .filter((row) => Boolean(row.id && row.state && row.submission_intent && row.notes && row.submitted_by_user_id))
    .map((row) => ({
      id: row.id,
      state: row.state,
      submission_intent: row.submission_intent,
      notes: row.notes,
      notes_preview: buildNotesPreview(row.notes),
      proposed_action_type: row.proposed_action_type,
      interpreter_decision: row.interpreter_decision,
      interpreter_reason_code: row.interpreter_reason_code,
      needs_promotion_review: row.needs_promotion_review === true,
      current_review_hold_reason: row.current_review_hold_reason,
      submitted_by_user_id: row.submitted_by_user_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

  return {
    rows,
    stateFilter,
    submissionIntentFilter,
  };
}
