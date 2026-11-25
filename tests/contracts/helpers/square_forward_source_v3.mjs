import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

// Historical catalog release scopes remain frozen. Only the separately bound
// Square successor extends the current repository inventory after their prefix.
export function assertSquareForwardSourceV3(root, canonical523) {
  const binding = JSON.parse(fs.readFileSync(root + '/scripts/schema/square_price_batch_candidate_v3.json'));
  assert.equal(binding.baselineMigrations, 523);
  assert.equal(binding.targetMigrations, 529);
  assert.deepEqual(binding.history, canonical523);
  assert.deepEqual(Object.keys(binding.candidates), [
    '20261124230000_square_recovery_target_window_release_v3.sql',
    '20261124231000_square_recovery_target_lanes_release_v3.sql',
    '20261124232000_square_durable_recovery_scheduler_release_v3.sql',
    '20261124233000_square_price_batch_authority_v3.sql',
    '20261124234000_square_price_batch_attempt_receipts_v3.sql',
    '20261124235000_square_price_batch_pause_recovery_v3.sql',
  ]);
  const sources = {...canonical523, ...binding.candidates};
  assert.deepEqual(fs.readdirSync(root + '/supabase/migrations')
    .filter(file => /^\d+.*\.sql$/.test(file)).sort(), Object.keys(sources).sort());
  for (const [file, hash] of Object.entries(sources)) {
    assert.equal(createHash('sha256').update(fs.readFileSync(root + '/supabase/migrations/' + file)).digest('hex'), hash, file);
  }
}
