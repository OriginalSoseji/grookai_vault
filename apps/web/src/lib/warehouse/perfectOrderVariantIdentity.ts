type JsonRecord = Record<string, unknown>;

export const PERFECT_ORDER_VARIANT_IDENTITY_RULE = "PERFECT_ORDER_VARIANT_IDENTITY_RULE_V1";

export type PerfectOrderVariantIdentity = {
  rule: string;
  applies: boolean;
  status: string | null;
  variant_key: string | null;
  illustration_category: string | null;
  collision_group_key: string | null;
  collision_resolution_reason: string | null;
  source_evidence: JsonRecord | null;
};

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

function coercePerfectOrderVariantIdentity(value: unknown): PerfectOrderVariantIdentity | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const rule = normalizeTextOrNull(record.rule);
  const status = normalizeTextOrNull(record.status);
  const variantKey = normalizeTextOrNull(record.variant_key);
  const illustrationCategory = normalizeTextOrNull(record.illustration_category);
  const collisionGroupKey = normalizeTextOrNull(record.collision_group_key);
  const collisionResolutionReason = normalizeTextOrNull(record.collision_resolution_reason);
  const sourceEvidence = asRecord(record.source_evidence);

  if (!rule && !status && !variantKey && !illustrationCategory && !collisionGroupKey) {
    return null;
  }

  return {
    rule: rule ?? PERFECT_ORDER_VARIANT_IDENTITY_RULE,
    applies: rule === PERFECT_ORDER_VARIANT_IDENTITY_RULE || Boolean(collisionGroupKey),
    status,
    variant_key: variantKey,
    illustration_category: illustrationCategory,
    collision_group_key: collisionGroupKey,
    collision_resolution_reason: collisionResolutionReason,
    source_evidence: sourceEvidence,
  };
}

export function extractPerfectOrderVariantIdentityFromClassificationPackage(
  classificationPackage: JsonRecord | null | undefined,
) {
  const extractedFields = asRecord(asRecord(classificationPackage?.metadata_documentation)?.extracted_fields);
  return coercePerfectOrderVariantIdentity(extractedFields?.variant_identity);
}

export function extractPerfectOrderVariantIdentityFromInterpreterPackage(
  interpreterPackage: JsonRecord | null | undefined,
) {
  return coercePerfectOrderVariantIdentity(interpreterPackage?.variant_identity);
}

export function extractPerfectOrderVariantIdentityFromPayload(payload: JsonRecord | null | undefined) {
  return (
    extractPerfectOrderVariantIdentityFromInterpreterPackage(
      asRecord(payload?.latest_interpreter_package) ?? asRecord(payload?.interpreter_package),
    ) ??
    extractPerfectOrderVariantIdentityFromClassificationPackage(
      asRecord(payload?.latest_classification_package) ?? asRecord(payload?.classification_package),
    )
  );
}

export function validatePerfectOrderVariantIdentity(
  variantIdentity: PerfectOrderVariantIdentity | null,
  variantKey: string | null,
) {
  if (!variantIdentity?.applies) {
    return { ok: true, reason: null, missingRequirements: [] as string[] };
  }

  if (variantIdentity.status !== "RESOLVED_BY_VARIANT_KEY") {
    return {
      ok: false,
      reason: "Perfect Order collision group is still unlabeled and cannot promote.",
      missingRequirements: ["deterministic variant_key", "illustration_category"],
    };
  }

  const normalizedVariantKey = normalizeTextOrNull(variantKey);
  if (!normalizedVariantKey) {
    return {
      ok: false,
      reason: "Missing required variant_key for collision-resolved promotion target.",
      missingRequirements: ["variant_key"],
    };
  }

  if (
    normalizeTextOrNull(variantIdentity.variant_key) &&
    normalizedVariantKey !== normalizeTextOrNull(variantIdentity.variant_key)
  ) {
    return {
      ok: false,
      reason: "variant_key does not match the resolved Perfect Order collision identity.",
      missingRequirements: ["variant_key_alignment"],
    };
  }

  return { ok: true, reason: null, missingRequirements: [] as string[] };
}
