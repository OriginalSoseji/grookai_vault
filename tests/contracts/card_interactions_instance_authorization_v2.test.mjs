import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260801153800_card_interactions_instance_authorization_v2.sql";
const sql = fs.readFileSync(migrationPath, "utf8");

test("message authorization is transactional and preserves the authenticated boundary", () => {
  assert.match(sql, /^-- CARD_INTERACTIONS_INSTANCE_AUTHORIZATION_V2/m);
  assert.match(sql, /begin;/i);
  assert.match(sql, /commit;/i);
  assert.match(sql, /security definer/i);
  assert.match(sql, /set search_path = pg_catalog, public/i);
  assert.match(sql, /auth\.uid\(\) is not null/i);
  assert.match(sql, /auth\.uid\(\) <> p_other_user_id/i);
  assert.match(
    sql,
    /not public\.trust_block_exists_between_v1\(auth\.uid\(\), p_other_user_id\)/i,
  );
  assert.match(
    sql,
    /revoke all on function public\.card_interaction_insert_authorized_v2\(uuid, uuid, uuid\)[\s\S]*from public, anon, authenticated/i,
  );
  assert.match(
    sql,
    /grant execute on function public\.card_interaction_insert_authorized_v2\(uuid, uuid, uuid\)[\s\S]*to authenticated, service_role/i,
  );
});

test("new messages use active instance contact state instead of legacy vault bucket intent", () => {
  assert.match(sql, /from public\.vault_item_instances vii/i);
  assert.match(sql, /vii\.legacy_vault_item_id = p_vault_item_id/i);
  assert.match(sql, /vii\.user_id = p_other_user_id/i);
  assert.match(
    sql,
    /coalesce\(vii\.card_print_id, sc\.card_print_id\) = p_card_print_id/i,
  );
  assert.match(sql, /vii\.archived_at is null/i);
  assert.match(sql, /vii\.intent in \('trade', 'sell', 'showcase'\)/i);
  assert.match(sql, /pp\.public_profile_enabled = true/i);
  assert.match(sql, /pp\.vault_sharing_enabled = true/i);
  assert.doesNotMatch(sql, /from public\.vault_items\s+vi/i);
  assert.doesNotMatch(sql, /vi\.intent/i);
});

test("existing participants can reply while unrelated collectors remain denied", () => {
  assert.match(sql, /from public\.card_interactions ci/i);
  assert.match(sql, /ci\.vault_item_id = p_vault_item_id/i);
  assert.match(sql, /ci\.card_print_id = p_card_print_id/i);
  assert.match(
    sql,
    /ci\.sender_user_id = auth\.uid\(\)[\s\S]*ci\.receiver_user_id = p_other_user_id/i,
  );
  assert.match(
    sql,
    /ci\.sender_user_id = p_other_user_id[\s\S]*ci\.receiver_user_id = auth\.uid\(\)/i,
  );
});

test("card interaction RLS binds the inserted sender to the current viewer", () => {
  assert.match(sql, /drop policy if exists card_interactions_insert_sender/i);
  assert.match(sql, /create policy card_interactions_insert_sender/i);
  assert.match(sql, /for insert\s+to authenticated/i);
  assert.match(sql, /auth\.uid\(\) = sender_user_id/i);
  assert.match(
    sql,
    /public\.card_interaction_insert_authorized_v2\(\s*vault_item_id,\s*card_print_id,\s*receiver_user_id\s*\)/i,
  );
  assert.match(sql, /notify pgrst, 'reload schema';/i);
});
