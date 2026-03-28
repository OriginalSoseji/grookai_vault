import "server-only";

import { createServerAdminClient } from "@/lib/supabase/admin";

type JsonRecord = Record<string, unknown>;

export const WAREHOUSE_STAGING_STATUSES = [
  "PENDING",
  "RUNNING",
  "FAILED",
  "SUCCEEDED",
] as const;

export type WarehouseStagingStatus = (typeof WAREHOUSE_STAGING_STATUSES)[number];
export type WarehouseStagingStatusFilter = WarehouseStagingStatus | "all";

type WarehouseStagingRow = {
  id: string;
  candidate_id: string;
  approved_action_type: string;
  frozen_payload: JsonRecord | null;
  founder_approved_at: string | null;
  staged_at: string;
  execution_status: string;
  execution_attempts: number | null;
  last_error: string | null;
  last_attempted_at: string | null;
  executed_at: string | null;
};

type WarehouseCandidateRow = {
  id: string;
  notes: string;
  submission_intent: string;
  state: string;
  promotion_result_type: string | null;
  promoted_card_print_id: string | null;
  promoted_card_printing_id: string | null;
  promoted_image_target_type: string | null;
  promoted_image_target_id: string | null;
};

export type FounderStagingQueueRow = WarehouseStagingRow & {
  candidate_notes_preview: string;
  submission_intent: string | null;
  candidate_state: string | null;
  promotion_result_type: string | null;
  promoted_card_print_id: string | null;
  promoted_card_printing_id: string | null;
  promoted_image_target_type: string | null;
  promoted_image_target_id: string | null;
};

export type FounderStagingQueueResult = {
  rows: FounderStagingQueueRow[];
  statusFilter: WarehouseStagingStatusFilter;
};

function isStagingStatus(value: string): value is WarehouseStagingStatus {
  return WAREHOUSE_STAGING_STATUSES.includes(value as WarehouseStagingStatus);
}

function normalizeStatusFilter(value?: string | null): WarehouseStagingStatusFilter {
  const normalized = (value ?? "").trim().toUpperCase();
  if (!normalized || normalized === "ALL") {
    return "all";
  }
  return isStagingStatus(normalized) ? normalized : "all";
}

function buildNotesPreview(notes: string | null | undefined) {
  const normalized = (notes ?? "").trim().replace(/\s+/g, " ");
  if (!normalized) {
    return "—";
  }
  if (normalized.length <= 120) {
    return normalized;
  }
  return `${normalized.slice(0, 117)}...`;
}

export async function getFounderStagingQueue(input?: {
  status?: string | null;
  limit?: number;
}): Promise<FounderStagingQueueResult> {
  const admin = createServerAdminClient();
  const statusFilter = normalizeStatusFilter(input?.status);
  const limit =
    typeof input?.limit === "number" && Number.isFinite(input.limit) && input.limit > 0
      ? Math.min(Math.trunc(input.limit), 200)
      : 100;

  let query = admin
    .from("canon_warehouse_promotion_staging")
    .select(
      "id,candidate_id,approved_action_type,frozen_payload,founder_approved_at,staged_at,execution_status,execution_attempts,last_error,last_attempted_at,executed_at",
    )
    .order("staged_at", { ascending: false })
    .limit(limit);

  if (statusFilter !== "all") {
    query = query.eq("execution_status", statusFilter);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Founder staging queue query failed: ${error.message}`);
  }

  const stagingRows = ((data ?? []) as WarehouseStagingRow[]) ?? [];
  const candidateIds = Array.from(new Set(stagingRows.map((row) => row.candidate_id).filter(Boolean)));

  const { data: candidateData, error: candidateError } = candidateIds.length
    ? await admin
        .from("canon_warehouse_candidates")
        .select("id,notes,submission_intent,state,promotion_result_type,promoted_card_print_id,promoted_card_printing_id,promoted_image_target_type,promoted_image_target_id")
        .in("id", candidateIds)
    : { data: [], error: null };

  if (candidateError) {
    throw new Error(`Founder staging candidate join failed: ${candidateError.message}`);
  }

  const candidateById = new Map(
    (((candidateData ?? []) as WarehouseCandidateRow[]) ?? []).map((row) => [row.id, row]),
  );

  return {
    rows: stagingRows.map((row) => {
      const candidate = candidateById.get(row.candidate_id) ?? null;
      return {
        ...row,
        execution_attempts: row.execution_attempts ?? 0,
        candidate_notes_preview: buildNotesPreview(candidate?.notes),
        submission_intent: candidate?.submission_intent ?? null,
        candidate_state: candidate?.state ?? null,
        promotion_result_type: candidate?.promotion_result_type ?? null,
        promoted_card_print_id: candidate?.promoted_card_print_id ?? null,
        promoted_card_printing_id: candidate?.promoted_card_printing_id ?? null,
        promoted_image_target_type: candidate?.promoted_image_target_type ?? null,
        promoted_image_target_id: candidate?.promoted_image_target_id ?? null,
      };
    }),
    statusFilter,
  };
}
