import { createHash } from "node:crypto";

export const ONE_PIECE_SEALED_CANONICAL_PREFLIGHT_VERSION =
  "ONE_PIECE_SEALED_CANONICAL_PREFLIGHT_V1";

export const ONE_PIECE_SEALED_CANONICAL_TABLE_COLUMNS = Object.freeze({
  sealed_product_families: [
    "id", "game_key", "family_key", "canonical_name", "manufacturer_name",
    "product_line_key", "identity_contract_version", "identity_fingerprint",
  ],
  sealed_product_variants: [
    "id", "family_id", "variant_key", "canonical_name", "package_form",
    "language_code", "region_code", "edition", "wave", "explicit_contents",
    "manufacturer_sku", "upc", "release_date", "identity_contract_version",
    "identity_fingerprint",
  ],
  sealed_product_candidate_reviews: [
    "id", "candidate_id", "decision", "promotion_authorized", "reviewed_by",
    "decision_evidence", "review_contract_version",
  ],
  sealed_product_source_mappings: [
    "id", "variant_id", "candidate_id", "review_id",
    "candidate_classification", "review_decision", "promotion_authorized",
    "source_provider", "source_category_id", "source_group_id",
    "source_product_id", "source_product_name", "source_url",
    "source_payload_hash", "classifier_version", "mapping_contract_version",
    "mapping_status", "mapping_fingerprint",
  ],
  sealed_product_variant_evidence: [
    "id", "variant_id", "source_mapping_id", "evidence_dimension",
    "source_provider", "source_object_identity", "source_field", "source_value",
    "normalized_value", "evidence_strength", "confidence",
    "source_payload_hash", "observed_at", "evidence_fingerprint",
  ],
});

export const ONE_PIECE_SEALED_REQUIRED_CONSTRAINTS = Object.freeze([
  "sealed_product_families_game_family_unique",
  "sealed_product_families_fingerprint_unique",
  "sealed_product_variants_family_key_unique",
  "sealed_product_variants_fingerprint_unique",
  "sealed_product_candidate_reviews_mapping_binding_unique",
  "sealed_product_source_mappings_candidate_binding_fk",
  "sealed_product_source_mappings_review_binding_fk",
  "sealed_product_source_mappings_exact_source_unique",
  "sealed_product_source_mappings_variant_binding_unique",
  "sealed_product_source_mappings_fingerprint_unique",
  "sealed_product_variant_evidence_mapping_binding_fk",
  "sealed_product_variant_evidence_fingerprint_unique",
]);

export const ONE_PIECE_SEALED_REQUIRED_TRIGGERS = Object.freeze([
  "sealed_product_families_append_only",
  "sealed_product_variants_append_only",
  "sealed_product_candidate_reviews_append_only",
  "sealed_product_source_mappings_append_only",
  "sealed_product_variant_evidence_append_only",
]);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stable(entry)]));
  }
  return value;
}

export function stableJsonOnePieceSealedCanonicalPreflightV1(value) {
  return JSON.stringify(stable(value));
}

export function hashOnePieceSealedCanonicalPreflightV1(value) {
  return createHash("sha256").update(
    typeof value === "string" || Buffer.isBuffer(value)
      ? value
      : stableJsonOnePieceSealedCanonicalPreflightV1(value),
  ).digest("hex");
}

export function evaluateOnePieceSealedCanonicalPreflightV1({ plan, snapshot }) {
  const findings = [];
  const add = (condition, code) => { if (condition) findings.push(code); };
  const canonical = plan?.payload ?? {};
  add(plan?.apply_authority !== false || plan?.pricing_authority !== false ||
    plan?.publication_authority !== false, "input_plan_authority_overclaim");
  add((canonical.families ?? []).length !== 242, "family_count_mismatch");
  add((canonical.variants ?? []).length !== 390, "variant_count_mismatch");
  add((canonical.automated_reviews ?? []).length !== 390,
    "review_count_mismatch");
  add((canonical.source_mappings ?? []).length !== 390,
    "source_mapping_count_mismatch");
  add((canonical.variant_evidence ?? []).length !== 1731,
    "variant_evidence_count_mismatch");

  add(snapshot?.guard?.transaction_read_only !== true,
    "transaction_not_read_only");
  add(snapshot?.guard?.default_transaction_read_only !== true,
    "session_not_read_only");
  add(snapshot?.guard?.transaction_closed_before_artifacts !== true,
    "transaction_not_closed_before_artifacts");

  for (const [table, columns] of Object.entries(
    ONE_PIECE_SEALED_CANONICAL_TABLE_COLUMNS)) {
    const actual = new Set(snapshot?.schema?.columns?.[table] ?? []);
    add(!snapshot?.schema?.tables?.[table]?.present, `table_missing:${table}`);
    add(!snapshot?.schema?.tables?.[table]?.rls_enabled,
      `rls_not_enabled:${table}`);
    add(snapshot?.schema?.tables?.[table]?.anon_select === true ||
      snapshot?.schema?.tables?.[table]?.authenticated_select === true,
    `client_select_privilege_present:${table}`);
    add(snapshot?.schema?.tables?.[table]?.service_select !== true ||
      snapshot?.schema?.tables?.[table]?.service_insert !== true,
    `service_privilege_missing:${table}`);
    for (const column of columns) {
      add(!actual.has(column), `column_missing:${table}.${column}`);
    }
  }
  const constraints = new Set(snapshot?.schema?.constraints ?? []);
  for (const constraint of ONE_PIECE_SEALED_REQUIRED_CONSTRAINTS) {
    add(!constraints.has(constraint), `constraint_missing:${constraint}`);
  }
  const triggers = new Set(snapshot?.schema?.triggers ?? []);
  for (const trigger of ONE_PIECE_SEALED_REQUIRED_TRIGGERS) {
    add(!triggers.has(trigger), `trigger_missing:${trigger}`);
  }

  add(snapshot?.candidate_lineage?.expected !== 390,
    "candidate_lineage_expected_count_mismatch");
  add(snapshot?.candidate_lineage?.found !== 390,
    "candidate_lineage_missing");
  add((snapshot?.candidate_lineage?.mismatches ?? []).length !== 0,
    "candidate_lineage_drift");
  for (const [key, value] of Object.entries(snapshot?.collisions ?? {})) {
    add(Number(value) !== 0, `production_collision:${key}`);
  }
  add((snapshot?.write_attribution ?? []).length !== 0,
    "read_only_write_attribution_present");
  add((snapshot?.blocking_pids ?? []).length !== 0, "blocking_pid_present");
  add(stableJsonOnePieceSealedCanonicalPreflightV1(snapshot?.baseline_before) !==
    stableJsonOnePieceSealedCanonicalPreflightV1(snapshot?.baseline_after),
  "protected_baseline_changed");
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}

export function buildOnePieceSealedCanonicalPreflightFingerprintV1(value) {
  return hashOnePieceSealedCanonicalPreflightV1({
    version: ONE_PIECE_SEALED_CANONICAL_PREFLIGHT_VERSION,
    resolution_fingerprint_sha256: value.resolution_fingerprint_sha256,
    canonical_plan_sha256: value.canonical_plan_sha256,
    snapshot: value.snapshot,
  });
}
