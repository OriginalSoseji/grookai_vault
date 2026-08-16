import { createHash } from "node:crypto";

import { deterministicUuidV5 } from
  "./one_piece_canonical_import_staging_v1.mjs";

export const ONE_PIECE_SEALED_PRICING_RELEASE_VERSION =
  "ONE_PIECE_SEALED_PRICING_RELEASE_V1";
export const ONE_PIECE_SEALED_PRICING_RELEASE_KEY =
  "one-piece-sealed-pricing-2026-08-15-v1";
export const ONE_PIECE_SEALED_PRICING_RELEASE_MEMBER_COUNT = 332;
export const ONE_PIECE_SEALED_PRICING_RELEASE_ID = deterministicUuidV5(
  `one-piece:sealed-pricing-release:${ONE_PIECE_SEALED_PRICING_RELEASE_KEY}`,
);
export const ONE_PIECE_SEALED_PRICING_RELEASE_ACTOR_ID = deterministicUuidV5(
  "grookai:system-actor:one-piece-sealed-pricing-release-v1",
);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stable(entry)]));
  }
  return value;
}

export function stableJsonOnePieceSealedPricingReleaseV1(value) {
  return JSON.stringify(stable(value));
}

export function hashOnePieceSealedPricingReleaseV1(value) {
  const body = Buffer.isBuffer(value) ? value :
    stableJsonOnePieceSealedPricingReleaseV1(value);
  return createHash("sha256").update(body).digest("hex");
}

function memberFromQualification(row) {
  const identity = {
    release_id: ONE_PIECE_SEALED_PRICING_RELEASE_ID,
    variant_id: row.variant_id,
    source_mapping_id: row.source_mapping_id,
    qualification_id: row.id,
    qualification_status: "qualified_exact",
  };
  const memberFingerprint = hashOnePieceSealedPricingReleaseV1(identity);
  return { id: deterministicUuidV5(
    `one-piece:sealed-pricing-release-member:${memberFingerprint}`),
  ...identity, member_fingerprint: memberFingerprint };
}

export function buildOnePieceSealedPricingReleasePlanV1({
  qualificationPlan,
  sourceProducerSha,
}) {
  const qualifiedRows = (qualificationPlan?.payload?.qualification_rows ?? [])
    .filter((row) => row.qualification_status === "qualified_exact")
    .sort((left, right) => String(left.variant_id)
      .localeCompare(String(right.variant_id)));
  const members = qualifiedRows.map(memberFromQualification);
  const manifestFingerprint = hashOnePieceSealedPricingReleaseV1(members);
  const release = {
    id: ONE_PIECE_SEALED_PRICING_RELEASE_ID,
    release_key: ONE_PIECE_SEALED_PRICING_RELEASE_KEY,
    release_state: "draft",
    source_audit_producer_sha: sourceProducerSha,
    source_sample_logical_hash:
      qualificationPlan.payload_fingerprint_sha256,
    release_contract_version: ONE_PIECE_SEALED_PRICING_RELEASE_VERSION,
    manifest_fingerprint: manifestFingerprint,
    expected_member_count: members.length,
    created_by: ONE_PIECE_SEALED_PRICING_RELEASE_ACTOR_ID,
  };
  const core = {
    version: ONE_PIECE_SEALED_PRICING_RELEASE_VERSION,
    release,
    members,
    exclusions: {
      blocked_stale: 4,
      blocked_missing_price: 38,
      blocked_missing_observation: 16,
      total: 58,
    },
    boundaries: {
      qualification_writes: 0,
      card_writes: 0,
      storage_writes: 0,
      vault_writes: 0,
      catalog_release_control_writes: 0,
    },
  };
  return { ...core,
    plan_fingerprint_sha256: hashOnePieceSealedPricingReleaseV1(core) };
}

export function validateOnePieceSealedPricingReleasePlanV1(plan) {
  const findings = [];
  const add = (condition, code) => { if (condition) findings.push(code); };
  const members = plan?.members ?? [];
  const { plan_fingerprint_sha256: fingerprint, ...core } = plan ?? {};
  add(plan?.version !== ONE_PIECE_SEALED_PRICING_RELEASE_VERSION,
    "version_mismatch");
  add(fingerprint !== hashOnePieceSealedPricingReleaseV1(core),
    "plan_fingerprint_mismatch");
  add(plan?.release?.id !== ONE_PIECE_SEALED_PRICING_RELEASE_ID,
    "release_id_mismatch");
  add(plan?.release?.release_key !== ONE_PIECE_SEALED_PRICING_RELEASE_KEY,
    "release_key_mismatch");
  add(plan?.release?.release_state !== "draft", "release_not_draft");
  add(plan?.release?.expected_member_count !==
    ONE_PIECE_SEALED_PRICING_RELEASE_MEMBER_COUNT,
  "expected_member_count_mismatch");
  add(members.length !== ONE_PIECE_SEALED_PRICING_RELEASE_MEMBER_COUNT,
    "member_count_mismatch");
  add(plan?.release?.manifest_fingerprint !==
    hashOnePieceSealedPricingReleaseV1(members), "manifest_mismatch");
  add(new Set(members.map((row) => row.id)).size !== members.length,
    "duplicate_member_id");
  add(new Set(members.map((row) => row.variant_id)).size !== members.length,
    "duplicate_variant_id");
  add(new Set(members.map((row) => row.qualification_id)).size !== members.length,
    "duplicate_qualification_id");
  add(new Set(members.map((row) => row.member_fingerprint)).size !==
    members.length, "duplicate_member_fingerprint");
  for (const member of members) {
    const expected = memberFromQualification({ id: member.qualification_id,
      variant_id: member.variant_id,
      source_mapping_id: member.source_mapping_id });
    add(member.release_id !== ONE_PIECE_SEALED_PRICING_RELEASE_ID,
      `release_binding_mismatch:${member.id}`);
    add(member.qualification_status !== "qualified_exact",
      `nonqualified_member:${member.id}`);
    add(member.id !== expected.id ||
      member.member_fingerprint !== expected.member_fingerprint,
    `member_fingerprint_mismatch:${member.id}`);
  }
  add(Number(plan?.exclusions?.total) !== 58,
    "exclusion_count_mismatch");
  for (const [key, value] of Object.entries(plan?.boundaries ?? {})) {
    add(value !== 0, `boundary_overclaim:${key}`);
  }
  return { valid: findings.length === 0,
    findings: [...new Set(findings)] };
}
