import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const candidatePath =
  'docs/sql/mtg_sealed_authenticated_image_read_v1_migration_candidate.sql';
const sql = fs.readFileSync(candidatePath, 'utf8');

test('authenticated image-read SQL remains an unapplied candidate', () => {
  assert.equal(fs.existsSync(candidatePath), true);
  assert.equal(fs.existsSync(
    'supabase/migrations/20260904010000_mtg_sealed_authenticated_image_read_v1.sql',
  ), false);
  assert.match(sql, /Review artifact only/i);
});

test('candidate exposes only an authenticated signing-authorization predicate', () => {
  assert.match(sql,
    /create or replace function public\.mtg_sealed_image_object_signing_authorized_v1/i);
  assert.match(sql, /security definer/i);
  assert.match(sql, /set search_path = pg_catalog, public/i);
  assert.match(sql,
    /grant execute on function public\.mtg_sealed_image_object_signing_authorized_v1[\s\S]*to authenticated, service_role/i);
  assert.doesNotMatch(sql, /create policy[\s\S]*storage\.objects/i);
  assert.doesNotMatch(sql, /grant [^;]+ on storage\.objects/i);
});

test('predicate requires exact active image and price release lineage', () => {
  for (const table of [
    'sealed_product_image_objects',
    'sealed_product_variant_image_assertions',
    'sealed_product_image_evidence',
    'sealed_product_image_release_members',
    'sealed_product_image_releases',
    'sealed_product_image_release_pointer',
    'sealed_product_release_pointer',
    'sealed_product_releases',
    'sealed_product_release_members',
    'sealed_product_pricing_lane_qualifications',
    'sealed_product_source_mappings',
  ]) assert.match(sql, new RegExp(`public\\.${table}\\b`, 'i'));
  assert.match(sql, /image_release\.source_price_release_id/i);
  assert.match(sql, /image_release\.release_state = 'frozen'/i);
  assert.match(sql, /price_release\.release_state = 'frozen'/i);
  assert.match(sql, /price_member\.qualification_status = 'qualified_exact'/i);
  assert.match(sql, /image_assertion\.assertion_state = 'exact_verified'/i);
});

test('predicate requires fresh exact English TCGPlayer USD evidence', () => {
  assert.match(sql, /mapping\.source_provider = 'tcgplayer'/i);
  assert.match(sql, /variant\.language_code = 'en'/i);
  assert.match(sql, /source_subtype_name_normalized = 'normal'/i);
  assert.match(sql, /qualification\.currency = 'USD'/i);
  assert.match(sql, /qualification\.observed_on >= current_date - 7/i);
  assert.match(sql, /qualification\.observed_on <= current_date/i);
  assert.match(sql, /market_price[\s\S]*::numeric[\s\S]*> 0/i);
});

test('predicate requires byte parity, exact path, and both visibility controls', () => {
  assert.match(sql, /storage_readback_sha256 = image_object\.content_sha256/i);
  assert.match(sql, /image_object\.content_sha256 = image_evidence\.content_sha256/i);
  assert.match(sql, /image_object\.image_mime = image_evidence\.image_mime/i);
  assert.match(sql, /left\(image_object\.content_sha256, 2\)/i);
  assert.match(sql, /catalog_game_visible_to_request_v1\('mtg'\)/i);
  assert.match(sql, /sealed_product_game_visible_to_request_v1\('mtg'\)/i);
});
