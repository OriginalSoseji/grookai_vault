import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const migrationPath = path.resolve(
  'supabase/migrations/20260824170000_print_identity_search_candidate_first_v1.sql'
);
const sql = fs.readFileSync(migrationPath, 'utf8');

test('candidate-first search preserves the public RPC contract and release boundary', () => {
  assert.match(sql, /create or replace function public\.search_print_identity_v1\(/i);
  assert.match(sql, /returns table\s*\([\s\S]*search_document_id text[\s\S]*rank_score integer/i);
  assert.match(sql, /public\.catalog_parent_gv_id_visible_to_request_v1\(cp\.gv_id\)/i);
  assert.match(sql, /grant execute on function public\.search_print_identity_v1[\s\S]*to anon, authenticated, service_role/i);
  assert.doesNotMatch(sql, /catalog_game_release_controls[\s\S]*(insert|update|delete)/i);
});

test('candidate-first search does not expand the legacy all-document function', () => {
  assert.match(sql, /name_seed as materialized/i);
  assert.match(sql, /parent_identity_seed as materialized/i);
  assert.match(sql, /printing_identity_seed as materialized/i);
  assert.match(sql, /matched_finish_keys as materialized/i);
  assert.match(sql, /create index if not exists card_printings_finish_key_idx/i);
  assert.match(sql, /candidate_cards as materialized/i);
  assert.match(sql, /from candidate_cards cp[\s\S]*where source\.card_print_id = cp\.id/i);
  assert.doesNotMatch(sql, /search_print_identity_unfiltered_internal_v1\s*\(/i);
  assert.doesNotMatch(sql, /from public\.v_print_identity_search_documents_v1\s+d/i);
});

test('candidate-first search retains identity, finish, set, number, and cameo evidence', () => {
  assert.match(sql, /name_seed/i);
  assert.match(sql, /set_seed/i);
  assert.match(sql, /printing_seed/i);
  assert.match(sql, /cameo_seed/i);
  assert.match(sql, /number_digits_norm/i);
  assert.match(sql, /cameo_search_text/i);
  assert.match(sql, /printing_gv_id/i);
});

test('candidate-first migration changes no canonical rows or RLS policies', () => {
  assert.doesNotMatch(sql, /\b(?:insert\s+into|update|delete\s+from|truncate)\s+public\./i);
  assert.doesNotMatch(sql, /\b(?:create|alter|drop)\s+policy\b/i);
  assert.doesNotMatch(sql, /\balter\s+table\b/i);
});
