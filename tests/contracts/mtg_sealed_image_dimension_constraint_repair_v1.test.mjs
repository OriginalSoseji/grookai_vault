import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const migrationPath =
  'supabase/migrations/20260905120000_mtg_sealed_image_dimension_constraint_repair_v1.sql';
const sql = fs.readFileSync(migrationPath, 'utf8');

test('dimension repair preserves the applied migration and uses a forward migration', () => {
  assert.equal(fs.existsSync(
    'supabase/migrations/20260904130000_mtg_sealed_image_evidence_and_signing_authorization_v1.sql',
  ), true);
  assert.equal(fs.existsSync(migrationPath), true);
});

test('dimension repair rejects partial, null, and non-positive tuples before replacement', () => {
  assert.match(sql, /if exists \([\s\S]*sealed_product_image_evidence[\s\S]*where not \(/i);
  assert.match(sql, /image_width is null[\s\S]*image_height is null[\s\S]*image_bytes is null/i);
  assert.match(sql, /image_width is not null[\s\S]*image_height is not null[\s\S]*image_bytes is not null/i);
  assert.match(sql, /image_width > 0[\s\S]*image_height > 0[\s\S]*image_bytes > 0/i);
  assert.match(sql, /using errcode = '23514'/i);
});

test('replacement constraint is fail-closed for every dimension tuple', () => {
  assert.match(sql, /drop constraint sealed_product_image_evidence_dimension_check/i);
  assert.match(sql, /add constraint sealed_product_image_evidence_dimension_check/i);
  assert.match(sql, /check \([\s\S]*image_width is not null[\s\S]*image_height is not null[\s\S]*image_bytes is not null[\s\S]*image_width > 0[\s\S]*image_height > 0[\s\S]*image_bytes > 0[\s\S]*\)/i);
});

test('dimension repair is schema-only and does not alter release or visibility state', () => {
  assert.doesNotMatch(sql, /\b(insert|update|delete|truncate)\b/i);
  assert.doesNotMatch(sql, /sealed_product_(?:image_)?release_pointer/i);
  assert.doesNotMatch(sql, /sealed_product_game_release_controls/i);
  assert.doesNotMatch(sql, /storage\./i);
});
