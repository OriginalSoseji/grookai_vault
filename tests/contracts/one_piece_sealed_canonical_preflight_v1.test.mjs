import assert from "node:assert/strict";
import test from "node:test";

import {
  ONE_PIECE_SEALED_CANONICAL_TABLE_COLUMNS,
  ONE_PIECE_SEALED_REQUIRED_CONSTRAINTS,
  ONE_PIECE_SEALED_REQUIRED_TRIGGERS,
  buildOnePieceSealedCanonicalPreflightFingerprintV1,
  evaluateOnePieceSealedCanonicalPreflightV1,
} from "../../backend/pricing/one_piece_sealed_canonical_preflight_v1.mjs";

function input() {
  const tables = {}, columns = {};
  for (const [table, expected] of Object.entries(
    ONE_PIECE_SEALED_CANONICAL_TABLE_COLUMNS)) {
    tables[table] = {
      present: true,
      rls_enabled: true,
      anon_select: false,
      authenticated_select: false,
      service_select: true,
      service_insert: true,
    };
    columns[table] = [...expected];
  }
  return {
    plan: {
      apply_authority: false,
      pricing_authority: false,
      publication_authority: false,
      payload: {
        families: Array(242).fill({}),
        variants: Array(390).fill({}),
        automated_reviews: Array(390).fill({}),
        source_mappings: Array(390).fill({}),
        variant_evidence: Array(1731).fill({}),
      },
    },
    snapshot: {
      guard: {
        transaction_read_only: true,
        default_transaction_read_only: true,
        transaction_closed_before_artifacts: true,
      },
      schema: {
        tables,
        columns,
        constraints: [...ONE_PIECE_SEALED_REQUIRED_CONSTRAINTS],
        triggers: [...ONE_PIECE_SEALED_REQUIRED_TRIGGERS],
      },
      candidate_lineage: { expected: 390, found: 390, mismatches: [] },
      collisions: {
        family_ids: 0,
        family_keys: 0,
        family_fingerprints: 0,
        variant_ids: 0,
        variant_keys: 0,
        variant_fingerprints: 0,
        review_ids: 0,
        mapping_ids: 0,
        mapping_sources: 0,
        mapping_fingerprints: 0,
        evidence_ids: 0,
        evidence_fingerprints: 0,
      },
      baseline_before: { card_prints: 100, sealed_product_candidates: 403 },
      baseline_after: { card_prints: 100, sealed_product_candidates: 403 },
      write_attribution: [],
      blocking_pids: [],
    },
  };
}

test("exact collision-free read-only preflight passes", () => {
  const value = input();
  assert.deepEqual(evaluateOnePieceSealedCanonicalPreflightV1(value),
    { valid: true, findings: [] });
  assert.match(buildOnePieceSealedCanonicalPreflightFingerprintV1({
    resolution_fingerprint_sha256: "a".repeat(64),
    canonical_plan_sha256: "b".repeat(64),
    snapshot: value.snapshot,
  }), /^[0-9a-f]{64}$/);
});

test("schema, lineage, collision, write, and baseline failures fail closed", () => {
  const value = input();
  value.snapshot.schema.tables.sealed_product_families.anon_select = true;
  value.snapshot.schema.columns.sealed_product_variants = [];
  value.snapshot.candidate_lineage.mismatches.push(288221);
  value.snapshot.collisions.mapping_sources = 1;
  value.snapshot.write_attribution.push({ table_name: "sealed_product_families" });
  value.snapshot.baseline_after.card_prints = 99;
  const result = evaluateOnePieceSealedCanonicalPreflightV1(value);
  assert.equal(result.valid, false);
  for (const finding of [
    "client_select_privilege_present:sealed_product_families",
    "column_missing:sealed_product_variants.id",
    "candidate_lineage_drift",
    "production_collision:mapping_sources",
    "read_only_write_attribution_present",
    "protected_baseline_changed",
  ]) assert.ok(result.findings.includes(finding), finding);
});
