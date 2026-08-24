import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const sql = fs.readFileSync(
  path.resolve('supabase/migrations/20260824173000_catalog_parent_visibility_direct_v1.sql'),
  'utf8'
);

test('direct parent visibility preserves every allowed release state', () => {
  assert.match(sql, /lower\(coalesce\(game\.code, ''\)\) = 'pokemon' then true/i);
  assert.match(sql, /control\.release_status = 'public' then true/i);
  assert.match(sql, /control\.release_status = 'signed_in'[\s\S]*auth\.role\(\)[\s\S]*'authenticated'[\s\S]*'service_role'/i);
  assert.match(sql, /else false/i);
  assert.match(sql, /coalesce\([\s\S]*false[\s\S]*\);/i);
});

test('direct parent visibility resolves canonical and release evidence in one query', () => {
  assert.match(sql, /from public\.card_prints card/i);
  assert.match(sql, /join public\.games game on game\.id = card\.game_id/i);
  assert.match(sql, /left join public\.catalog_game_release_controls control/i);
  assert.match(sql, /where card\.gv_id = p_parent_gv_id/i);
  assert.doesNotMatch(sql, /catalog_game_id_visible_to_request_v1\s*\(/i);
  assert.doesNotMatch(sql, /catalog_game_visible_to_request_v1\s*\(/i);
});

test('direct parent visibility keeps grants and changes no policy or rows', () => {
  assert.match(sql, /security definer/i);
  assert.match(sql, /set search_path = public/i);
  assert.match(sql, /grant execute[\s\S]*to anon, authenticated, service_role/i);
  assert.doesNotMatch(sql, /\b(?:insert\s+into|update|delete\s+from|truncate)\s+public\./i);
  assert.doesNotMatch(sql, /\b(?:create|alter|drop)\s+policy\b/i);
  assert.doesNotMatch(sql, /\balter\s+table\b/i);
});
