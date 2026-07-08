import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

function readSource(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("E3 want-match delivery migration wires instant and digest jobs", () => {
  const sql = readSource("supabase/migrations/20260708120000_product_evolution_e3_want_match_delivery_v1.sql");

  assert.match(sql, /create table if not exists public\.want_match_job_state/i);
  assert.match(sql, /create or replace function public\.run_want_match_instant_candidate_pass_v1/i);
  assert.match(sql, /create or replace function public\.run_want_match_daily_digest_aggregation_v1/i);
  assert.match(sql, /p_dry_run boolean default false/i);
  assert.match(sql, /p_timeout_seconds integer default 25/i);
  assert.match(sql, /cursor_user_id/i);
  assert.match(sql, /want_match_log_delivery_failure_v1/i);
  assert.match(sql, /notification_emit_failures/i);
  assert.match(sql, /cron\.schedule\(\s*'want-match-instant-every-5-min-v1',\s*'\*\/5 \* \* \* \*'/i);
  assert.match(sql, /cron\.schedule\(\s*'want-match-digest-daily-v1'/i);
});

test("E3 scheduled job auth fix preserves user guard while allowing cron execution", () => {
  const sql = readSource("supabase/migrations/20260708130000_product_evolution_e3_want_match_job_auth_fix_v1.sql");

  assert.match(sql, /create or replace function public\.local_community_want_match_candidates_v1/i);
  assert.match(sql, /v_auth_role text := coalesce\(auth\.role\(\), ''\)/i);
  assert.match(sql, /v_auth_uid uuid := auth\.uid\(\)/i);
  assert.match(sql, /if v_auth_uid is null then/i);
  assert.match(sql, /v_auth_role in \('authenticated', 'anon'\)/i);
  assert.match(sql, /v_auth_role <> 'service_role'/i);
  assert.match(sql, /v_auth_uid is distinct from p_viewer_user_id/i);
  assert.match(sql, /scheduled database jobs may run without a JWT/i);
});

test("E3 instant delivery is want-user only, trade nearby, and deduped by match id", () => {
  const sql = readSource("supabase/migrations/20260708120000_product_evolution_e3_want_match_delivery_v1.sql");

  assert.match(sql, /create or replace function public\.enqueue_want_match_instant_notifications_v1/i);
  assert.match(sql, /wm\.recommended_tier = 'instant'/i);
  assert.match(sql, /wm\.distance_bucket = 'nearby'/i);
  assert.match(sql, /wm\.intent = 'trade'/i);
  assert.match(sql, /wm\.match_strength >= 0\.85/i);
  assert.match(sql, /'want_match_available:' \|\| v_match\.id::text/i);
  assert.match(sql, /v_match\.want_user_id,\s*'want_match_available',\s*'instant'/i);
  assert.doesNotMatch(sql, /v_match\.owner_user_id,\s*'want_match_available',\s*'instant'/i);
  assert.doesNotMatch(sql, /want_match_owner_count[\s\S]*insert into public\.notification_outbox/i);
});

test("E3 minimal digest creates one daily pulse and reschedules budget folds", () => {
  const sql = readSource("supabase/migrations/20260708120000_product_evolution_e3_want_match_delivery_v1.sql");

  assert.match(sql, /create or replace function public\.enqueue_want_match_digest_notifications_v1/i);
  assert.match(sql, /wm\.recommended_tier = 'digest'/i);
  assert.match(sql, /'want_match_digest:' \|\| v_user\.want_user_id::text \|\| ':' \|\| v_window_key/i);
  assert.match(sql, /'want_match_digest',\s*'daily_pulse'/i);
  assert.match(sql, /'match_count', v_user\.match_count/i);
  assert.match(sql, /'top_card', jsonb_build_object/i);
  assert.match(sql, /'compact_match_ids', to_jsonb\(v_user\.match_ids\[1:10\]\)/i);
  assert.match(sql, /notification_dispatcher_reschedule_digest_fold_v1/i);
  assert.match(sql, /folded_into_digest_at = null/i);
  assert.match(sql, /\|\| '_rescheduled'/i);
});

test("E3 dispatcher formats want-match notifications and reschedules digest budget folds", () => {
  const dispatcher = readSource("supabase/functions/notification-dispatcher/index.ts");

  assert.match(dispatcher, /outbox\.event_type === "want_match_available"/);
  assert.match(dispatcher, /has this available for trade/);
  assert.match(dispatcher, /outbox\.event_type === "want_match_digest"/);
  assert.match(dispatcher, /want-list match/);
  assert.match(dispatcher, /notification_dispatcher_reschedule_digest_fold_v1/);
  assert.match(dispatcher, /row\.event_type === "want_match_digest" && reason === "daily_budget_exhausted"/);
});

test("E3 local smoke has delivery gates for instant, digest, owner-zero, and reschedule", () => {
  const script = readSource("scripts/audits/e3_want_match_local_fixture_smoke_v1.mjs");

  assert.match(script, /--include-delivery/);
  assert.match(script, /enqueue_want_match_instant_notifications_v1/);
  assert.match(script, /instant_enqueue_second/);
  assert.match(script, /owner_outbox_rows/);
  assert.match(script, /enqueue_want_match_digest_notifications_v1/);
  assert.match(script, /notification_dispatcher_reschedule_digest_fold_v1/);
  assert.match(script, /delivery_failures/);
});
