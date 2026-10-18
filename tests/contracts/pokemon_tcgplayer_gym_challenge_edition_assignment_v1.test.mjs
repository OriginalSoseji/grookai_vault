import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';

const migration = fs.readFileSync(new URL(
  '../../supabase/migrations/20261013123000_pokemon_tcgplayer_gym_challenge_edition_assignment_v1.sql',
  import.meta.url), 'utf8');
const correctionMigration = fs.readFileSync(new URL(
  '../../supabase/migrations/20261014003500_pokemon_tcgplayer_gym_challenge_binding_identity_v2.sql',
  import.meta.url), 'utf8');
const canonicalTextSha256 = value => createHash('sha256')
  .update(value.replace(/\r\n?/g, '\n')).digest('hex');
const migrationSha = canonicalTextSha256(migration);
const correctionMigrationSha = canonicalTextSha256(correctionMigration);
const receipt = JSON.parse(fs.readFileSync(new URL(
  '../../docs/audits/pricing/pokemon_tcgplayer_variant_repair_20261012/batch_02/gym_edition_assignment_rollback_rehearsal.json',
  import.meta.url), 'utf8'));
const worker = fs.readFileSync(new URL(
  '../../scripts/workers/tcgplayer_market_publication_worker_v1.mjs', import.meta.url), 'utf8');
const releaseLauncher = fs.readFileSync(new URL(
  '../../scripts/ops/apply_pokemon_tcgplayer_gym_release_v1.mjs', import.meta.url), 'utf8');

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
  assert.match(worker, /v_tcgplayer_market_qualification_candidates_v5/);
});

test('all installed current-price readers validate the Gym assignment lane', () => {
  const guardedReaderPredicate =
    /snapshot\.gym_edition_assignment_id is not null\s+or snapshot\.edition_assignment_id is not null or exists/g;
  assert.equal([...migration.matchAll(guardedReaderPredicate)].length, 3);
  assert.match(migration, /create or replace view public\.v_market_price_current_v1/);
  assert.match(migration, /create or replace function public\.get_market_pricing_read_model_v1/);
});

test('current Gym products use stable identity evidence while assignments roll by source run', () => {
  assert.match(correctionMigration,
    /create or replace function public\.pokemon_tcgplayer_gym_challenge_binding_valid_v1/);
  assert.doesNotMatch(correctionMigration,
    /product\.payload_hash = binding\.source_product_sha256/);
  assert.match(correctionMigration, /product\.name = 'Giovanni''s Nidoran F'/);
  assert.match(correctionMigration, /product\.name = 'Giovanni''s Nidoran M'/);
  assert.match(correctionMigration, /'075\/132'/);
  assert.match(correctionMigration, /'076\/132'/);
  assert.match(migration,
    /join observations observation on observation\.product_id=binding\.product_id/);
  assert.match(migration,
    /where candidate\.source_sync_run_id=p_source_sync_run_id/);
});

test('production launcher is dry-run by default and seals the bounded release', () => {
  assert.match(releaseLauncher, /const apply = process\.argv\.includes\('--apply'\)/);
  assert.match(releaseLauncher, /const rollbackRehearsal = process\.argv\.includes\('--rollback-rehearsal'\)/);
  assert.match(releaseLauncher, /production transaction requires/);
  assert.match(releaseLauncher, /choose either --apply or --rollback-rehearsal/);
  assert.match(releaseLauncher, /begin isolation level serializable/);
  assert.match(releaseLauncher, /pg_advisory_xact_lock/);
  assert.match(releaseLauncher, /assert\.equal\(prepared, 4\)/);
  assert.doesNotMatch(releaseLauncher,
    /insert into public\.card_prints\([\s\S]{0,300}\bnumber_plain\b/i);
  assert.match(releaseLauncher, /POKEMON_TCGPLAYER_GYM_RELEASE_ROLLBACK_REHEARSAL_V1/);
  assert.match(releaseLauncher, /status:'passed_rolled_back'/);
  assert.match(releaseLauncher, /price_publication_writes:0/);
  assert.match(releaseLauncher, /rollback_action:'retire the four binding IDs/);
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
  const crlfMigration = migration.replace(/\r\n?/g, '\n').replace(/\n/g, '\r\n');
  assert.equal(canonicalTextSha256(crlfMigration), migrationSha);
  assert.equal(receipt.status, 'passed_rolled_back');
  assert.equal(receipt.migration_sha256, migrationSha);
  assert.equal(receipt.correction_migration_sha256, correctionMigrationSha);
  assert.equal(receipt.exact_binding_rows.length, 4);
  assert.ok(receipt.exact_binding_rows.every(row => row.local_policy_eligible));
  assert.deepEqual(receipt.separate_fk_lane,
    { accepted_gym_fk: true, rejected_as_jungle_fk: true });
  assert.deepEqual(receipt.idempotent_prepare,
    { first_inserted: 4, second_inserted: 0 });
  assert.equal(receipt.rolling_source_assignment.current_observations_differ_from_reviewed_evidence,
    true);
  assert.equal(receipt.rolling_source_assignment.current_product_ingestion_hash_differs_from_reviewed_source_sha,
    true);
  assert.equal(receipt.current_product_identity_drift_test.binding_rejected, true);
  assert.equal(receipt.drift_test.assignment_rejected, true);
  assert.equal(receipt.truth_quarantine_test.assignment_rejected, true);
  assert.deepEqual(receipt.current_price_reader_retirement_guard, {
    view_visible_before_retirement: 1,
    rpc_available_before_retirement: 2,
    view_visible_after_retirement: 0,
    rpc_available_after_retirement: 0,
  });
  assert.equal(receipt.historical_deleted_identifiers_reused, false);
  assert.equal(receipt.database_writes_committed, 0);
  assert.equal(receipt.price_publication_writes, 0);
  assert.equal(receipt.customer_state_writes, 0);
  assert.equal(receipt.rollback_proof_equal, true);
});
