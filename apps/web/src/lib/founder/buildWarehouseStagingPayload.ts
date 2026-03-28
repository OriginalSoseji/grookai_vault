import "server-only";

import type { FounderWarehouseCandidateDetailResult } from "@/lib/warehouse/getFounderWarehouseCandidateById";

const STAGING_ACTION_TYPES = new Set([
  "CREATE_CARD_PRINT",
  "CREATE_CARD_PRINTING",
  "ENRICH_CANON_IMAGE",
]);

function normalizeText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function pickLatestPayload(detail: FounderWarehouseCandidateDetailResult) {
  return {
    normalized_package: detail.latestNormalizedPackage ?? null,
    classification_package: detail.latestClassificationPackage ?? null,
  };
}

export function buildWarehouseStagingPayload(detail: FounderWarehouseCandidateDetailResult, stagedAt: string) {
  if (!detail.candidate) {
    throw new Error("candidate_not_found");
  }

  const candidate = detail.candidate;
  const approvedActionType = normalizeText(candidate.proposed_action_type);
  if (!approvedActionType || !STAGING_ACTION_TYPES.has(approvedActionType)) {
    throw new Error("invalid_approved_action_type");
  }

  const latestPackages = pickLatestPayload(detail);

  return {
    payload_version: "warehouse_staging_v1",
    candidate_id: candidate.id,
    approved_action_type: approvedActionType,
    candidate_summary: {
      state: candidate.state,
      submission_intent: candidate.submission_intent,
      intake_channel: candidate.intake_channel,
      submission_type: candidate.submission_type,
      notes: candidate.notes,
      tcgplayer_id: candidate.tcgplayer_id,
      proposed_action_type: candidate.proposed_action_type,
      interpreter_decision: candidate.interpreter_decision,
      interpreter_reason_code: candidate.interpreter_reason_code,
      interpreter_explanation: candidate.interpreter_explanation,
      interpreter_resolved_finish_key: candidate.interpreter_resolved_finish_key,
      needs_promotion_review: candidate.needs_promotion_review === true,
      current_review_hold_reason: candidate.current_review_hold_reason,
    },
    founder_approval: {
      founder_approved_by_user_id: candidate.founder_approved_by_user_id,
      founder_approved_at: candidate.founder_approved_at,
      founder_approval_notes: candidate.founder_approval_notes,
    },
    evidence_summary: {
      evidence_count: detail.evidenceRows.length,
      evidence_rows: detail.evidenceRows.map((row) => ({
        id: row.id,
        evidence_kind: row.evidence_kind,
        evidence_slot: row.evidence_slot,
        storage_path: row.storage_path,
        identity_snapshot_id: row.identity_snapshot_id,
        condition_snapshot_id: row.condition_snapshot_id,
        identity_scan_event_id: row.identity_scan_event_id,
        created_at: row.created_at,
      })),
    },
    latest_normalized_package: latestPackages.normalized_package,
    latest_classification_package: latestPackages.classification_package,
    staged_context: {
      staged_at: stagedAt,
      candidate_created_at: candidate.created_at,
      candidate_updated_at: candidate.updated_at,
    },
  };
}
