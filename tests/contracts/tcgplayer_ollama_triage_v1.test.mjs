import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  assertLoopbackOllamaUrlV1,
  planTcgplayerOllamaTriageRowV1,
  validateTcgplayerOllamaAdviceV1,
} from '../../backend/pricing/tcgplayer_ollama_triage_v1.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function row(overrides = {}) {
  return {
    source_product_id: 45160,
    source_product_name: 'Nidoran F',
    source_group_name: 'Jungle',
    printed_number: '57/64',
    normalized_source_name: 'nidoran f',
    normalized_source_number: '57',
    source_subtypes: ['1st Edition'],
    set_authority: { set_code: 'base2' },
    candidate_targets: [{
      card_print_id: 'first-edition-print',
      gv_id: 'GV-PK-JU-57-FIRST-EDITION',
      set_code: 'base2',
      canonical_name: 'Nidoran ♀',
      canonical_number: '57',
      variant_key: '',
    }, {
      card_print_id: 'generic-print',
      gv_id: 'GV-PK-JU-57',
      set_code: 'base2',
      canonical_name: 'Nidoran ♀',
      canonical_number: '57',
      variant_key: '',
    }, {
      card_print_id: 'unlimited-print',
      gv_id: 'GV-PK-JU-57-UNLIMITED',
      set_code: 'base2',
      canonical_name: 'Nidoran ♀',
      canonical_number: '57',
      variant_key: '',
    }],
    ...overrides,
  };
}

test('Ollama endpoint is limited to local HTTP', () => {
  assert.equal(assertLoopbackOllamaUrlV1('http://127.0.0.1:11434').hostname, '127.0.0.1');
  assert.throws(() => assertLoopbackOllamaUrlV1('https://127.0.0.1:11434'), /HTTP loopback/);
  assert.throws(() => assertLoopbackOllamaUrlV1('http://example.com:11434'), /HTTP loopback/);
});

test('deterministic edition conflicts are removed before the model call', () => {
  const plan = planTcgplayerOllamaTriageRowV1(row());
  assert.equal(plan.model_call_allowed, true);
  assert.deepEqual(
    plan.compatible_candidates.map((candidate) => candidate.candidate_id),
    ['first-edition-print'],
  );
  assert.deepEqual(plan.rejected_candidates, [
    {
      candidate_id: 'generic-print',
      conflicts: ['edition_missing_on_candidate'],
    },
    {
      candidate_id: 'unlimited-print',
      conflicts: ['edition'],
    },
  ]);
});

test('rows with no candidate remain held without a model call', () => {
  const plan = planTcgplayerOllamaTriageRowV1(row({ candidate_targets: [] }));
  assert.equal(plan.model_call_allowed, false);
  assert.equal(plan.disposition, 'held_by_deterministic_guard');
  assert.equal(plan.reason, 'no_candidate_targets');
});

test('number-scoped review targets feed the model without becoming authority', () => {
  const input = row({
    candidate_targets: [],
    review_targets: row().candidate_targets,
  });
  const plan = planTcgplayerOllamaTriageRowV1(input);
  assert.equal(plan.model_call_allowed, true);
  assert.deepEqual(
    plan.compatible_candidates.map((candidate) => candidate.candidate_id),
    ['first-edition-print'],
  );
});

test('missing printed coordinates remain held without aborting the chunk', () => {
  const plan = planTcgplayerOllamaTriageRowV1(row({ printed_number: '' }));
  assert.equal(plan.model_call_allowed, false);
  assert.equal(plan.reason, 'missing_source_identity_fields');
  assert.deepEqual(plan.missing_fields, ['printed_number']);
});

test('model output cannot escape the guarded candidate set or grant authority', () => {
  const plan = planTcgplayerOllamaTriageRowV1(row());
  const advice = validateTcgplayerOllamaAdviceV1({
    decision: 'lead_candidate',
    candidate_index: 0,
    confidence: 0.83,
    reason_code: 'alias_or_unicode_review',
    explanation: 'Edition and printed coordinate align; name symbol needs review.',
  }, plan);
  assert.equal(advice.candidate_id, 'first-edition-print');
  assert.throws(() => validateTcgplayerOllamaAdviceV1({
    ...advice,
    candidate_index: 5,
  }, plan), /outside the guarded set/);
});

test('worker has no database dependency or mutation mode', () => {
  const worker = fs.readFileSync(
    path.join(ROOT, 'scripts/workers/tcgplayer_ollama_triage_v1.mjs'),
    'utf8',
  );
  assert.doesNotMatch(worker, /backend\/env|\bpg\b|SUPABASE|DATABASE_URL|POSTGRES_URL/);
  assert.match(worker, /sequential_model_calls: true/);
  assert.match(worker, /does not support write modes/);
  assert.match(worker, /keep_alive: '15s'/);
  assert.match(worker, /\/api\/tags/);
  assert.match(worker, /review_leads\.jsonl/);
  assert.match(worker, /5000, '--limit'/);
});
