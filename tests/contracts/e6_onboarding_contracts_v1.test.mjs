import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

function readSource(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("E6 PR1 creates onboarding state/events, owner RLS, and authenticated RPCs", () => {
  const sql = readSource("supabase/migrations/20260709100000_product_evolution_e6_onboarding_contracts_v1.sql");

  assert.match(sql, /create table if not exists public\.onboarding_ladder_state/i);
  assert.match(sql, /create table if not exists public\.onboarding_ladder_events/i);
  assert.match(sql, /alter table public\.onboarding_ladder_state enable row level security/i);
  assert.match(sql, /alter table public\.onboarding_ladder_events enable row level security/i);
  assert.match(sql, /create policy onboarding_ladder_state_owner_select/i);
  assert.match(sql, /using \(user_id = auth\.uid\(\)\)/i);
  assert.match(sql, /create policy onboarding_ladder_events_owner_select/i);
  assert.match(sql, /onboarding_ladder_events is append-only/i);
  assert.match(sql, /revoke all on function public\.onboarding_ladder_state_v1\(\) from public, anon/i);
  assert.match(sql, /revoke all on function public\.onboarding_record_rung_v1\(text, uuid, uuid, text, jsonb\) from public, anon/i);
  assert.match(sql, /revoke all on function public\.onboarding_skip_v1\(text\) from public, anon/i);
  assert.match(sql, /grant execute on function public\.onboarding_ladder_state_v1\(\) to authenticated, service_role/i);
});

test("E6 PR1 bootstraps existing owned/wanted state and records idempotent rung events", () => {
  const sql = readSource("supabase/migrations/20260709100000_product_evolution_e6_onboarding_contracts_v1.sql");

  assert.match(sql, /from public\.vault_item_instances vii/i);
  assert.match(sql, /vii\.archived_at is null/i);
  assert.match(sql, /from public\.wishlist_items wi/i);
  assert.match(sql, /from public\.collector_follows cf/i);
  assert.match(sql, /create or replace function public\.onboarding_record_rung_v1/i);
  assert.match(sql, /canonical_wishlist_item_required/i);
  assert.match(sql, /collector_follow_required/i);
  assert.match(sql, /on conflict \(dedupe_key\) where dedupe_key is not null do nothing/i);
});

test("E6 PR1 bridges existing user_card_intents wants into canonical wishlist_items", () => {
  const sql = readSource("supabase/migrations/20260709100000_product_evolution_e6_onboarding_contracts_v1.sql");

  assert.match(sql, /create or replace function public\.onboarding_sync_user_card_intent_wishlist_v1/i);
  assert.match(sql, /after insert or update or delete on public\.user_card_intents/i);
  assert.match(sql, /insert into public\.wishlist_items/i);
  assert.match(sql, /on conflict \(user_id, card_id\) do nothing/i);
  assert.match(sql, /delete from public\.wishlist_items wi/i);
  assert.match(sql, /from public\.user_card_intents uci/i);
  assert.match(sql, /where uci\.want is true/i);
  assert.match(sql, /interest_graph_log_emit_failure_v1/i);
});

test("E6 PR1 stays out of pricing and identity surfaces", () => {
  const sql = readSource("supabase/migrations/20260709100000_product_evolution_e6_onboarding_contracts_v1.sql");

  assert.doesNotMatch(sql, /insert into public\.[a-z_]*pricing/i);
  assert.doesNotMatch(sql, /update public\.[a-z_]*pricing/i);
  assert.doesNotMatch(sql, /delete from public\.[a-z_]*pricing/i);
  assert.doesNotMatch(sql, /insert into public\.card_print_identity/i);
  assert.doesNotMatch(sql, /update public\.card_print_identity/i);
  assert.doesNotMatch(sql, /delete from public\.card_print_identity/i);
});

test("E6 plan records the approved amendments in-body", () => {
  const plan = readSource("docs/plans/product_evolution/E6_PLAN.md");

  assert.match(plan, /uses the bridge approach/i);
  assert.match(plan, /PR 4 UI is design-gated/i);
  assert.match(plan, /first Feed\/Search landing/i);
  assert.match(plan, /owned \+ wanted but no follows see collector suggestions only/i);
  assert.match(plan, /either participant's first card message/i);
});

test("E6 local fixture smoke covers RLS, bootstrap, bridge, and idempotency gates", () => {
  const script = readSource("scripts/audits/e6_onboarding_local_fixture_smoke_v1.mjs");

  assert.match(script, /anon select onboarding_ladder_state/);
  assert.match(script, /anon call onboarding_ladder_state_v1/);
  assert.match(script, /user A insert state for user B/);
  assert.match(script, /user A insert event for user B/);
  assert.match(script, /user A update own event denied/);
  assert.match(script, /user A delete own event denied/);
  assert.match(script, /wishlist_rows_after_want/);
  assert.match(script, /want_watch_rows_after_want/);
  assert.match(script, /want_added_events_after_repeat_true/);
  assert.match(script, /rung_1_wanted_event_rows_after_duplicate_calls/);
  assert.match(script, /bootstrap_suggestions_only_for_owned_wanted_no_follow/);
});
