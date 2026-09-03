import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const workflow = fs.readFileSync(
  '.github/workflows/mtg-sealed-visibility-boundary.yml', 'utf8');

test('visibility workflow targets only the forward boundary migration', () => {
  assert.match(workflow,
    /TARGET_MIGRATION: 20260903143000_sealed_product_visibility_boundary_v1\.sql/);
  assert.doesNotMatch(workflow, /--include-all/);
  assert.match(workflow, /test "\$GITHUB_SHA" = "\$EXPECTED_SHA"/);
  assert.match(workflow, /test -f "supabase\/migrations\/\$TARGET_MIGRATION"/);
});

test('visibility workflow proves exactly one pending migration before apply', () => {
  assert.match(workflow, /supabase@2\.54\.11 migration list/);
  assert.match(workflow, /supabase@2\.54\.11 db push[\s\S]*--dry-run/);
  assert.match(workflow, /test "\$\{#pending\[@\]\}" -eq 1/);
  assert.match(workflow, /test "\$\{pending\[0\]\}" = "\$TARGET_MIGRATION"/);
  assert.match(workflow,
    /if: \$\{\{ inputs\.operation == 'migration_apply' \}\}[\s\S]*supabase@2\.54\.11 db push/);
});

test('visibility workflow installs dependencies before checks and runs full readback', () => {
  const installIndex = workflow.indexOf('npm ci --ignore-scripts');
  const importIndex = workflow.indexOf(
    'node --check backend/pricing/mtg_sealed_migration_readback_v1.mjs');
  assert.notEqual(installIndex, -1);
  assert.notEqual(importIndex, -1);
  assert.ok(installIndex < importIndex);
  assert.match(workflow,
    /node scripts\/audits\/mtg_sealed_migration_readback_v1\.mjs/);
  assert.match(workflow, /--expected-head-sha="\$EXPECTED_SHA"/);
});
