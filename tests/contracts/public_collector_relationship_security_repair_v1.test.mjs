import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260804203000_public_collector_relationship_security_repair_v1.sql";
const migration = fs.readFileSync(migrationPath, "utf8");
const service = fs.readFileSync(
  "lib/services/public/public_collector_service.dart",
  "utf8",
);
const screen = fs.readFileSync(
  "lib/screens/public_collector/public_collector_screen.dart",
  "utf8",
);

test("public relationship reads restore a bounded definer boundary", () => {
  assert.match(
    migration,
    /^-- PUBLIC_COLLECTOR_RELATIONSHIP_SECURITY_REPAIR_V1/m,
  );
  assert.equal((migration.match(/security definer/gi) ?? []).length, 2);
  assert.equal((migration.match(/set search_path = ''/gi) ?? []).length, 2);
  assert.match(migration, /public_profile_enabled = true/);
  assert.match(migration, /or auth\.uid\(\) = p_user_id/);
  assert.match(migration, /revoke all on function[\s\S]*from public/i);
  assert.match(migration, /grant execute on function[\s\S]*to anon/i);
  assert.match(migration, /grant execute on function[\s\S]*to authenticated/i);
});

test("count RPC returns only aggregate relationship truth", () => {
  const countFunction = migration.match(
    /create or replace function public\.public_collector_follow_counts_v1[\s\S]*?\$\$;/i,
  )?.[0];

  assert.ok(countFunction);
  assert.match(countFunction, /count\(\*\)::bigint/);
  assert.match(countFunction, /cf\.follower_user_id = p_user_id/);
  assert.match(countFunction, /cf\.followed_user_id = p_user_id/);
  assert.doesNotMatch(countFunction, /select\s+cf\.\*/i);
  assert.doesNotMatch(countFunction, /insert|update|delete/i);
});

test("relationship rows expose only public related profiles", () => {
  const rowFunction = migration.match(
    /create or replace function public\.public_collector_relationship_rows_v1[\s\S]*?\$\$;/i,
  )?.[0];

  assert.ok(rowFunction);
  assert.match(rowFunction, /related_profile\.public_profile_enabled = true/);
  assert.match(rowFunction, /when n\.mode = 'followers'/);
  assert.match(rowFunction, /when 'followers' then 'followers'/);
  assert.match(rowFunction, /when 'following' then 'following'/);
  assert.doesNotMatch(rowFunction, /email|phone|bio|location/i);
  assert.doesNotMatch(rowFunction, /insert|update|delete/i);
});

test("Flutter continues to consume the repaired RPCs", () => {
  assert.match(service, /'public_collector_follow_counts_v1'/);
  assert.match(service, /'public_collector_relationship_rows_v1'/);
  assert.match(service, /followerCount: _toCount\(row\['follower_count'\]\)/);
  assert.match(service, /followingCount: _toCount\(row\['following_count'\]\)/);
});

test("public profile uses correct singular follower copy", () => {
  assert.match(
    screen,
    /profile\.followerCount == 1 \? 'follower' : 'followers'/,
  );
  assert.doesNotMatch(screen, /label: '\$\{profile\.followerCount\} followers'/);
});
