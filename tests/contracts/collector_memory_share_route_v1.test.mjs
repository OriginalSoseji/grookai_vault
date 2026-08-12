import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync(
  "supabase/migrations/20260811213000_collector_memory_share_route_v1.sql",
  "utf8",
);
const shareScreen = fs.readFileSync(
  "lib/screens/grookai_objects/collector_memory_detail_screen.dart",
  "utf8",
);
const webRoute = fs.readFileSync(
  "apps/web/src/app/memory/[memory_id]/page.tsx",
  "utf8",
);

test("Memory share route is authenticated and does not expose a direct table read", () => {
  assert.match(migration, /collector_memory_accessible_by_id_v1\(\s*p_memory_id uuid/i);
  assert.match(migration, /security definer/i);
  assert.match(migration, /revoke all[\s\S]*from public, anon/i);
  assert.match(migration, /grant execute[\s\S]*to authenticated/i);
});

test("owner access and public viewer access remain distinct", () => {
  assert.match(migration, /cm\.user_id = auth\.uid\(\)/i);
  assert.match(migration, /cm\.is_public is true/i);
  assert.match(migration, /cm\.publication_event_id = publication_event\.id/i);
  assert.match(migration, /interest_graph_collectors_visible_to_viewer_v1\(/i);
  assert.match(migration, /viewer_is_owner/i);
});

test("public route requires exact current publication evidence", () => {
  assert.match(migration, /publication_event\.event_type = 'collector_memory_published'/i);
  assert.match(migration, /publication_event\.card_print_id = vii\.card_print_id/i);
  assert.match(migration, /publication_event\.payload ->> 'memory_id'/i);
  assert.match(migration, /publication_event\.payload ->> 'publication_version'/i);
  assert.match(migration, /cm\.archived_at is null/i);
});

test("share identity is the Memory and web does not substitute the card", () => {
  assert.match(shareScreen, /\/memory\/\$\{Uri\.encodeComponent\(item\.memory\.id\)\}/);
  assert.doesNotMatch(shareScreen, /final path = gvId/);
  assert.match(webRoute, /collector_memory_accessible_by_id_v1/);
  assert.match(webRoute, /Memory unavailable|notFound\(\)/);
  assert.match(webRoute, /requireServerUser\(currentPath\)/);
});
