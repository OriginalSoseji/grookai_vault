import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(
  new URL('../../scripts/audits/special_variant_printing_coverage_v1.mjs', import.meta.url),
  'utf8',
);

test('special variant printing coverage audit is transactionally read-only', () => {
  assert.match(source, /begin read only/i);
  assert.match(source, /rollback/i);
  assert.doesNotMatch(source, /\b(?:insert|update|delete|upsert|truncate)\b\s+(?:into|public\.)/i);
});

test('printing gaps require mapped source finish evidence before becoming candidates', () => {
  assert.match(source, /missing_child_source_evidence_available/);
  assert.match(source, /missing_child_no_source_finish_evidence/);
  assert.match(source, /repair_eligible: true/);
  assert.match(source, /never infer a finish from a variant label or image alone/i);
});

test('public printing readiness includes active finish and truth-review visibility', () => {
  assert.match(source, /finish_keys/);
  assert.match(source, /card_printing_truth_reviews/);
  assert.match(source, /hidden_pending_review/);
  assert.match(source, /hidden_unsupported/);
});
