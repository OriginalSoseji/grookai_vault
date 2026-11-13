import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const SCRIPT = fs.readFileSync(new URL(
  '../../scripts/audits/mtg_tcgplayer_qualifier_mapping_release_apply_v1.mjs',
  import.meta.url,
), 'utf8');

test('MTG qualifier mapping apply binds the exact founder-approved release', () => {
  assert.match(SCRIPT, /04a693eadc9cbc1105522c590fd8d7fb8efe7f26/);
  assert.match(SCRIPT, /0b38d24e4e211a5d2762f3868c5952c12efb1fccae509b5a668bae65a37f121c/);
  assert.match(SCRIPT, /a3c56faf-bae4-474c-816b-0a7e7eb1206c/);
  assert.match(SCRIPT, /312f4fce-2de2-4744-aa9f-ff86dd0e1fca/);
  assert.match(SCRIPT, /approval_text_changed/);
  assert.match(SCRIPT, /rehearsal_receipt_hash_changed/);
  assert.match(SCRIPT, /rehearsal_rows_hash_changed/);
});

test('MTG qualifier mapping apply respects the 25-row execution ceiling', () => {
  assert.match(SCRIPT, /const BATCH_SIZE = 25/);
  assert.match(SCRIPT, /const TOTAL_ROWS = 452/);
  assert.match(SCRIPT, /batch_index_must_be_1_through_/);
  assert.match(SCRIPT, /release_sequence_mapping_count_changed/);
  assert.match(SCRIPT, /future_batch_mapping_already_exists/);
});

test('MTG qualifier mapping apply revalidates and commits only mapping inserts', () => {
  assert.match(SCRIPT, /begin transaction isolation level serializable/);
  assert.match(SCRIPT, /pg_advisory_xact_lock\(hashtext\('tcgplayer_market_exact_mapping_apply_v1'\)\)/);
  assert.equal((SCRIPT.match(/insert into public\.external_mappings/g) ?? []).length, 1);
  assert.equal((SCRIPT.match(/client\.query\('commit'\)/g) ?? []).length, 1);
  assert.doesNotMatch(SCRIPT, /\bupdate public\./i);
  assert.doesNotMatch(SCRIPT, /\bdelete from public\./i);
  assert.doesNotMatch(SCRIPT, /\binsert into public\.(?!external_mappings)/i);
});

test('MTG qualifier mapping apply persists readback and rollback evidence', () => {
  assert.match(SCRIPT, /committed_zero_mismatch_readback/);
  assert.match(SCRIPT, /post_commit_readback_failed/);
  assert.match(SCRIPT, /failed_zero_committed_writes/);
  assert.match(SCRIPT, /rollback_manifest\.json/);
  assert.match(SCRIPT, /artifact_hashes\.json/);
  assert.match(SCRIPT, /rollback_identity/);
  assert.match(SCRIPT, /pricing_writes: 0/);
  assert.match(SCRIPT, /publication_writes: 0/);
  assert.match(SCRIPT, /vault_writes: 0/);
});
