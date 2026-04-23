import test from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyDriftSeverityBucketV1,
  summarizeDriftAuditRowsV1,
} from '../../scripts/contracts/run_drift_audit_v1.mjs';

test('drift severity buckets normalize into gate categories', () => {
  assert.equal(classifyDriftSeverityBucketV1('critical_enforce_now'), 'critical_fail');
  assert.equal(classifyDriftSeverityBucketV1('unexpected_regression'), 'critical_fail');
  assert.equal(classifyDriftSeverityBucketV1('deferred_known_debt'), 'known_deferred_debt');
  assert.equal(classifyDriftSeverityBucketV1('other'), 'informational');
});

test('drift audit summary counts only non-zero rows into blocking categories', () => {
  const summary = summarizeDriftAuditRowsV1([
    { issue_name: 'a', severity_bucket: 'critical_enforce_now', row_count: 2 },
    { issue_name: 'b', severity_bucket: 'unexpected_regression', row_count: 1 },
    { issue_name: 'c', severity_bucket: 'deferred_known_debt', row_count: 4 },
    { issue_name: 'd', severity_bucket: 'other', row_count: 5 },
    { issue_name: 'e', severity_bucket: 'critical_enforce_now', row_count: 0 },
  ]);

  assert.deepEqual(summary, {
    total_checks: 5,
    critical_fail_checks: 2,
    known_deferred_debt_checks: 1,
    informational_checks: 1,
  });
});
