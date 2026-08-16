import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260816050000_catalog_release_definer_boundary_v1.sql";
const migration = fs.readFileSync(migrationPath, "utf8");
const cardLoader = fs.readFileSync(
  "apps/web/src/lib/getPublicCardByGvId.ts",
  "utf8",
);

test("catalog definer repair is one transactional read-model migration", () => {
  assert.match(migration, /^-- CATALOG_RELEASE_DEFINER_BOUNDARY_V1/m);
  assert.match(migration, /begin;/i);
  assert.match(migration, /commit;/i);
  assert.match(migration, /notify pgrst, 'reload schema';/i);
  assert.doesNotMatch(
    migration,
    /\b(insert into|update\s+public\.|delete from|truncate table|drop table|create table|alter table)\b/i,
  );
});

test("public card traits use a release-aware RPC instead of a service-only embed", () => {
  assert.match(
    migration,
    /create or replace function public\.card_print_public_traits_v1\(/i,
  );
  assert.match(
    migration,
    /where traits\.card_print_id = p_card_print_id[\s\S]*catalog_card_print_visible_to_request_v1\(p_card_print_id\)/i,
  );
  assert.doesNotMatch(cardLoader, /card_print_traits\s*\(/);
  assert.match(cardLoader, /\.rpc\("card_print_public_traits_v1"/);
});

test("anonymous feed and wall functions wrap revoked internal projections", () => {
  for (const functionName of [
    "card_stream_rows",
    "wall_card_rows",
    "section_card_rows",
  ]) {
    assert.match(
      migration,
      new RegExp(
        `alter function public\\.${functionName}_v2\\(\\)\\s+rename to ${functionName}_unfiltered_internal_v2`,
        "i",
      ),
    );
    assert.match(
      migration,
      new RegExp(
        `revoke all on function public\\.${functionName}_unfiltered_internal_v2\\(\\)[\\s\\S]*?from public, anon, authenticated, service_role`,
        "i",
      ),
    );
    assert.match(
      migration,
      new RegExp(
        `create function public\\.${functionName}_v2\\(\\)[\\s\\S]*?catalog_card_print_visible_to_request_v1\\(source\\.card_print_id\\)`,
        "i",
      ),
    );
  }
});

test("public vault and Journey reads are gated inside their definer wrappers", () => {
  assert.match(
    migration,
    /create function public\.public_vault_instance_detail_v1\([\s\S]*?catalog_card_print_visible_to_request_v1\([\s\S]*?public_vault_instance_detail_unfiltered_internal_v1/i,
  );
  assert.match(
    migration,
    /create function public\.card_journey_public_counts_v1\([\s\S]*?catalog_card_print_visible_to_request_v1\(source\.card_print_id\)/i,
  );
});

test("nested Binder projections cannot expose hidden cards or set targets", () => {
  for (const functionName of [
    "binder_target_enabled_v1",
    "binder_card_json_v1",
    "binder_target_json_v1",
    "binder_slot_rows_v1",
  ]) {
    assert.match(
      migration,
      new RegExp(
        `create or replace function public\\.${functionName}\\([\\s\\S]*?catalog_(?:card_print|game)_visible_to_request_v1`,
        "i",
      ),
    );
  }
});
