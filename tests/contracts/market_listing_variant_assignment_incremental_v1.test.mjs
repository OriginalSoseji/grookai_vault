import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const worker = readFileSync(
  new URL(
    "../../scripts/workers/market_listing_variant_assignment_incremental_v1.mjs",
    import.meta.url,
  ),
  "utf8",
);

test("incremental assignment worker is dry-run by default and acquisition-bounded", () => {
  assert.match(worker, /apply: false/);
  assert.match(worker, /--acquisition-run-id=/);
  assert.match(worker, /observation\.acquisition_run_id = \$1/);
  assert.match(worker, /--max-candidates=/);
  assert.match(worker, /--batch-size=/);
  assert.match(worker, /limit \$3/);
  assert.doesNotMatch(worker, /\[1-5\]\[0-9a-f\]\{3\}/);
});

test("incremental assignment worker preserves evidence and publication boundaries", () => {
  assert.match(worker, /provider_calls: false/);
  assert.match(worker, /source_evidence_updates: false/);
  assert.match(worker, /canonical_identity_writes: false/);
  assert.match(worker, /pricing_publication_writes: false/);
  assert.match(worker, /true, false, false, false/);
  assert.doesNotMatch(worker, /update public\.market_listing/i);
  assert.doesNotMatch(worker, /delete from public\./i);
});

test("incremental assignment worker is idempotent and reconciles every selected row", () => {
  assert.match(
    worker,
    /on conflict \(source_family, source_row_id, variant_assignment_version\) do nothing/,
  );
  assert.match(worker, /Batch reconciliation failed/);
  assert.match(worker, /incremental assignment apply requires a clean tracked working tree/);
  assert.match(worker, /selected_candidates_/);
  assert.match(worker, /selected_sha256/);
});

test("incremental assignment worker preserves the governed variant ontology", () => {
  assert.match(worker, /MEE_VARIANT_ASSIGNMENT_RULES_V1/);
  assert.match(worker, /exact_child_finish/);
  assert.match(worker, /single_child_inferred/);
  assert.match(worker, /unknown_finish_needs_review/);
  assert.match(worker, /no_matching_child_finish/);
  assert.match(worker, /ambiguous_finish_conflict/);
  assert.match(worker, /parent_has_no_child/);
  assert.match(worker, /normalize_market_evidence_finish_key_v1/);
});
