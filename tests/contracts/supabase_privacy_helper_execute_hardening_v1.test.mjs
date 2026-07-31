import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260731210500_security_advisor_privacy_helper_execute_hardening_v1.sql";
const sql = fs.readFileSync(migrationPath, "utf8");

const helpers = [
  "card_events_resolve_visibility_v1\\(text, uuid, text, jsonb\\)",
  "interest_graph_collector_public_v1\\(uuid\\)",
  "interest_graph_collectors_visible_to_viewer_v1\\(uuid, uuid, uuid\\)",
  "interest_graph_card_event_visible_to_viewer_v1\\(uuid, uuid, uuid, text\\)",
  "trust_block_exists_between_v1\\(uuid, uuid\\)",
];

test("privacy helper hardening is one transactional authority-only migration", () => {
  assert.match(sql, /^-- SECURITY_ADVISOR_PRIVACY_HELPER_EXECUTE_HARDENING_V1/m);
  assert.match(sql, /begin;/i);
  assert.match(sql, /commit;/i);
  assert.match(sql, /notify pgrst, 'reload schema';/i);
  assert.doesNotMatch(sql, /\b(insert|update|delete|truncate|drop|create table|alter table)\b/i);
});

test("all five privacy helpers deny anonymous direct execution and retain governed roles", () => {
  for (const helper of helpers) {
    assert.match(
      sql,
      new RegExp(`revoke execute on function public\\.${helper}\\s+from public, anon;`, "i"),
    );
    assert.match(
      sql,
      new RegExp(`grant execute on function public\\.${helper}\\s+to authenticated, service_role;`, "i"),
    );
  }
});

test("contact-target view removes its anonymous helper dependency without changing its contract", () => {
  assert.match(
    sql,
    /create or replace function public\.trust_block_exists_for_current_viewer_v1\(\s*p_other_user_id uuid\s*\)/i,
  );
  assert.match(sql, /when auth\.uid\(\) is null then false/i);
  assert.match(
    sql,
    /else public\.trust_block_exists_between_v1\(auth\.uid\(\), p_other_user_id\)/i,
  );
  assert.match(
    sql,
    /grant execute on function public\.trust_block_exists_for_current_viewer_v1\(uuid\)\s+to anon, authenticated, service_role/i,
  );
  assert.match(sql, /create or replace view public\.v_card_contact_targets_v1 as/i);
  assert.match(
    sql,
    /not public\.trust_block_exists_for_current_viewer_v1\(vii\.user_id\)/i,
  );
  assert.match(sql, /alter view public\.v_card_contact_targets_v1 set \(security_invoker = false\)/i);
  assert.match(sql, /grant select on table public\.v_card_contact_targets_v1 to anon, authenticated/i);
});

test("other public product RPCs and views are outside this narrow migration", () => {
  for (const publicBoundary of [
    "binder_explore_v1",
    "binder_public_detail_v1",
    "card_journey_public_counts_v1",
    "public_vault_instance_detail_v1",
    "search_print_identity_v1",
    "v_card_stream_v1",
    "v_section_cards_v1",
    "v_wall_cards_v1",
  ]) {
    assert.doesNotMatch(sql, new RegExp(`(?:revoke|alter|create|drop)[^;]*${publicBoundary}`, "i"));
  }
});
