import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const migration = fs.readFileSync(
  'supabase/migrations/20260804210000_public_card_printing_options_truth_boundary_v1.sql',
  'utf8',
);

test('public printing options use a bounded hardened read model', () => {
  assert.match(migration, /get_public_card_printing_options_v1/);
  assert.match(migration, /security definer/i);
  assert.match(migration, /set search_path = ''/i);
  assert.match(migration, /cardinality\(v_card_print_ids\) > 250/);
  assert.match(migration, /p_limit < 1 or p_limit > 1000/);
  assert.match(migration, /grant execute[\s\S]*to anon, authenticated, service_role/i);
});

test('public printing options exclude quarantines without mutating canon', () => {
  assert.match(migration, /not exists[\s\S]*card_printing_truth_reviews/i);
  assert.match(migration, /hidden_pending_review/);
  assert.match(migration, /hidden_unsupported/);
  assert.match(migration, /fk\.is_active = true/);
  assert.doesNotMatch(migration, /delete\s+from\s+public\.card_printings/i);
  assert.doesNotMatch(migration, /update\s+public\.card_printings/i);
});

test('the reported #215 conflict is quarantined with reversible evidence', () => {
  assert.match(migration, /467efb22-34ee-4122-a783-e45ff5798ee7/);
  assert.match(migration, /GV-PK-CEC-215-STD/);
  assert.match(migration, /'conflicting'/);
  assert.match(migration, /'hidden_pending_review'/);
  assert.match(migration, /tcgdex_card_api/);
  assert.match(migration, /pokemon_tcg_api_tcgplayer_prices/);
  assert.match(migration, /hide_pending_review_without_canonical_mutation/);
});
