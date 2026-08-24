import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const sql = fs.readFileSync(
  path.resolve('supabase/migrations/20260824174500_print_identity_search_bounded_candidates_v1.sql'),
  'utf8'
);

test('bounded search preserves the public RPC and release boundary', () => {
  assert.match(sql, /create or replace function public\.search_print_identity_v1\(/i);
  assert.match(sql, /returns table\s*\([\s\S]*search_document_id text[\s\S]*rank_score integer/i);
  assert.match(sql, /public\.catalog_parent_gv_id_visible_to_request_v1\(cp\.gv_id\)/i);
  assert.match(sql, /grant execute on function public\.search_print_identity_v1[\s\S]*to anon, authenticated, service_role/i);
});

test('name candidates are exact-first and bounded to the requested page', () => {
  assert.match(sql, /name_seed as materialized\s*\([\s\S]*case when lower\(cp\.name\) = p\.q_norm then 0 else 1 end[\s\S]*limit greatest\([\s\S]*100[\s\S]*result_limit \+ result_offset\) \* 2/i);
  assert.match(sql, /name_seed_sufficient as materialized\s*\([\s\S]*count\(\*\) >= \(select result_limit \+ result_offset from prepared\)/i);
});

test('exact identities remain primary and lower-ranked families are conditional', () => {
  assert.match(sql, /primary_seed as materialized\s*\([\s\S]*parent_identity_seed[\s\S]*name_seed[\s\S]*printing_identity_seed/i);
  assert.match(sql, /select id from set_seed\s*where not \(select sufficient from name_seed_sufficient\)/i);
  assert.match(sql, /select id from finish_seed\s*where not \(select sufficient from name_seed_sufficient\)/i);
  assert.match(sql, /select id from cameo_seed\s*where not \(select sufficient from name_seed_sufficient\)/i);
  assert.match(sql, /fallback_seed as materialized[\s\S]*not exists \(select 1 from fast_seed\)/i);
});

test('bounded migration retains set, number, finish, cameo, and child evidence', () => {
  assert.match(sql, /set_code_norm/i);
  assert.match(sql, /number_digits_norm/i);
  assert.match(sql, /matched_finish_keys/i);
  assert.match(sql, /cameo_search_text/i);
  assert.match(sql, /from candidate_cards cp[\s\S]*where source\.card_print_id = cp\.id/i);
  assert.doesNotMatch(sql, /search_print_identity_unfiltered_internal_v1\s*\(/i);
  assert.doesNotMatch(sql, /from public\.v_print_identity_search_documents_v1\s+d/i);
});

test('bounded migration changes no canonical rows, indexes, or RLS policies', () => {
  assert.doesNotMatch(sql, /\b(?:insert\s+into|update|delete\s+from|truncate)\s+public\./i);
  assert.doesNotMatch(sql, /\b(?:create|alter|drop)\s+policy\b/i);
  assert.doesNotMatch(sql, /\balter\s+table\b/i);
  assert.doesNotMatch(sql, /\bcreate\s+(?:unique\s+)?index\b/i);
});
