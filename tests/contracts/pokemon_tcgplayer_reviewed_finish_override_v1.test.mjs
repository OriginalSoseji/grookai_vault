import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = await fs.readFile(path.join(ROOT, 'supabase', 'migrations',
  '20261012193000_pokemon_tcgplayer_reviewed_finish_override_v1.sql'), 'utf8');
const worker = await fs.readFile(path.join(ROOT, 'scripts', 'workers',
  'tcgplayer_market_publication_worker_v1.mjs'), 'utf8');
const receipt = JSON.parse(await fs.readFile(path.join(ROOT, 'docs', 'audits', 'pricing',
  'pokemon_tcgplayer_variant_repair_20261012', 'batch_02',
  'mep_schema_rollback_rehearsal.json'), 'utf8'));

test('reviewed MEP override is exact, private, and takes candidate precedence', () => {
  assert.match(migration, /MEE_TCGPLAYER_REVIEWED_FINISH_OVERRIDE_V1/);
  for (const value of [
    '654596', '654598',
    '2664dc1d-4e03-43cb-8346-0ca5f10c4b19',
    'e626cae7-60cf-4f41-a30f-531ccb3f3432',
    '65988cf3a595e676cc5ac8417d261f93330742ac1a612c4f155e3eec1d42457d',
    'da3644e729758eb2cb8e978b83bd8e4b315823ed4791725a0d5ba772ac814f73',
    'ced09a10c3194b404452b360a932e79b32e8e11c3c69d18989ca5f1f6d93e495',
  ]) assert.ok(migration.includes(value), `missing exact authority ${value}`);
  assert.match(migration, /source_finish_hint = 'Normal'/);
  assert.match(migration, /normalized_finish_key = 'normal'/);
  assert.match(migration, /assigned_finish_key = 'holo'/);
  assert.match(migration, /publishable = false/);
  assert.match(migration, /app_visible = false/);
  assert.match(migration, /market_truth = false/);
  assert.match(migration, /from public\.card_printing_truth_reviews truth_review/);
  assert.match(migration, /'hidden_pending_review'/);
  assert.match(migration, /'hidden_unsupported'/);
  assert.match(migration, /create or replace view public\.v_tcgplayer_market_qualification_candidates_v3/);
  assert.match(migration, /select candidate\.source_observation_id,/);
  assert.match(migration, /candidate\.source_sync_run_id,/);
  assert.match(migration, /candidate\.source_product_id,/);
  assert.doesNotMatch(migration, /jsonb_populate_record/);
  assert.match(migration, /then reviewed_override\.assigned_finish_key/);
  assert.match(worker, /from public\.v_tcgplayer_market_qualification_candidates_v4 candidate/g);
  assert.doesNotMatch(worker, /from public\.v_tcgplayer_market_qualification_candidates_v2 candidate/);
});

test('local MEP schema rehearsal passed and rolled every write back', () => {
  assert.equal(
    receipt.migration_sha256,
    crypto.createHash('sha256').update(migration).digest('hex'),
    'rehearsal receipt must cover the exact migration under review',
  );
  assert.equal(receipt.status, 'passed_rolled_back');
  assert.equal(receipt.exact_override_rows.length, 2);
  assert.ok(receipt.exact_override_rows.every(row =>
    row.raw_source_subtype_name === 'Normal' &&
    row.assigned_finish_key === 'holo' && row.local_policy_eligible === true));
  assert.deepEqual(receipt.drift_test, {
    changed_field: 'assignment_payload.source_row_hash',
    override_rejected: true,
    fallback_status: 'no_matching_child_finish',
  });
  assert.deepEqual(receipt.truth_quarantine_test, {
    public_visibility: 'hidden_pending_review',
    override_rejected: true,
    fallback_status: 'no_matching_child_finish',
  });
  assert.equal(receipt.database_writes_committed, 0);
  assert.equal(receipt.price_publication_writes, 0);
  assert.equal(receipt.customer_state_writes, 0);
  assert.equal(receipt.rollback_proof_equal, true);
});
