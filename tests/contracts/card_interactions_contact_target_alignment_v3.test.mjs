import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const path =
  "supabase/migrations/20260803203000_card_interactions_contact_target_alignment_v3.sql";
const sql = fs.readFileSync(path, "utf8");

test("message insert authorization matches active public instance visibility", () => {
  assert.match(sql, /^-- CARD_INTERACTIONS_CONTACT_TARGET_ALIGNMENT_V3/m);
  assert.match(sql, /from public\.vault_item_instances vii/i);
  assert.match(sql, /vii\.legacy_vault_item_id = p_vault_item_id/i);
  assert.match(sql, /vii\.user_id = p_other_user_id/i);
  assert.match(
    sql,
    /coalesce\(vii\.card_print_id, sc\.card_print_id\) = p_card_print_id/i,
  );
  assert.match(sql, /vii\.archived_at is null/i);
  assert.match(sql, /pp\.public_profile_enabled = true/i);
  assert.match(sql, /pp\.vault_sharing_enabled = true/i);
  assert.doesNotMatch(sql, /vii\.intent/i);
});

test("alignment repair preserves trust and participant boundaries", () => {
  assert.match(sql, /auth\.uid\(\) is not null/i);
  assert.match(sql, /auth\.uid\(\) <> p_other_user_id/i);
  assert.match(
    sql,
    /not public\.trust_block_exists_between_v1\(auth\.uid\(\), p_other_user_id\)/i,
  );
  assert.match(sql, /from public\.card_interactions ci/i);
  assert.match(sql, /ci\.sender_user_id = auth\.uid\(\)/i);
  assert.match(sql, /ci\.receiver_user_id = auth\.uid\(\)/i);
  assert.match(sql, /security definer/i);
  assert.match(sql, /set search_path = pg_catalog, public/i);
  assert.match(sql, /notify pgrst, 'reload schema';/i);
});
