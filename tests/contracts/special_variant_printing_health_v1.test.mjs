import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

import {
  validateHealthMetrics,
} from '../../scripts/audits/special_variant_printing_health_v1.mjs';

const healthyMetrics = {
  target_count: 143,
  distinct_child_count: 143,
  exact_child_count: 143,
  exact_hidden_review_count: 143,
  exact_quarantined_hidden_review_count: 0,
  exact_verified_hidden_review_count: 143,
  unexpected_hidden_review_status_count: 0,
  public_printing_option_leak_count: 0,
  external_printing_mapping_count: 0,
  qualification_candidate_hidden_child_count: 0,
  eligible_decision_count: 0,
  historical_snapshot_count: 0,
  current_price_count: 0,
  exact_parent_tcgplayer_mapping_count: 7,
  conflicting_parent_tcgplayer_mapping_count: 2,
};

test('health policy allows parent discovery mappings but prohibits child publication evidence', () => {
  assert.deepEqual(validateHealthMetrics(healthyMetrics, 143), {
    healthy: true,
    failures: [],
  });
});

test('health policy accepts either quarantined or verified reviews while every child remains hidden', () => {
  const quarantinedMetrics = {
    ...healthyMetrics,
    exact_quarantined_hidden_review_count: 143,
    exact_verified_hidden_review_count: 0,
  };

  assert.equal(validateHealthMetrics(quarantinedMetrics, 143).healthy, true);
  assert.equal(validateHealthMetrics(healthyMetrics, 143).healthy, true);
});

test('health policy rejects unexpected review states even when the row is hidden', () => {
  const result = validateHealthMetrics({
    ...healthyMetrics,
    unexpected_hidden_review_status_count: 1,
  }, 143);

  assert.equal(result.healthy, false);
  assert.ok(result.failures.includes('unexpected_hidden_review_status_count:1!=0'));
});

test('health policy fails on any hidden child price or public printing leak', () => {
  const result = validateHealthMetrics({
    ...healthyMetrics,
    public_printing_option_leak_count: 1,
    current_price_count: 1,
  }, 143);

  assert.equal(result.healthy, false);
  assert.ok(result.failures.includes('public_printing_option_leak_count:1!=0'));
  assert.ok(result.failures.includes('current_price_count:1!=0'));
});

test('health implementation opens a read-only transaction and has no durable mutation SQL', async () => {
  const source = await fs.readFile(
    new URL('../../scripts/audits/special_variant_printing_health_v1.mjs', import.meta.url),
    'utf8',
  );

  assert.match(source, /begin read only/);
  assert.match(source, /get_public_card_printing_options_v1/);
  assert.match(source, /v_tcgplayer_market_qualification_candidates_v1/);
  assert.match(source, /v_market_price_current_v1/);
  assert.doesNotMatch(source, /\binsert\s+into\b/i);
  assert.doesNotMatch(source, /\bupdate\s+public\./i);
  assert.doesNotMatch(source, /\bdelete\s+from\b/i);
});

test('health workflow is scheduled and cannot enter an apply mode', async () => {
  const workflow = await fs.readFile(
    new URL('../../.github/workflows/special-variant-printing-health.yml', import.meta.url),
    'utf8',
  );

  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /schedule:/);
  assert.match(workflow, /special_variant_printing_health_v1\.mjs/);
  assert.doesNotMatch(workflow, /--apply/);
  assert.doesNotMatch(workflow, /db push/);
  assert.doesNotMatch(workflow, /psql/);
});
