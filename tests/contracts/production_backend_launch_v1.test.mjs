import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

import {
  TOPOLOGY_PATH,
  buildBaselineMatrixV1,
  validateTopologyV1
} from '../../scripts/audits/production_backend_launch_baseline_v1.mjs';

test('production topology is valid and all declared repository sources exist', async () => {
  const topology = JSON.parse(await fs.readFile(TOPOLOGY_PATH, 'utf8'));
  const result = await validateTopologyV1(topology);

  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.equal(result.summary.missing_repository_sources, 0);
  assert.ok(result.summary.class_a > 0);
  assert.ok(result.summary.class_b > 0);
  assert.ok(result.summary.class_c > 0);
});

test('Class C topology entries always yield to collector-critical work', async () => {
  const topology = JSON.parse(await fs.readFile(TOPOLOGY_PATH, 'utf8'));
  const classC = topology.components.filter((component) => component.workload_class === 'C');

  assert.ok(classC.length > 0);
  for (const component of classC) {
    assert.match(component.pause_policy, /pause/i, component.id);
  }
});

test('baseline matrix refuses to claim launch readiness from partial evidence', () => {
  const matrix = buildBaselineMatrixV1({
    topologyValidation: {
      ok: true,
      errors: [],
      summary: {
        components: 15,
        class_a: 5,
        class_b: 5,
        class_c: 5,
        repository_sources: 20,
        missing_repository_sources: 0
      }
    },
    runtimePreflight: {
      collected_at: '2026-08-23T12:00:00.000Z',
      summary: { critical_fail_checks: 0 }
    },
    nowIso: '2026-08-23T13:00:00.000Z'
  });

  assert.equal(matrix.launch_ready, false);
  assert.equal(matrix.rows.find((row) => row.id === 'runtime-contract-health').status, 'pass');
  assert.equal(matrix.rows.find((row) => row.id === 'supabase-capacity-performance').status, 'unmeasured');
  assert.equal(matrix.rows.find((row) => row.id === 'new-set-discovery').status, 'stale');
});

test('stale runtime evidence cannot pass its launch gate', () => {
  const matrix = buildBaselineMatrixV1({
    topologyValidation: {
      ok: true,
      errors: [],
      summary: {
        components: 1,
        class_a: 1,
        class_b: 0,
        class_c: 0,
        repository_sources: 1,
        missing_repository_sources: 0
      }
    },
    runtimePreflight: {
      collected_at: '2026-08-20T00:00:00.000Z',
      summary: { critical_fail_checks: 0 }
    },
    nowIso: '2026-08-23T13:00:00.000Z'
  });

  assert.equal(matrix.rows.find((row) => row.id === 'runtime-contract-health').status, 'stale');
});
