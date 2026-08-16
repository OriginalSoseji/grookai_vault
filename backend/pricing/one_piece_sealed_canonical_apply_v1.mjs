import { createHash } from "node:crypto";

export const ONE_PIECE_SEALED_CANONICAL_APPLY_VERSION =
  "ONE_PIECE_SEALED_CANONICAL_DURABLE_APPLY_V1";

export const ONE_PIECE_SEALED_CANONICAL_EXPECTED_INSERTS = Object.freeze({
  sealed_product_families: 242,
  sealed_product_variants: 390,
  sealed_product_candidate_reviews: 390,
  sealed_product_source_mappings: 390,
  sealed_product_variant_evidence: 1731,
});

export const ONE_PIECE_SEALED_CANONICAL_WRITE_TABLES = Object.freeze(
  Object.keys(ONE_PIECE_SEALED_CANONICAL_EXPECTED_INSERTS),
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

export function stableJsonOnePieceSealedCanonicalApplyV1(value) {
  return JSON.stringify(stable(value));
}

export function hashOnePieceSealedCanonicalApplyV1(value) {
  return createHash("sha256").update(
    typeof value === "string" || Buffer.isBuffer(value)
      ? value
      : stableJsonOnePieceSealedCanonicalApplyV1(value),
  ).digest("hex");
}

function sorted(rows) {
  return [...(rows ?? [])].sort((left, right) =>
    String(left.id).localeCompare(String(right.id)));
}

export function normalizeOnePieceSealedCanonicalPayloadV1(payload) {
  return {
    families: sorted(payload?.families),
    variants: sorted(payload?.variants).map((row) => {
      const { family_identity_fingerprint: ignored, ...stored } = row;
      return stored;
    }),
    automated_reviews: sorted(payload?.automated_reviews),
    source_mappings: sorted(payload?.source_mappings).map((row) => ({
      ...row,
      source_category_id: Number(row.source_category_id),
      source_group_id: Number(row.source_group_id),
      source_product_id: Number(row.source_product_id),
    })),
    variant_evidence: sorted(payload?.variant_evidence).map((row) => ({
      ...row,
      confidence: Number(row.confidence),
      observed_at: row.observed_at
        ? new Date(row.observed_at).toISOString()
        : null,
    })),
  };
}

function expectedDelta(before) {
  const after = { ...before };
  for (const [table, count] of Object.entries(
    ONE_PIECE_SEALED_CANONICAL_EXPECTED_INSERTS)) {
    after[table] = Number(before?.[table] ?? 0) + count;
  }
  return after;
}

function validateReadback(findings, readback) {
  if (readback?.exact !== true ||
      readback?.expected_sha256 !== readback?.actual_sha256) {
    findings.push("exact_payload_readback_mismatch");
  }
  for (const [key, expected] of Object.entries({
    families: 242,
    variants: 390,
    automated_reviews: 390,
    source_mappings: 390,
    variant_evidence: 1731,
  })) {
    if (Number(readback?.counts?.[key]) !== expected) {
      findings.push(`readback_count_mismatch:${key}`);
    }
  }
}

function validateVisibility(findings, visibility) {
  if (visibility?.release_status !== "hidden") {
    findings.push("one_piece_release_not_hidden");
  }
  if (visibility?.anon_visible !== false ||
      visibility?.authenticated_visible !== false) {
    findings.push("one_piece_client_visibility_changed");
  }
}

export function evaluateOnePieceSealedCanonicalPrecommitV1(proof) {
  const findings = [];
  if (proof?.transaction?.started !== true ||
      proof?.transaction?.committed !== false) {
    findings.push("transaction_state_invalid_before_commit");
  }
  if (Number(proof?.prior_target_rows) !== 0) {
    findings.push("target_row_collision");
  }
  if (proof?.candidate_lineage?.expected !== 390 ||
      proof?.candidate_lineage?.found !== 390 ||
      (proof?.candidate_lineage?.mismatches ?? []).length !== 0) {
    findings.push("candidate_lineage_mismatch");
  }
  if (Object.entries(proof?.collisions ?? {})
    .some(([, value]) => Number(value) !== 0)) {
    findings.push("production_collision_present");
  }
  validateReadback(findings, proof?.readback);

  const actualWrites = Object.fromEntries((proof?.write_attribution ?? [])
    .map((row) => [row.table_name, row]));
  for (const [table, expected] of Object.entries(
    ONE_PIECE_SEALED_CANONICAL_EXPECTED_INSERTS)) {
    const row = actualWrites[table];
    if (Number(row?.inserted) !== expected) {
      findings.push(`write_attribution_mismatch:${table}`);
    }
    if (Number(row?.updated ?? 0) !== 0 ||
        Number(row?.deleted ?? 0) !== 0 ||
        Number(row?.hot_updated ?? 0) !== 0) {
      findings.push(`non_insert_write:${table}`);
    }
  }
  if (Object.keys(actualWrites).some((table) =>
    !ONE_PIECE_SEALED_CANONICAL_WRITE_TABLES.includes(table))) {
    findings.push("unexpected_table_write");
  }

  const expectedAfter = expectedDelta(proof?.baseline_before ?? {});
  if (stableJsonOnePieceSealedCanonicalApplyV1(expectedAfter) !==
      stableJsonOnePieceSealedCanonicalApplyV1(
        proof?.baseline_after_transaction ?? {})) {
    findings.push("protected_baseline_delta_mismatch");
  }
  validateVisibility(findings, proof?.visibility_before);
  validateVisibility(findings, proof?.visibility_after_transaction);
  if (proof?.boundaries?.storage_writes !== 0 ||
      proof?.boundaries?.pricing_writes !== 0 ||
      proof?.boundaries?.release_writes !== 0 ||
      proof?.boundaries?.publication_writes !== 0 ||
      proof?.boundaries?.card_writes !== 0 ||
      proof?.boundaries?.vault_writes !== 0) {
    findings.push("boundary_overclaim");
  }
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}

export function evaluateOnePieceSealedCanonicalPostApplyV1({
  applySummary,
  verification,
}) {
  const findings = [];
  if (applySummary?.status !==
      "durable_apply_committed_and_exact_readback_passed" ||
      applySummary?.committed !== true) {
    findings.push("durable_apply_not_proven");
  }
  if (verification?.transaction_read_only !== true) {
    findings.push("verification_not_read_only");
  }
  validateReadback(findings, verification?.readback);
  validateVisibility(findings, verification?.visibility);
  if (verification?.candidate_lineage?.expected !== 390 ||
      verification?.candidate_lineage?.found !== 390 ||
      (verification?.candidate_lineage?.mismatches ?? []).length !== 0) {
    findings.push("candidate_lineage_mismatch");
  }
  if ((verification?.write_attribution ?? []).length !== 0) {
    findings.push("read_only_write_attribution_present");
  }
  if (verification?.boundaries?.database_writes !== 0 ||
      verification?.boundaries?.storage_writes !== 0 ||
      verification?.boundaries?.pricing_writes !== 0 ||
      verification?.boundaries?.release_writes !== 0 ||
      verification?.boundaries?.publication_writes !== 0 ||
      verification?.boundaries?.card_writes !== 0 ||
      verification?.boundaries?.vault_writes !== 0) {
    findings.push("verification_boundary_overclaim");
  }
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}
