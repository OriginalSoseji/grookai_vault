import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const SCRIPT = fs.readFileSync(new URL(
  '../../scripts/audits/mtg_tcgplayer_qualifier_mapping_guarded_dry_run_v1.mjs',
  import.meta.url,
), 'utf8');

test('MTG qualifier mapping rehearsal binds the exact immutable review package', () => {
  assert.match(SCRIPT, /ready\.rows\.length, 452/);
  assert.match(SCRIPT, /summary\.manifest_sha256/);
  assert.match(SCRIPT, /review_manifest_changed/);
  assert.match(SCRIPT, /package_source_commit_not_ancestor/);
  assert.match(SCRIPT, /review_source_commit/);
  assert.match(SCRIPT, /content_addressed_input_queue_changed/);
  assert.match(SCRIPT, /frozen_observation_scope_changed/);
  assert.match(SCRIPT, /duplicate_source_product/);
  assert.match(SCRIPT, /duplicate_target_card_print/);
});

test('MTG qualifier mapping rehearsal revalidates live source and canonical truth', () => {
  assert.match(SCRIPT, /source_not_in_latest_run/);
  assert.match(SCRIPT, /group_consensus_changed/);
  assert.match(SCRIPT, /frozen_price_observation_ids_changed/);
  assert.match(SCRIPT, /current_price_availability/);
  assert.match(SCRIPT, /target_identity_not_unique/);
  assert.match(SCRIPT, /mapping_history_or_collision_now_exists/);
  assert.match(SCRIPT, /identity\.identity_domain='mtg_eng_paper_print'/);
});

test('MTG qualifier mapping rehearsal simulates one insert-only scope and always rolls back', () => {
  assert.match(SCRIPT, /begin transaction isolation level serializable/);
  assert.match(SCRIPT, /pg_advisory_xact_lock\(hashtext\('tcgplayer_market_exact_mapping_apply_v1'\)\)/);
  assert.equal((SCRIPT.match(/insert into public\.external_mappings/g) ?? []).length, 1);
  assert.match(SCRIPT, /await client\.query\('rollback'\)/);
  assert.match(SCRIPT, /rollback_proof_passed_zero_durable_changes/);
  assert.doesNotMatch(SCRIPT, /client\.query\(['"]commit/i);
  assert.doesNotMatch(SCRIPT, /\bupdate public\./i);
  assert.doesNotMatch(SCRIPT, /\bdelete from public\./i);
});

test('MTG qualifier mapping rehearsal has no apply mode or adjacent write authority', () => {
  assert.match(SCRIPT, /rehearsal_has_no_apply_mode/);
  assert.match(SCRIPT, /durable_mapping_writes: 0/);
  assert.match(SCRIPT, /canonical_writes: 0/);
  assert.match(SCRIPT, /pricing_writes: 0/);
  assert.match(SCRIPT, /publication_writes: 0/);
  assert.match(SCRIPT, /vault_writes: 0/);
  assert.match(SCRIPT, /next_gate: 'separate_exact_founder_approval'/);
});
