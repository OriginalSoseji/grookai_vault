import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  ONE_PIECE_SEALED_CANONICAL_EXPECTED_INSERTS,
  evaluateOnePieceSealedCanonicalPostApplyV1,
  evaluateOnePieceSealedCanonicalPrecommitV1,
  normalizeOnePieceSealedCanonicalPayloadV1,
} from "../../backend/pricing/one_piece_sealed_canonical_apply_v1.mjs";

function visibility() {
  return { release_status: "hidden", anon_visible: false,
    authenticated_visible: false };
}

function baseline() {
  return { sealed_product_families: 0, sealed_product_variants: 0,
    sealed_product_candidates: 403, sealed_product_candidate_reviews: 0,
    sealed_product_source_mappings: 0,
    sealed_product_variant_evidence: 0, card_prints: 6508,
    card_printings: 14, external_mappings: 6508,
    vault_item_instances: 7, market_price_current_publication: 100,
    catalog_game_release_controls: 3 };
}

function readback() {
  return { exact: true, expected_sha256: "a".repeat(64),
    actual_sha256: "a".repeat(64), counts: { families: 242,
      variants: 390, automated_reviews: 390, source_mappings: 390,
      variant_evidence: 1731 } };
}

function precommitProof() {
  const before = baseline();
  const after = { ...before };
  for (const [table, count] of Object.entries(
    ONE_PIECE_SEALED_CANONICAL_EXPECTED_INSERTS)) after[table] += count;
  return { transaction: { started: true, committed: false },
    prior_target_rows: 0,
    candidate_lineage: { expected: 390, found: 390, mismatches: [] },
    collisions: { family_ids: 0, mapping_sources: 0 },
    readback: readback(), baseline_before: before,
    baseline_after_transaction: after, visibility_before: visibility(),
    visibility_after_transaction: visibility(),
    write_attribution: Object.entries(
      ONE_PIECE_SEALED_CANONICAL_EXPECTED_INSERTS).map(
      ([table_name, inserted]) => ({ table_name, inserted, updated: 0,
        deleted: 0, hot_updated: 0 })),
    boundaries: { storage_writes: 0, pricing_writes: 0, release_writes: 0,
      publication_writes: 0, card_writes: 0, vault_writes: 0 } };
}

test("exact insert-only precommit proof passes", () => {
  assert.deepEqual(evaluateOnePieceSealedCanonicalPrecommitV1(
    precommitProof()), { valid: true, findings: [] });
});

test("unexpected writes, count drift, and visibility changes fail closed", () => {
  const proof = precommitProof();
  proof.write_attribution.push({ table_name: "card_prints", inserted: 1,
    updated: 0, deleted: 0, hot_updated: 0 });
  proof.baseline_after_transaction.sealed_product_variants -= 1;
  proof.visibility_after_transaction.authenticated_visible = true;
  const result = evaluateOnePieceSealedCanonicalPrecommitV1(proof);
  assert.equal(result.valid, false);
  assert.ok(result.findings.includes("unexpected_table_write"));
  assert.ok(result.findings.includes("protected_baseline_delta_mismatch"));
  assert.ok(result.findings.includes("one_piece_client_visibility_changed"));
});

test("independent exact read-only verification passes and drift fails", () => {
  const applySummary = { status:
    "durable_apply_committed_and_exact_readback_passed", committed: true };
  const verification = { transaction_read_only: true, readback: readback(),
    visibility: visibility(), candidate_lineage: { expected: 390, found: 390,
      mismatches: [] }, write_attribution: [], boundaries: {
      database_writes: 0, storage_writes: 0, pricing_writes: 0,
      release_writes: 0, publication_writes: 0, card_writes: 0,
      vault_writes: 0 } };
  assert.deepEqual(evaluateOnePieceSealedCanonicalPostApplyV1({
    applySummary, verification }), { valid: true, findings: [] });
  verification.readback.actual_sha256 = "b".repeat(64);
  assert.equal(evaluateOnePieceSealedCanonicalPostApplyV1({
    applySummary, verification }).valid, false);
});

test("payload normalization removes derived-only variant fields", () => {
  const normalized = normalizeOnePieceSealedCanonicalPayloadV1({
    families: [], variants: [{ id: "2", family_identity_fingerprint: "x" }],
    automated_reviews: [], source_mappings: [], variant_evidence: [] });
  assert.equal("family_identity_fingerprint" in normalized.variants[0], false);
});

test("durable writer contains inserts only for the five authorized tables", () => {
  const source = fs.readFileSync(new URL("../../scripts/audits/" +
    "one_piece_sealed_canonical_apply_v1.mjs", import.meta.url), "utf8");
  const inserts = [...source.matchAll(
    /insert into public\.([a-z0-9_]+)/g)].map((match) => match[1]);
  assert.deepEqual([...new Set(inserts)].sort(),
    Object.keys(ONE_PIECE_SEALED_CANONICAL_EXPECTED_INSERTS).sort());
  assert.doesNotMatch(source, /\bupdate\s+public\./i);
  assert.doesNotMatch(source, /\bdelete\s+from\s+public\./i);
  assert.doesNotMatch(source, /on\s+conflict/i);
});
