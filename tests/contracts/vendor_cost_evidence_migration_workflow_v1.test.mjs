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

test('vendor cost migration apply requires the explicit approval phrase', () => {
  assert.match(workflow, /inputs\.mode == 'apply'/);
  assert.match(workflow, /APPLY_VENDOR_COST_EVIDENCE_V1/);
  assert.match(workflow, /application_flags_enabled: false/);
});
