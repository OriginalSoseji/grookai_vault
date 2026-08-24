import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyPricingRunV1,
  classifySourceSyncV1,
  classifyWorkflowRunV1
} from '../../scripts/audits/production_live_control_plane_v1.mjs';

const NOW = new Date('2026-08-24T01:00:00.000Z');

test('successful fresh GitHub workflow is healthy', () => {
  const result = classifyWorkflowRunV1(
    { max_staleness_minutes: 90 },
    {
      status: 'completed',
      conclusion: 'success',
      updated_at: '2026-08-24T00:30:00.000Z'
    },
    NOW
  );
  assert.equal(result.status, 'healthy');
});

test('failed GitHub workflow is never hidden by freshness', () => {
  const result = classifyWorkflowRunV1(
    { max_staleness_minutes: 90 },
    {
      status: 'completed',
      conclusion: 'failure',
      updated_at: '2026-08-24T00:59:00.000Z'
    },
    NOW
  );
  assert.equal(result.status, 'failed');
});

test('pricing requires terminal state, reconciliation, and freshness', () => {
  assert.equal(classifyPricingRunV1({
    state: 'verified',
    reconciliation_state: 'reconciled',
    completed_at: '2026-08-24T00:00:00.000Z'
  }, NOW).status, 'healthy');
  assert.equal(classifyPricingRunV1({
    state: 'verified',
    reconciliation_state: 'mismatch',
    completed_at: '2026-08-24T00:00:00.000Z'
  }, NOW).status, 'degraded');
  assert.equal(classifyPricingRunV1({
    state: 'failed',
    reconciliation_state: 'pending',
    failed_at: '2026-08-24T00:00:00.000Z'
  }, NOW).status, 'failed');
});

test('source sync rejects partial or row-level failures', () => {
  assert.equal(classifySourceSyncV1({
    status: 'completed',
    failed_count: 0,
    finished_at: '2026-08-24T00:00:00.000Z'
  }, NOW).status, 'healthy');
  assert.equal(classifySourceSyncV1({
    status: 'partial_success',
    failed_count: 0,
    finished_at: '2026-08-24T00:00:00.000Z'
  }, NOW).status, 'degraded');
  assert.equal(classifySourceSyncV1({
    status: 'completed',
    failed_count: 1,
    finished_at: '2026-08-24T00:00:00.000Z'
  }, NOW).status, 'failed');
});
