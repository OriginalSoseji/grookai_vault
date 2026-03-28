import "server-only";

import { isUsablePublicImageUrl } from "@/lib/publicCardImage";
import { createServerAdminClient } from "@/lib/supabase/admin";

type JsonRecord = Record<string, unknown>;

type FounderWarehouseCandidateRow = {
  id: string;
  submitted_by_user_id: string;
  intake_channel: string;
  submission_type: string;
  notes: string;
  tcgplayer_id: string | null;
  submission_intent: string;
  state: string;
  current_review_hold_reason: string | null;
  current_staging_id: string | null;
  interpreter_decision: string | null;
  interpreter_reason_code: string | null;
  interpreter_explanation: string | null;
  interpreter_resolved_finish_key: string | null;
  needs_promotion_review: boolean | null;
  proposed_action_type: string | null;
  founder_approved_by_user_id: string | null;
  founder_approved_at: string | null;
  founder_approval_notes: string | null;
  rejected_by_user_id: string | null;
  rejected_at: string | null;
  rejection_notes: string | null;
  archived_by_user_id: string | null;
  archived_at: string | null;
  archive_notes: string | null;
  created_at: string;
  updated_at: string;
};

type WarehouseEvidenceRow = {
  id: string;
  candidate_id: string;
  evidence_kind: string;
  evidence_slot: string | null;
  identity_snapshot_id: string | null;
  condition_snapshot_id: string | null;
  identity_scan_event_id: string | null;
  storage_path: string | null;
  metadata_payload: JsonRecord | null;
  created_by_user_id: string;
  created_at: string;
};

type WarehouseEventRow = {
  id: string;
  candidate_id: string;
  staging_id: string | null;
  event_type: string;
  action: string;
  previous_state: string | null;
  next_state: string | null;
  actor_user_id: string | null;
  actor_type: string;
  metadata: JsonRecord | null;
  created_at: string;
};

type WarehouseStagingRow = {
  id: string;
  candidate_id: string;
  approved_action_type: string;
  frozen_payload: JsonRecord | null;
  founder_approved_by_user_id: string | null;
  founder_approved_at: string | null;
  staged_by_user_id: string;
  staged_at: string;
  execution_status: string;
  execution_attempts: number;
  last_error: string | null;
  last_attempted_at: string | null;
  executed_at: string | null;
};

type IdentitySnapshotRow = {
  id: string;
  images: JsonRecord | null;
  scan_quality: JsonRecord | null;
  created_at: string | null;
};

type ConditionSnapshotRow = {
  id: string;
  images: JsonRecord | null;
  scan_quality: JsonRecord | null;
  confidence: number | null;
  card_print_id: string | null;
  created_at: string | null;
};

type ScanEventRow = {
  id: string;
  status: string | null;
  source_table: string | null;
  error: string | null;
  created_at: string | null;
};

type ScanEventResultRow = {
  id: string;
  identity_scan_event_id: string;
  status: string | null;
  analysis_version: string | null;
  error: string | null;
  created_at: string | null;
};

export type WarehouseEvidencePreview = {
  label: string;
  url: string;
};

export type FounderWarehouseEvidenceDetailRow = WarehouseEvidenceRow & {
  previews: WarehouseEvidencePreview[];
  linked_identity_snapshot: IdentitySnapshotRow | null;
  linked_condition_snapshot: ConditionSnapshotRow | null;
  linked_scan_event: ScanEventRow | null;
  linked_scan_result: ScanEventResultRow | null;
};

export type FounderWarehouseCandidateDetailResult = {
  candidate: FounderWarehouseCandidateRow | null;
  evidenceRows: FounderWarehouseEvidenceDetailRow[];
  eventRows: WarehouseEventRow[];
  stagingRows: WarehouseStagingRow[];
  latestNormalizedPackage: JsonRecord | null;
  latestClassificationPackage: JsonRecord | null;
};

function normalizeIdArray(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter((value) => value.length > 0),
    ),
  );
}

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as JsonRecord;
}

function extractImagePreviewUrls(value: unknown): WarehouseEvidencePreview[] {
  const payload = asRecord(value);
  if (!payload) {
    return [];
  }

  const previews: WarehouseEvidencePreview[] = [];
  const paths = asRecord(payload.paths);

  if (paths) {
    for (const [key, pathValue] of Object.entries(paths)) {
      if (typeof pathValue === "string" && isUsablePublicImageUrl(pathValue)) {
        previews.push({ label: `snapshot:${key}`, url: pathValue.trim() });
      }
    }
  }

  for (const [key, fieldValue] of Object.entries(payload)) {
    if (typeof fieldValue === "string" && isUsablePublicImageUrl(fieldValue)) {
      previews.push({ label: `snapshot:${key}`, url: fieldValue.trim() });
      continue;
    }

    const nested = asRecord(fieldValue);
    if (!nested) {
      continue;
    }

    const nestedPath = typeof nested.path === "string" ? nested.path : null;
    if (nestedPath && isUsablePublicImageUrl(nestedPath)) {
      previews.push({ label: `snapshot:${key}`, url: nestedPath.trim() });
    }
  }

  return previews;
}

function extractLatestPackage(eventRows: WarehouseEventRow[], key: "normalized_package" | "classification_package") {
  for (let index = eventRows.length - 1; index >= 0; index -= 1) {
    const metadata = asRecord(eventRows[index]?.metadata);
    const candidate = asRecord(metadata?.[key]);
    if (candidate) {
      return candidate;
    }
  }
  return null;
}

export async function getFounderWarehouseCandidateById(
  candidateId: string,
): Promise<FounderWarehouseCandidateDetailResult> {
  const normalizedCandidateId = candidateId.trim();
  const admin = createServerAdminClient();

  const { data: candidateData, error: candidateError } = await admin
    .from("canon_warehouse_candidates")
    .select(
      "id,submitted_by_user_id,intake_channel,submission_type,notes,tcgplayer_id,submission_intent,state,current_review_hold_reason,current_staging_id,interpreter_decision,interpreter_reason_code,interpreter_explanation,interpreter_resolved_finish_key,needs_promotion_review,proposed_action_type,founder_approved_by_user_id,founder_approved_at,founder_approval_notes,rejected_by_user_id,rejected_at,rejection_notes,archived_by_user_id,archived_at,archive_notes,created_at,updated_at",
    )
    .eq("id", normalizedCandidateId)
    .maybeSingle();

  if (candidateError) {
    throw new Error(`Founder warehouse candidate detail query failed: ${candidateError.message}`);
  }

  const candidate = (candidateData as FounderWarehouseCandidateRow | null) ?? null;
  if (!candidate) {
    return {
      candidate: null,
      evidenceRows: [],
      eventRows: [],
      stagingRows: [],
      latestNormalizedPackage: null,
      latestClassificationPackage: null,
    };
  }

  const [
    { data: evidenceData, error: evidenceError },
    { data: eventData, error: eventError },
    { data: stagingData, error: stagingError },
  ] = await Promise.all([
    admin
      .from("canon_warehouse_candidate_evidence")
      .select(
        "id,candidate_id,evidence_kind,evidence_slot,identity_snapshot_id,condition_snapshot_id,identity_scan_event_id,storage_path,metadata_payload,created_by_user_id,created_at",
      )
      .eq("candidate_id", normalizedCandidateId)
      .order("created_at", { ascending: true }),
    admin
      .from("canon_warehouse_candidate_events")
      .select(
        "id,candidate_id,staging_id,event_type,action,previous_state,next_state,actor_user_id,actor_type,metadata,created_at",
      )
      .eq("candidate_id", normalizedCandidateId)
      .order("created_at", { ascending: true }),
    admin
      .from("canon_warehouse_promotion_staging")
      .select(
        "id,candidate_id,approved_action_type,frozen_payload,founder_approved_by_user_id,founder_approved_at,staged_by_user_id,staged_at,execution_status,execution_attempts,last_error,last_attempted_at,executed_at",
      )
      .eq("candidate_id", normalizedCandidateId)
      .order("staged_at", { ascending: false }),
  ]);

  if (evidenceError) {
    throw new Error(`Founder warehouse evidence detail query failed: ${evidenceError.message}`);
  }
  if (eventError) {
    throw new Error(`Founder warehouse event detail query failed: ${eventError.message}`);
  }
  if (stagingError) {
    throw new Error(`Founder warehouse staging detail query failed: ${stagingError.message}`);
  }

  const evidenceRows = ((evidenceData ?? []) as WarehouseEvidenceRow[]) ?? [];
  const eventRows = ((eventData ?? []) as WarehouseEventRow[]) ?? [];
  const stagingRows = ((stagingData ?? []) as WarehouseStagingRow[]) ?? [];

  const identitySnapshotIds = normalizeIdArray(evidenceRows.map((row) => row.identity_snapshot_id));
  const conditionSnapshotIds = normalizeIdArray(evidenceRows.map((row) => row.condition_snapshot_id));
  const scanEventIds = normalizeIdArray(evidenceRows.map((row) => row.identity_scan_event_id));

  const [
    { data: identitySnapshotData, error: identitySnapshotError },
    { data: conditionSnapshotData, error: conditionSnapshotError },
    { data: scanEventData, error: scanEventError },
    { data: scanEventResultData, error: scanEventResultError },
  ] = await Promise.all([
    identitySnapshotIds.length > 0
      ? admin
          .from("identity_snapshots")
          .select("id,images,scan_quality,created_at")
          .in("id", identitySnapshotIds)
      : Promise.resolve({ data: [], error: null }),
    conditionSnapshotIds.length > 0
      ? admin
          .from("condition_snapshots")
          .select("id,images,scan_quality,confidence,card_print_id,created_at")
          .in("id", conditionSnapshotIds)
      : Promise.resolve({ data: [], error: null }),
    scanEventIds.length > 0
      ? admin
          .from("identity_scan_events")
          .select("id,status,source_table,error,created_at")
          .in("id", scanEventIds)
      : Promise.resolve({ data: [], error: null }),
    scanEventIds.length > 0
      ? admin
          .from("identity_scan_event_results")
          .select("id,identity_scan_event_id,status,analysis_version,error,created_at")
          .in("identity_scan_event_id", scanEventIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (identitySnapshotError) {
    throw new Error(`Founder warehouse identity snapshot join failed: ${identitySnapshotError.message}`);
  }
  if (conditionSnapshotError) {
    throw new Error(`Founder warehouse condition snapshot join failed: ${conditionSnapshotError.message}`);
  }
  if (scanEventError) {
    throw new Error(`Founder warehouse scan event join failed: ${scanEventError.message}`);
  }
  if (scanEventResultError) {
    throw new Error(`Founder warehouse scan event result join failed: ${scanEventResultError.message}`);
  }

  const identitySnapshotsById = new Map(
    (((identitySnapshotData ?? []) as IdentitySnapshotRow[]) ?? []).map((row) => [row.id, row]),
  );
  const conditionSnapshotsById = new Map(
    (((conditionSnapshotData ?? []) as ConditionSnapshotRow[]) ?? []).map((row) => [row.id, row]),
  );
  const scanEventsById = new Map((((scanEventData ?? []) as ScanEventRow[]) ?? []).map((row) => [row.id, row]));

  const latestScanResultByEventId = new Map<string, ScanEventResultRow>();
  for (const row of (((scanEventResultData ?? []) as ScanEventResultRow[]) ?? [])) {
    if (!latestScanResultByEventId.has(row.identity_scan_event_id)) {
      latestScanResultByEventId.set(row.identity_scan_event_id, row);
    }
  }

  const detailEvidenceRows = evidenceRows.map((row) => {
    const previews: WarehouseEvidencePreview[] = [];
    if (row.storage_path && isUsablePublicImageUrl(row.storage_path)) {
      previews.push({
        label: row.evidence_slot ? `warehouse:${row.evidence_slot}` : "warehouse:image",
        url: row.storage_path.trim(),
      });
    }

    const linkedIdentitySnapshot = row.identity_snapshot_id
      ? identitySnapshotsById.get(row.identity_snapshot_id) ?? null
      : null;
    const linkedConditionSnapshot = row.condition_snapshot_id
      ? conditionSnapshotsById.get(row.condition_snapshot_id) ?? null
      : null;
    const linkedScanEvent = row.identity_scan_event_id
      ? scanEventsById.get(row.identity_scan_event_id) ?? null
      : null;
    const linkedScanResult = row.identity_scan_event_id
      ? latestScanResultByEventId.get(row.identity_scan_event_id) ?? null
      : null;

    previews.push(...extractImagePreviewUrls(linkedIdentitySnapshot?.images));
    previews.push(...extractImagePreviewUrls(linkedConditionSnapshot?.images));

    const dedupedPreviews = Array.from(new Map(previews.map((preview) => [preview.url, preview])).values());

    return {
      ...row,
      previews: dedupedPreviews,
      linked_identity_snapshot: linkedIdentitySnapshot,
      linked_condition_snapshot: linkedConditionSnapshot,
      linked_scan_event: linkedScanEvent,
      linked_scan_result: linkedScanResult,
    };
  });

  return {
    candidate,
    evidenceRows: detailEvidenceRows,
    eventRows,
    stagingRows,
    latestNormalizedPackage: extractLatestPackage(eventRows, "normalized_package"),
    latestClassificationPackage: extractLatestPackage(eventRows, "classification_package"),
  };
}
