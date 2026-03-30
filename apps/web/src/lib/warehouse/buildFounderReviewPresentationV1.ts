import "server-only";

import type { FounderPromotionReviewModel } from "./buildFounderPromotionReview";
import type { PromotionWritePlanV1 } from "./buildPromotionWritePlanV1";
import type { WarehouseInterpreterPackage } from "./buildWarehouseInterpreterV1";
import type { PromotionImageNormalizationEnvelope } from "./promotionImageNormalization";
import { asPrintedModifierRecord, getPrintedModifierLabel } from "./printedIdentityModel";

type JsonRecord = Record<string, unknown>;

export type FounderReviewPresentationV1 = {
  hasReadyWritePlan: boolean;
  showFallbackBlocking: boolean;
  preview: {
    imageUrl: string | null;
    imageOriginLabel: string | null;
    displayName: string | null;
    setDisplay: string | null;
    printedNumber: string | null;
    variantLabel: string | null;
    candidateTypeLabel: string;
    unresolvedReason: string | null;
  };
  comparison: {
    summary: string;
    existing: string[];
    introduced: string[];
    delta: string[];
  } | null;
};

function normalizeTextOrNull(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as JsonRecord;
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

function formatSetDisplay(
  setName: string | null | undefined,
  setCode: string | null | undefined,
  fallback: string | null | undefined = null,
) {
  const normalizedSetName = normalizeTextOrNull(setName);
  const normalizedSetCode = normalizeTextOrNull(setCode);
  const normalizedFallback = normalizeTextOrNull(fallback);

  if (normalizedSetName && normalizedSetCode) {
    return `${normalizedSetName} (${normalizedSetCode.toUpperCase()})`;
  }
  if (normalizedSetName) {
    return normalizedSetName;
  }
  if (normalizedSetCode) {
    return normalizedSetCode.toUpperCase();
  }

  return normalizedFallback;
}

function describeCardPrintState(cardPrint: JsonRecord | null, variantLabel: string | null = null) {
  if (!cardPrint) {
    return null;
  }

  const name = normalizeTextOrNull(cardPrint.name) ?? "Unknown card";
  const setDisplay = formatSetDisplay(null, normalizeTextOrNull(cardPrint.set_code));
  const printedNumber =
    normalizeTextOrNull(cardPrint.number) ?? normalizeTextOrNull(cardPrint.number_plain);
  const normalizedVariantLabel =
    variantLabel ??
    humanizeToken(normalizeTextOrNull(cardPrint.variant_key));

  return [name, setDisplay, printedNumber ? `#${printedNumber}` : null, normalizedVariantLabel]
    .filter(Boolean)
    .join(" • ");
}

function getReadyCandidateTypeLabel(
  promotionWritePlan: PromotionWritePlanV1 | null,
  interpreterPackage: WarehouseInterpreterPackage | null,
) {
  if (interpreterPackage?.decision === "NEW_CANONICAL_REQUIRED") {
    return "New Canon";
  }
  if (interpreterPackage?.decision === "NEW_CHILD_PRINTING_REQUIRED") {
    return "Child Printing";
  }
  if (interpreterPackage?.decision === "IMAGE_REPAIR_ONLY") {
    return "Image Repair";
  }
  if (interpreterPackage?.decision === "DUPLICATE_EXISTING") {
    return "Duplicate Existing";
  }

  if (!promotionWritePlan || promotionWritePlan.status !== "READY") {
    return "Unresolved";
  }

  if (promotionWritePlan.actions.card_prints.action === "CREATE") {
    return "New Canon";
  }
  if (promotionWritePlan.actions.card_printings.action === "CREATE") {
    return "Child Printing";
  }
  if (promotionWritePlan.actions.image_fields.action === "UPDATE") {
    return "Image Repair";
  }

  return "Duplicate Existing";
}

function buildReadyComparison({
  promotionWritePlan,
  interpreterPackage,
  metadataPrintedModifierLabel,
  fallbackSummary,
}: {
  promotionWritePlan: PromotionWritePlanV1 | null;
  interpreterPackage: WarehouseInterpreterPackage | null;
  metadataPrintedModifierLabel: string | null;
  fallbackSummary: {
    summary: string;
    existing: string[];
    introduced: string[];
    delta: string[];
  } | null;
}) {
  if (!promotionWritePlan || promotionWritePlan.status !== "READY") {
    return fallbackSummary;
  }

  const beforeCardPrint = asRecord(promotionWritePlan.preview.before?.card_prints);
  const afterCardPrint = asRecord(promotionWritePlan.preview.after?.card_prints);
  const variantKey =
    normalizeTextOrNull(afterCardPrint?.variant_key) ??
    normalizeTextOrNull(interpreterPackage?.canon_context.variant_key);
  const modifierLabel =
    metadataPrintedModifierLabel ??
    humanizeToken(variantKey);

  if (promotionWritePlan.actions.card_prints.action === "CREATE") {
    const existing: string[] = [];
    const introduced: string[] = [];
    const delta: string[] = [];

    if (beforeCardPrint) {
      existing.push(
        `${describeCardPrintState(beforeCardPrint) ?? "Existing base canonical row"} exists without ${modifierLabel ?? variantKey ?? "this stamped variant"}.`,
      );
    }
    if (variantKey) {
      existing.push(`No exact canonical row exists for variant_key ${variantKey}.`);
    }

    introduced.push(
      `${describeCardPrintState(afterCardPrint, modifierLabel) ?? "A new canonical card_prints row"} would be created.`,
    );
    delta.push(
      modifierLabel
        ? `${modifierLabel} creates a new canonical row under PRINTED_IDENTITY_MODEL_V1.`
        : `variant_key ${variantKey ?? "for the detected stamp"} creates a new canonical row under PRINTED_IDENTITY_MODEL_V1.`,
    );

    return {
      summary: promotionWritePlan.reason,
      existing,
      introduced,
      delta,
    };
  }

  if (promotionWritePlan.actions.card_printings.action === "CREATE") {
    return {
      summary: promotionWritePlan.reason,
      existing: [describeCardPrintState(beforeCardPrint ?? afterCardPrint)].filter(Boolean) as string[],
      introduced: ["A child printing would be created under the resolved canonical parent."],
      delta: ["Canonical parent identity stays the same; only the child-printing layer changes."],
    };
  }

  if (promotionWritePlan.actions.image_fields.action === "UPDATE") {
    return {
      summary: promotionWritePlan.reason,
      existing: [describeCardPrintState(beforeCardPrint ?? afterCardPrint)].filter(Boolean) as string[],
      introduced: ["Canon image fields would be updated."],
      delta: ["Canonical identity stays unchanged; only image fields would change."],
    };
  }

  return {
    summary: promotionWritePlan.reason,
    existing: [describeCardPrintState(beforeCardPrint ?? afterCardPrint)].filter(Boolean) as string[],
    introduced: ["No new canonical write would be performed."],
    delta: ["Current canon already covers this submission."],
  };
}

export function buildFounderReviewPresentationV1({
  promotionWritePlan,
  promotionReview,
  interpreterPackage,
  metadataExtraction,
  promotionImageNormalization,
}: {
  promotionWritePlan: PromotionWritePlanV1 | null;
  promotionReview: FounderPromotionReviewModel | null;
  interpreterPackage: WarehouseInterpreterPackage | null;
  metadataExtraction:
    | {
        normalized_metadata_package?: JsonRecord | null;
      }
    | null
    | undefined;
  promotionImageNormalization?: PromotionImageNormalizationEnvelope | null;
}) {
  const metadataExtractionNormalized = asRecord(metadataExtraction?.normalized_metadata_package);
  const metadataExtractionIdentity = asRecord(metadataExtractionNormalized?.identity);
  const metadataExtractionPrintedModifier = asPrintedModifierRecord(
    metadataExtractionNormalized?.printed_modifier,
  );
  const metadataPrintedModifierLabel = getPrintedModifierLabel(metadataExtractionPrintedModifier);
  const normalizationPackage = asRecord(
    promotionImageNormalization?.promotion_image_normalization_package,
  );
  const normalizationPreviewUrls = asRecord(promotionImageNormalization?.preview_urls);
  const hasReadyWritePlan = promotionWritePlan?.status === "READY";
  const writePlanAfterCardPrint = asRecord(promotionWritePlan?.preview.after?.card_prints);
  const previewImageUrl =
    normalizeTextOrNull(normalizationPreviewUrls?.normalized_front_url) ??
    normalizeTextOrNull(writePlanAfterCardPrint?.image_url) ??
    normalizeTextOrNull(writePlanAfterCardPrint?.image_alt_url) ??
    promotionReview?.preview.imageUrl ??
    promotionReview?.preview.frontEvidenceUrl ??
    null;
  const previewImageOriginLabel = normalizeTextOrNull(normalizationPreviewUrls?.normalized_front_url)
    ? `Normalized promotion asset (${normalizeTextOrNull(normalizationPackage?.status) ?? "READY"})`
    : normalizeTextOrNull(writePlanAfterCardPrint?.image_url) ||
        normalizeTextOrNull(writePlanAfterCardPrint?.image_alt_url)
      ? "Planned canon image"
      : promotionReview?.preview.imageOriginLabel ??
        (promotionReview?.preview.frontEvidenceUrl ? "Warehouse front evidence" : null);

  return {
    hasReadyWritePlan,
    showFallbackBlocking: !hasReadyWritePlan,
    preview: {
      imageUrl: previewImageUrl,
      imageOriginLabel: previewImageOriginLabel,
      displayName:
        normalizeTextOrNull(writePlanAfterCardPrint?.name) ??
        normalizeTextOrNull(metadataExtractionIdentity?.name) ??
        promotionReview?.preview.displayName ??
        null,
      setDisplay: formatSetDisplay(
        normalizeTextOrNull(metadataExtractionIdentity?.set_name),
        normalizeTextOrNull(writePlanAfterCardPrint?.set_code) ??
          normalizeTextOrNull(metadataExtractionIdentity?.set_code),
        promotionReview?.preview.setDisplay ?? null,
      ),
      printedNumber:
        normalizeTextOrNull(writePlanAfterCardPrint?.number) ??
        normalizeTextOrNull(writePlanAfterCardPrint?.number_plain) ??
        normalizeTextOrNull(metadataExtractionIdentity?.printed_number) ??
        normalizeTextOrNull(metadataExtractionIdentity?.number) ??
        promotionReview?.preview.printedNumber ??
        null,
      variantLabel:
        metadataPrintedModifierLabel ??
        humanizeToken(normalizeTextOrNull(writePlanAfterCardPrint?.variant_key)) ??
        promotionReview?.preview.variantLabel ??
        null,
      candidateTypeLabel: hasReadyWritePlan
        ? getReadyCandidateTypeLabel(promotionWritePlan, interpreterPackage)
        : promotionReview?.candidateTypeLabel ?? "Unresolved",
      unresolvedReason: hasReadyWritePlan ? null : promotionReview?.preview.unresolvedReason ?? null,
    },
    comparison:
      buildReadyComparison({
        promotionWritePlan,
        interpreterPackage,
        metadataPrintedModifierLabel,
        fallbackSummary: promotionReview?.comparison ?? null,
      }) ?? promotionReview?.comparison ?? null,
  } satisfies FounderReviewPresentationV1;
}
