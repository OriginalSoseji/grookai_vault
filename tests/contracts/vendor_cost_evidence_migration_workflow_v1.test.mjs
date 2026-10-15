import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync(new URL('../../.github/workflows/vendor-cost-evidence-migration.yml', import.meta.url), 'utf8');

test('vendor cost migration workflow is dry-run first and exact-ref pinned', () => {
  assert.match(workflow, /TARGET_MIGRATION:\s*20261007180000_vendor_cost_evidence_v1\.sql/);
  assert.match(workflow, /test "\$GITHUB_SHA" = "\$EXPECTED_SHA"/);
  assert.match(workflow, /--dry-run/);
  assert.match(workflow, /test "\$\{pending\[0\]\}" = "\$TARGET_MIGRATION"/);
});

test('vendor cost migration has no production apply path before release authority', () => {
  assert.doesNotMatch(workflow, /- apply/);
  assert.doesNotMatch(workflow, /db push --db-url/);
  assert.match(workflow, /db_row_writes_performed: false/);
  assert.match(workflow, /production_apply_authorized: false/);
  assert.match(workflow, /readback_verified: false/);
  assert.doesNotMatch(workflow, /job\.status/);
  assert.match(workflow, /JOB_SUCCEEDED: \$\{\{ success\(\) \}\}/);
  assert.match(workflow, /dry_run_completed: process\.env\.JOB_SUCCEEDED === 'true'/);
});
