import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const migrationPath = new URL(
  '../../supabase/migrations/20260801160000_binder_card_variant_context_v1.sql',
  import.meta.url,
);
const migration = readFileSync(migrationPath, 'utf8');

test('binder card context exposes governed canonical variant fields', () => {
  assert.match(
    migration,
    /create or replace function public\.binder_card_json_v1\(/i,
  );
  assert.match(migration, /'variant_key',\s*left\(nullif\(btrim\(cp\.variant_key\)/i);
  assert.match(
    migration,
    /'printed_identity_modifier',\s*left\(nullif\(btrim\(cp\.printed_identity_modifier\)/i,
  );
  assert.match(migration, /'rarity',\s*left\(nullif\(btrim\(cp\.rarity\)/i);
  assert.match(migration, /'finish_label'/i);
  assert.match(migration, /'canonical_image_url'/i);
  assert.match(migration, /'hosted_image'/i);
});

test('binder variant context remains a bounded read-only contract', () => {
  assert.match(migration, /^begin;/i);
  assert.match(migration, /commit;\s*$/i);
  assert.doesNotMatch(migration, /insert\s+into|update\s+public\.|delete\s+from/i);
  assert.doesNotMatch(migration, /alter\s+table|create\s+table|drop\s+table/i);
  assert.doesNotMatch(migration, /split_part\s*\([^)]*gv_id|regexp[^\n]*gv_id/i);
});
