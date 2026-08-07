import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const sql = fs.readFileSync(
  "supabase/migrations/20260807023000_card_interactions_exact_instance_authorization_v2.sql",
  "utf8",
);

test("exact interaction identity records the contacted vault instance without inference", () => {
  assert.match(sql, /^-- CARD_INTERACTIONS_EXACT_INSTANCE_AUTHORIZATION_V2/m);
  assert.match(
    sql,
    /add column if not exists vault_item_instance_id uuid[\s\S]*references public\.vault_item_instances\(id\) on delete set null/i,
  );
  assert.doesNotMatch(
    sql,
    /update\s+public\.card_interactions[\s\S]*vault_item_instance_id/i,
  );
});

test("database trigger binds instance, bucket, owner, parent, and exact printing", () => {
  assert.match(sql, /into new\.vault_item_instance_id/i);
  assert.match(sql, /vii\.user_id = new\.receiver_user_id/i);
  assert.match(sql, /order by vii\.created_at desc, vii\.id desc/i);
  assert.match(sql, /v_existing_legacy_thread/i);
  assert.match(sql, /vii\.id = new\.vault_item_instance_id/i);
  assert.match(sql, /vii\.legacy_vault_item_id = new\.vault_item_id/i);
  assert.match(
    sql,
    /vii\.user_id in \(new\.sender_user_id, new\.receiver_user_id\)/i,
  );
  assert.match(
    sql,
    /coalesce\(vii\.card_print_id, sc\.card_print_id\) = new\.card_print_id/i,
  );
  assert.match(
    sql,
    /vii\.card_printing_id is not distinct from new\.card_printing_id/i,
  );
  assert.match(sql, /card_interaction_vault_instance_identity_mismatch/i);
});

test("new-thread authorization requires the owner's visible matching instance tuple", () => {
  assert.match(sql, /card_interaction_insert_authorized_v4/i);
  assert.match(sql, /vii\.id = p_vault_item_instance_id/i);
  assert.match(sql, /p_vault_item_instance_id is not null/i);
  assert.match(sql, /vii\.user_id = p_other_user_id/i);
  assert.match(
    sql,
    /vii\.card_printing_id is not distinct from p_card_printing_id/i,
  );
  assert.match(sql, /vii\.archived_at is null/i);
  assert.match(sql, /pp\.public_profile_enabled = true/i);
  assert.match(sql, /pp\.vault_sharing_enabled = true/i);
});

test("reply authorization preserves the established instance and printing tuple", () => {
  assert.match(sql, /from public\.card_interactions ci/i);
  assert.match(
    sql,
    /ci\.vault_item_instance_id is not distinct from p_vault_item_instance_id/i,
  );
  assert.match(
    sql,
    /ci\.card_printing_id is not distinct from p_card_printing_id/i,
  );
  assert.match(
    sql,
    /public\.card_interaction_insert_authorized_v4\(\s*vault_item_instance_id,\s*vault_item_id,\s*card_print_id,\s*card_printing_id,\s*receiver_user_id\s*\)/i,
  );
  assert.match(
    sql,
    /revoke all on function public\.card_interaction_insert_authorized_v2\(uuid, uuid, uuid\)[\s\S]*from authenticated, service_role/i,
  );
});
