import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync(
  "supabase/migrations/20260816030000_sealed_product_release_qualification_binding_v1.sql",
  "utf8",
);

test("release members are database-bound to qualified exact evidence", () => {
  assert.match(migration, /add column qualification_id uuid/i);
  assert.match(migration, /qualification_status text not null default 'qualified_exact'/i);
  assert.match(migration, /check \(qualification_status = 'qualified_exact'\)/i);
  assert.match(migration, /sealed_product_release_members_qualification_binding_fk/i);
  assert.match(migration, /references public\.sealed_product_pricing_lane_qualifications/i);
  assert.match(migration, /alter column qualification_id set not null/i);
});

test("governed read model requires an active frozen release and exact binding", () => {
  assert.match(migration, /join public\.sealed_product_releases release[\s\S]*release\.release_state = 'frozen'/i);
  assert.match(migration, /qualification\.id = member\.qualification_id/i);
  assert.match(migration, /qualification\.qualification_status = member\.qualification_status/i);
  assert.match(migration, /catalog_game_visible_to_request_v1\(family\.game_key\)/i);
  assert.match(migration, /market_price/i);
});

test("read model is bounded and unavailable to anonymous requests", () => {
  assert.match(migration, /limit least\(greatest\(coalesce\(p_limit, 50\), 1\), 100\)/i);
  assert.match(migration, /revoke all on function[\s\S]*from public, anon, authenticated, service_role/i);
  assert.match(migration, /grant execute on function[\s\S]*to authenticated, service_role/i);
  assert.doesNotMatch(migration, /grant execute[\s\S]*to anon/i);
});

test("migration is atomic and contains no data mutation", () => {
  assert.match(migration, /^\s*--[\s\S]*\bbegin\s*;/i);
  assert.match(migration, /commit\s*;\s*$/i);
  assert.doesNotMatch(migration, /\b(insert into|update|delete from|truncate)\b/i);
});
