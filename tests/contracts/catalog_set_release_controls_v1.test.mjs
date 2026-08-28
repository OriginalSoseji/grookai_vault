import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const sql = fs.readFileSync(
  new URL(
    "../../supabase/migrations/20260828110000_catalog_set_release_controls_v1.sql",
    import.meta.url,
  ),
  "utf8",
);

test("set release migration is transactional and service-owned", () => {
  assert.match(sql, /^\s*--[\s\S]*?\bbegin;/i);
  assert.match(sql, /\bcommit;\s*$/i);
  assert.match(sql, /create table if not exists public\.catalog_set_release_controls/i);
  assert.match(sql, /release_status in \('hidden', 'signed_in', 'public'\)/i);
  assert.match(sql, /revoke all on table public\.catalog_set_release_controls[\s\S]*?from public, anon, authenticated/i);
  assert.match(sql, /grant select, insert, update on table public\.catalog_set_release_controls[\s\S]*?to service_role/i);
  assert.doesNotMatch(sql, /grant[^;]*catalog_set_release_controls[^;]*to (?:anon|authenticated)/i);
});

test("missing set controls inherit the game release while explicit controls override it", () => {
  assert.match(sql, /when set_control\.set_id is not null then[\s\S]*?set_control\.release_status = 'public'/i);
  assert.match(sql, /set_control\.release_status = 'signed_in'[\s\S]*?auth\.role\(\)/i);
  assert.match(sql, /else public\.catalog_game_visible_to_request_v1\(target_set\.game\)/i);
});

test("card and parent visibility resolve through the set boundary", () => {
  assert.match(sql, /catalog_card_print_visible_to_request_v1[\s\S]*?catalog_set_visible_to_request_v1\(card\.set_id\)/i);
  assert.match(sql, /catalog_parent_gv_id_visible_to_request_v1[\s\S]*?catalog_set_visible_to_request_v1\(card\.set_id\)/i);
  assert.match(sql, /sets_catalog_release_visibility_v1[\s\S]*?catalog_set_visible_to_request_v1\(id\)/i);
  assert.match(sql, /card_prints_catalog_release_visibility_v1[\s\S]*?catalog_card_print_visible_to_request_v1\(id\)/i);
});

test("all active privileged catalog reads enforce card-level set visibility", () => {
  assert.match(sql, /search_game_card_prints_v3[\s\S]*?catalog_card_print_visible_to_request_v1\(card\.id\)/i);
  assert.match(sql, /search_game_card_prints_v4[\s\S]*?catalog_card_print_visible_to_request_v1\(card\.id\)/i);
  assert.match(sql, /search_game_card_prints_v2[\s\S]*?search_game_card_prints_v3/i);
  assert.match(sql, /get_public_set_card_counts_v1[\s\S]*?catalog_card_print_visible_to_request_v1\(card\.id\)/i);
  assert.match(sql, /get_public_set_catalog_facets_v1[\s\S]*?catalog_card_print_visible_to_request_v1\(card\.id\)/i);
});
