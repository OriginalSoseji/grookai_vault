import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  applyMarketListingOllamaDeterministicGuardV1,
  validateMarketListingOllamaReviewV1,
} from '../../backend/pricing/market_listing_ollama_review_v1.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const cleanReview = {
  decision: 'route_to_human_review',
  confidence: 0.8,
  reason_code: 'clean_identity',
  explanation: 'Candidate is eligible for a human review lane.',
};

test('warehouse evidence review validates the closed advisory schema', () => {
  assert.deepEqual(validateMarketListingOllamaReviewV1(cleanReview), cleanReview);
  assert.throws(() => validateMarketListingOllamaReviewV1({ ...cleanReview, decision: 'publish' }), /decision/);
  assert.throws(() => validateMarketListingOllamaReviewV1({ ...cleanReview, confidence: 2 }), /confidence/);
  assert.throws(() => validateMarketListingOllamaReviewV1({ ...cleanReview, explanation: 'x'.repeat(241) }), /explanation/);
});

test('deterministic contamination counts override model advice', () => {
  const guarded = applyMarketListingOllamaDeterministicGuardV1({
    evidence_class: 'slab',
    review_bucket: 'review_required_contamination',
    exclusion_counts: { foreign_language: 73, custom_fake: 2 },
  }, cleanReview);
  assert.equal(guarded.decision, 'reject_contamination');
  assert.equal(guarded.reason_code, 'fake_or_custom');
  assert.equal(guarded.confidence, 1);
});

test('review buckets remain authoritative for clean and thin evidence', () => {
  const ready = applyMarketListingOllamaDeterministicGuardV1({
    evidence_class: 'slab',
    review_bucket: 'review_ready_internal_candidate',
    exclusion_counts: {},
  }, { ...cleanReview, decision: 'needs_more_evidence' });
  assert.equal(ready.decision, 'route_to_human_review');
  assert.equal(ready.reason_code, 'slab_requires_separate_review');

  const thin = applyMarketListingOllamaDeterministicGuardV1({
    evidence_class: 'raw_single',
    review_bucket: 'review_required_more_evidence',
    exclusion_counts: {},
  }, cleanReview);
  assert.equal(thin.decision, 'needs_more_evidence');
});

test('warehouse evidence worker is local, sequential, and has no write authority', () => {
  const worker = fs.readFileSync(
    path.join(ROOT, 'scripts/workers/market_listing_ollama_review_v1.mjs'),
    'utf8',
  );
  assert.doesNotMatch(worker, /backend\/env|\bpg\b|SUPABASE|DATABASE_URL|POSTGRES_URL/);
  assert.match(worker, /127\.0\.0\.1/);
  assert.match(worker, /database_writes: false/);
  assert.match(worker, /publication_authority: false/);
  assert.match(worker, /deterministic_guard_applied/);
  assert.match(worker, /keep_alive: "15s"/);
});
