import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

function readSource(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("E4 Pulse daily migration cuts over legacy want-match digest", () => {
  const sql = readSource("supabase/migrations/20260708150000_product_evolution_e4_pulse_daily_delivery_v1.sql");

  assert.match(sql, /create table if not exists public\.pulse_daily_job_state/i);
  assert.match(sql, /create or replace function public\.enqueue_want_match_digest_notifications_v1/i);
  assert.match(sql, /E4 cutover no-op/i);
  assert.match(sql, /create or replace function public\.skip_undelivered_want_match_digest_for_pulse_daily_v1/i);
  assert.match(sql, /superseded_by_pulse_daily/i);
  assert.match(sql, /notification_dispatcher_mark_skipped_v1/i);
  assert.match(sql, /create or replace function public\.enqueue_pulse_daily_notifications_v1/i);
  assert.match(sql, /'pulse_daily'/i);
  assert.match(sql, /'daily_pulse'/i);
  assert.match(sql, /'pulse_daily:' \|\| v_user\.recipient_user_id::text \|\| ':' \|\| v_window_key/i);
  assert.match(sql, /public\.pulse_eligible_events_for_viewer_v1/i);
  assert.match(sql, /wm\.recommended_tier = 'digest'/i);
  assert.match(sql, /'counts_by_type'/i);
  assert.match(sql, /'compact_item_ids'/i);
  assert.match(sql, /'grookai:\/\/feed\?segment=pulse'/i);
  assert.match(sql, /create or replace function public\.run_pulse_daily_aggregation_v1/i);
  assert.match(sql, /create or replace function public\.notification_dispatcher_reschedule_digest_fold_v1/i);
  assert.match(sql, /'want_match_digest'::text, 'pulse_daily'::text/i);
  assert.match(sql, /cron\.schedule\(\s*'pulse-daily-aggregation-v1'/i);
  assert.doesNotMatch(sql, /insert into public\.card_events/i);
  assert.doesNotMatch(sql, /insert into public\.[a-z_]*pricing/i);
  assert.doesNotMatch(sql, /update public\.[a-z_]*pricing/i);
  assert.doesNotMatch(sql, /delete from public\.[a-z_]*pricing/i);
});

test("E4 dispatcher formats and reschedules pulse_daily", () => {
  const dispatcher = readSource("supabase/functions/notification-dispatcher/index.ts");

  assert.match(dispatcher, /outbox\.event_type === "pulse_daily"/);
  assert.match(dispatcher, /happened around your collection/);
  assert.match(dispatcher, /grookai:\/\/feed\?segment=pulse/);
  assert.match(dispatcher, /row\.event_type === "want_match_digest" \|\| row\.event_type === "pulse_daily"/);
  assert.match(dispatcher, /notification_dispatcher_reschedule_digest_fold_v1/);
});

test("E4 Pulse daily local smoke covers PR2 gate", () => {
  const script = readSource("scripts/audits/e4_pulse_daily_local_fixture_smoke_v1.mjs");

  assert.match(script, /run_pulse_daily_aggregation_v1/);
  assert.match(script, /enqueue_want_match_digest_notifications_v1/);
  assert.match(script, /cutover_digest_enqueue_returned_rows/);
  assert.match(script, /pulse_daily_rows/);
  assert.match(script, /zero_user_pulse_daily_rows/);
  assert.match(script, /legacy_digest_after_cutover/);
  assert.match(script, /undelivered_legacy_digest_rows/);
  assert.match(script, /notification_dispatcher_reschedule_digest_fold_v1/);
  assert.match(script, /rollback_only/);
});
