import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildAutoscalePlan,
  configsEqual,
  normalizeAutoscaleConfig,
} from '../../scripts/ops/supabase_disk_autoscale_apply_v1.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const worker = readFileSync(
  path.join(ROOT, 'scripts', 'ops', 'supabase_disk_autoscale_apply_v1.mjs'),
  'utf8',
);
const workflow = readFileSync(
  path.join(ROOT, '.github', 'workflows', 'supabase-disk-autoscale-apply.yml'),
  'utf8',
);

test('autoscale plan is narrow and deterministic about its authority', () => {
  const plan = buildAutoscalePlan({
    projectRef: 'production-ref',
    expectedCurrent: { growth_percent: 0, min_increment_gb: 0, max_size_gb: 600 },
    desired: { growth_percent: 50, min_increment_gb: 4, max_size_gb: 600 },
    commitSha: 'a'.repeat(40),
    runId: '123',
  });
  assert.equal(plan.boundaries.management_api_mutation, 'disk_autoscale_custom_config_only');
  assert.equal(plan.boundaries.database_access, false);
  assert.equal(plan.boundaries.disk_resize, false);
  assert.equal(plan.desired.max_size_gb, 600);
  assert.match(plan.plan_sha256, /^[a-f0-9]{64}$/);
});

test('config comparison is field exact', () => {
  assert.equal(
    configsEqual(
      { growth_percent: 50, min_increment_gb: 4, max_size_gb: 600 },
      { growth_percent: 50, min_increment_gb: 4, max_size_gb: 600 },
    ),
    true,
  );
  assert.equal(
    configsEqual(
      { growth_percent: 0, min_increment_gb: 0, max_size_gb: 600 },
      { growth_percent: 50, min_increment_gb: 4, max_size_gb: 600 },
    ),
    false,
  );
  assert.deepEqual(
    normalizeAutoscaleConfig({ growth_percent: '50', min_increment_gb: '4', max_size_gb: '600' }),
    { growth_percent: 50, min_increment_gb: 4, max_size_gb: 600 },
  );
});

test('worker is apply-gated, preflight-pinned, read back, and rollback-capable', () => {
  assert.match(worker, /if \(!apply\) throw new Error\('--apply is required/);
  assert.match(worker, /preflight refused/);
  assert.match(worker, /waitForConfig/);
  assert.match(worker, /await applyConfig\(projectRef, accessToken, before\)/);
  assert.match(worker, /max-size-gb may not exceed the approved 600 GB ceiling/);
});

test('workflow is manual and contains no database credential', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /schedule:/);
  assert.match(workflow, /expected-growth-percent 0/);
  assert.match(workflow, /growth-percent 50/);
  assert.match(workflow, /max-size-gb 600/);
  assert.doesNotMatch(workflow, /SUPABASE_DB_URL/);
});

