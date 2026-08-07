import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const migrationPath =
  "supabase/migrations/20260807043000_want_match_current_want_truth_boundary_v1.sql";

function readSource(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("current Want Match truth is the exact user_card_intents row", () => {
  const sql = readSource(migrationPath);

  assert.match(sql, /create or replace function public\.viewer_has_current_card_want_v1/i);
  assert.match(sql, /from public\.user_card_intents uci/i);
  assert.match(sql, /uci\.user_id = p_user_id/i);
  assert.match(sql, /uci\.card_print_id = p_card_print_id/i);
  assert.match(sql, /uci\.want is true/i);
  assert.doesNotMatch(
    sql,
    /create or replace function public\.viewer_has_current_card_want_v1[\s\S]*?from public\.wishlist_items/i,
  );
});

test("local-community wishlist signals use the same current-want boundary", () => {
  const sql = readSource(migrationPath);

  assert.match(
    sql,
    /alter function public\.local_community_visible_source_cards_v1\(uuid\)[\s\S]*rename to legacy_local_community_visible_source_cards_v1/i,
  );
  assert.match(
    sql,
    /public\.viewer_has_current_card_want_v1\(\s*p_viewer_user_id,\s*src\.card_print_id\s*\) as viewer_wishlist_match/i,
  );
});

test("turning off or deleting a want stales matches without deleting history", () => {
  const sql = readSource(migrationPath);

  assert.match(sql, /create or replace function public\.stale_want_matches_when_intent_removed_v1/i);
  assert.match(sql, /after update or delete on public\.user_card_intents/i);
  assert.match(sql, /old\.want is true/i);
  assert.match(sql, /new\.want is not true/i);
  assert.match(sql, /update public\.want_matches wm/i);
  assert.match(sql, /set status = 'stale'/i);
  assert.match(sql, /where wm\.want_user_id = old\.user_id/i);
  assert.match(sql, /and wm\.card_print_id = old\.card_print_id/i);
  assert.doesNotMatch(sql, /delete from public\.want_matches/i);
  assert.doesNotMatch(sql, /delete from public\.card_events/i);
});

test("every active match activation serializes against the exact current intent", () => {
  const sql = readSource(migrationPath);

  assert.match(sql, /create or replace function public\.enforce_current_want_match_activation_v1/i);
  assert.match(sql, /from public\.user_card_intents uci[\s\S]*for update/i);
  assert.match(sql, /after insert or update of status on public\.want_matches/i);
  assert.match(sql, /activation_without_current_want/i);
  assert.match(sql, /set status = 'stale'/i);
});

test("opt-out terminally cancels queued Want Match delivery", () => {
  const sql = readSource(migrationPath);

  assert.match(
    sql,
    /update public\.notification_outbox outbox[\s\S]*cancelled_current_want_removed/i,
  );
  assert.match(sql, /outbox\.send_started_at is null/i);
  assert.match(sql, /outbox\.event_type = 'want_match_available'/i);
  assert.match(sql, /'want_match_digest'::text, 'pulse_daily'::text/i);
  assert.match(sql, /failed_at = now\(\)/i);
});

test("dispatcher claim and send-start both recheck current evidence", () => {
  const sql = readSource(migrationPath);
  const worker = readSource("supabase/functions/notification-dispatcher/index.ts");

  assert.match(sql, /create or replace function public\.notification_outbox_has_current_want_truth_v1/i);
  assert.match(
    sql,
    /create or replace function public\.notification_dispatcher_claim_batch_v1[\s\S]*notification_outbox_has_current_want_truth_v1/i,
  );
  assert.match(
    sql,
    /create or replace function public\.notification_dispatcher_mark_send_started_if_current_v1[\s\S]*same intent -> outbox lock order[\s\S]*from public\.user_card_intents[\s\S]*for update[\s\S]*from public\.notification_outbox[\s\S]*for update[\s\S]*notification_outbox_has_current_want_truth_v1/i,
  );
  assert.match(sql, /v_outbox\.send_started_at is not null then[\s\S]*return false/i);
  assert.match(
    worker,
    /notification_dispatcher_mark_send_started_if_current_v1/,
  );
  assert.match(worker, /sendStarted !== true/);
  assert.match(worker, /current_evidence_invalidated/);
});

test("Pulse eligibility rejects inactive or unsupported Want Match events", () => {
  const sql = readSource(migrationPath);

  assert.match(
    sql,
    /alter function public\.binder_pulse_base_eligible_events_for_viewer_v1\(uuid\)[\s\S]*rename to legacy_binder_pulse_base_eligible_events_v1/i,
  );
  assert.match(sql, /eligible\.event_type <> 'want_match_available'/i);
  assert.match(sql, /wm\.status = 'active'/i);
  assert.match(sql, /wm\.want_user_id = p_viewer_user_id/i);
  assert.match(sql, /wm\.card_print_id = eligible\.card_print_id/i);
  assert.match(
    sql,
    /public\.viewer_has_current_card_want_v1\(\s*p_viewer_user_id,\s*wm\.card_print_id\s*\)/i,
  );
});

test("existing drift is status-repaired and owner-side cleanup is scheduled", () => {
  const sql = readSource(migrationPath);

  assert.match(
    sql,
    /update public\.want_matches wm[\s\S]*where wm\.status = 'active'[\s\S]*not public\.viewer_has_current_card_want_v1/i,
  );
  assert.match(sql, /canonical_want_not_current_at_truth_repair/i);
  assert.match(sql, /grookai-want-match-stale-cleanup-v1/i);
  assert.match(sql, /mark_stale_want_matches_v1\(null, 1000\)/i);
  assert.match(sql, /'\*\/15 \* \* \* \*'/i);
  assert.doesNotMatch(sql, /\btruncate\b/i);
  assert.doesNotMatch(sql, /\bdrop table\b/i);
});

test("rollback-only E3 smoke covers opt-out hiding and deterministic reactivation", () => {
  const script = readSource(
    "scripts/audits/e3_want_match_local_fixture_smoke_v1.mjs",
  );

  assert.match(script, /insert into public\.user_card_intents/i);
  assert.match(script, /pulseBeforeWantOff/);
  assert.match(script, /statusAfterWantOff/);
  assert.match(script, /candidatesAfterWantOff/);
  assert.match(script, /pulseAfterWantOff/);
  assert.match(script, /invalidatedSendStart/);
  assert.match(script, /reactivationRun/);
  assert.match(script, /pulseAfterReactivation/);
  assert.match(script, /validSendStart/);
  assert.match(script, /duplicateSendStart/);
  assert.match(script, /rollback_only: true/);
});

test("Pulse fixture carries a real active match and exact current-want evidence", () => {
  const script = readSource(
    "scripts/audits/e4_pulse_local_fixture_smoke_v1.mjs",
  );

  assert.match(script, /wantMatchId/);
  assert.match(script, /insert into public\.user_card_intents/i);
  assert.match(script, /insert into public\.want_matches/i);
  assert.match(script, /'want_match_id', \$13::text/i);
  assert.match(script, /'active'/i);
});
