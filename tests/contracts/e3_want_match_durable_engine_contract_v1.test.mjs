import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

function readSource(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("E3 durable want-match engine persists matches without delivery writes", () => {
  const sql = readSource("supabase/migrations/20260708110000_product_evolution_e3_want_match_durable_engine_v1.sql");

  assert.match(sql, /create table if not exists public\.want_matches/i);
  assert.match(sql, /card_events[\s\S]*column_name = 'dedupe_key'/i);
  assert.match(sql, /notification_outbox[\s\S]*column_name = 'dedupe_key'/i);
  assert.match(sql, /create unique index if not exists want_matches_user_copy_unique_idx/i);
  assert.match(sql, /coalesce\(vault_item_id, instance_id/i);
  assert.match(sql, /create policy want_matches_want_user_select/i);
  assert.match(sql, /using \(auth\.uid\(\) = want_user_id\)/i);
  assert.match(sql, /create or replace function public\.run_want_match_engine_v1/i);
  assert.match(sql, /local_community_want_match_candidates_v1\(u\.user_id, v_limit\)/i);
  assert.match(sql, /interest_graph_emit_event_v1\(\s*'e3_want_match_engine',\s*'want_match_available'/i);
  assert.match(sql, /interest_graph_emit_event_v1\(\s*'e3_want_match_engine',\s*'want_match_owner_count'/i);
  assert.match(sql, /'want_match_available:' \|\| v_match\.id::text/i);
  assert.match(sql, /'want_match_owner_count:' \|\| v_match\.id::text/i);
  assert.match(sql, /create or replace function public\.want_matches_for_viewer_v1/i);
  assert.match(sql, /create or replace function public\.mark_stale_want_matches_v1/i);
  assert.match(sql, /last_seen_available_at < now\(\) - interval '7 days'/i);
  assert.match(sql, /It never hard-deletes matches/i);
  assert.match(sql, /never writes notification_outbox/i);
  assert.doesNotMatch(sql, /insert into public\.notification_outbox/i);
});

test("E3 local fixture smoke includes feed agreement and PR2 gates", () => {
  const script = readSource("scripts/audits/e3_want_match_local_fixture_smoke_v1.mjs");

  assert.match(script, /run_want_match_engine_v1/);
  assert.match(script, /match_row_count_after_first/);
  assert.match(script, /event_rows_after_first/);
  assert.match(script, /private_candidate_count/);
  assert.match(script, /want_match_outbox_rows/);
  assert.match(script, /mark_stale_want_matches_v1/);
  assert.match(script, /rollback_only/);
});
