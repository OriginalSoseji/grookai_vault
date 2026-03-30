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
    metadata_extraction_package:
      detail.latestMetadataExtractionPackage?.normalized_metadata_package ?? null,
    interpreter_package: detail.interpreterPackage ?? null,
  };
}

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function normalizeLowerSnake(value: string | null | undefined) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  return normalized
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function buildFrozenIdentity(detail: FounderWarehouseCandidateDetailResult) {
  const afterCardPrint = asRecord(detail.promotionWritePlan?.preview.after?.card_prints);
  const extractionIdentity = asRecord(
    detail.latestMetadataExtractionPackage?.normalized_metadata_package?.identity,
  );
  const printedModifier = asRecord(
    detail.latestMetadataExtractionPackage?.normalized_metadata_package?.printed_modifier,
  );

  const printedModifierVariantKey =
    normalizeText(printedModifier?.status as string | null | undefined) === "READY"
      ? normalizeLowerSnake(
          (printedModifier?.modifier_key as string | null | undefined) ??
            (printedModifier?.modifier_label as string | null | undefined),
        )
      : null;

  return {
    set_code:
      normalizeText(afterCardPrint?.set_code as string | null | undefined) ??
      normalizeText(extractionIdentity?.set_code as string | null | undefined),
    name:
      normalizeText(afterCardPrint?.name as string | null | undefined) ??
      normalizeText(extractionIdentity?.name as string | null | undefined),
    number_plain:
      normalizeText(afterCardPrint?.number_plain as string | null | undefined) ??
      normalizeText(
        (afterCardPrint?.number as string | null | undefined)?.split("/", 1)?.[0] ??
          null,
      ) ??
      normalizeText(
        (extractionIdentity?.printed_number as string | null | undefined)?.split("/", 1)?.[0] ??
          (extractionIdentity?.number as string | null | undefined)?.split("/", 1)?.[0] ??
          null,
      ),
    variant_key:
      normalizeText(afterCardPrint?.variant_key as string | null | undefined) ??
      printedModifierVariantKey,
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
    staging_contract: "promotion_stage_from_write_plan_v1",
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
    latest_metadata_extraction_package: latestPackages.metadata_extraction_package,
    latest_interpreter_package: latestPackages.interpreter_package,
    write_plan: detail.promotionWritePlan ?? null,
    frozen_identity: buildFrozenIdentity(detail),
    normalization_asset: {
      front_path:
        detail.latestPromotionImageNormalizationPackage?.promotion_image_normalization_package
          ?.outputs?.normalized_front_storage_path ?? null,
      back_path:
        detail.latestPromotionImageNormalizationPackage?.promotion_image_normalization_package
          ?.outputs?.normalized_back_storage_path ?? null,
    },
    staged_context: {
      staged_at: stagedAt,
      candidate_created_at: candidate.created_at,
      candidate_updated_at: candidate.updated_at,
      created_at: stagedAt,
      created_by: candidate.founder_approved_by_user_id,
    },
  };
}
