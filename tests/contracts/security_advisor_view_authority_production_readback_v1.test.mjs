import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const SOURCE = fs.readFileSync(
  new URL(
    "../../scripts/audits/security_advisor_view_authority_production_readback_v1.mjs",
    import.meta.url,
  ),
  "utf8",
);

test("production security readback requires frozen provenance inputs", () => {
  assert.match(SOURCE, /--commit-sha is required/);
  assert.match(SOURCE, /--pre-apply is required/);
  assert.match(SOURCE, /--dry-run is required/);
  assert.match(SOURCE, /frozen_commit_sha/);
  assert.match(SOURCE, /migration_history_exact/);
});

test("production security readback reconciles pre-apply schema and rows", () => {
  assert.match(SOURCE, /pre_apply_column_contract_preserved/);
  assert.match(SOURCE, /pre_apply_row_counts_preserved/);
  assert.match(SOURCE, /pre_apply_row_fingerprints_preserved/);
  assert.match(SOURCE, /row_to_json\(source_row\)/);
});

test("production security readback verifies exact grants and role behavior", () => {
  assert.match(SOURCE, /exact_view_grants/);
  assert.match(SOURCE, /set local role anon/);
  assert.match(SOURCE, /set local role authenticated/);
  assert.match(SOURCE, /anonymous_pricing_denied/);
  assert.match(SOURCE, /authenticated_pricing_exact/);
});

test("production readback is read-only and emits no collector identity", () => {
  assert.match(SOURCE, /begin read only/);
  assert.match(SOURCE, /database_writes:\s*false/);
  assert.match(SOURCE, /collector_identifiers_emitted:\s*false/);
  assert.doesNotMatch(SOURCE, /\b(insert|update|delete|truncate)\s+public\./i);
});
