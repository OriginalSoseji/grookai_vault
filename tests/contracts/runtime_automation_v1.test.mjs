import test from 'node:test';
import assert from 'node:assert/strict';

import {
  RUNTIME_AUTOMATION_BOUNDARIES_V1,
  bucketQuarantineAgeV1,
  buildDeferredRuntimeGapReportV1,
  buildQuarantineVisibilityReportV1,
  classifyDeferredRuntimeGapV1,
  summarizeAutomationPreflightV1,
  summarizeRuntimeHealthV1,
} from '../../scripts/contracts/runtime_automation_v1.mjs';

test('runtime health passes when enforced canon coverage aligns with scope, policy, and proof mode', () => {
  const result = summarizeRuntimeHealthV1({
    auditRows: [
      {
        surface_class: 'canon',
        path_name: 'canon_worker_v1',
        canon_affecting: true,
        runtime_status: 'enforced',
        transaction_mode: 'transactional_authoritative',
        post_write_proof: true,
      },
      {
        surface_class: 'ownership_trust',
        path_name: 'owner_action_v1',
        runtime_status: 'partial',
        post_write_proof: true,
      },
    ],
    scopeRegistry: {
      canon_worker_v1: { execution_name: 'canon_worker_v1' },
    },
    executionPolicies: {
      canon_worker_v1: { transaction_mode: 'transactional_authoritative' },
    },
    proofModes: {
      canon_worker_v1: 'transactional_authoritative',
    },
    scopeRegistryPassed: true,
  });

  assert.equal(result.ok, true);
  assert.equal(result.summary.failed_checks, 0);
});

test('runtime health fails when an enforced canon path is missing its execution policy', () => {
  const result = summarizeRuntimeHealthV1({
    auditRows: [
      {
        surface_class: 'canon',
        path_name: 'canon_worker_v1',
        canon_affecting: true,
        runtime_status: 'enforced',
        transaction_mode: 'transactional_authoritative',
        post_write_proof: true,
      },
    ],
    scopeRegistry: {
      canon_worker_v1: { execution_name: 'canon_worker_v1' },
    },
    executionPolicies: {},
    proofModes: {
      canon_worker_v1: 'transactional_authoritative',
    },
    scopeRegistryPassed: true,
  });

  assert.equal(result.ok, false);
  assert.match(
    result.checks.find((check) =>
      /no canon write execution policy/i.test(check.detail),
    ).detail,
    /no canon write execution policy/i,
  );
});

test('deferred gap classification distinguishes blocked, unknown, deferred, maintenance-contained, and architecture-blocked paths', () => {
  assert.equal(
    classifyDeferredRuntimeGapV1({
      runtime_status: 'intentionally blocked',
      next_action: 'Keep blocked.',
    }),
    'should_be_blocked_from_use',
  );
  assert.equal(
    classifyDeferredRuntimeGapV1({
      runtime_status: 'unknown',
      next_action: 'Needs audit.',
    }),
    'not_yet_audited',
  );
  assert.equal(
    classifyDeferredRuntimeGapV1({
      runtime_status: 'bypass',
      next_action: 'Explicitly defer. Private notes are not a current public trust surface.',
    }),
    'intentionally_deferred',
  );
  assert.equal(
    classifyDeferredRuntimeGapV1({
      runtime_status: 'contained_maintenance_authority',
      next_action: 'Keep behind explicit maintenance-only boundary until replay architecture exists.',
    }),
    'architecture_blocked',
  );
  assert.equal(
    classifyDeferredRuntimeGapV1({
      runtime_status: 'bypass',
      next_action:
        'Explicitly defer. This route needs a dedicated ownership execution service.',
    }),
    'architecture_blocked',
  );
});

test('deferred gap report remains truthful about blocker classes and affected surfaces', () => {
  const report = buildDeferredRuntimeGapReportV1([
    {
      surface_class: 'canon',
      path_name: 'canon_deferred_v1',
      canon_affecting: true,
      ownership_affecting: false,
      public_trust_affecting: false,
      runtime_status: 'bypass',
      risk_level: 'high',
      next_action: 'Explicitly defer. This worker needs a separate replay architecture.',
    },
    {
      surface_class: 'ownership_trust',
      path_name: 'grouped_intent_v1',
      canon_affecting: false,
      ownership_affecting: true,
      public_trust_affecting: true,
      runtime_status: 'intentionally blocked',
      risk_level: 'low',
      next_action: 'Keep blocked.',
    },
  ]);

  assert.equal(report.summary.total, 2);
  assert.equal(report.summary.architecture_blocked, 1);
  assert.equal(report.summary.should_be_blocked_from_use, 1);
  assert.equal(report.canon_paths[0].path_name, 'canon_deferred_v1');
  assert.equal(report.ownership_trust_paths[0].path_name, 'grouped_intent_v1');
});

test('quarantine visibility report shows explicit age buckets and stale unresolved items', () => {
  const now = new Date('2026-04-23T12:00:00.000Z');
  const report = buildQuarantineVisibilityReportV1(
    [
      {
        id: 'q-1',
        source_system: 'warehouse',
        execution_name: 'worker_a',
        contract_name: 'NO_ASSUMPTION_RULE',
        quarantine_reason: 'ambiguous',
        created_at: '2026-04-23T01:00:00.000Z',
        resolved_at: null,
      },
      {
        id: 'q-2',
        source_system: 'pricing',
        execution_name: 'worker_b',
        contract_name: 'PRICING_ENGINE_V1',
        quarantine_reason: 'conflict',
        created_at: '2026-04-18T00:00:00.000Z',
        resolved_at: null,
      },
      {
        id: 'q-3',
        source_system: 'warehouse',
        execution_name: 'worker_c',
        contract_name: 'IDENTITY_CONTRACT_SUITE_V1',
        quarantine_reason: 'identity gap',
        created_at: '2026-03-01T00:00:00.000Z',
        resolved_at: null,
      },
    ],
    { now, stale_threshold_days: 30 },
  );

  assert.equal(report.summary.unresolved_count, 3);
  assert.equal(report.summary.stale_unresolved_count, 1);
  assert.deepEqual(
    report.by_age_bucket.map((row) => row.age_bucket),
    ['0-1 days', '2-7 days', '30+ days'],
  );
  assert.equal(report.oldest_unresolved[0].id, 'q-3');
});

test('quarantine age buckets use the documented labels', () => {
  const now = new Date('2026-04-23T12:00:00.000Z');

  assert.equal(bucketQuarantineAgeV1('2026-04-23T10:00:00.000Z', now), '0-1 days');
  assert.equal(bucketQuarantineAgeV1('2026-04-20T00:00:00.000Z', now), '2-7 days');
  assert.equal(bucketQuarantineAgeV1('2026-04-01T00:00:00.000Z', now), '8-30 days');
  assert.equal(bucketQuarantineAgeV1('2026-03-01T00:00:00.000Z', now), '30+ days');
});

test('preflight reports pass with deferred debt when there are no critical failures', () => {
  const result = summarizeAutomationPreflightV1({
    driftAudit: {
      summary: {
        critical_fail_checks: 0,
        known_deferred_debt_checks: 2,
      },
    },
    runtimeHealth: {
      summary: {
        failed_checks: 0,
        deferred_gap_count: 3,
      },
    },
  });

  assert.equal(result.status, 'PASS_WITH_DEFERRED_DEBT');
  assert.equal(result.summary.known_deferred_debt_checks, 5);
});

test('preflight fails when drift or runtime health fails', () => {
  const result = summarizeAutomationPreflightV1({
    driftAudit: {
      summary: {
        critical_fail_checks: 1,
        known_deferred_debt_checks: 0,
      },
    },
    runtimeHealth: {
      summary: {
        failed_checks: 0,
        deferred_gap_count: 0,
      },
    },
  });

  assert.equal(result.status, 'FAIL');
});

test('automation boundaries keep dangerous canon-mutating actions out of auto-run sets', () => {
  assert.deepEqual(
    RUNTIME_AUTOMATION_BOUNDARIES_V1.explicit_human_only.includes(
      'quarantine_promotion',
    ),
    true,
  );
  assert.deepEqual(
    RUNTIME_AUTOMATION_BOUNDARIES_V1.explicit_human_only.includes(
      'repair_actions_that_mutate_truth',
    ),
    true,
  );
  assert.equal(
    RUNTIME_AUTOMATION_BOUNDARIES_V1.auto_run.includes('quarantine_promotion'),
    false,
  );
  assert.equal(
    RUNTIME_AUTOMATION_BOUNDARIES_V1.auto_run.includes('bulk_canon_rewrite_jobs'),
    false,
  );
});
