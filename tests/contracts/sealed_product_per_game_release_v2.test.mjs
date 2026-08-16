import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sql = fs.readFileSync(
  'supabase/migrations/20260816170000_sealed_product_per_game_release_v2.sql',
  'utf8',
);

test('sealed releases and pointers become game-scoped without deleting history', () => {
  assert.match(sql, /sealed_product_releases[\s\S]*add column game_key text/i);
  assert.match(sql, /sealed_product_release_pointer[\s\S]*add column game_key text/i);
  assert.match(sql, /primary key \(game_key\)/i);
  assert.match(sql, /references public\.sealed_product_releases \(id, game_key\)/i);
  assert.doesNotMatch(sql, /\b(delete from|truncate|drop table)\b/i);
});

test('migration fails when an existing release crosses games or cannot be resolved', () => {
  assert.match(sql, /Every existing sealed release must resolve to exactly one game/i);
  assert.match(sql, /Existing sealed release contains a cross-game member/i);
  assert.match(sql, /Every existing sealed release pointer must resolve to one game/i);
});

test('active release compare-and-swap is isolated by game', () => {
  assert.match(sql, /where pointer\.game_key = v_release\.game_key[\s\S]*for update/i);
  assert.match(sql, /on conflict \(game_key\) do update/i);
  assert.match(sql, /CROSS_TCG_SEALED_PRODUCT_RELEASE_POINTER_V2/i);
  assert.doesNotMatch(sql, /on conflict \(singleton\) do update/i);
});

test('v2 read model requires an explicit game and remains signed-in only', () => {
  assert.match(sql, /create function public\.get_active_sealed_product_pricing_v2/i);
  assert.match(sql, /where family\.game_key = lower\(btrim\(p_game_key\)\)/i);
  assert.match(sql, /catalog_game_visible_to_request_v1\(family\.game_key\)/i);
  assert.match(sql, /revoke all on function[\s\S]*from public, anon, authenticated, service_role/i);
  assert.match(sql, /grant execute on function[\s\S]*to authenticated, service_role/i);
  assert.doesNotMatch(sql, /grant execute on function[\s\S]*to anon/i);
});

test('migration is atomic and limits backfill updates to sealed release controls', () => {
  assert.match(sql, /^\s*--[\s\S]*\bbegin\s*;/i);
  assert.match(sql, /commit\s*;\s*$/i);
  const updates = [...sql.matchAll(/update\s+public\.([a-z0-9_]+)/gi)]
    .map((match) => match[1]);
  assert.deepEqual([...new Set(updates)].sort(), [
    'sealed_product_release_pointer',
    'sealed_product_releases',
  ]);
});
