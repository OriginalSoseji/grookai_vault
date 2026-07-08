import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

function readSource(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("E4 Pulse PR1 creates viewer state and read RPCs without emitters", () => {
  const sql = readSource("supabase/migrations/20260708140000_product_evolution_e4_pulse_state_read_rpc_v1.sql");

  assert.match(sql, /create table if not exists public\.pulse_viewer_state/i);
  assert.match(sql, /seen_through_created_at timestamptz null/i);
  assert.match(sql, /seen_through_event_id uuid null references public\.card_events/i);
  assert.match(sql, /create or replace function public\.pulse_items_v1/i);
  assert.match(sql, /create or replace function public\.pulse_unread_count_v1/i);
  assert.match(sql, /create or replace function public\.pulse_mark_seen_v1/i);
  assert.match(sql, /create or replace function public\.pulse_eligible_events_for_viewer_v1/i);
  assert.match(sql, /interest_graph_card_event_visible_to_viewer_v1/i);
  assert.match(sql, /w\.muted_at is null/i);
  assert.match(sql, /pulse seen cursor cannot move backwards/i);
  assert.match(sql, /latest_event_created_at/i);
  assert.match(sql, /Opening Pulse means seen-all currently eligible rows/i);
  assert.match(sql, /card_value_moved|value_moved|card_value_changed/i);
  assert.match(sql, /value_delta_amount numeric/i);
  assert.match(sql, /value_delta_percent numeric/i);
  assert.doesNotMatch(sql, /insert into public\.card_events/i);
  assert.doesNotMatch(sql, /insert into public\.notification_outbox/i);
  assert.doesNotMatch(sql, /insert into public\.[a-z_]*pricing/i);
  assert.doesNotMatch(sql, /update public\.[a-z_]*pricing/i);
  assert.doesNotMatch(sql, /delete from public\.[a-z_]*pricing/i);
});

test("E4 Pulse RLS is owner-only and public entrypoints are authenticated", () => {
  const sql = readSource("supabase/migrations/20260708140000_product_evolution_e4_pulse_state_read_rpc_v1.sql");

  assert.match(sql, /alter table public\.pulse_viewer_state enable row level security/i);
  assert.match(sql, /create policy pulse_viewer_state_owner_select/i);
  assert.match(sql, /using \(auth\.uid\(\) = user_id\)/i);
  assert.match(sql, /create policy pulse_viewer_state_owner_insert/i);
  assert.match(sql, /with check \(auth\.uid\(\) = user_id\)/i);
  assert.match(sql, /create policy pulse_viewer_state_owner_update/i);
  assert.match(sql, /revoke all on function public\.pulse_items_v1\(integer, timestamptz, uuid\) from public, anon/i);
  assert.match(sql, /grant execute on function public\.pulse_items_v1\(integer, timestamptz, uuid\) to authenticated, service_role/i);
  assert.match(sql, /revoke all on function public\.pulse_mark_seen_v1\(timestamptz, uuid\) from public, anon/i);
});

test("E4 Pulse local smoke covers ranking, muted/private exclusions, pagination, and mark-seen", () => {
  const script = readSource("scripts/audits/e4_pulse_local_fixture_smoke_v1.mjs");

  assert.match(script, /pulse_items_v1\(2, null, null\)/);
  assert.match(script, /page_one_buckets\.join\(', '\)|page_one_buckets\.join\(','\)/);
  assert.match(script, /want_match,collector_activity/);
  assert.match(script, /completion bucket missing/);
  assert.match(script, /hard_cap_row_count/);
  assert.match(script, /pagination_overlap_count/);
  assert.match(script, /muted_event_visible/);
  assert.match(script, /private_event_visible/);
  assert.match(script, /pulse_unread_count_v1/);
  assert.match(script, /pulse_mark_seen_v1/);
  assert.match(script, /backwards_rejected/);
  assert.match(script, /rollback_only/);
});

test("E4 Pulse want-match rows carry contact anchors in payload", () => {
  const sql = readSource("supabase/migrations/20260708160000_product_evolution_e4_pulse_contact_payload_v1.sql");

  assert.match(sql, /create or replace function public\.pulse_items_v1/i);
  assert.match(sql, /left join public\.want_matches wm/i);
  assert.match(sql, /wm\.want_user_id = v_uid/i);
  assert.match(sql, /wm\.id = public\.pulse_jsonb_uuid_v1\(e\.payload ->> 'want_match_id'\)/i);
  assert.match(sql, /'vault_item_id', ranked\.contact_vault_item_id/i);
  assert.match(sql, /'instance_id', ranked\.contact_instance_id/i);
  assert.doesNotMatch(sql, /insert into public\.card_events/i);
  assert.doesNotMatch(sql, /insert into public\.notification_outbox/i);
});
