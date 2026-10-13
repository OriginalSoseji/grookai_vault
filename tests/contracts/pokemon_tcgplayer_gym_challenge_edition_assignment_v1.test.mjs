import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';

const migration = fs.readFileSync(new URL(
  '../../supabase/migrations/20261013123000_pokemon_tcgplayer_gym_challenge_edition_assignment_v1.sql',
  import.meta.url), 'utf8');
const migrationSha = createHash('sha256').update(migration).digest('hex');
const receipt = JSON.parse(fs.readFileSync(new URL(
  '../../docs/audits/pricing/pokemon_tcgplayer_variant_repair_20261012/batch_02/gym_edition_assignment_rollback_rehearsal.json',
  import.meta.url), 'utf8'));
const worker = fs.readFileSync(new URL(
  '../../scripts/workers/tcgplayer_market_publication_worker_v1.mjs', import.meta.url), 'utf8');

test('Gym Challenge uses an exact separate binding, assignment, and FK lane', () => {
  assert.match(migration, /create table if not exists public\.tcgplayer_gym_challenge_edition_bindings_v1/);
  assert.match(migration, /create table if not exists public\.tcgplayer_gym_challenge_edition_assignments_v1/);
  assert.match(migration, /gym_edition_assignment_id uuid references/);
  assert.match(migration, /create or replace view public\.v_tcgplayer_market_qualification_candidates_v4/);
  assert.match(migration, /from public\.v_tcgplayer_market_qualification_candidates_v3 candidate/);
  assert.match(migration, /candidate\.source_observation_id,candidate\.source_sync_run_id/);
  assert.doesNotMatch(migration, /jsonb_populate_record/);
  assert.match(migration, /group_id integer not null default 1440 check \(group_id = 1440\)/);
  assert.match(migration, /source_subtype in \('1st Edition','Unlimited'\)/);
  assert.match(migration, /'hidden_pending_review','hidden_unsupported'/);
  assert.match(worker, /prepare_tcgplayer_gym_challenge_edition_assignments_v1/);
  assert.match(worker, /v_tcgplayer_market_qualification_candidates_v4/);
});

test('the four reviewed identities are fresh and historical deleted IDs are forbidden', () => {
  for (const value of [85720, 85721,
    'c75ade4f-0abf-5380-822a-5b3d3014bb96',
    '8c1fe8e6-b3a6-5727-971b-fa1629d5d635',
    'bd623537-374a-5526-bb24-fcc14022c6e9',
    'a5923fb0-b9b1-50d7-9494-3c229e20f7a4']) assert.match(migration, new RegExp(String(value)));
  for (const forbidden of [
    '03208d73-8206-4780-aa45-c3735677cf99',
    '47425cf5-146f-41e0-a770-e37c761ce1ef',
    '895970ba-ed4c-4d00-91ce-db650563e126',
    'a8c17fda-b5a7-46ab-a7c9-32284dfec54f',
  ]) assert.match(migration, new RegExp(forbidden));
  assert.doesNotMatch(migration, /insert into public\.(?:card_prints|card_print_identity|card_printings)/i);
  assert.doesNotMatch(migration, /insert into public\.tcgplayer_gym_challenge_edition_bindings_v1/i);
});

test('local Gym schema rehearsal passed with zero committed writes', () => {
  assert.equal(receipt.status, 'passed_rolled_back');
  assert.equal(receipt.migration_sha256, migrationSha);
  assert.equal(receipt.exact_binding_rows.length, 4);
  assert.ok(receipt.exact_binding_rows.every(row => row.local_policy_eligible));
  assert.deepEqual(receipt.separate_fk_lane,
    { accepted_gym_fk: true, rejected_as_jungle_fk: true });
  assert.deepEqual(receipt.idempotent_prepare,
    { first_inserted: 4, second_inserted: 0 });
  assert.equal(receipt.drift_test.assignment_rejected, true);
  assert.equal(receipt.truth_quarantine_test.assignment_rejected, true);
  assert.equal(receipt.historical_deleted_identifiers_reused, false);
  assert.equal(receipt.database_writes_committed, 0);
  assert.equal(receipt.price_publication_writes, 0);
  assert.equal(receipt.customer_state_writes, 0);
  assert.equal(receipt.rollback_proof_equal, true);
});
