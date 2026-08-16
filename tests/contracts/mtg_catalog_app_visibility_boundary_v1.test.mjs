import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const sql = fs.readFileSync(
  new URL(
    "../../supabase/migrations/20260813200000_mtg_catalog_app_visibility_boundary_v1.sql",
    import.meta.url,
  ),
  "utf8",
);

test("MTG visibility boundary is transactional and hidden by default", () => {
  assert.match(sql, /^\s*--[\s\S]*?\bbegin;/i);
  assert.match(sql, /'mtg'[\s\S]*?'hidden'[\s\S]*?'MTG_CATALOG_APP_VISIBILITY_BOUNDARY_V1'/i);
  assert.match(sql, /release_status in \('hidden', 'signed_in', 'public'\)/i);
  assert.match(sql, /\bcommit;\s*$/i);
});

test("non-Pokemon catalog tables receive restrictive release policies", () => {
  for (const table of ["games", "sets", "card_prints", "card_print_identity", "card_printings"]) {
    assert.match(
      sql,
      new RegExp(`create policy [\\s\\S]*?on public\\.${table}[\\s\\S]*?as restrictive`, "i"),
    );
  }
});

test("security-definer print search is wrapped by the visibility check", () => {
  assert.match(sql, /rename to search_print_identity_unfiltered_internal_v1/i);
  assert.match(sql, /revoke all on function public\.search_print_identity_unfiltered_internal_v1/i);
  assert.match(sql, /catalog_parent_gv_id_visible_to_request_v1\(result\.parent_gv_id\)/i);
});

test("release control remains service-owned", () => {
  assert.match(
    sql,
    /revoke all on table public\.catalog_game_release_controls from public, anon, authenticated/i,
  );
  assert.match(
    sql,
    /grant select, insert, update on table public\.catalog_game_release_controls to service_role/i,
  );
  assert.doesNotMatch(sql, /grant[^;]*catalog_game_release_controls[^;]*to anon/i);
  assert.doesNotMatch(sql, /grant[^;]*catalog_game_release_controls[^;]*to authenticated/i);
});
