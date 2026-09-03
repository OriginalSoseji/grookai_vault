import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const migration = fs.readFileSync(
  'supabase/migrations/20260903143000_sealed_product_visibility_boundary_v1.sql',
  'utf8',
);

test('sealed visibility is independent, fail-closed, and service owned', () => {
  assert.match(migration,
    /create table public\.sealed_product_game_release_controls/i);
  assert.match(migration,
    /alter table public\.sealed_product_game_release_controls force row level security/i);
  assert.match(migration,
    /revoke all on table public\.sealed_product_game_release_controls[\s\S]*from public, anon, authenticated, service_role/i);
  assert.match(migration,
    /grant select, insert, update on table public\.sealed_product_game_release_controls[\s\S]*to service_role/i);
  assert.doesNotMatch(migration,
    /grant[^;]*(?:delete|truncate)[^;]*sealed_product_game_release_controls/i);
  assert.match(migration,
    /create function public\.sealed_product_game_visible_to_request_v1/i);
});

test('existing active sealed behavior is preserved while MTG starts hidden', () => {
  assert.match(migration,
    /catalog\.release_status[\s\S]*from public\.sealed_product_release_pointer pointer/i);
  assert.match(migration,
    /'SEALED_PRODUCT_VISIBILITY_BOUNDARY_V1_PRESERVED_ACTIVE'/i);
  assert.match(migration,
    /values \([\s\S]*'mtg',[\s\S]*'hidden',[\s\S]*'SEALED_PRODUCT_VISIBILITY_BOUNDARY_V1_MTG_HIDDEN'/i);
  assert.match(migration,
    /'sealed_payload_apply_authorizes_visibility', false/i);
  assert.match(migration,
    /'catalog_release_authorizes_sealed_visibility', false/i);
});

test('both sealed pricing RPCs require catalog and sealed release authority', () => {
  const catalogChecks = migration.match(
    /catalog_game_visible_to_request_v1\(family\.game_key\)/g,
  ) ?? [];
  const sealedChecks = migration.match(
    /sealed_product_game_visible_to_request_v1\(family\.game_key\)/g,
  ) ?? [];
  assert.equal(catalogChecks.length, 2);
  assert.equal(sealedChecks.length, 2);
  assert.match(migration,
    /revoke all on function public\.get_active_sealed_product_pricing_v2[\s\S]*from public, anon, authenticated, service_role/i);
  assert.match(migration,
    /grant execute on function public\.get_active_sealed_product_pricing_v2[\s\S]*to authenticated, service_role/i);
  assert.doesNotMatch(migration,
    /grant execute on function public\.get_active_sealed_product_pricing_v2[\s\S]*to anon/i);
});

test('migration is atomic and does not mutate catalog or sealed payload rows', () => {
  assert.match(migration, /^--[\s\S]*\nbegin;/i);
  assert.match(migration, /commit;\s*$/i);
  assert.doesNotMatch(migration,
    /(?:update|delete from|truncate) public\.catalog_game_release_controls/i);
  assert.doesNotMatch(migration,
    /(?:insert into|update|delete from|truncate) public\.sealed_product_(?:families|variants|candidates|source_mappings|variant_evidence|pricing_lane_qualifications|releases|release_members|release_pointer)\b/i);
});
