import "server-only";

import { resolveCanonImageUrlV1 } from "@/lib/canon/resolveCanonImageV1";
import { getBestPublicCardImageUrl, isUsablePublicImageUrl } from "@/lib/publicCardImage";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { buildWarehouseStagingPayload } from "@/lib/founder/buildWarehouseStagingPayload";

type JsonRecord = Record<string, unknown>;
type AdminClient = ReturnType<typeof createServerAdminClient>;

type PromotionReviewInput = {
  candidate: {
    id: string;
    state: string;
    current_staging_id: string | null;
    notes: string;
    tcgplayer_id: string | null;
    submission_intent: string;
    intake_channel: string;
    submission_type: string;
    current_review_hold_reason: string | null;
    interpreter_decision: string | null;
    interpreter_reason_code: string | null;
    interpreter_explanation: string | null;
    interpreter_resolved_finish_key: string | null;
    needs_promotion_review: boolean | null;
    proposed_action_type: string | null;
    founder_approved_by_user_id: string | null;
    founder_approved_at: string | null;
    founder_approval_notes: string | null;
    promotion_result_type: string | null;
    promoted_card_print_id: string | null;
    promoted_card_printing_id: string | null;
    promoted_image_target_type: string | null;
    promoted_image_target_id: string | null;
    promoted_at: string | null;
    created_at: string;
    updated_at: string;
  };
  evidenceRows: Array<{
    id: string;
    evidence_kind: string;
    evidence_slot: string | null;
    storage_path: string | null;
    previews: Array<{ label: string; url: string }>;
    created_at: string;
  }>;
  eventRows: Array<unknown>;
  stagingRows: Array<{
    id: string;
    approved_action_type: string;
    frozen_payload: JsonRecord | null;
    founder_approved_by_user_id: string | null;
    founder_approved_at: string | null;
    staged_at: string;
    execution_status: string;
    execution_attempts: number;
    last_error: string | null;
    last_attempted_at: string | null;
    executed_at: string | null;
  }>;
  currentStagingRow: {
    id: string;
    approved_action_type: string;
    frozen_payload: JsonRecord | null;
    founder_approved_by_user_id: string | null;
    founder_approved_at: string | null;
    staged_at: string;
    execution_status: string;
    execution_attempts: number;
    last_error: string | null;
    last_attempted_at: string | null;
    executed_at: string | null;
  } | null;
  latestNormalizedPackage: JsonRecord | null;
  latestClassificationPackage: JsonRecord | null;
};

type CanonSetRow = {
  id: string;
  code: string;
  name: string | null;
  game: string | null;
};

type CanonCardPrintRow = {
  id: string;
  set_id: string;
  set_code: string | null;
  name: string | null;
  number: string | null;
  number_plain: string | null;
  variant_key: string | null;
  tcgplayer_id: string | null;
  image_url: string | null;
  image_alt_url: string | null;
  image_source: string | null;
  image_path: string | null;
};

type CanonCardPrintingRow = {
  id: string;
  card_print_id: string;
  finish_key: string | null;
  is_provisional: boolean | null;
  provenance_source: string | null;
  provenance_ref: string | null;
  created_by: string | null;
};

type FinishKeyRow = {
  key: string;
  label: string;
  is_active: boolean;
};

export type FounderPromotionPlanStatus = "CREATE" | "REUSE" | "UPDATE" | "NONE" | "UNRESOLVED";

export type FounderPromotionPlanRow = {
  domain: string;
  status: FounderPromotionPlanStatus;
  title: string;
  detail: string;
  target: string | null;
  fields: Array<{ label: string; value: string | null }>;
};

export type FounderUnresolvedBlockingReasonCode =
  | "NO_CLASSIFICATION_DECISION"
  | "NO_LAWFUL_PROMOTION_ACTION"
  | "MISSING_CANON_MATCH_CONTEXT"
  | "MISSING_IDENTITY_DELTA"
  | "MISSING_REQUIRED_EVIDENCE"
  | "INSUFFICIENT_IMAGE_EVIDENCE"
  | "STAGING_NOT_CREATED"
  | "AMBIGUOUS_TARGET"
  | "MISSING_EXTERNAL_REFERENCE"
  | "OTHER";

export type FounderUnresolvedReview = {
  status: "UNRESOLVED";
  blocking_reason_code: FounderUnresolvedBlockingReasonCode;
  blocking_reason_label: string;
  founder_explanation: string;
  missing_fields: string[];
  next_actions: string[];
  raw_reason_code: string | null;
};

export type FounderPromotionReviewModel = {
  payloadSource: "staging" | "derived" | "unavailable";
  payloadStatus: "READY" | "UNRESOLVED";
  payloadReason: string | null;
  actionType: string | null;
  actionTypeLabel: string;
  candidateTypeLabel: string;
  decisionSummary: string;
  preview: {
    imageUrl: string | null;
    imageOriginLabel: string | null;
    frontEvidenceUrl: string | null;
    backEvidenceUrl: string | null;
    displayName: string | null;
    setDisplay: string | null;
    printedNumber: string | null;
    variantLabel: string | null;
    finishLabel: string | null;
    candidateTypeLabel: string;
    unresolvedReason: string | null;
  };
  writePlan: {
    status: "READY" | "UNRESOLVED";
    summary: string;
    resultPreviewType: string | null;
    raw: JsonRecord | null;
    rows: FounderPromotionPlanRow[];
  };
  comparison: {
    summary: string;
    existing: string[];
    introduced: string[];
    delta: string[];
  };
  references: {
    setCode: string | null;
    matchedCardPrintId: string | null;
    matchedCardPrintingId: string | null;
    finishKey: string | null;
    tcgplayerId: string | null;
  };
  unresolved: FounderUnresolvedReview | null;
};

const POKEMON_GAME = "pokemon";
const ALLOWED_ACTION_TYPES = new Set([
  "CREATE_CARD_PRINT",
  "CREATE_CARD_PRINTING",
  "ENRICH_CANON_IMAGE",
]);

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as JsonRecord;
}

function normalizeTextOrNull(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function uniqueText(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = normalizeTextOrNull(value);
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function normalizeLowerOrNull(value: unknown) {
  const normalized = normalizeTextOrNull(value);
  return normalized ? normalized.toLowerCase() : null;
}

function normalizeNumberPlain(value: unknown) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) {
    return null;
  }
  const digits = normalized.replace(/[^0-9]/g, "");
  return digits.length > 0 ? digits : null;
}

function normalizeNameKey(value: unknown) {
  const normalized = normalizeTextOrNull(value);
  return normalized ? normalized.toLowerCase().replace(/\s+/g, " ") : null;
}

function humanizeToken(value: string | null | undefined) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) {
    return null;
  }
  return normalized
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return uniqueText(
    value.map((entry) => {
      const normalized = normalizeTextOrNull(entry);
      return normalized ? humanizeToken(normalized) ?? normalized : null;
    }),
  );
}

function formatActionTypeLabel(actionType: string | null) {
  switch (actionType) {
    case "CREATE_CARD_PRINT":
      return "Create Canon Card";
    case "CREATE_CARD_PRINTING":
      return "Create Child Printing";
    case "ENRICH_CANON_IMAGE":
      return "Repair Canon Image";
    default:
      return "Unresolved Promotion";
  }
}

function formatCandidateTypeLabel(actionType: string | null) {
  switch (actionType) {
    case "CREATE_CARD_PRINT":
      return "New Canon";
    case "CREATE_CARD_PRINTING":
      return "Child Printing";
    case "ENRICH_CANON_IMAGE":
      return "Image Repair";
    default:
      return "Unresolved";
  }
}

function getVisibleIdentityHints(payload: JsonRecord | null) {
  return asRecord(asRecord(payload?.latest_normalized_package)?.visible_identity_hints);
}

function getNormalizedPackage(payload: JsonRecord | null) {
  return asRecord(payload?.latest_normalized_package);
}

function getClassificationPackage(payload: JsonRecord | null) {
  return asRecord(payload?.latest_classification_package);
}

function getResolverSummary(payload: JsonRecord | null) {
  return asRecord(getClassificationPackage(payload)?.resolver_summary);
}

function getEvidenceSummary(payload: JsonRecord | null) {
  return asRecord(payload?.evidence_summary);
}

function getEvidenceRows(payload: JsonRecord | null) {
  const summary = getEvidenceSummary(payload);
  const rows = Array.isArray(summary?.evidence_rows) ? summary.evidence_rows : [];
  return rows.map((row) => asRecord(row)).filter(Boolean) as JsonRecord[];
}

function extractSetCode(payload: JsonRecord | null) {
  const visibleHints = getVisibleIdentityHints(payload);
  const normalizedPackage = getNormalizedPackage(payload);
  const classificationPackage = getClassificationPackage(payload);
  const normalizedExtracted = asRecord(asRecord(normalizedPackage?.raw_metadata_documentation)?.extracted_fields);
  const classifiedExtracted = asRecord(asRecord(classificationPackage?.metadata_documentation)?.extracted_fields);

  return (
    normalizeLowerOrNull(visibleHints?.set_hint) ||
    normalizeLowerOrNull(normalizedExtracted?.set_hint) ||
    normalizeLowerOrNull(classifiedExtracted?.set_hint)
  );
}

function extractCardName(payload: JsonRecord | null) {
  const visibleHints = getVisibleIdentityHints(payload);
  const normalizedPackage = getNormalizedPackage(payload);
  const classificationPackage = getClassificationPackage(payload);
  const normalizedExtracted = asRecord(asRecord(normalizedPackage?.raw_metadata_documentation)?.extracted_fields);
  const classifiedExtracted = asRecord(asRecord(classificationPackage?.metadata_documentation)?.extracted_fields);

  return (
    normalizeTextOrNull(visibleHints?.card_name) ||
    normalizeTextOrNull(normalizedExtracted?.card_name) ||
    normalizeTextOrNull(classifiedExtracted?.card_name)
  );
}

function extractPrintedNumberPlain(payload: JsonRecord | null) {
  const visibleHints = getVisibleIdentityHints(payload);
  const normalizedPackage = getNormalizedPackage(payload);
  const classificationPackage = getClassificationPackage(payload);
  const normalizedExtracted = asRecord(asRecord(normalizedPackage?.raw_metadata_documentation)?.extracted_fields);
  const classifiedExtracted = asRecord(asRecord(classificationPackage?.metadata_documentation)?.extracted_fields);

  return (
    normalizeTextOrNull(visibleHints?.printed_number_plain) ||
    normalizeNumberPlain(visibleHints?.printed_number) ||
    normalizeTextOrNull(normalizedExtracted?.printed_number_plain) ||
    normalizeNumberPlain(normalizedExtracted?.printed_number) ||
    normalizeTextOrNull(classifiedExtracted?.printed_number_plain) ||
    normalizeNumberPlain(classifiedExtracted?.printed_number)
  );
}

function extractRarityHint(payload: JsonRecord | null) {
  const visibleHints = getVisibleIdentityHints(payload);
  return normalizeTextOrNull(visibleHints?.rarity_hint);
}

function extractResolvedFinishKey(payload: JsonRecord | null) {
  return (
    normalizeTextOrNull(asRecord(payload?.candidate_summary)?.interpreter_resolved_finish_key) ||
    normalizeTextOrNull(getVisibleIdentityHints(payload)?.finish_hint)
  );
}

function extractMatchedCardPrintId(payload: JsonRecord | null) {
  const resolverSummary = getResolverSummary(payload);
  const normalizedPackage = getNormalizedPackage(payload);
  const normalizedExtracted = asRecord(asRecord(normalizedPackage?.raw_metadata_documentation)?.extracted_fields);
  return (
    normalizeTextOrNull(resolverSummary?.matched_card_print_id) ||
    normalizeTextOrNull(normalizedExtracted?.matched_card_print_id)
  );
}

function extractMatchedCardPrintingId(payload: JsonRecord | null) {
  const resolverSummary = getResolverSummary(payload);
  return normalizeTextOrNull(resolverSummary?.matched_card_printing_id);
}

function extractPublicImageUrl(payload: JsonRecord | null) {
  for (const row of getEvidenceRows(payload)) {
    const candidate = normalizeTextOrNull(row.storage_path);
    if (isUsablePublicImageUrl(candidate)) {
      return candidate;
    }
  }

  const normalizedPackage = getNormalizedPackage(payload);
  const refs = [
    normalizedPackage?.primary_front_image_ref,
    normalizedPackage?.secondary_back_image_ref,
    ...(Array.isArray(normalizedPackage?.normalized_image_refs) ? normalizedPackage.normalized_image_refs : []),
  ];

  for (const ref of refs) {
    const candidate = normalizeTextOrNull(ref);
    if (isUsablePublicImageUrl(candidate)) {
      return candidate;
    }
  }

  return null;
}

function firstPreviewBySlot(
  evidenceRows: PromotionReviewInput["evidenceRows"],
  slot: "front" | "back",
) {
  for (const row of evidenceRows) {
    if (normalizeLowerOrNull(row.evidence_slot) !== slot) {
      continue;
    }

    const preview = row.previews[0];
    if (preview?.url) {
      return preview.url;
    }
  }

  return null;
}

function buildPlanRow(
  domain: string,
  status: FounderPromotionPlanStatus,
  title: string,
  detail: string,
  target: string | null,
  fields: Array<{ label: string; value: string | null }> = [],
): FounderPromotionPlanRow {
  return { domain, status, title, detail, target, fields };
}

function formatSetDisplay(setRow: CanonSetRow | null, fallbackSetCode: string | null) {
  const setCode = normalizeTextOrNull(setRow?.code) ?? normalizeTextOrNull(fallbackSetCode);
  const setName = normalizeTextOrNull(setRow?.name);

  if (setName && setCode) {
    return `${setName} (${setCode.toUpperCase()})`;
  }
  if (setName) {
    return setName;
  }
  if (setCode) {
    return setCode.toUpperCase();
  }
  return null;
}

function describeCardPrint(row: CanonCardPrintRow | null, setRow: CanonSetRow | null) {
  if (!row) {
    return null;
  }
  const name = normalizeTextOrNull(row.name) ?? "Unknown card";
  const setDisplay = formatSetDisplay(setRow, row.set_code);
  const number = normalizeTextOrNull(row.number) ?? normalizeTextOrNull(row.number_plain);
  return [name, setDisplay, number ? `#${number}` : null, row.id].filter(Boolean).join(" • ");
}

function describeCardPrinting(
  row: CanonCardPrintingRow | null,
  parentCardPrint: CanonCardPrintRow | null,
  setRow: CanonSetRow | null,
  finishLabel: string | null,
) {
  if (!row) {
    return null;
  }
  return [
    describeCardPrint(parentCardPrint, setRow),
    finishLabel ? `Finish ${finishLabel}` : row.finish_key ? `Finish ${row.finish_key}` : null,
    row.id,
  ]
    .filter(Boolean)
    .join(" • ");
}

async function fetchSetByCode(admin: AdminClient, setCode: string) {
  const normalizedSetCode = normalizeLowerOrNull(setCode);
  if (!normalizedSetCode) {
    return [];
  }

  const { data, error } = await admin
    .from("sets")
    .select("id,code,name,game")
    .eq("game", POKEMON_GAME)
    .ilike("code", normalizedSetCode)
    .limit(2);

  if (error) {
    throw new Error(`Founder promotion review set lookup failed: ${error.message}`);
  }

  return ((data ?? []) as CanonSetRow[]) ?? [];
}

async function fetchSetById(admin: AdminClient, setId: string | null) {
  const normalizedSetId = normalizeTextOrNull(setId);
  if (!normalizedSetId) {
    return null;
  }

  const { data, error } = await admin
    .from("sets")
    .select("id,code,name,game")
    .eq("id", normalizedSetId)
    .maybeSingle();

  if (error) {
    throw new Error(`Founder promotion review parent set lookup failed: ${error.message}`);
  }

  return (data as CanonSetRow | null) ?? null;
}

async function fetchCardPrintById(admin: AdminClient, cardPrintId: string | null) {
  const normalizedCardPrintId = normalizeTextOrNull(cardPrintId);
  if (!normalizedCardPrintId) {
    return null;
  }

  const { data, error } = await admin
    .from("card_prints")
    .select("id,set_id,set_code,name,number,number_plain,variant_key,tcgplayer_id,image_url,image_alt_url,image_source,image_path")
    .eq("id", normalizedCardPrintId)
    .maybeSingle();

  if (error) {
    throw new Error(`Founder promotion review card_print lookup failed: ${error.message}`);
  }

  return (data as CanonCardPrintRow | null) ?? null;
}

async function fetchCardPrintingById(admin: AdminClient, cardPrintingId: string | null) {
  const normalizedCardPrintingId = normalizeTextOrNull(cardPrintingId);
  if (!normalizedCardPrintingId) {
    return null;
  }

  const { data, error } = await admin
    .from("card_printings")
    .select("id,card_print_id,finish_key,is_provisional,provenance_source,provenance_ref,created_by")
    .eq("id", normalizedCardPrintingId)
    .maybeSingle();

  if (error) {
    throw new Error(`Founder promotion review card_printing lookup failed: ${error.message}`);
  }

  return (data as CanonCardPrintingRow | null) ?? null;
}

async function fetchExistingCardPrints(admin: AdminClient, setId: string, numberPlain: string) {
  const { data, error } = await admin
    .from("card_prints")
    .select("id,set_id,set_code,name,number,number_plain,variant_key,tcgplayer_id,image_url,image_alt_url,image_source,image_path")
    .eq("set_id", setId)
    .or(`number_plain.eq.${numberPlain},number.eq.${numberPlain}`)
    .limit(10);

  if (error) {
    throw new Error(`Founder promotion review existing card_print lookup failed: ${error.message}`);
  }

  return (((data ?? []) as CanonCardPrintRow[]) ?? []).filter(
    (row) => normalizeTextOrNull(row.variant_key) === null,
  );
}

async function fetchExistingCardPrinting(admin: AdminClient, cardPrintId: string, finishKey: string) {
  const { data, error } = await admin
    .from("card_printings")
    .select("id,card_print_id,finish_key,is_provisional,provenance_source,provenance_ref,created_by")
    .eq("card_print_id", cardPrintId)
    .eq("finish_key", finishKey)
    .maybeSingle();

  if (error) {
    throw new Error(`Founder promotion review existing card_printing lookup failed: ${error.message}`);
  }

  return (data as CanonCardPrintingRow | null) ?? null;
}

async function fetchFinishKey(admin: AdminClient, finishKey: string | null) {
  const normalizedFinishKey = normalizeTextOrNull(finishKey);
  if (!normalizedFinishKey) {
    return null;
  }

  const { data, error } = await admin
    .from("finish_keys")
    .select("key,label,is_active")
    .eq("key", normalizedFinishKey)
    .maybeSingle();

  if (error) {
    throw new Error(`Founder promotion review finish key lookup failed: ${error.message}`);
  }

  return (data as FinishKeyRow | null) ?? null;
}

function buildBaseRows(detail: PromotionReviewInput, stageStatusLabel: string) {
  return [
    buildPlanRow(
      "external_mappings",
      "NONE",
      "External mappings",
      "Promotion Executor V1 does not write external_mappings. External source identity remains unchanged in this action path.",
      null,
    ),
    buildPlanRow(
      "external_printing_mappings",
      "NONE",
      "External printing mappings",
      "Promotion Executor V1 does not write external_printing_mappings.",
      null,
    ),
    buildPlanRow(
      "promotion_staging",
      detail.currentStagingRow ? "REUSE" : "NONE",
      "Staging row",
      detail.currentStagingRow
        ? `Executor will reuse the current staging row in ${stageStatusLabel}.`
        : "No staging row exists yet. Founder approval must stage this candidate before execution.",
      detail.currentStagingRow?.id ?? null,
      detail.currentStagingRow
        ? [
            { label: "execution_status", value: detail.currentStagingRow.execution_status },
            { label: "staged_at", value: detail.currentStagingRow.staged_at },
          ]
        : [],
    ),
  ];
}

type FounderUnresolvedReviewOptions = {
  reasonCode: string | null;
  detailExplanation: string;
  missingFields?: Array<string | null | undefined>;
  nextActions?: Array<string | null | undefined>;
};

function buildUnresolvedReview(
  detail: PromotionReviewInput,
  options: FounderUnresolvedReviewOptions,
): FounderUnresolvedReview {
  const normalizedReasonCode = normalizeLowerOrNull(options.reasonCode);
  const hasFrontImage = detail.evidenceRows.some(
    (row) => normalizeLowerOrNull(row.evidence_slot) === "front",
  );
  const hasBackImage = detail.evidenceRows.some(
    (row) => normalizeLowerOrNull(row.evidence_slot) === "back",
  );
  const hasClassificationDecision =
    !!detail.latestClassificationPackage ||
    !!normalizeTextOrNull(detail.candidate.interpreter_decision) ||
    !!normalizeTextOrNull(detail.candidate.interpreter_reason_code);
  const classificationMetadata = asRecord(detail.latestClassificationPackage?.metadata_documentation);
  const normalizedMetadata = asRecord(detail.latestNormalizedPackage?.raw_metadata_documentation);
  const classificationUnresolvedFields = asStringArray(classificationMetadata?.unresolved_fields);
  const normalizedUnresolvedFields = asStringArray(normalizedMetadata?.unresolved_fields);
  const normalizedEvidenceGaps = asStringArray(detail.latestNormalizedPackage?.evidence_gaps);
  const ambiguityNotes = asStringArray(classificationMetadata?.ambiguity_notes);
  const hasTcgplayerId = !!normalizeTextOrNull(detail.candidate.tcgplayer_id);

  let blockingReasonCode: FounderUnresolvedBlockingReasonCode = "OTHER";
  let blockingReasonLabel = "Promotion plan is unresolved";
  let founderExplanation = options.detailExplanation;
  const missingFields = [...(options.missingFields ?? [])];
  const nextActions = [...(options.nextActions ?? [])];

  if (
    detail.candidate.submission_intent === "MISSING_IMAGE" &&
    !hasTcgplayerId &&
    (
      normalizedReasonCode?.includes("image_target_missing") ||
      normalizedReasonCode?.includes("invalid_approved_action_type") ||
      normalizedReasonCode?.includes("lawful promotion action type")
    )
  ) {
    blockingReasonCode = "MISSING_EXTERNAL_REFERENCE";
    blockingReasonLabel = "Missing image reference context";
    founderExplanation =
      "Promotion cannot proceed because this missing-image submission does not yet resolve to a lawful canon target. No TCGPlayer reference is attached, and the current review data does not identify a single repair target.";
    missingFields.push("TCGPlayer ID", "Resolved canon image target");
    nextActions.push(
      "Provide external reference context for the missing-image submission.",
      "Run classification again after the canon target can be resolved.",
    );
  } else if (
    !hasClassificationDecision &&
    (
      !normalizedReasonCode ||
      normalizedReasonCode.includes("invalid_approved_action_type") ||
      normalizedReasonCode.includes("lawful promotion action type")
    )
  ) {
    blockingReasonCode = "NO_CLASSIFICATION_DECISION";
    blockingReasonLabel = "Classification has not run yet";
    founderExplanation =
      "Promotion cannot proceed because the candidate has not produced a classification boundary yet. The current evidence is in warehouse, but no lawful promotion decision has been derived from it.";
    missingFields.push("Normalization package", "Classification package", "Lawful promotion action");
    nextActions.push(
      "Run normalization and classification before relying on this review for promotion.",
      "Review evidence quality if classification continues to produce no decision.",
    );
  } else if (
    normalizedReasonCode?.includes("invalid_approved_action_type") ||
    normalizedReasonCode?.includes("lawful promotion action type")
  ) {
    blockingReasonCode = "NO_LAWFUL_PROMOTION_ACTION";
    blockingReasonLabel = "No lawful promotion action exists yet";
    founderExplanation =
      "Promotion cannot proceed because current warehouse interpretation does not resolve to one of the allowed V1 executor actions. The system has not yet determined whether this should be a new canon row, a child printing, or an image repair.";
    missingFields.push("Lawful promotion action");
    nextActions.push(
      "Review the classification output to determine the lawful promotion action.",
      "Only stage this candidate after the action type is explicit and reviewable.",
    );
  } else if (normalizedReasonCode?.includes("missing_parent_identity_fields")) {
    blockingReasonCode = "MISSING_IDENTITY_DELTA";
    blockingReasonLabel = "Parent card identity is incomplete";
    founderExplanation =
      "Promotion cannot proceed because the candidate does not yet document the full parent identity needed to justify a new canonical card.";
    missingFields.push("Set code", "Card name", "Printed number");
    nextActions.push(
      "Review evidence to identify the set, card name, and printed number.",
      "Run classification again after the parent identity fields are documented.",
    );
  } else if (
    normalizedReasonCode?.includes("set_resolution_failed") ||
    normalizedReasonCode?.includes("parent_card_print_missing")
  ) {
    blockingReasonCode = "MISSING_CANON_MATCH_CONTEXT";
    blockingReasonLabel = "Canon target is not resolved";
    founderExplanation =
      "Promotion cannot proceed because the current review data does not resolve to a single lawful canon target. The page cannot show a safe write until the parent set or parent card target converges.";
    missingFields.push("Single canon set or parent target");
    nextActions.push(
      "Verify the resolved set and parent card against the current evidence.",
      "Do not stage until the canon target resolves to exactly one row.",
    );
  } else if (
    normalizedReasonCode?.includes("duplicate_existing_card_prints") ||
    normalizedReasonCode?.includes("name_conflict") ||
    normalizedReasonCode?.includes("tcgplayer_conflict") ||
    ambiguityNotes.length > 0
  ) {
    blockingReasonCode = "AMBIGUOUS_TARGET";
    blockingReasonLabel = "Canon target is ambiguous";
    founderExplanation =
      "Promotion cannot proceed because current canon context contains conflicting or ambiguous targets. Founder review can see the conflict, but V1 cannot safely choose a single write target from it.";
    missingFields.push("Single lawful canon target");
    nextActions.push(
      "Inspect the conflicting canon rows and resolve the target ambiguity.",
      "Only approve staging after one canon target remains lawful.",
    );
  } else if (normalizedReasonCode?.includes("finish_key_not_found")) {
    blockingReasonCode = "MISSING_IDENTITY_DELTA";
    blockingReasonLabel = "Child printing finish is unresolved";
    founderExplanation =
      "Promotion cannot proceed because the candidate does not yet resolve to a lawful child printing finish. The parent may be known, but the identity delta for the child layer is still missing.";
    missingFields.push("Finish key");
    nextActions.push(
      "Review evidence to determine the exact finish or printing distinction.",
      "Do not stage a child printing until the finish key is explicit.",
    );
  } else if (normalizedReasonCode?.includes("image_target_missing")) {
    blockingReasonCode = hasTcgplayerId ? "MISSING_CANON_MATCH_CONTEXT" : "MISSING_EXTERNAL_REFERENCE";
    blockingReasonLabel = hasTcgplayerId ? "Image repair target is unresolved" : "Missing image reference context";
    founderExplanation = hasTcgplayerId
      ? "Promotion cannot proceed because the image-repair target is not resolved to a single canonical card yet."
      : "Promotion cannot proceed because this missing-image submission still lacks the reference context needed to resolve a canonical repair target.";
    missingFields.push(hasTcgplayerId ? "Resolved canon image target" : "TCGPlayer ID");
    nextActions.push(
      "Resolve the exact canon image target before staging image repair.",
      hasTcgplayerId
        ? "Run classification again after the target card can be matched."
        : "Provide external reference context for the missing-image submission.",
    );
  } else if (normalizedReasonCode?.includes("image_url_missing_from_payload")) {
    blockingReasonCode = "INSUFFICIENT_IMAGE_EVIDENCE";
    blockingReasonLabel = "Image source is not executor-ready";
    founderExplanation =
      "Promotion cannot proceed because the staged review data does not yet expose a lawful public image URL the executor can attach to canon.";
    missingFields.push("Public image URL");
    nextActions.push(
      "Provide or expose a lawful image URL that the executor can read from staged payload.",
      "Re-stage only after the image source is executor-ready.",
    );
  } else if (normalizedReasonCode?.includes("image_target_already_has_distinct_images")) {
    blockingReasonCode = "NO_LAWFUL_PROMOTION_ACTION";
    blockingReasonLabel = "V1 has no lawful image overwrite path";
    founderExplanation =
      "Promotion cannot proceed because the resolved canon target already has distinct primary and alternate images. Executor V1 will fail closed rather than overwrite both image fields.";
    missingFields.push("Lawful image delta");
    nextActions.push(
      "Review whether this candidate is truly an image repair or requires a different action path.",
      "Do not stage an overwrite that V1 cannot execute safely.",
    );
  } else if (!hasFrontImage) {
    blockingReasonCode = "MISSING_REQUIRED_EVIDENCE";
    blockingReasonLabel = "Required evidence is missing";
    founderExplanation =
      "Promotion cannot proceed because the candidate does not include the minimum front image evidence required for review-grade identity interpretation.";
    missingFields.push("Front image evidence");
    nextActions.push(
      "Attach front image evidence before continuing review.",
      "Re-run classification after the required evidence is present.",
    );
  } else if (!hasBackImage && detail.candidate.submission_intent === "MISSING_CARD") {
    blockingReasonCode = "INSUFFICIENT_IMAGE_EVIDENCE";
    blockingReasonLabel = "Evidence is too thin for a safe promotion plan";
    founderExplanation =
      "Promotion cannot proceed because the current evidence does not yet document enough of the card to justify a safe write plan. Front-only evidence is present, but the identity difference is still not decision-grade.";
    missingFields.push("Back image evidence or stronger identity proof");
    nextActions.push(
      "Add clearer back evidence or stronger normalized identity context.",
      "Only approve after the candidate shows a clear identity delta.",
    );
  }

  const combinedMissingFields = uniqueText([
    ...missingFields,
    ...classificationUnresolvedFields,
    ...normalizedUnresolvedFields,
    ...normalizedEvidenceGaps,
  ]);
  const combinedNextActions = uniqueText(nextActions);

  return {
    status: "UNRESOLVED",
    blocking_reason_code: blockingReasonCode,
    blocking_reason_label: blockingReasonLabel,
    founder_explanation: founderExplanation,
    missing_fields: combinedMissingFields,
    next_actions: combinedNextActions,
    raw_reason_code: normalizeTextOrNull(options.reasonCode),
  };
}

function buildUnavailableReview(detail: PromotionReviewInput, reason: string | null): FounderPromotionReviewModel {
  const frontEvidenceUrl = firstPreviewBySlot(detail.evidenceRows, "front");
  const backEvidenceUrl = firstPreviewBySlot(detail.evidenceRows, "back");
  const normalizedHints = asRecord(detail.latestNormalizedPackage?.visible_identity_hints);
  const noteHeadline = normalizeTextOrNull(detail.candidate.notes.split(/\r?\n/, 1)[0]);
  const founderReadableReason =
    reason === "invalid_approved_action_type"
      ? "This candidate is not yet promotion-ready. Classification has not produced a lawful promotion action type."
      : reason;
  const unresolved = buildUnresolvedReview(detail, {
    reasonCode: reason,
    detailExplanation:
      founderReadableReason ??
      "Promotion interpretation is not complete enough to show a deterministic write plan from the current candidate state.",
  });

  return {
    payloadSource: "unavailable",
    payloadStatus: "UNRESOLVED",
    payloadReason: reason,
    actionType: normalizeTextOrNull(detail.candidate.proposed_action_type),
    actionTypeLabel: formatActionTypeLabel(normalizeTextOrNull(detail.candidate.proposed_action_type)),
    candidateTypeLabel: "Unresolved",
    decisionSummary: unresolved.founder_explanation,
    preview: {
      imageUrl: frontEvidenceUrl,
      imageOriginLabel: frontEvidenceUrl ? "Warehouse front evidence" : null,
      frontEvidenceUrl,
      backEvidenceUrl,
      displayName: normalizeTextOrNull(normalizedHints?.card_name) ?? noteHeadline,
      setDisplay: normalizeTextOrNull(normalizedHints?.set_hint),
      printedNumber:
        normalizeTextOrNull(normalizedHints?.printed_number) ??
        normalizeTextOrNull(normalizedHints?.printed_number_plain),
      variantLabel: null,
      finishLabel: humanizeToken(detail.candidate.interpreter_resolved_finish_key),
      candidateTypeLabel: "Unresolved",
      unresolvedReason: unresolved.founder_explanation,
    },
    writePlan: {
      status: "UNRESOLVED",
      summary: `No lawful write plan exists yet: ${unresolved.blocking_reason_label}.`,
      resultPreviewType: null,
      raw: null,
      rows: [
        buildPlanRow(
          "promotion_plan",
          "UNRESOLVED",
          "Promotion plan unavailable",
          unresolved.founder_explanation,
          null,
        ),
        ...buildBaseRows(detail, "review-only state"),
      ],
    },
    comparison: {
      summary: "Founder review still needs a lawful promotion interpretation before approval can rely on this screen alone.",
      existing: [],
      introduced: [],
      delta: [
        unresolved.blocking_reason_label,
        ...unresolved.missing_fields,
      ],
    },
    references: {
      setCode: null,
      matchedCardPrintId: null,
      matchedCardPrintingId: null,
      finishKey: normalizeTextOrNull(detail.candidate.interpreter_resolved_finish_key),
      tcgplayerId: normalizeTextOrNull(detail.candidate.tcgplayer_id),
    },
    unresolved,
  };
}

export async function buildFounderPromotionReview(
  admin: AdminClient,
  detail: PromotionReviewInput,
): Promise<FounderPromotionReviewModel> {
  const frontEvidenceUrl = firstPreviewBySlot(detail.evidenceRows, "front");
  const backEvidenceUrl = firstPreviewBySlot(detail.evidenceRows, "back");
  const payloadSource = detail.currentStagingRow?.frozen_payload ? "staging" : "derived";

  let payload: JsonRecord | null = detail.currentStagingRow?.frozen_payload ?? null;
  let payloadReason: string | null = null;

  if (!payload) {
    try {
      payload = asRecord(
        buildWarehouseStagingPayload(
          detail as Parameters<typeof buildWarehouseStagingPayload>[0],
          detail.currentStagingRow?.staged_at ?? detail.candidate.updated_at,
        ),
      );
    } catch (error) {
      payloadReason = error instanceof Error ? error.message : "promotion_payload_unavailable";
    }
  }

  if (!payload) {
    return buildUnavailableReview(detail, payloadReason);
  }

  const actionType =
    normalizeTextOrNull(payload.approved_action_type) ??
    normalizeTextOrNull(detail.candidate.proposed_action_type);

  if (!actionType || !ALLOWED_ACTION_TYPES.has(actionType)) {
    return buildUnavailableReview(
      detail,
      "Current candidate does not expose a lawful promotion action type yet.",
    );
  }

  const setCode = extractSetCode(payload);
  const cardName = extractCardName(payload);
  const numberPlain = extractPrintedNumberPlain(payload);
  const finishKey = extractResolvedFinishKey(payload);
  const tcgplayerId = normalizeTextOrNull(asRecord(payload.candidate_summary)?.tcgplayer_id);
  const matchedCardPrintId = extractMatchedCardPrintId(payload);
  const matchedCardPrintingId = extractMatchedCardPrintingId(payload);
  const desiredImageUrl = extractPublicImageUrl(payload);

  const [matchedCardPrint, matchedCardPrinting, finishRow] = await Promise.all([
    fetchCardPrintById(admin, matchedCardPrintId ?? detail.candidate.promoted_card_print_id),
    fetchCardPrintingById(admin, matchedCardPrintingId ?? detail.candidate.promoted_card_printing_id),
    fetchFinishKey(admin, finishKey),
  ]);

  const parentCardPrintId = matchedCardPrinting?.card_print_id ?? matchedCardPrint?.id ?? null;
  const parentCardPrint =
    matchedCardPrint?.id === parentCardPrintId
      ? matchedCardPrint
      : await fetchCardPrintById(admin, parentCardPrintId);

  const setRows = setCode ? await fetchSetByCode(admin, setCode) : [];
  const setRow =
    setRows.length === 1
      ? setRows[0]
      : await fetchSetById(admin, parentCardPrint?.set_id ?? null);

  const baseRows = buildBaseRows(detail, detail.currentStagingRow?.execution_status ?? "review-only state");
  const finishLabel = finishRow?.label ?? humanizeToken(finishKey);
  const candidateTypeLabel = formatCandidateTypeLabel(actionType);
  const actionTypeLabel = formatActionTypeLabel(actionType);
  const visibleHints = getVisibleIdentityHints(payload);
  const displayName =
    normalizeTextOrNull(parentCardPrint?.name) ||
    cardName ||
    normalizeTextOrNull(visibleHints?.card_name);
  const setDisplay =
    formatSetDisplay(setRow, setCode) ||
    normalizeTextOrNull(visibleHints?.set_hint);
  const printedNumber =
    normalizeTextOrNull(parentCardPrint?.number) ||
    normalizeTextOrNull(parentCardPrint?.number_plain) ||
    numberPlain ||
    normalizeTextOrNull(visibleHints?.printed_number) ||
    normalizeTextOrNull(visibleHints?.printed_number_plain);
  const variantLabel = humanizeToken(parentCardPrint?.variant_key);
  const previewImageFromCanon = await resolveCanonImageUrlV1(parentCardPrint);

  let previewImageUrl: string | null = null;
  let imageOriginLabel: string | null = null;
  let decisionSummary = "";
  let writePlanSummary = "";
  let resultPreviewType: string | null = null;
  let rows: FounderPromotionPlanRow[] = [];
  let rawPlan: JsonRecord | null = null;
  let comparisonSummary = "";
  let existing: string[] = [];
  let introduced: string[] = [];
  let delta: string[] = [];
  let unresolvedReasonCode: string | null = null;
  let unresolvedMissingFields: string[] = [];
  let unresolvedNextActions: string[] = [];

  if (actionType === "CREATE_CARD_PRINT") {
    if (!setCode || !cardName || !numberPlain) {
      const missingFields = [
        !setCode ? "set code" : null,
        !cardName ? "card name" : null,
        !numberPlain ? "printed number" : null,
      ].filter(Boolean) as string[];

      decisionSummary = "Promotion is unresolved because the staging payload does not yet describe a complete canonical parent card.";
      writePlanSummary = "card_print creation is unresolved until set code, card name, and printed number are all present.";
      rows = [
        buildPlanRow(
          "card_prints",
          "UNRESOLVED",
          "Card print",
          `Missing required parent identity fields: ${missingFields.join(", ")}.`,
          null,
        ),
        buildPlanRow(
          "card_printings",
          "NONE",
          "Card printing",
          "This action path does not create a child printing.",
          null,
        ),
        buildPlanRow(
          "image_fields",
          "NONE",
          "Image fields",
          "Promotion Executor V1 does not attach canon image fields during CREATE_CARD_PRINT.",
          null,
        ),
        ...baseRows,
      ];
      rawPlan = {
        action_type: actionType,
        unresolved_reason: "missing_parent_identity_fields",
        missing_fields: missingFields,
      };
      unresolvedReasonCode = "missing_parent_identity_fields";
      unresolvedMissingFields = missingFields;
      unresolvedNextActions = [
        "Review evidence to identify the set code, card name, and printed number.",
        "Run classification again after the parent identity fields are documented.",
      ];
      comparisonSummary = "No decision-grade parent write can be shown because the candidate still lacks required canonical identity fields.";
      delta = ["A canonical parent row cannot be created until the missing identity fields are resolved."];
      previewImageUrl = frontEvidenceUrl ?? previewImageFromCanon ?? null;
      imageOriginLabel = frontEvidenceUrl ? "Warehouse front evidence" : previewImageFromCanon ? "Existing canon image" : null;
    } else if (setRows.length !== 1) {
      decisionSummary = "Promotion is unresolved because the canonical set target does not resolve to exactly one active set row.";
      writePlanSummary = "Set resolution must converge before founder approval can rely on this write plan.";
      rows = [
        buildPlanRow(
          "card_prints",
          "UNRESOLVED",
          "Card print",
          `Set lookup for ${setCode.toUpperCase()} returned ${setRows.length} rows.`,
          null,
          [{ label: "set_code", value: setCode }],
        ),
        buildPlanRow(
          "card_printings",
          "NONE",
          "Card printing",
          "This action path does not create a child printing.",
          null,
        ),
        buildPlanRow(
          "image_fields",
          "NONE",
          "Image fields",
          "Promotion Executor V1 does not attach canon image fields during CREATE_CARD_PRINT.",
          null,
        ),
        ...baseRows,
      ];
      rawPlan = {
        action_type: actionType,
        unresolved_reason: "set_resolution_failed",
        set_code: setCode,
        set_row_count: setRows.length,
      };
      unresolvedReasonCode = "set_resolution_failed";
      unresolvedMissingFields = [setRows.length === 0 ? "Resolved canon set" : "Single canon set target"];
      unresolvedNextActions = [
        "Verify the resolved set against the visible evidence.",
        "Resolve the canon set target before staging a new parent card.",
      ];
      comparisonSummary = `The parent card identity points at set ${setCode.toUpperCase()}, but that set does not resolve cleanly in canon yet.`;
      delta = ["No canonical parent row will be written until set resolution is unique."];
      previewImageUrl = frontEvidenceUrl ?? previewImageFromCanon ?? null;
      imageOriginLabel = frontEvidenceUrl ? "Warehouse front evidence" : previewImageFromCanon ? "Existing canon image" : null;
    } else {
      const setTarget = setRows[0];
      const existingRows = await fetchExistingCardPrints(admin, setTarget.id, numberPlain);
      const existingRow = existingRows[0] ?? null;

      if (existingRows.length > 1) {
        decisionSummary = "Promotion is unresolved because canon already has multiple parent candidates for this set and number.";
        writePlanSummary = "Duplicate base card rows must be resolved before founder approval can rely on this write plan.";
        rows = [
          buildPlanRow(
            "card_prints",
            "UNRESOLVED",
            "Card print",
            `Found ${existingRows.length} canonical parent candidates for ${setTarget.code.toUpperCase()} #${numberPlain}.`,
            null,
            [{ label: "set_code", value: setTarget.code }, { label: "number_plain", value: numberPlain }],
          ),
          buildPlanRow(
            "card_printings",
            "NONE",
            "Card printing",
            "This action path does not create a child printing.",
            null,
          ),
          buildPlanRow(
            "image_fields",
            "NONE",
            "Image fields",
            "Promotion Executor V1 does not attach canon image fields during CREATE_CARD_PRINT.",
            null,
          ),
          ...baseRows,
        ];
        rawPlan = {
          action_type: actionType,
          unresolved_reason: "duplicate_existing_card_prints",
          set_code: setTarget.code,
          number_plain: numberPlain,
          existing_card_print_ids: existingRows.map((row) => row.id),
        };
        unresolvedReasonCode = "duplicate_existing_card_prints";
        unresolvedMissingFields = ["Single canonical parent target"];
        unresolvedNextActions = [
          "Inspect the conflicting parent card rows already in canon.",
          "Resolve the duplicate parent target before approving staging.",
        ];
        comparisonSummary = "Canon already contains conflicting parent candidates, so this screen cannot present a lawful single-row write plan.";
        existing = existingRows.map((row) => describeCardPrint(row, setTarget)).filter(Boolean) as string[];
        delta = ["No new parent row should be written until the duplicate canonical candidates are resolved."];
        previewImageUrl = frontEvidenceUrl ?? previewImageFromCanon ?? null;
        imageOriginLabel = frontEvidenceUrl ? "Warehouse front evidence" : previewImageFromCanon ? "Existing canon image" : null;
      } else if (existingRow && normalizeNameKey(existingRow.name) !== normalizeNameKey(cardName)) {
        decisionSummary = "Promotion is unresolved because the existing canonical parent name conflicts with the staged parent name.";
        writePlanSummary = "Name conflict must be resolved before founder approval can rely on this write plan.";
        rows = [
          buildPlanRow(
            "card_prints",
            "UNRESOLVED",
            "Card print",
            "Existing canonical row conflicts with the staged card name.",
            existingRow.id,
            [
              { label: "existing_name", value: normalizeTextOrNull(existingRow.name) },
              { label: "staged_name", value: cardName },
              { label: "set_code", value: setTarget.code },
              { label: "number_plain", value: numberPlain },
            ],
          ),
          buildPlanRow("card_printings", "NONE", "Card printing", "This action path does not create a child printing.", null),
          buildPlanRow("image_fields", "NONE", "Image fields", "Promotion Executor V1 does not attach canon image fields during CREATE_CARD_PRINT.", null),
          ...baseRows,
        ];
        rawPlan = {
          action_type: actionType,
          unresolved_reason: "existing_card_print_name_conflict",
          existing_card_print_id: existingRow.id,
          existing_name: existingRow.name,
          staged_name: cardName,
        };
        unresolvedReasonCode = "existing_card_print_name_conflict";
        unresolvedMissingFields = ["Confirmed parent identity delta"];
        unresolvedNextActions = [
          "Review the evidence to confirm whether this is a distinct canonical card or a misresolved target.",
          "Do not stage until the parent identity conflict is resolved.",
        ];
        comparisonSummary = "A parent row already exists at this set and number, but the staged name does not match canon.";
        existing = [describeCardPrint(existingRow, setTarget)].filter(Boolean) as string[];
        delta = ["No canonical parent row should be written until the name conflict is resolved."];
        const existingCanonImageUrl = await resolveCanonImageUrlV1(existingRow);
        previewImageUrl = existingCanonImageUrl ?? frontEvidenceUrl ?? null;
        imageOriginLabel = existingCanonImageUrl ? "Existing canon image" : frontEvidenceUrl ? "Warehouse front evidence" : null;
      } else if (
        existingRow &&
        tcgplayerId &&
        normalizeTextOrNull(existingRow.tcgplayer_id) &&
        normalizeTextOrNull(existingRow.tcgplayer_id) !== tcgplayerId
      ) {
        decisionSummary = "Promotion is unresolved because the existing canonical parent row carries a conflicting TCGPlayer ID.";
        writePlanSummary = "External identity conflict must be resolved before founder approval can rely on this write plan.";
        rows = [
          buildPlanRow(
            "card_prints",
            "UNRESOLVED",
            "Card print",
            "Existing canonical row conflicts with the staged TCGPlayer reference.",
            existingRow.id,
            [
              { label: "existing_tcgplayer_id", value: normalizeTextOrNull(existingRow.tcgplayer_id) },
              { label: "staged_tcgplayer_id", value: tcgplayerId },
            ],
          ),
          buildPlanRow("card_printings", "NONE", "Card printing", "This action path does not create a child printing.", null),
          buildPlanRow("image_fields", "NONE", "Image fields", "Promotion Executor V1 does not attach canon image fields during CREATE_CARD_PRINT.", null),
          ...baseRows,
        ];
        rawPlan = {
          action_type: actionType,
          unresolved_reason: "existing_card_print_tcgplayer_conflict",
          existing_card_print_id: existingRow.id,
          existing_tcgplayer_id: existingRow.tcgplayer_id,
          staged_tcgplayer_id: tcgplayerId,
        };
        unresolvedReasonCode = "existing_card_print_tcgplayer_conflict";
        unresolvedMissingFields = ["Consistent external reference"];
        unresolvedNextActions = [
          "Verify the external reference against the intended canon target.",
          "Resolve the reference conflict before staging this candidate.",
        ];
        comparisonSummary = "Canon already has a matching parent row, but the staged external identity conflicts with the existing TCGPlayer reference.";
        existing = [describeCardPrint(existingRow, setTarget)].filter(Boolean) as string[];
        delta = ["No canonical parent row should be written until the external identity conflict is resolved."];
        const existingCanonImageUrl = await resolveCanonImageUrlV1(existingRow);
        previewImageUrl = existingCanonImageUrl ?? frontEvidenceUrl ?? null;
        imageOriginLabel = existingCanonImageUrl ? "Existing canon image" : frontEvidenceUrl ? "Warehouse front evidence" : null;
      } else if (existingRow) {
        resultPreviewType = "NO_OP";
        decisionSummary = "Canon already contains the parent card this candidate resolves to. Promotion would reuse that row and write no new parent identity.";
        writePlanSummary = "Executor would succeed as NO_OP because the canonical parent row already exists.";
        rows = [
          buildPlanRow(
            "card_prints",
            "REUSE",
            "Card print",
            "Existing canonical parent row already matches the staged identity.",
            existingRow.id,
            [
              { label: "set_code", value: setTarget.code },
              { label: "number_plain", value: numberPlain },
              { label: "name", value: cardName },
              { label: "tcgplayer_id", value: tcgplayerId },
            ],
          ),
          buildPlanRow("card_printings", "NONE", "Card printing", "This action path does not create a child printing.", null),
          buildPlanRow("image_fields", "NONE", "Image fields", "Promotion Executor V1 does not attach canon image fields during CREATE_CARD_PRINT.", null),
          ...baseRows,
        ];
        rawPlan = {
          action_type: actionType,
          plan: "existing_card_print_noop",
          result_type_preview: resultPreviewType,
          target_card_print_id: existingRow.id,
          set_code: setTarget.code,
          number_plain: numberPlain,
          card_name: cardName,
        };
        comparisonSummary = "This candidate does not introduce a new parent canonical row. Canon already has the resolved card.";
        existing = [describeCardPrint(existingRow, setTarget)].filter(Boolean) as string[];
        introduced = ["No new canonical parent row would be created."];
        delta = ["Promotion would reuse the existing parent card and leave child/image tables untouched."];
        const existingCanonImageUrl = await resolveCanonImageUrlV1(existingRow);
        previewImageUrl = existingCanonImageUrl ?? frontEvidenceUrl ?? null;
        imageOriginLabel = existingCanonImageUrl ? "Existing canon image" : frontEvidenceUrl ? "Warehouse front evidence" : null;
      } else {
        resultPreviewType = "CARD_PRINT_CREATED";
        decisionSummary = "Promotion would create one new canonical parent card row.";
        writePlanSummary = "Executor would insert a new card_print row and leave child/image tables untouched in V1.";
        rows = [
          buildPlanRow(
            "card_prints",
            "CREATE",
            "Card print",
            "A new canonical parent row would be inserted.",
            `${setTarget.code.toUpperCase()} #${numberPlain}`,
            [
              { label: "set_code", value: setTarget.code },
              { label: "number", value: numberPlain },
              { label: "variant_key", value: "" },
              { label: "name", value: cardName },
              { label: "rarity", value: extractRarityHint(payload) },
              { label: "tcgplayer_id", value: tcgplayerId },
            ],
          ),
          buildPlanRow("card_printings", "NONE", "Card printing", "This action path does not create a child printing.", null),
          buildPlanRow("image_fields", "NONE", "Image fields", "Promotion Executor V1 does not attach canon image fields during CREATE_CARD_PRINT.", null),
          ...baseRows,
        ];
        rawPlan = {
          action_type: actionType,
          plan: "insert_card_print",
          result_type_preview: resultPreviewType,
          mutation: {
            set_code: setTarget.code,
            number: numberPlain,
            variant_key: "",
            name: cardName,
            rarity: extractRarityHint(payload),
            tcgplayer_id: tcgplayerId,
          },
        };
        comparisonSummary = "No canonical parent row exists yet at this set and number. Promotion would create one new parent record.";
        introduced = [[cardName, formatSetDisplay(setTarget, setTarget.code), `#${numberPlain}`].filter(Boolean).join(" • ")];
        delta = ["This candidate introduces a new canonical parent card identity."];
        if (tcgplayerId) {
          delta.push("The TCGPlayer reference would be stored directly on card_prints.tcgplayer_id.");
        }
        previewImageUrl = frontEvidenceUrl ?? null;
        imageOriginLabel = frontEvidenceUrl ? "Warehouse front evidence" : null;
      }
    }
  } else if (actionType === "CREATE_CARD_PRINTING") {
    if (!parentCardPrintId || !parentCardPrint) {
      decisionSummary = "Promotion is unresolved because no lawful parent card_print target is present in the staged payload.";
      writePlanSummary = "Parent card_print resolution must succeed before a child printing can be created or reused.";
      rows = [
        buildPlanRow("card_prints", "UNRESOLVED", "Parent card print", "No resolved parent card_print target was found in the staged payload.", null),
        buildPlanRow("card_printings", "UNRESOLVED", "Card printing", "Child printing creation depends on a resolved parent card_print target.", null),
        buildPlanRow("image_fields", "NONE", "Image fields", "This action path does not update canon image fields.", null),
        ...baseRows,
      ];
      rawPlan = {
        action_type: actionType,
        unresolved_reason: "parent_card_print_missing_from_payload",
      };
      unresolvedReasonCode = "parent_card_print_missing_from_payload";
      unresolvedMissingFields = ["Parent card_print target"];
      unresolvedNextActions = [
        "Resolve the parent canon card before staging a child printing.",
        "Run classification again after the parent target is explicit.",
      ];
      comparisonSummary = "The candidate appears to require a child printing, but the parent canonical row is not resolved yet.";
      delta = ["No child printing should be written until the parent card is resolved."];
      previewImageUrl = frontEvidenceUrl ?? previewImageFromCanon ?? null;
      imageOriginLabel = frontEvidenceUrl ? "Warehouse front evidence" : previewImageFromCanon ? "Existing canon image" : null;
    } else if (!finishKey || !finishRow?.is_active) {
      decisionSummary = "Promotion is unresolved because the finish target is missing or inactive.";
      writePlanSummary = "Finish resolution must succeed before a child printing can be created or reused.";
      rows = [
        buildPlanRow(
          "card_prints",
          "REUSE",
          "Parent card print",
          "Existing canonical parent row is resolved and would be reused.",
          parentCardPrint.id,
          [{ label: "parent_card_print_id", value: parentCardPrint.id }],
        ),
        buildPlanRow(
          "card_printings",
          "UNRESOLVED",
          "Card printing",
          "No active finish key was resolved for the child printing.",
          null,
          [{ label: "finish_key", value: finishKey }],
        ),
        buildPlanRow("image_fields", "NONE", "Image fields", "This action path does not update canon image fields.", null),
        ...baseRows,
      ];
      rawPlan = {
        action_type: actionType,
        unresolved_reason: "finish_key_not_found",
        parent_card_print_id: parentCardPrint.id,
        finish_key: finishKey,
      };
      unresolvedReasonCode = "finish_key_not_found";
      unresolvedMissingFields = ["Finish key"];
      unresolvedNextActions = [
        "Review evidence to determine the exact finish or child-printing distinction.",
        "Do not stage until the finish key is explicit and active.",
      ];
      comparisonSummary = "The parent card exists, but the candidate does not yet resolve to a lawful finish target.";
      existing = [describeCardPrint(parentCardPrint, setRow)].filter(Boolean) as string[];
      delta = ["No child printing should be written until the finish target is resolved."];
      const parentCanonImageUrl = await resolveCanonImageUrlV1(parentCardPrint);
      previewImageUrl = parentCanonImageUrl ?? frontEvidenceUrl ?? null;
      imageOriginLabel = parentCanonImageUrl ? "Existing canon image" : frontEvidenceUrl ? "Warehouse front evidence" : null;
    } else {
      const existingPrinting = await fetchExistingCardPrinting(admin, parentCardPrint.id, finishKey);

      if (existingPrinting) {
        resultPreviewType = "NO_OP";
        decisionSummary = "Canon already contains this child printing. Promotion would reuse the existing child row.";
        writePlanSummary = "Executor would succeed as NO_OP because the child printing already exists.";
        rows = [
          buildPlanRow(
            "card_prints",
            "REUSE",
            "Parent card print",
            "Existing canonical parent row would be reused.",
            parentCardPrint.id,
            [{ label: "parent_card_print_id", value: parentCardPrint.id }],
          ),
          buildPlanRow(
            "card_printings",
            "REUSE",
            "Card printing",
            "Existing child printing already satisfies the staged finish.",
            existingPrinting.id,
            [
              { label: "finish_key", value: finishKey },
              { label: "finish_label", value: finishLabel },
            ],
          ),
          buildPlanRow("image_fields", "NONE", "Image fields", "This action path does not update canon image fields.", null),
          ...baseRows,
        ];
        rawPlan = {
          action_type: actionType,
          plan: "existing_card_printing_noop",
          result_type_preview: resultPreviewType,
          parent_card_print_id: parentCardPrint.id,
          result_card_printing_id: existingPrinting.id,
          finish_key: finishKey,
        };
        comparisonSummary = "The parent card already exists and the requested child finish already exists. No new child printing would be written.";
        existing = [
          describeCardPrint(parentCardPrint, setRow),
          describeCardPrinting(existingPrinting, parentCardPrint, setRow, finishLabel),
        ].filter(Boolean) as string[];
        introduced = ["No new child printing would be created."];
        delta = ["Promotion would reuse the existing child printing and leave parent/image tables untouched."];
      } else {
        resultPreviewType = "CARD_PRINTING_CREATED";
        decisionSummary = "Promotion would reuse the parent card and create one new child printing.";
        writePlanSummary = "Executor would insert a new card_printing row under the resolved parent card.";
        rows = [
          buildPlanRow(
            "card_prints",
            "REUSE",
            "Parent card print",
            "Existing canonical parent row would be reused.",
            parentCardPrint.id,
            [{ label: "parent_card_print_id", value: parentCardPrint.id }],
          ),
          buildPlanRow(
            "card_printings",
            "CREATE",
            "Card printing",
            "A new child printing would be inserted for the resolved finish.",
            `${parentCardPrint.id} • ${finishKey}`,
            [
              { label: "card_print_id", value: parentCardPrint.id },
              { label: "finish_key", value: finishKey },
              { label: "finish_label", value: finishLabel },
              { label: "is_provisional", value: "false" },
              { label: "provenance_source", value: "contract" },
              {
                label: "provenance_ref",
                value: detail.currentStagingRow ? `warehouse_staging:${detail.currentStagingRow.id}` : "warehouse_staging:<staging-id>",
              },
            ],
          ),
          buildPlanRow("image_fields", "NONE", "Image fields", "This action path does not update canon image fields.", null),
          ...baseRows,
        ];
        rawPlan = {
          action_type: actionType,
          plan: "insert_card_printing",
          result_type_preview: resultPreviewType,
          mutation: {
            card_print_id: parentCardPrint.id,
            finish_key: finishKey,
            is_provisional: false,
            provenance_source: "contract",
            provenance_ref: detail.currentStagingRow ? `warehouse_staging:${detail.currentStagingRow.id}` : "warehouse_staging:<staging-id>",
            created_by: "promotion_executor_v1",
          },
        };
        comparisonSummary = "The parent card already exists, but the requested child finish does not. Promotion would add that child printing only.";
        existing = [describeCardPrint(parentCardPrint, setRow)].filter(Boolean) as string[];
        introduced = [`${normalizeTextOrNull(parentCardPrint.name) ?? "Unknown card"} • ${finishLabel ?? finishKey ?? "Unknown finish"} child printing`];
        delta = ["Parent card_print is reused; only the child printing layer changes."];
      }

      const parentCanonImageUrl = await resolveCanonImageUrlV1(parentCardPrint);
      previewImageUrl = parentCanonImageUrl ?? frontEvidenceUrl ?? null;
      imageOriginLabel = parentCanonImageUrl ? "Existing canon image" : frontEvidenceUrl ? "Warehouse front evidence" : null;
    }
  } else {
    const targetCardPrint = parentCardPrint;
    const targetImageUrl = await resolveCanonImageUrlV1(targetCardPrint);
    const currentPrimaryImage = normalizeTextOrNull(targetCardPrint?.image_url);
    const currentAltImage = normalizeTextOrNull(targetCardPrint?.image_alt_url);
    const targetDisplay = describeCardPrint(targetCardPrint, setRow);

    if (!targetCardPrint) {
      decisionSummary = "Promotion is unresolved because no lawful canon image target exists in the staged payload.";
      writePlanSummary = "Image repair requires a resolved card_print target.";
      rows = [
        buildPlanRow("card_prints", "UNRESOLVED", "Target card print", "No resolved card_print target was found for image repair.", null),
        buildPlanRow("card_printings", "NONE", "Card printing", "This action path does not create or update child printings.", null),
        buildPlanRow("image_fields", "UNRESOLVED", "Image fields", "No lawful card_print target exists for the image update.", null),
        ...baseRows,
      ];
      rawPlan = {
        action_type: actionType,
        unresolved_reason: "image_target_missing_from_payload",
      };
      unresolvedReasonCode = "image_target_missing_from_payload";
      unresolvedMissingFields = [
        detail.candidate.submission_intent === "MISSING_IMAGE" && !detail.candidate.tcgplayer_id
          ? "TCGPlayer ID"
          : "Resolved canon image target",
      ];
      unresolvedNextActions = [
        detail.candidate.submission_intent === "MISSING_IMAGE" && !detail.candidate.tcgplayer_id
          ? "Provide external reference context for the missing-image submission."
          : "Resolve the exact canon image target before staging image repair.",
        "Run classification again after the image target can be resolved.",
      ];
      comparisonSummary = "The candidate appears to be an image repair, but the canonical image target is not resolved yet.";
      delta = ["No canon image field should be touched until the target card is resolved."];
      previewImageUrl = frontEvidenceUrl ?? null;
      imageOriginLabel = frontEvidenceUrl ? "Warehouse front evidence" : null;
    } else if (desiredImageUrl && (currentPrimaryImage === desiredImageUrl || currentAltImage === desiredImageUrl)) {
      resultPreviewType = "NO_OP";
      decisionSummary = "Canon already contains the same image URL this candidate would attach. Promotion would succeed as NO_OP.";
      writePlanSummary = "Executor would reuse the existing canon image and write no new image field.";
      rows = [
        buildPlanRow("card_prints", "REUSE", "Target card print", "Existing canonical target would be reused.", targetCardPrint.id, [{ label: "target_card_print_id", value: targetCardPrint.id }]),
        buildPlanRow("card_printings", "NONE", "Card printing", "This action path does not create or update child printings.", null),
        buildPlanRow("image_fields", "NONE", "Image fields", "The staged image already matches a canon image field.", targetCardPrint.id, [{ label: "desired_image_url", value: desiredImageUrl }]),
        ...baseRows,
      ];
      rawPlan = {
        action_type: actionType,
        plan: "canon_image_existing_noop",
        result_type_preview: resultPreviewType,
        target_card_print_id: targetCardPrint.id,
        desired_image_url: desiredImageUrl,
      };
      comparisonSummary = "The canonical card already has the image the staged payload wants to attach.";
      existing = [targetDisplay].filter(Boolean) as string[];
      introduced = ["No new canon image change would be written."];
      delta = ["Identity stays unchanged and the current canon image already satisfies staged intent."];
      previewImageUrl = targetImageUrl ?? frontEvidenceUrl ?? desiredImageUrl;
      imageOriginLabel = targetImageUrl ? "Existing canon image" : frontEvidenceUrl ? "Warehouse front evidence" : desiredImageUrl ? "Staged image target" : null;
    } else if (!desiredImageUrl && targetImageUrl) {
      resultPreviewType = "NO_OP";
      decisionSummary = "Canon already has a usable image on the resolved target. Promotion would succeed as NO_OP.";
      writePlanSummary = "Executor would reuse the existing canon image because no new public image URL exists in the staged payload.";
      rows = [
        buildPlanRow("card_prints", "REUSE", "Target card print", "Existing canonical target would be reused.", targetCardPrint.id, [{ label: "target_card_print_id", value: targetCardPrint.id }]),
        buildPlanRow("card_printings", "NONE", "Card printing", "This action path does not create or update child printings.", null),
        buildPlanRow("image_fields", "NONE", "Image fields", "No public image URL is present in the staged payload, but canon already has a usable image.", targetCardPrint.id),
        ...baseRows,
      ];
      rawPlan = {
        action_type: actionType,
        plan: "canon_image_already_present_noop",
        result_type_preview: resultPreviewType,
        target_card_print_id: targetCardPrint.id,
      };
      comparisonSummary = "The canonical card already has a usable image, so this candidate would not change canon image fields.";
      existing = [targetDisplay].filter(Boolean) as string[];
      introduced = ["No new canon image change would be written."];
      delta = ["Identity stays unchanged and existing canon media already satisfies staged intent."];
      previewImageUrl = targetImageUrl ?? frontEvidenceUrl ?? null;
      imageOriginLabel = targetImageUrl ? "Existing canon image" : frontEvidenceUrl ? "Warehouse front evidence" : null;
    } else if (!desiredImageUrl) {
      decisionSummary = "Promotion is unresolved because the staged payload does not yet expose a public image URL for canon attachment.";
      writePlanSummary = "Image repair is blocked until the staged payload contains a public image URL the executor can apply.";
      rows = [
        buildPlanRow("card_prints", "REUSE", "Target card print", "Existing canonical target is resolved and would be reused.", targetCardPrint.id, [{ label: "target_card_print_id", value: targetCardPrint.id }]),
        buildPlanRow("card_printings", "NONE", "Card printing", "This action path does not create or update child printings.", null),
        buildPlanRow("image_fields", "UNRESOLVED", "Image fields", "Executor has no public image URL in the staged payload, so image repair would fail closed.", targetCardPrint.id),
        ...baseRows,
      ];
      rawPlan = {
        action_type: actionType,
        unresolved_reason: "image_url_missing_from_payload",
        target_card_print_id: targetCardPrint.id,
      };
      unresolvedReasonCode = "image_url_missing_from_payload";
      unresolvedMissingFields = ["Public image URL"];
      unresolvedNextActions = [
        "Provide a lawful public image URL the executor can attach to canon.",
        "Re-stage only after the image source is executor-ready.",
      ];
      comparisonSummary = "The canonical card exists, but the staged payload does not yet expose a lawful image URL the executor can write.";
      existing = [targetDisplay].filter(Boolean) as string[];
      delta = ["Identity stays unchanged, but image repair cannot proceed until the staged payload exposes a public image URL."];
      previewImageUrl = frontEvidenceUrl ?? targetImageUrl ?? null;
      imageOriginLabel = frontEvidenceUrl ? "Warehouse front evidence" : targetImageUrl ? "Existing canon image" : null;
    } else if (!isUsablePublicImageUrl(currentPrimaryImage)) {
      resultPreviewType = "CANON_IMAGE_ENRICHED";
      decisionSummary = "Promotion would repair the primary canon image on the resolved target card.";
      writePlanSummary = "Executor would update card_prints.image_url and leave all identity rows untouched.";
      rows = [
        buildPlanRow("card_prints", "REUSE", "Target card print", "Existing canonical target would be reused.", targetCardPrint.id, [{ label: "target_card_print_id", value: targetCardPrint.id }]),
        buildPlanRow("card_printings", "NONE", "Card printing", "This action path does not create or update child printings.", null),
        buildPlanRow("image_fields", "UPDATE", "Image fields", "Primary canon image would be updated from staged evidence.", targetCardPrint.id, [
          { label: "field", value: "image_url" },
          { label: "desired_image_url", value: desiredImageUrl },
        ]),
        ...baseRows,
      ];
      rawPlan = {
        action_type: actionType,
        plan: "update_card_print_image_url",
        result_type_preview: resultPreviewType,
        target_card_print_id: targetCardPrint.id,
        desired_image_url: desiredImageUrl,
      };
      comparisonSummary = "The canonical card already exists. Promotion would repair only the primary image field.";
      existing = [targetDisplay].filter(Boolean) as string[];
      introduced = ["A new primary canon image would be attached from staged evidence."];
      delta = ["Identity stays unchanged; only card_prints.image_url changes."];
      previewImageUrl = desiredImageUrl ?? frontEvidenceUrl ?? targetImageUrl ?? null;
      imageOriginLabel = desiredImageUrl ? "Planned canon image" : frontEvidenceUrl ? "Warehouse front evidence" : targetImageUrl ? "Existing canon image" : null;
    } else if (!isUsablePublicImageUrl(currentAltImage)) {
      resultPreviewType = "CANON_IMAGE_ENRICHED";
      decisionSummary = "Promotion would attach a secondary canon image on the resolved target card.";
      writePlanSummary = "Executor would update card_prints.image_alt_url and leave all identity rows untouched.";
      rows = [
        buildPlanRow("card_prints", "REUSE", "Target card print", "Existing canonical target would be reused.", targetCardPrint.id, [{ label: "target_card_print_id", value: targetCardPrint.id }]),
        buildPlanRow("card_printings", "NONE", "Card printing", "This action path does not create or update child printings.", null),
        buildPlanRow("image_fields", "UPDATE", "Image fields", "Secondary canon image would be updated from staged evidence.", targetCardPrint.id, [
          { label: "field", value: "image_alt_url" },
          { label: "desired_image_url", value: desiredImageUrl },
        ]),
        ...baseRows,
      ];
      rawPlan = {
        action_type: actionType,
        plan: "update_card_print_image_alt_url",
        result_type_preview: resultPreviewType,
        target_card_print_id: targetCardPrint.id,
        desired_image_url: desiredImageUrl,
      };
      comparisonSummary = "The canonical card already exists. Promotion would add the missing secondary image field only.";
      existing = [targetDisplay].filter(Boolean) as string[];
      introduced = ["A secondary canon image would be attached from staged evidence."];
      delta = ["Identity stays unchanged; only card_prints.image_alt_url changes."];
      previewImageUrl = desiredImageUrl ?? frontEvidenceUrl ?? targetImageUrl ?? null;
      imageOriginLabel = desiredImageUrl ? "Planned canon image" : frontEvidenceUrl ? "Warehouse front evidence" : targetImageUrl ? "Existing canon image" : null;
    } else {
      decisionSummary = "Promotion is unresolved because the resolved canon target already has distinct primary and alternate images.";
      writePlanSummary = "Image repair would fail closed because executor will not replace distinct existing canon images in V1.";
      rows = [
        buildPlanRow("card_prints", "REUSE", "Target card print", "Existing canonical target would be reused.", targetCardPrint.id, [{ label: "target_card_print_id", value: targetCardPrint.id }]),
        buildPlanRow("card_printings", "NONE", "Card printing", "This action path does not create or update child printings.", null),
        buildPlanRow("image_fields", "UNRESOLVED", "Image fields", "Target already has distinct primary and alternate canon images, so executor will fail closed.", targetCardPrint.id),
        ...baseRows,
      ];
      rawPlan = {
        action_type: actionType,
        unresolved_reason: "image_target_already_has_distinct_images",
        target_card_print_id: targetCardPrint.id,
      };
      unresolvedReasonCode = "image_target_already_has_distinct_images";
      unresolvedMissingFields = ["Lawful image delta"];
      unresolvedNextActions = [
        "Review whether this candidate should remain an image repair.",
        "Do not overwrite distinct canon images in V1 without a clearer action path.",
      ];
      comparisonSummary = "The canonical card already has two distinct image fields, so V1 will not overwrite either one.";
      existing = [targetDisplay].filter(Boolean) as string[];
      delta = ["Identity stays unchanged and image repair is blocked to prevent unintended canon media overwrite."];
      previewImageUrl = targetImageUrl ?? frontEvidenceUrl ?? null;
      imageOriginLabel = targetImageUrl ? "Existing canon image" : frontEvidenceUrl ? "Warehouse front evidence" : null;
    }
  }

  const unresolved =
    rows.some((row) => row.status === "UNRESOLVED")
      ? buildUnresolvedReview(detail, {
          reasonCode:
            unresolvedReasonCode ??
            normalizeTextOrNull(asRecord(rawPlan)?.unresolved_reason) ??
            payloadReason,
          detailExplanation: decisionSummary,
          missingFields: unresolvedMissingFields,
          nextActions: unresolvedNextActions,
        })
      : null;

  return {
    payloadSource,
    payloadStatus: "READY",
    payloadReason,
    actionType,
    actionTypeLabel,
    candidateTypeLabel,
    decisionSummary,
    preview: {
      imageUrl: previewImageUrl,
      imageOriginLabel,
      frontEvidenceUrl,
      backEvidenceUrl,
      displayName,
      setDisplay,
      printedNumber,
      variantLabel,
      finishLabel: actionType === "CREATE_CARD_PRINTING" ? finishLabel : null,
      candidateTypeLabel,
      unresolvedReason: unresolved?.founder_explanation ?? null,
    },
    writePlan: {
      status: rows.some((row) => row.status === "UNRESOLVED") ? "UNRESOLVED" : "READY",
      summary: writePlanSummary,
      resultPreviewType,
      raw: rawPlan,
      rows,
    },
    comparison: {
      summary: comparisonSummary,
      existing,
      introduced,
      delta,
    },
    references: {
      setCode,
      matchedCardPrintId: matchedCardPrint?.id ?? matchedCardPrintId,
      matchedCardPrintingId: matchedCardPrinting?.id ?? matchedCardPrintingId,
      finishKey,
      tcgplayerId,
    },
    unresolved,
  };
}
