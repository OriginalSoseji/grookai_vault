import "server-only";

import type {
  FounderPromotionReviewModel,
  FounderUnresolvedBlockingReasonCode,
} from "@/lib/warehouse/buildFounderPromotionReview";
import {
  asPrintedModifierRecord,
  getPrintedModifierLabel,
  isReadyStampPrintedModifier,
  normalizePrintedModifierVariantKey,
} from "@/lib/warehouse/printedIdentityModel";
import {
  extractPerfectOrderVariantIdentityFromClassificationPackage,
  type PerfectOrderVariantIdentity,
} from "@/lib/warehouse/perfectOrderVariantIdentity";

type JsonRecord = Record<string, unknown>;

type InterpreterCandidate = {
  id: string;
  state: string;
  notes: string;
  tcgplayer_id: string | null;
  submission_intent: string;
  current_review_hold_reason: string | null;
  interpreter_decision: string | null;
  interpreter_reason_code: string | null;
  interpreter_explanation: string | null;
  interpreter_resolved_finish_key: string | null;
  needs_promotion_review: boolean | null;
  proposed_action_type: string | null;
  current_staging_id: string | null;
  promotion_result_type: string | null;
  promoted_card_print_id: string | null;
  promoted_card_printing_id: string | null;
  promoted_image_target_type: string | null;
  promoted_image_target_id: string | null;
};

type InterpreterEvidenceRow = {
  evidence_slot: string | null;
  previews: Array<{ label: string; url: string }>;
};

type InterpreterStagingRow = {
  id: string;
  approved_action_type: string;
  execution_status: string;
} | null;

type WarehouseInterpreterInput = {
  candidate: InterpreterCandidate;
  evidenceRows: InterpreterEvidenceRow[];
  latestMetadataExtractionPackage?: JsonRecord | null;
  latestNormalizedPackage: JsonRecord | null;
  latestClassificationPackage: JsonRecord | null;
  currentStagingRow: InterpreterStagingRow;
  promotionReview: FounderPromotionReviewModel | null;
};

export type WarehouseInterpreterDecision =
  | "NEW_CANONICAL_REQUIRED"
  | "NEW_CHILD_PRINTING_REQUIRED"
  | "IMAGE_REPAIR_ONLY"
  | "DUPLICATE_EXISTING"
  | "HOLD_FOR_REVIEW"
  | "UNRESOLVED";

export type WarehouseInterpreterReasonCode =
  | "NO_EXISTING_CANON_MATCH"
  | "PRINTED_IDENTITY_DELTA_DETECTED"
  | "CANONICAL_MATCH_WITH_NEW_CHILD_PRINTING"
  | "CANONICAL_MATCH_IMAGE_MISSING_OR_WEAK"
  | "EXISTING_CANON_ALREADY_COVERS_SUBMISSION"
  | "NO_CLASSIFICATION_DECISION"
  | "MISSING_CANON_MATCH_CONTEXT"
  | "MISSING_IDENTITY_DELTA"
  | "MISSING_REQUIRED_EVIDENCE"
  | "INSUFFICIENT_IMAGE_EVIDENCE"
  | "AMBIGUOUS_TARGET"
  | "MISSING_EXTERNAL_REFERENCE"
  | "NO_LAWFUL_PROMOTION_ACTION"
  | "OTHER";

export type WarehouseInterpreterStatus = "READY" | "BLOCKED";
export type WarehouseInterpreterConfidence = "HIGH" | "MEDIUM" | "LOW";

export type WarehouseInterpreterPackage = {
  version: "V1";
  status: WarehouseInterpreterStatus;
  decision: WarehouseInterpreterDecision;
  reason_code: WarehouseInterpreterReasonCode;
  confidence: WarehouseInterpreterConfidence;
  founder_explanation: string;
  canon_context: {
    matched_card_print_id: string | null;
    matched_card_printing_id: string | null;
    canonical_set_code: string | null;
    number: string | null;
    variant_key: string | null;
    finish_key: string | null;
  };
  proposed_action: "CREATE_CARD_PRINT" | "CREATE_CARD_PRINTING" | "ENRICH_CANON_IMAGE" | "NO_OP" | null;
  missing_fields: string[];
  evidence_gaps: string[];
  next_actions: string[];
  variant_identity: PerfectOrderVariantIdentity | null;
  raw_reason_code?: string | null;
};

export type WarehouseInterpreterCandidateSummary = {
  interpreter_decision: "ROW" | "CHILD" | "BLOCKED";
  interpreter_reason_code: string;
  interpreter_explanation: string;
  interpreter_resolved_finish_key: string | null;
  needs_promotion_review: boolean;
  proposed_action_type:
    | "CREATE_CARD_PRINT"
    | "CREATE_CARD_PRINTING"
    | "ENRICH_CANON_IMAGE"
    | "BLOCKED_NO_PROMOTION"
    | "REVIEW_REQUIRED";
  current_review_hold_reason: string | null;
};

const EXECUTOR_ACTIONS = new Set([
  "CREATE_CARD_PRINT",
  "CREATE_CARD_PRINTING",
  "ENRICH_CANON_IMAGE",
]);

const NOTE_MODIFIER_PATTERNS = [
  /\bstamp(?:ed)?\b/i,
  /\bstaff\b/i,
  /\bprerelease\b/i,
  /\b1st edition\b/i,
  /\bfirst edition\b/i,
  /\bpokemon together\b/i,
  /\blogo\b/i,
];

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

function normalizeLowerOrNull(value: unknown) {
  const normalized = normalizeTextOrNull(value);
  return normalized ? normalized.toLowerCase() : null;
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

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return uniqueText(
    value.map((entry) => {
      const normalized = normalizeTextOrNull(entry);
      return normalized;
    }),
  );
}

function getExtractionIdentity(payload: JsonRecord | null) {
  return asRecord(payload?.identity);
}

function getExtractionPrintedModifier(payload: JsonRecord | null) {
  return asPrintedModifierRecord(payload?.printed_modifier);
}

function noteClaimsPrintedModifier(notes: string) {
  return NOTE_MODIFIER_PATTERNS.some((pattern) => pattern.test(notes));
}

function buildCanonContext(input: WarehouseInterpreterInput) {
  const latestMetadataExtractionPackage = input.latestMetadataExtractionPackage ?? null;
  const visibleHints = asRecord(input.latestNormalizedPackage?.visible_identity_hints);
  const resolverSummary = asRecord(input.latestClassificationPackage?.resolver_summary);
  const rawPlan = asRecord(input.promotionReview?.writePlan.raw);
  const rawMutation = asRecord(rawPlan?.mutation);
  const extractionIdentity = getExtractionIdentity(latestMetadataExtractionPackage);
  const extractionPrintedModifier = getExtractionPrintedModifier(latestMetadataExtractionPackage);
  const stampVariantKey = normalizePrintedModifierVariantKey(extractionPrintedModifier);
  const variantIdentity = extractPerfectOrderVariantIdentityFromClassificationPackage(
    input.latestClassificationPackage,
  );

  const matchedCardPrintId =
    normalizeTextOrNull(input.promotionReview?.references.matchedCardPrintId) ??
    normalizeTextOrNull(resolverSummary?.matched_card_print_id) ??
    normalizeTextOrNull(input.candidate.promoted_card_print_id) ??
    (input.candidate.promoted_image_target_type === "CARD_PRINT"
      ? normalizeTextOrNull(input.candidate.promoted_image_target_id)
      : null);

  const matchedCardPrintingId =
    normalizeTextOrNull(input.promotionReview?.references.matchedCardPrintingId) ??
    normalizeTextOrNull(resolverSummary?.matched_card_printing_id) ??
    normalizeTextOrNull(input.candidate.promoted_card_printing_id);

  return {
    matched_card_print_id: matchedCardPrintId,
    matched_card_printing_id: matchedCardPrintingId,
    canonical_set_code:
      normalizeTextOrNull(input.promotionReview?.references.setCode) ??
      normalizeTextOrNull(visibleHints?.set_hint) ??
      normalizeTextOrNull(extractionIdentity?.set_code),
    number:
      normalizeTextOrNull(input.promotionReview?.preview.printedNumber) ??
      normalizeTextOrNull(visibleHints?.printed_number) ??
      normalizeTextOrNull(visibleHints?.printed_number_plain) ??
      normalizeTextOrNull(extractionIdentity?.number),
    variant_key:
      normalizeTextOrNull(rawMutation?.variant_key) ??
      normalizeTextOrNull(variantIdentity?.variant_key) ??
      stampVariantKey,
    finish_key:
      normalizeTextOrNull(input.promotionReview?.references.finishKey) ??
      normalizeTextOrNull(input.candidate.interpreter_resolved_finish_key),
  };
}

function mapBlockingReasonCode(
  code: FounderUnresolvedBlockingReasonCode | null,
): { decision: WarehouseInterpreterDecision; reasonCode: WarehouseInterpreterReasonCode } {
  switch (code) {
    case "NO_CLASSIFICATION_DECISION":
      return { decision: "UNRESOLVED", reasonCode: "NO_CLASSIFICATION_DECISION" };
    case "NO_LAWFUL_PROMOTION_ACTION":
      return { decision: "UNRESOLVED", reasonCode: "NO_LAWFUL_PROMOTION_ACTION" };
    case "MISSING_CANON_MATCH_CONTEXT":
      return { decision: "UNRESOLVED", reasonCode: "MISSING_CANON_MATCH_CONTEXT" };
    case "MISSING_IDENTITY_DELTA":
      return { decision: "HOLD_FOR_REVIEW", reasonCode: "MISSING_IDENTITY_DELTA" };
    case "MISSING_REQUIRED_EVIDENCE":
      return { decision: "UNRESOLVED", reasonCode: "MISSING_REQUIRED_EVIDENCE" };
    case "INSUFFICIENT_IMAGE_EVIDENCE":
      return { decision: "HOLD_FOR_REVIEW", reasonCode: "INSUFFICIENT_IMAGE_EVIDENCE" };
    case "AMBIGUOUS_TARGET":
      return { decision: "HOLD_FOR_REVIEW", reasonCode: "AMBIGUOUS_TARGET" };
    case "MISSING_EXTERNAL_REFERENCE":
      return { decision: "UNRESOLVED", reasonCode: "MISSING_EXTERNAL_REFERENCE" };
    case "STAGING_NOT_CREATED":
      return { decision: "UNRESOLVED", reasonCode: "NO_LAWFUL_PROMOTION_ACTION" };
    case "OTHER":
    default:
      return { decision: "UNRESOLVED", reasonCode: "OTHER" };
  }
}

function inferBlockedReasonFromClassification(
  input: WarehouseInterpreterInput,
): {
  decision: WarehouseInterpreterDecision;
  reasonCode: WarehouseInterpreterReasonCode;
  founderExplanation: string;
  missingFields: string[];
  nextActions: string[];
  rawReasonCode: string | null;
} | null {
  const classificationAction = normalizeTextOrNull(input.latestClassificationPackage?.proposed_action_type);
  const classificationReason = normalizeTextOrNull(input.latestClassificationPackage?.interpreter_reason_code);
  const classificationExplanation = normalizeTextOrNull(
    input.latestClassificationPackage?.interpreter_explanation,
  );
  const unresolvedFields = asStringArray(
    asRecord(input.latestClassificationPackage?.metadata_documentation)?.unresolved_fields,
  );

  if (!classificationAction && !classificationReason) {
    return null;
  }

  if (classificationAction === "REVIEW_REQUIRED") {
    const reasonLower = normalizeLowerOrNull(classificationReason);
    if (reasonLower?.includes("ambiguous") || reasonLower?.includes("low_resolver_confidence")) {
      return {
        decision: "HOLD_FOR_REVIEW",
        reasonCode: "AMBIGUOUS_TARGET",
        founderExplanation:
          classificationExplanation ??
          "Promotion cannot proceed automatically because current canon matching remains ambiguous.",
        missingFields: uniqueText(["Single lawful canon target", ...unresolvedFields]),
        nextActions: [
          "Inspect the candidate evidence and current canon matches manually.",
          "Only approve promotion after one lawful target remains.",
        ],
        rawReasonCode: classificationReason,
      };
    }

    return {
      decision: "HOLD_FOR_REVIEW",
      reasonCode: "INSUFFICIENT_IMAGE_EVIDENCE",
      founderExplanation:
        classificationExplanation ??
        "Promotion cannot proceed automatically because the current evidence does not produce a decision-grade identity boundary.",
      missingFields: uniqueText(unresolvedFields.length > 0 ? unresolvedFields : ["Decision-grade identity evidence"]),
      nextActions: [
        "Review the candidate evidence manually before promotion.",
        "Only stage the candidate after the missing identity distinction is explicit.",
      ],
      rawReasonCode: classificationReason,
    };
  }

  if (classificationAction === "BLOCKED_NO_PROMOTION") {
    return {
      decision: "UNRESOLVED",
      reasonCode: "NO_LAWFUL_PROMOTION_ACTION",
      founderExplanation:
        classificationExplanation ??
        "Current warehouse interpretation does not expose a lawful promotion action yet.",
      missingFields: uniqueText(unresolvedFields.length > 0 ? unresolvedFields : ["Lawful promotion action"]),
      nextActions: [
        "Review the current classification boundary and evidence quality.",
        "Do not stage the candidate until a lawful promotion action exists.",
      ],
      rawReasonCode: classificationReason,
    };
  }

  return null;
}

function buildReadyPackage(
  input: WarehouseInterpreterInput,
  decision: WarehouseInterpreterDecision,
  reasonCode: WarehouseInterpreterReasonCode,
  proposedAction: WarehouseInterpreterPackage["proposed_action"],
  confidence: WarehouseInterpreterConfidence,
): WarehouseInterpreterPackage {
  const variantIdentity = extractPerfectOrderVariantIdentityFromClassificationPackage(
    input.latestClassificationPackage,
  );
  const evidenceGaps = uniqueText([
    ...asStringArray(input.latestNormalizedPackage?.evidence_gaps),
    ...asStringArray(asRecord(input.latestClassificationPackage?.metadata_documentation)?.unresolved_fields),
  ]);

  return {
    version: "V1",
    status: "READY",
    decision,
    reason_code: reasonCode,
    confidence,
    founder_explanation:
      input.promotionReview?.decisionSummary ??
      "Warehouse interpretation resolved to a lawful founder-review decision.",
    canon_context: buildCanonContext(input),
    proposed_action: proposedAction,
    missing_fields: [],
    evidence_gaps: evidenceGaps,
    variant_identity: variantIdentity,
    next_actions:
      proposedAction === "NO_OP"
        ? [
            "Do not stage this candidate for promotion.",
            "Archive or reject it after founder review if the submission adds no new canon value.",
          ]
        : [
            "Founder approval remains explicit and intentional before any executable staging can proceed.",
            "Stage this candidate only after founder approval if the write plan matches the intended canon change.",
          ],
    raw_reason_code:
      normalizeTextOrNull(input.latestClassificationPackage?.interpreter_reason_code) ??
      normalizeTextOrNull(input.candidate.interpreter_reason_code),
  };
}

export function buildWarehouseInterpreterSeed(
  input: Omit<WarehouseInterpreterInput, "promotionReview">,
): WarehouseInterpreterCandidateSummary {
  const classificationAction = normalizeTextOrNull(input.latestClassificationPackage?.proposed_action_type);
  const classificationDecision = normalizeTextOrNull(input.latestClassificationPackage?.interpreter_decision);
  const classificationReason = normalizeTextOrNull(input.latestClassificationPackage?.interpreter_reason_code);
  const classificationExplanation = normalizeTextOrNull(
    input.latestClassificationPackage?.interpreter_explanation,
  );
  const stageAction = normalizeTextOrNull(input.currentStagingRow?.approved_action_type);
  const existingReason = normalizeTextOrNull(input.candidate.interpreter_reason_code);
  const existingExplanation = normalizeTextOrNull(input.candidate.interpreter_explanation);
  const finishKey = normalizeTextOrNull(input.candidate.interpreter_resolved_finish_key);

  if (stageAction && EXECUTOR_ACTIONS.has(stageAction)) {
    return {
      interpreter_decision: stageAction === "CREATE_CARD_PRINTING" ? "CHILD" : "ROW",
      interpreter_reason_code: existingReason ?? "FOUNDER_STAGED_ACTION",
      interpreter_explanation:
        existingExplanation ??
        `Founder review currently resolves this candidate to ${stageAction}.`,
      interpreter_resolved_finish_key: finishKey,
      needs_promotion_review: false,
      proposed_action_type: stageAction as WarehouseInterpreterCandidateSummary["proposed_action_type"],
      current_review_hold_reason: null,
    };
  }

  if (classificationAction) {
    return {
      interpreter_decision:
        classificationAction === "CREATE_CARD_PRINTING"
          ? "CHILD"
          : classificationAction === "CREATE_CARD_PRINT" || classificationAction === "ENRICH_CANON_IMAGE"
            ? "ROW"
            : classificationDecision === "CHILD"
              ? "CHILD"
              : classificationDecision === "ROW"
                ? "ROW"
                : "BLOCKED",
      interpreter_reason_code: classificationReason ?? existingReason ?? "INTERPRETER_V1",
      interpreter_explanation:
        classificationExplanation ??
        existingExplanation ??
        "Warehouse interpreter derived a founder-review summary from the current classification package.",
      interpreter_resolved_finish_key: finishKey,
      needs_promotion_review: classificationAction === "REVIEW_REQUIRED" || classificationAction === "BLOCKED_NO_PROMOTION",
      proposed_action_type:
        classificationAction === "CREATE_CARD_PRINT" ||
        classificationAction === "CREATE_CARD_PRINTING" ||
        classificationAction === "ENRICH_CANON_IMAGE" ||
        classificationAction === "BLOCKED_NO_PROMOTION" ||
        classificationAction === "REVIEW_REQUIRED"
          ? (classificationAction as WarehouseInterpreterCandidateSummary["proposed_action_type"])
          : "BLOCKED_NO_PROMOTION",
      current_review_hold_reason:
        classificationAction === "REVIEW_REQUIRED" || classificationAction === "BLOCKED_NO_PROMOTION"
          ? classificationReason ?? input.candidate.current_review_hold_reason
          : null,
    };
  }

  return {
    interpreter_decision:
      input.candidate.interpreter_decision === "ROW" || input.candidate.interpreter_decision === "CHILD"
        ? input.candidate.interpreter_decision
        : "BLOCKED",
    interpreter_reason_code: existingReason ?? "INTERPRETER_V1_PENDING",
    interpreter_explanation:
      existingExplanation ??
      "Warehouse interpreter has not yet derived a stronger founder-review summary from current data.",
    interpreter_resolved_finish_key: finishKey,
    needs_promotion_review: input.candidate.needs_promotion_review ?? true,
    proposed_action_type:
      input.candidate.proposed_action_type === "CREATE_CARD_PRINT" ||
      input.candidate.proposed_action_type === "CREATE_CARD_PRINTING" ||
      input.candidate.proposed_action_type === "ENRICH_CANON_IMAGE" ||
      input.candidate.proposed_action_type === "BLOCKED_NO_PROMOTION" ||
      input.candidate.proposed_action_type === "REVIEW_REQUIRED"
        ? input.candidate.proposed_action_type
        : "BLOCKED_NO_PROMOTION",
    current_review_hold_reason: input.candidate.current_review_hold_reason,
  };
}

export function buildWarehouseInterpreterV1(
  input: WarehouseInterpreterInput,
): WarehouseInterpreterPackage {
  const latestMetadataExtractionPackage = input.latestMetadataExtractionPackage ?? null;
  const canonContext = buildCanonContext(input);
  const variantIdentity = extractPerfectOrderVariantIdentityFromClassificationPackage(
    input.latestClassificationPackage,
  );
  const noteModifierClaim = noteClaimsPrintedModifier(input.candidate.notes);
  const hasFrontEvidence = input.evidenceRows.some((row) => normalizeLowerOrNull(row.evidence_slot) === "front");
  const hasBackEvidence = input.evidenceRows.some((row) => normalizeLowerOrNull(row.evidence_slot) === "back");
  const extractionIdentity = getExtractionIdentity(latestMetadataExtractionPackage);
  const extractionPrintedModifier = getExtractionPrintedModifier(latestMetadataExtractionPackage);
  const printedModifierStatus = normalizeTextOrNull(extractionPrintedModifier?.status);
  const printedModifierLabel = getPrintedModifierLabel(extractionPrintedModifier);
  const stampedVariantKey = normalizePrintedModifierVariantKey(extractionPrintedModifier);
  const hasReadyStampPrintedModifier =
    printedModifierStatus === "READY" && isReadyStampPrintedModifier(extractionPrintedModifier);
  const hasStructuredPrintedModifier =
    (printedModifierStatus === "READY" || printedModifierStatus === "PARTIAL") && Boolean(printedModifierLabel);
  const extractionMissingFields = asStringArray(latestMetadataExtractionPackage?.missing_fields);
  const extractionEvidenceGaps = asStringArray(latestMetadataExtractionPackage?.evidence_gaps);
  const extractionAmbiguityNotes = asStringArray(latestMetadataExtractionPackage?.ambiguity_notes);
  const extractionStatus = normalizeTextOrNull(latestMetadataExtractionPackage?.status);
  const normalizedGaps = asStringArray(input.latestNormalizedPackage?.evidence_gaps);
  const classificationMetadata = asRecord(input.latestClassificationPackage?.metadata_documentation);
  const classificationUnresolved = asStringArray(classificationMetadata?.unresolved_fields);
  const ambiguityNotes = asStringArray(classificationMetadata?.ambiguity_notes);
  const unresolved = input.promotionReview?.unresolved ?? null;
  const reviewActionType =
    normalizeTextOrNull(input.currentStagingRow?.approved_action_type) ??
    normalizeTextOrNull(input.promotionReview?.actionType) ??
    normalizeTextOrNull(input.latestClassificationPackage?.proposed_action_type);
  const resultPreviewType =
    normalizeTextOrNull(input.promotionReview?.writePlan.resultPreviewType) ??
    normalizeTextOrNull(input.candidate.promotion_result_type);
  const writePlanReady = input.promotionReview?.writePlan.status === "READY";
  const missingFieldsBase = uniqueText([
    ...extractionMissingFields,
    ...(unresolved?.missing_fields ?? []),
    ...classificationUnresolved,
  ]);
  const evidenceGapsBase = uniqueText([
    ...extractionEvidenceGaps,
    ...normalizedGaps,
    ...extractionAmbiguityNotes,
    ...(!hasFrontEvidence ? ["Front image evidence"] : []),
    ...(!hasBackEvidence && input.candidate.submission_intent === "MISSING_CARD"
      ? ["Back image evidence or stronger identity proof"]
      : []),
  ]);

  if (resultPreviewType === "NO_OP") {
    return buildReadyPackage(
      input,
      "DUPLICATE_EXISTING",
      "EXISTING_CANON_ALREADY_COVERS_SUBMISSION",
      "NO_OP",
      "HIGH",
    );
  }

  if (
    hasReadyStampPrintedModifier &&
    stampedVariantKey &&
    input.candidate.state !== "PROMOTED"
  ) {
    const modifierSummary = printedModifierLabel ?? "printed stamp";
    const baseIdentitySummary = uniqueText([
      normalizeTextOrNull(extractionIdentity?.name),
      normalizeTextOrNull(extractionIdentity?.printed_number),
      normalizeTextOrNull(extractionIdentity?.set_name) ?? normalizeTextOrNull(extractionIdentity?.set_code),
    ]).join(" / ");

    return {
      version: "V1",
      status: "READY",
      decision: "NEW_CANONICAL_REQUIRED",
      reason_code: "PRINTED_IDENTITY_DELTA_DETECTED",
      confidence:
        canonContext.canonical_set_code && canonContext.number ? "HIGH" : "MEDIUM",
      founder_explanation: baseIdentitySummary
        ? `${modifierSummary} is a structured printed identity delta on ${baseIdentitySummary}. Under PRINTED_IDENTITY_MODEL_V1, stamped cards are new canonical rows, so promotion should create a new card_prints identity with variant_key ${stampedVariantKey}.`
        : `${modifierSummary} is a structured printed identity delta. Under PRINTED_IDENTITY_MODEL_V1, stamped cards are new canonical rows, so promotion should create a new card_prints identity with variant_key ${stampedVariantKey}.`,
      canon_context: {
        ...canonContext,
        variant_key: stampedVariantKey,
        matched_card_printing_id: null,
        finish_key: null,
      },
      proposed_action: "CREATE_CARD_PRINT",
      missing_fields: [],
      evidence_gaps: uniqueText([...evidenceGapsBase, ...ambiguityNotes]),
      variant_identity: variantIdentity,
      next_actions: [
        "Founder may approve and stage this candidate as a new canonical row.",
        `Promotion should create a new card_prints row with variant_key ${stampedVariantKey}.`,
      ],
      raw_reason_code:
        normalizeTextOrNull(extractionPrintedModifier?.modifier_key) ??
        normalizeTextOrNull(input.latestClassificationPackage?.interpreter_reason_code),
    };
  }

  if (writePlanReady && reviewActionType === "ENRICH_CANON_IMAGE") {
    return buildReadyPackage(
      input,
      "IMAGE_REPAIR_ONLY",
      "CANONICAL_MATCH_IMAGE_MISSING_OR_WEAK",
      "ENRICH_CANON_IMAGE",
      canonContext.matched_card_print_id ? "HIGH" : "MEDIUM",
    );
  }

  if (writePlanReady && reviewActionType === "CREATE_CARD_PRINTING") {
    return buildReadyPackage(
      input,
      "NEW_CHILD_PRINTING_REQUIRED",
      "CANONICAL_MATCH_WITH_NEW_CHILD_PRINTING",
      "CREATE_CARD_PRINTING",
      canonContext.matched_card_print_id && canonContext.finish_key ? "HIGH" : "MEDIUM",
    );
  }

  if (writePlanReady && reviewActionType === "CREATE_CARD_PRINT") {
    return buildReadyPackage(
      input,
      "NEW_CANONICAL_REQUIRED",
      hasStructuredPrintedModifier || noteModifierClaim
        ? "PRINTED_IDENTITY_DELTA_DETECTED"
        : "NO_EXISTING_CANON_MATCH",
      "CREATE_CARD_PRINT",
      canonContext.canonical_set_code && canonContext.number ? "MEDIUM" : "LOW",
    );
  }

  if (
    hasStructuredPrintedModifier &&
    !input.currentStagingRow &&
    input.candidate.state !== "PROMOTED" &&
    reviewActionType !== "ENRICH_CANON_IMAGE"
  ) {
    const modifierSummary = printedModifierLabel ?? "printed modifier";
    const baseIdentitySummary = uniqueText([
      normalizeTextOrNull(extractionIdentity?.name),
      normalizeTextOrNull(extractionIdentity?.printed_number),
      normalizeTextOrNull(extractionIdentity?.set_name) ?? normalizeTextOrNull(extractionIdentity?.set_code),
    ]).join(" / ");

    return {
      version: "V1",
      status: "BLOCKED",
      decision: "HOLD_FOR_REVIEW",
      reason_code: "PRINTED_IDENTITY_DELTA_DETECTED",
      confidence: printedModifierStatus === "READY" ? "MEDIUM" : "LOW",
      founder_explanation: baseIdentitySummary
        ? `${modifierSummary} is present as a structured printed modifier signal on ${baseIdentitySummary}. The base card identity is known, but founder review still needs a lawful canon identity mapping for that printed modifier before promotion can proceed.`
        : `${modifierSummary} is present as a structured printed modifier signal. Founder review still needs a lawful canon identity mapping for that printed modifier before promotion can proceed.`,
      canon_context: canonContext,
      proposed_action: null,
      missing_fields: uniqueText([
        "Lawful printed modifier identity mapping",
        "Variant key or canon contract for the detected printed modifier",
        ...missingFieldsBase,
      ]),
      evidence_gaps: uniqueText([...evidenceGapsBase, ...ambiguityNotes]),
      variant_identity: variantIdentity,
      next_actions: [
        `Confirm whether ${modifierSummary} represents a real canonical identity delta.`,
        "Only stage the candidate after the modifier-backed identity can be represented lawfully in canon.",
      ],
      raw_reason_code:
        normalizeTextOrNull(extractionPrintedModifier?.modifier_key) ??
        normalizeTextOrNull(input.latestClassificationPackage?.interpreter_reason_code),
    };
  }

  if (
    noteModifierClaim &&
    !input.currentStagingRow &&
    input.candidate.state !== "PROMOTED" &&
    !canonContext.finish_key &&
    reviewActionType !== "ENRICH_CANON_IMAGE"
  ) {
    return {
      version: "V1",
      status: "BLOCKED",
      decision: "HOLD_FOR_REVIEW",
      reason_code: "MISSING_IDENTITY_DELTA",
      confidence: "LOW",
      founder_explanation:
        "Notes claim a printed modifier or stamped distinction, but the current repo does not yet expose a trusted structured extraction for that identity delta. Founder review must confirm the modifier before promotion.",
      canon_context: canonContext,
      proposed_action: null,
      missing_fields: uniqueText(["Structured identity delta", ...missingFieldsBase]),
      evidence_gaps: evidenceGapsBase,
      variant_identity: variantIdentity,
      next_actions: [
        "Review the evidence to confirm whether the notes describe a real printed modifier or stamp.",
        "Only stage this candidate after the identity delta is explicit and reviewable.",
      ],
      raw_reason_code: normalizeTextOrNull(input.latestClassificationPackage?.interpreter_reason_code),
    };
  }

  if (unresolved) {
    const mapped = mapBlockingReasonCode(unresolved.blocking_reason_code);
    return {
      version: "V1",
      status: "BLOCKED",
      decision: mapped.decision,
      reason_code: mapped.reasonCode,
      confidence: "LOW",
      founder_explanation: unresolved.founder_explanation,
      canon_context: canonContext,
      proposed_action: null,
      missing_fields: uniqueText([...missingFieldsBase]),
      evidence_gaps: uniqueText([...evidenceGapsBase, ...ambiguityNotes]),
      variant_identity: variantIdentity,
      next_actions: unresolved.next_actions,
      raw_reason_code: unresolved.raw_reason_code,
    };
  }

  const blockedFromClassification = inferBlockedReasonFromClassification(input);
  if (blockedFromClassification) {
    return {
      version: "V1",
      status: "BLOCKED",
      decision: blockedFromClassification.decision,
      reason_code: blockedFromClassification.reasonCode,
      confidence: "LOW",
      founder_explanation: blockedFromClassification.founderExplanation,
      canon_context: canonContext,
      proposed_action: null,
      missing_fields: blockedFromClassification.missingFields,
      evidence_gaps: evidenceGapsBase,
      variant_identity: variantIdentity,
      next_actions: blockedFromClassification.nextActions,
      raw_reason_code: blockedFromClassification.rawReasonCode,
    };
  }

  if (!input.latestClassificationPackage) {
    const extractionExplanation = extractionStatus
      ? `Metadata extraction is ${extractionStatus.toLowerCase()}, but no classification package exists yet. Founder review still lacks a lawful promotion action.`
      : null;

    return {
      version: "V1",
      status: "BLOCKED",
      decision: "UNRESOLVED",
      reason_code: "NO_CLASSIFICATION_DECISION",
      confidence: "LOW",
      founder_explanation:
        extractionExplanation ??
        "Promotion cannot proceed because no classification package exists yet. Warehouse evidence is present, but the system has not produced a lawful interpretation boundary for founder review.",
      canon_context: canonContext,
      proposed_action: null,
      missing_fields: uniqueText([
        ...(extractionIdentity ? [] : ["Metadata extraction package"]),
        ...missingFieldsBase,
        "Classification package",
        "Lawful promotion action",
      ]),
      evidence_gaps: evidenceGapsBase,
      variant_identity: variantIdentity,
      next_actions: [
        ...(extractionStatus
          ? [
              "Use the metadata extraction package as supporting context while classification is still missing.",
            ]
          : ["Run metadata extraction before relying on fallback identity hints."]),
        "Run normalization and classification before relying on this candidate for promotion.",
        "Review evidence quality if the interpreter continues to produce no decision.",
      ],
      raw_reason_code: null,
    };
  }

  return {
    version: "V1",
    status: "BLOCKED",
    decision: "UNRESOLVED",
    reason_code: "OTHER",
    confidence: "LOW",
    founder_explanation:
      "Current warehouse data does not yet converge to a lawful promotion-review decision.",
    canon_context: canonContext,
    proposed_action: null,
    missing_fields: missingFieldsBase,
    evidence_gaps: uniqueText([...evidenceGapsBase, ...ambiguityNotes]),
    variant_identity: variantIdentity,
    next_actions: [
      "Review the current evidence and classification output manually.",
      "Only stage after the promotion action is explicit and lawful.",
    ],
    raw_reason_code:
      normalizeTextOrNull(input.latestClassificationPackage?.interpreter_reason_code) ??
      normalizeTextOrNull(input.candidate.interpreter_reason_code),
  };
}

export function mapWarehouseInterpreterToCandidateSummary(
  interpreterPackage: WarehouseInterpreterPackage,
): WarehouseInterpreterCandidateSummary {
  const finishKey = normalizeTextOrNull(interpreterPackage.canon_context.finish_key);
  const childLike =
    interpreterPackage.decision === "NEW_CHILD_PRINTING_REQUIRED" ||
    (!!interpreterPackage.canon_context.matched_card_printing_id && interpreterPackage.decision === "DUPLICATE_EXISTING") ||
    !!finishKey;

  switch (interpreterPackage.decision) {
    case "NEW_CANONICAL_REQUIRED":
      return {
        interpreter_decision: "ROW",
        interpreter_reason_code: interpreterPackage.reason_code,
        interpreter_explanation: interpreterPackage.founder_explanation,
        interpreter_resolved_finish_key: finishKey,
        needs_promotion_review: false,
        proposed_action_type: "CREATE_CARD_PRINT",
        current_review_hold_reason: null,
      };
    case "NEW_CHILD_PRINTING_REQUIRED":
      return {
        interpreter_decision: "CHILD",
        interpreter_reason_code: interpreterPackage.reason_code,
        interpreter_explanation: interpreterPackage.founder_explanation,
        interpreter_resolved_finish_key: finishKey,
        needs_promotion_review: false,
        proposed_action_type: "CREATE_CARD_PRINTING",
        current_review_hold_reason: null,
      };
    case "IMAGE_REPAIR_ONLY":
      return {
        interpreter_decision: "ROW",
        interpreter_reason_code: interpreterPackage.reason_code,
        interpreter_explanation: interpreterPackage.founder_explanation,
        interpreter_resolved_finish_key: finishKey,
        needs_promotion_review: false,
        proposed_action_type: "ENRICH_CANON_IMAGE",
        current_review_hold_reason: null,
      };
    case "DUPLICATE_EXISTING":
      return {
        interpreter_decision: childLike ? "CHILD" : "ROW",
        interpreter_reason_code: interpreterPackage.reason_code,
        interpreter_explanation: interpreterPackage.founder_explanation,
        interpreter_resolved_finish_key: finishKey,
        needs_promotion_review: false,
        proposed_action_type: "BLOCKED_NO_PROMOTION",
        current_review_hold_reason: null,
      };
    case "HOLD_FOR_REVIEW":
      return {
        interpreter_decision: "BLOCKED",
        interpreter_reason_code: interpreterPackage.reason_code,
        interpreter_explanation: interpreterPackage.founder_explanation,
        interpreter_resolved_finish_key: finishKey,
        needs_promotion_review: true,
        proposed_action_type: "REVIEW_REQUIRED",
        current_review_hold_reason: interpreterPackage.reason_code,
      };
    case "UNRESOLVED":
    default:
      return {
        interpreter_decision: "BLOCKED",
        interpreter_reason_code: interpreterPackage.reason_code,
        interpreter_explanation: interpreterPackage.founder_explanation,
        interpreter_resolved_finish_key: finishKey,
        needs_promotion_review: true,
        proposed_action_type: "BLOCKED_NO_PROMOTION",
        current_review_hold_reason: interpreterPackage.reason_code,
      };
  }
}
