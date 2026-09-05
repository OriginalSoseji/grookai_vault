import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const candidatePath =
  'docs/sql/mtg_sealed_image_backed_pricing_rpc_v3_migration_candidate.sql';
const migrationPath =
  'supabase/migrations/20260905070000_mtg_sealed_image_backed_pricing_rpc_v3.sql';
const sql = fs.readFileSync(candidatePath, 'utf8');
const migrationSql = fs.readFileSync(migrationPath, 'utf8');

test('RPC V3 reviewed candidate is promoted under a forward-only migration', () => {
  assert.equal(fs.existsSync(candidatePath), true);
  assert.equal(fs.existsSync(migrationPath), true);
  assert.match(sql, /Review artifact only/);
  assert.match(migrationSql, /MTG_SEALED_IMAGE_BACKED_PRICING_RPC_V3/);
  assert.doesNotMatch(migrationSql, /Review artifact only/);
});

test('RPC V3 binds frozen image and price releases to the same authority', () => {
  assert.match(sql, /price_release\.release_state = 'frozen'/i);
  assert.match(sql, /image_release\.release_state = 'frozen'/i);
  assert.match(sql,
    /image_release\.source_price_release_id = price_pointer\.release_id/i);
  assert.match(sql,
    /image_evidence\.source_release_member_id = price_member\.id/i);
});

test('RPC V3 requires exact price and exact image evidence', () => {
  assert.match(sql, /price_member\.qualification_status = 'qualified_exact'/i);
  assert.match(sql, /mapping\.source_provider = 'tcgplayer'/i);
  assert.match(sql, /variant\.language_code = 'en'/i);
  assert.match(sql,
    /qualification\.source_subtype_name_normalized = 'normal'/i);
  assert.match(sql, /qualification\.currency = 'USD'/i);
  assert.match(sql, /image_assertion\.assertion_state = 'exact_verified'/i);
  assert.match(sql, /'exact_image_ready', 'shared_bytes_exact_variant'/i);
  assert.match(sql,
    /image_assertion\.source_mapping_id = price_member\.source_mapping_id/i);
});

test('RPC V3 enforces serving-time price freshness and positive market price', () => {
  assert.match(sql, /lower\(btrim\(p_game_key\)\) = 'mtg'/i);
  assert.match(sql,
    /qualification\.observed_on >= current_date - 7/i);
  assert.match(sql, /qualification\.observed_on <= current_date/i);
  assert.match(sql,
    /qualification\.qualification_evidence #>> '\{observation,market_price\}'\)::numeric\s*> 0/i);
});

test('RPC V3 returns only byte-verified self-hosted image metadata', () => {
  assert.match(sql,
    /image_object\.storage_readback_sha256 = image_evidence\.content_sha256/i);
  assert.match(sql,
    /image_object\.content_sha256 = image_evidence\.content_sha256/i);
  assert.match(sql, /image_object\.image_mime = image_evidence\.image_mime/i);
  assert.match(sql, /image_object\.image_width = image_evidence\.image_width/i);
  assert.match(sql, /image_object\.image_height = image_evidence\.image_height/i);
  assert.match(sql, /image_object\.image_bytes = image_evidence\.image_bytes/i);
  assert.match(sql, /image_object\.storage_bucket = 'user-card-images'/i);
  assert.match(sql, /sealed\/.*\/sha256\//i);
  assert.doesNotMatch(sql, /selected_source_url|source_image_url|external_image_url/i);
});

test('RPC V3 preserves both visibility controls and denies anonymous execution', () => {
  assert.match(sql, /catalog_game_visible_to_request_v1\(family\.game_key\)/i);
  assert.match(sql, /sealed_product_game_visible_to_request_v1\(family\.game_key\)/i);
  assert.match(sql,
    /coalesce\(auth\.role\(\), ''\) in \('authenticated', 'service_role'\)/i);
  assert.match(sql,
    /revoke all on function public\.get_active_sealed_product_pricing_v3[\s\S]*from public, anon, authenticated, service_role/i);
  assert.match(sql,
    /grant execute on function public\.get_active_sealed_product_pricing_v3[\s\S]*to authenticated, service_role/i);
  assert.doesNotMatch(sql, /grant execute[\s\S]*to anon/i);
});

test('RPC V3 clamps query bounds', () => {
  assert.match(sql,
    /limit least\(greatest\(coalesce\(p_limit, 50\), 1\), 100\)/i);
  assert.match(sql, /offset greatest\(coalesce\(p_offset, 0\), 0\)/i);
});

test('promoted migration preserves the reviewed RPC behavior', () => {
  for (const pattern of [
    /create or replace function public\.get_active_sealed_product_pricing_v3/i,
    /image_release\.source_price_release_id = price_pointer\.release_id/i,
    /image_evidence\.source_release_member_id = price_member\.id/i,
    /qualification\.observed_on >= current_date - 7/i,
    /image_object\.storage_readback_sha256 = image_evidence\.content_sha256/i,
    /catalog_game_visible_to_request_v1\(family\.game_key\)/i,
    /sealed_product_game_visible_to_request_v1\(family\.game_key\)/i,
    /grant execute on function public\.get_active_sealed_product_pricing_v3[\s\S]*to authenticated, service_role/i,
  ]) assert.match(migrationSql, pattern);
});
