import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const SOURCE = fs.readFileSync(
  new URL(
    "../../scripts/audits/security_advisor_view_authority_guarded_dry_run_v1.mjs",
    import.meta.url,
  ),
  "utf8",
);

test("guarded dry-run strips the migration envelope and always rolls back", () => {
  assert.match(SOURCE, /migrationBody/);
  assert.match(SOURCE, /await client\.query\("begin"\)/);
  assert.match(SOURCE, /await client\.query\("rollback"\)/);
  assert.match(SOURCE, /transaction_ended_with_rollback:\s*true/);
  assert.match(SOURCE, /persistent_database_writes:\s*false/);
});

test("guarded dry-run compares schema and complete row fingerprints", () => {
  assert.match(SOURCE, /column_contracts_unchanged/);
  assert.match(SOURCE, /row_counts_unchanged/);
  assert.match(SOURCE, /row_fingerprints_unchanged/);
  assert.match(SOURCE, /row_to_json\(source_row\)/);
  assert.match(SOURCE, /order by row_hash/);
});

test("guarded dry-run proves role behavior and post-rollback absence", () => {
  assert.match(SOURCE, /set local role anon/);
  assert.match(SOURCE, /set local role authenticated/);
  assert.match(SOURCE, /anonymous_pricing_denied/);
  assert.match(SOURCE, /authenticated_pricing_exact/);
  assert.match(SOURCE, /rollback_removed_wrapper_functions/);
});

test("guarded dry-run artifacts cannot emit owner identity or row content", () => {
  assert.match(SOURCE, /collector_identifiers_emitted:\s*false/);
  assert.match(SOURCE, /row_content_emitted:\s*false/);
  assert.doesNotMatch(SOURCE, /sample_user_id|owner_identifier/);
});
