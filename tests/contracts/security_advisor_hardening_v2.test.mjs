import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("security hardening makes internal relations service-only", () => {
  const sql = read(
    "supabase/migrations/20260730193000_security_advisor_hardening_v2.sql",
  );

  assert.match(
    sql,
    /alter table public\.external_mapping_aliases enable row level security/i,
  );
  assert.match(
    sql,
    /revoke all on table public\.external_mapping_aliases\s+from public, anon, authenticated/i,
  );
  assert.match(sql, /external_mapping_aliases_service_role_all/i);
  assert.match(
    sql,
    /alter view public\.v_market_evidence_lifecycle_current_v1\s+set \(security_invoker = true\)/i,
  );
  assert.match(
    sql,
    /revoke all on table public\.v_market_evidence_lifecycle_current_v1\s+from public, anon, authenticated/i,
  );
});

test("security hardening fixes mutable search paths and RPC grants", () => {
  const sql = read(
    "supabase/migrations/20260730193000_security_advisor_hardening_v2.sql",
  );

  for (const signature of [
    "card_events_block_mutation_v1\\(\\)",
    "card_events_emit_failures_block_mutation_v1\\(\\)",
    "interest_graph_watch_rank_v1\\(text\\)",
    "interest_graph_watch_strength_v1\\(text\\)",
    "normalize_market_evidence_finish_key_v1\\(text\\)",
    "normalize_tcgplayer_market_subtype_v1\\(text\\)",
    "set_card_printing_truth_reviews_updated_at_v1\\(\\)",
    "set_master_identity_graph_jpn_review_tables_updated_at_v1\\(\\)",
  ]) {
    assert.match(
      sql,
      new RegExp(`alter function public\\.${signature}\\s+set search_path = pg_catalog`, "i"),
    );
  }

  for (const internalFunction of [
    "notification_dispatcher_claim_batch_v1",
    "notification_dispatcher_mark_sent_v1",
    "notification_log_emit_failure_v1",
    "interest_graph_vault_instance_after_insert_v1",
  ]) {
    assert.match(sql, new RegExp(`'${internalFunction}'`));
  }

  for (const authenticatedFunction of [
    "mark_notification_tapped_v1",
    "notification_disable_device_token_v1",
    "notification_register_device_token_v1",
  ]) {
    assert.match(sql, new RegExp(`'${authenticatedFunction}'`));
  }

  assert.match(
    sql,
    /revoke execute on function %s from public, anon, authenticated/i,
  );
  assert.match(
    sql,
    /grant execute on function %s to authenticated, service_role/i,
  );
});

test("vault wall repair uses current vault_items columns and remains service-only", () => {
  const sql = read(
    "supabase/migrations/20260730194000_vault_post_to_wall_schema_repair_v1.sql",
  );

  assert.match(sql, /vi\.card_id/);
  assert.match(sql, /vi\.condition_label/);
  assert.match(sql, /vi\.user_id = v_uid/);
  assert.match(sql, /vi\.archived_at is null/);
  assert.doesNotMatch(sql, /vi\.card_print_id/);
  assert.doesNotMatch(sql, /vi\.owner_id/);
  assert.doesNotMatch(sql, /vi\.condition_tier/);
  assert.match(
    sql,
    /from public, anon, authenticated/i,
  );
  assert.match(sql, /to service_role/i);
});
