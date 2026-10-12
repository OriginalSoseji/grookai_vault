import { createHash } from "node:crypto";

export const TCGPLAYER_INACTIVE_MAPPING_REPAIR_POLICY_V1 =
  "TCGPLAYER_INACTIVE_MAPPING_REPAIR_POLICY_V1";
export const TCGPLAYER_INACTIVE_MAPPING_REPAIR_CONFIRMATION_V1 =
  "TCGPLAYER_MARKET_EXACT_MAPPING_INSERT_4_REPAIR_1_V1";

function text(value) {
  return String(value ?? "").trim();
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function tcgplayerInactiveMappingRepairFingerprintV1(value) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

export function assertTcgplayerInactiveMappingRepairAuthorityV1(
  authority,
  { candidate, liveMapping } = {},
) {
  const { fingerprint, ...body } = authority ?? {};
  if (authority?.version !== TCGPLAYER_INACTIVE_MAPPING_REPAIR_POLICY_V1) {
    throw new Error("INACTIVE_REPAIR_AUTHORITY_VERSION_MISMATCH");
  }
  if (authority?.status !== "reviewed_repair_evidence") {
    throw new Error("INACTIVE_REPAIR_AUTHORITY_NOT_REVIEWED");
  }
  if (authority?.execution_authorized !== false) {
    throw new Error("INACTIVE_REPAIR_AUTHORITY_MUST_NOT_SELF_AUTHORIZE");
  }
  if (fingerprint !== tcgplayerInactiveMappingRepairFingerprintV1(body)) {
    throw new Error("INACTIVE_REPAIR_AUTHORITY_FINGERPRINT_MISMATCH");
  }
  if (!candidate) return authority;
  if (
    Number(authority.source_product_id) !== Number(candidate.source_product_id) ||
    authority.candidate_fingerprint !== candidate.candidate_fingerprint ||
    authority.target_card_print_id !== candidate.target.card_print_id
  ) {
    throw new Error("INACTIVE_REPAIR_CANDIDATE_BINDING_MISMATCH");
  }
  if (liveMapping === undefined) return authority;
  if (!liveMapping) throw new Error("INACTIVE_REPAIR_LIVE_MAPPING_MISSING");
  if (
    text(liveMapping.id) !== text(authority.mapping_id) ||
    liveMapping.source !== "tcgplayer" ||
    liveMapping.external_id !== String(candidate.source_product_id) ||
    liveMapping.card_print_id !== authority.expected_current.card_print_id ||
    liveMapping.active !== false ||
    new Date(liveMapping.synced_at).toISOString() !==
      new Date(authority.expected_current.synced_at).toISOString() ||
    tcgplayerInactiveMappingRepairFingerprintV1(liveMapping.meta ?? {}) !==
      authority.expected_current.meta_fingerprint
  ) {
    throw new Error("INACTIVE_REPAIR_LIVE_MAPPING_DRIFT");
  }
  if (
    liveMapping.meta?.reviewed_invalidation?.reason_code !==
    authority.expected_current.reviewed_invalidation_reason_code
  ) {
    throw new Error("INACTIVE_REPAIR_INVALIDATION_EVIDENCE_MISMATCH");
  }
  return authority;
}

export function buildTcgplayerInactiveMappingRepairMetaV1({
  authority,
  liveMapping,
  exactMappingMeta,
}) {
  assertTcgplayerInactiveMappingRepairAuthorityV1(authority, {
    candidate: {
      source_product_id: Number(liveMapping.external_id),
      candidate_fingerprint: authority.candidate_fingerprint,
      target: { card_print_id: authority.target_card_print_id },
    },
    liveMapping,
  });
  const {
    reviewed_invalidation: reviewedInvalidation,
    ...retainedLegacyMeta
  } = liveMapping.meta ?? {};
  return {
    ...retainedLegacyMeta,
    ...exactMappingMeta,
    inactive_mapping_repair: {
      policy_version: TCGPLAYER_INACTIVE_MAPPING_REPAIR_POLICY_V1,
      authority_fingerprint: authority.fingerprint,
      prior_mapping_id: text(liveMapping.id),
      prior_card_print_id: liveMapping.card_print_id,
      prior_active: false,
      prior_synced_at: new Date(liveMapping.synced_at).toISOString(),
      prior_meta_fingerprint:
        tcgplayerInactiveMappingRepairFingerprintV1(liveMapping.meta ?? {}),
      prior_reviewed_invalidation: reviewedInvalidation ?? null,
      reason_code: authority.reason_code,
    },
  };
}
