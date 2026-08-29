import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const sql = fs.readFileSync(
  new URL(
    "../../supabase/migrations/20260829203000_search_game_card_prints_v4_performance_v2.sql",
    import.meta.url,
  ),
  "utf8",
);

test("V4 performance repair preserves its public contract and release boundaries", () => {
  assert.match(sql, /^\s*--[\s\S]*?\bbegin;/i);
  assert.match(sql, /\bcommit;\s*$/i);
  assert.match(sql, /create or replace function public\.search_game_card_prints_v4/i);
  assert.match(sql, /security definer[\s\S]*?set search_path = public/i);
  assert.match(sql, /catalog_game_visible_to_request_v1\(game\.code\)/i);
  assert.match(sql, /or exists[\s\S]*?catalog_set_visible_to_request_v1\(released_set\.id\)/i);
  assert.match(sql, /catalog_card_print_visible_to_request_v1\(card\.id\)/i);
  assert.match(sql, /data_quality_flags\s*#>>\s*'\{app_visibility_v1,status\}'/i);
  assert.match(sql, /grant execute on function public\.search_game_card_prints_v4[\s\S]*?to anon, authenticated, service_role/i);
});

test("ordinary name search uses the indexed card table directly instead of V3", () => {
  assert.match(sql, /from public\.card_prints card[\s\S]*?card\.game_id = v_game_id/i);
  assert.match(sql, /lower\(card\.name\) like '%' \|\| lower\(v_effective_query\) \|\| '%'/i);
  assert.doesNotMatch(sql, /search_game_card_prints_v3\s*\(/i);
});

test("exact identity, language, set, number, and illustrator constraints remain bounded", () => {
  assert.match(sql, /lower\(v_query\) like 'gv-%'/i);
  assert.match(sql, /lower\(card\.gv_id\) = lower\(v_query\)/i);
  assert.match(sql, /v_set_code is null or lower\(card\.set_code\) = v_set_code/i);
  assert.match(sql, /lower\(card\.number\) = v_number/i);
  assert.match(sql, /lower\(card\.number_plain\) = v_number/i);
  assert.match(sql, /v_illustrator is null or lower\(card\.artist\) = v_illustrator/i);
  assert.match(sql, /v_language_scope = 'ja'[\s\S]*?GV-PK-JPN-/i);
  assert.match(sql, /least\(greatest\(coalesce\(limit_in, 50\), 1\), 64\)/i);
  assert.match(sql, /least\(greatest\(coalesce\(offset_in, 0\), 0\), 10000\)/i);
});

test("performance repair is schema-only and cannot mutate catalog rows", () => {
  assert.doesNotMatch(sql, /insert\s+into|update\s+public|delete\s+from|truncate\s+/i);
});
