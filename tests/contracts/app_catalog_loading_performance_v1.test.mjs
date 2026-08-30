import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function source(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("populated set catalog is release-aware and computed as one set-based read", () => {
  const sql = source(
    "supabase/migrations/20260830193000_public_catalog_sets_performance_v2.sql",
  );

  assert.match(sql, /^\s*--[\s\S]*?\bbegin;/i);
  assert.match(sql, /\bcommit;\s*$/i);
  assert.match(sql, /get_public_catalog_sets_v2/i);
  assert.match(sql, /visible_sets as materialized/i);
  assert.match(sql, /visible_card_counts as materialized/i);
  assert.match(sql, /catalog_set_release_controls/i);
  assert.match(sql, /catalog_game_release_controls/i);
  assert.match(sql, /request_role in \('authenticated', 'service_role'\)/i);
  assert.match(sql, /join visible_sets visible_set\s+on visible_set\.id = card\.set_id/i);
  assert.doesNotMatch(sql, /catalog_card_print_visible_to_request_v1\(card\.id\)/i);
  assert.match(
    sql,
    /grant execute on function public\.get_public_catalog_sets_v2\(text\)\s+to anon, authenticated, service_role/i,
  );
});

test("Flutter Sets uses the populated catalog RPC with bounded compatibility and cache", () => {
  const service = source("lib/services/public/public_sets_service.dart");
  const screen = source("lib/screens/sets/public_sets_screen.dart");

  assert.match(service, /get_public_catalog_sets_v2/);
  assert.match(service, /_setCountChunkSize = 200/);
  assert.match(service, /_setCatalogCacheTtl = Duration\(minutes: 5\)/);
  assert.match(service, /bool forceRefresh = false/);
  assert.match(service, /error\.code != 'PGRST202'/);
  assert.match(screen, /_load\(\{bool forceRefresh = false\}\)/);
  assert.match(screen, /_load\(forceRefresh: true\)/);
});

test("canonical public images resolve release authority in the card lookup", () => {
  const route = source("apps/web/src/app/api/canon/cards/[gv_id]/image/route.ts");

  assert.match(route, /catalog_set_release_controls\(release_status\)/);
  assert.match(route, /catalog_game_release_controls\(release_status\)/);
  assert.match(route, /function catalogImageAccess/);
  assert.match(route, /if \(gameCode === "pokemon"\)/);
  assert.match(route, /requestIsAuthenticated/);
  assert.doesNotMatch(route, /\.rpc\(\s*"catalog_card_print_visible_to_request_v1"/);
});

test("Wall metadata and public-safe wall content load concurrently", () => {
  const service = source("lib/services/public/public_collector_service.dart");

  assert.match(
    service,
    /initialResults = await Future\.wait<dynamic>\(\[\s*loadPublicProfileBySlug[\s\S]*?loadCollectorWallViewBySlug/,
  );
});
