import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateCapacityForecastV1 } from '../../scripts/audits/production_supabase_capacity_forecast_v1.mjs';

function input(overrides = {}) {
  return {
    managed_disk: {
      fs_size_bytes: 320_101_937_152,
      fs_used_bytes: 231_542_988_800,
      fs_avail_bytes: 88_558_948_352
    },
    relation_growth_inputs: [
      {
        relation: 'source_rows',
        workload: 'pricing',
        total_bytes: 104_558_796_800,
        live_rows: 111_160_278,
        cycle_insert_rows: 546_333,
        cycles_per_day: 1
      }
    ],
    storage: { current_bytes: 31_838_610_700 },
    connections: { current: 21, maximum: 90, load_test_verified: false },
    egress: { forecast_verified: false },
    autoscale: { configured: false },
    ...overrides
  };
}

test('capacity gate fails when current managed disk use exceeds 70 percent', () => {
  const report = evaluateCapacityForecastV1(input());
  assert.equal(report.status, 'failed');
  assert.ok(report.metrics.managed_disk.utilization > 0.72);
  assert.ok(report.findings.some((row) => row.code === 'managed_disk_at_or_above_70_percent'));
});

test('forecast is derived from evidence-backed relation size and cycle rows', () => {
  const report = evaluateCapacityForecastV1(input());
  const expected = (104_558_796_800 / 111_160_278) * 546_333;
  assert.equal(report.metrics.managed_disk.projected_daily_database_bytes_lower_bound, expected);
  assert.equal(report.relation_growth[0].projected_daily_bytes, expected);
});

test('unknown Storage capacity, egress, and untested connections remain unmeasured', () => {
  const report = evaluateCapacityForecastV1(input({
    managed_disk: {
      fs_size_bytes: 1_000_000_000_000,
      fs_used_bytes: 100_000_000_000,
      fs_avail_bytes: 900_000_000_000
    },
    relation_growth_inputs: []
  }));
  assert.equal(report.status, 'incomplete');
  assert.ok(report.findings.some((row) => row.code === 'storage_plan_capacity_unmeasured'));
  assert.ok(report.findings.some((row) => row.code === 'egress_forecast_unverified'));
  assert.ok(report.findings.some((row) => row.code === 'connection_load_forecast_unverified'));
});

test('2x 90-day headroom is enforced separately from current utilization', () => {
  const report = evaluateCapacityForecastV1(input({
    managed_disk: {
      fs_size_bytes: 1_000_000_000_000,
      fs_used_bytes: 600_000_000_000,
      fs_avail_bytes: 400_000_000_000
    },
    relation_growth_inputs: [{
      relation: 'large_daily_append',
      workload: 'launch_data',
      total_bytes: 900_000_000_000,
      live_rows: 90_000_000,
      cycle_insert_rows: 500_000,
      cycles_per_day: 1
    }]
  }));
  assert.ok(report.findings.some((row) => row.code === 'managed_disk_2x_90_day_headroom_missing'));
});
