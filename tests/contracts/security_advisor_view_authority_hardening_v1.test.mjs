import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const SQL = fs.readFileSync(
  new URL(
    "../../supabase/migrations/20260807133000_security_advisor_view_authority_hardening_v1.sql",
    import.meta.url,
  ),
  "utf8",
);

const VIEWS = [
  "v_card_stream_v1",
  "v_wall_cards_v1",
  "v_section_cards_v1",
  "v_card_contact_targets_v1",
  "v_vault_mobile_pricing_targets_v1",
];

const FUNCTIONS = [
  "card_stream_rows_v2",
  "wall_card_rows_v2",
  "section_card_rows_v2",
  "card_contact_target_rows_for_current_viewer_v2",
  "vault_mobile_pricing_target_rows_for_current_user_v2",
];

test("all five advisor views become security-invoker compatibility contracts", () => {
  for (const view of VIEWS) {
    assert.match(
      SQL,
      new RegExp(
        `create or replace view public\\.${view}[\\s\\S]*?security_barrier = true, security_invoker = true`,
        "i",
      ),
    );
  }
  assert.doesNotMatch(SQL, /security_invoker\s*=\s*false/i);
});

test("every privileged projection has fixed search path and exact execute grants", () => {
  for (const functionName of FUNCTIONS) {
    assert.match(
      SQL,
      new RegExp(
        `create or replace function public\\.${functionName}\\(\\)[\\s\\S]*?security definer[\\s\\S]*?set search_path = pg_catalog, public`,
        "i",
      ),
    );
    assert.match(
      SQL,
      new RegExp(`revoke all on function public\\.${functionName}\\(\\)`, "i"),
    );
  }
});

test("public projections preserve explicit privacy predicates", () => {
  assert.match(SQL, /pp\.public_profile_enabled = true/i);
  assert.match(SQL, /pp\.vault_sharing_enabled = true/i);
  assert.match(SQL, /ws\.is_active = true/i);
  assert.match(
    SQL,
    /not public\.trust_block_exists_for_current_viewer_v1\(vii\.user_id\)/i,
  );
});

test("mobile pricing projection remains current-user-only", () => {
  assert.match(SQL, /where auth\.uid\(\) is not null/i);
  assert.match(SQL, /vii\.user_id = auth\.uid\(\)/i);
  assert.match(
    SQL,
    /grant execute on function public\.vault_mobile_pricing_target_rows_for_current_user_v2\(\)\s+to authenticated, service_role/i,
  );
  assert.doesNotMatch(
    SQL,
    /grant execute on function public\.vault_mobile_pricing_target_rows_for_current_user_v2\(\)\s+to[^;]*anon/i,
  );
});

test("migration preserves view names and does not grant or mutate base tables", () => {
  for (const view of VIEWS) {
    assert.match(SQL, new RegExp(`grant select on table public\\.${view}`, "i"));
  }
  assert.doesNotMatch(SQL, /grant\s+select[^;]*on\s+table\s+public\.vault_item_instances/i);
  assert.doesNotMatch(SQL, /\b(insert into|update|delete from|truncate)\s+public\./i);
  assert.doesNotMatch(SQL, /drop\s+(table|view)/i);
});
