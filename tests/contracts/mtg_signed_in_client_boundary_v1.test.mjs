import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function source(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("web exposes MTG as an explicit collector catalog scope", () => {
  const gameScope = source("apps/web/src/lib/publicGameScope.ts");
  const explore = source("apps/web/src/components/explore/ExplorePageClient.tsx");

  assert.match(gameScope, /"pokemon" \| "one_piece" \| "mtg"/);
  assert.match(gameScope, /value: "mtg", label: "Magic: The Gathering"/);
  assert.match(explore, /PUBLIC_GAME_SCOPE_OPTIONS/);
  assert.match(explore, /aria-label="Game scope"/);
  assert.match(explore, /params\.set\("game", gameScope\)/);
});

test("MTG search is signed-in, game-scoped, and bypasses Pokemon resolution", () => {
  const route = source("apps/web/src/app/api/resolver/search/route.ts");
  const lookup = source("apps/web/src/lib/explore/getExploreRows.ts");
  const migrationV1 = source(
    "supabase/migrations/20260822203000_game_scoped_card_search_v1.sql",
  );
  const migrationV2 = source(
    "supabase/migrations/20260822210000_game_scoped_card_search_suppression_guard_v2.sql",
  );
  const migrationV3 = source(
    "supabase/migrations/20260822230000_cross_tcg_card_search_v3.sql",
  );
  const migrationV4 = source(
    "supabase/migrations/20260823074000_cross_tcg_direct_gvid_search_v4.sql",
  );

  assert.match(route, /gameScope !== "pokemon" && !userId/);
  assert.match(route, /Sign in to search this catalog/);
  assert.match(route, /getExploreRowsForGameScopedTextSearch/);
  assert.match(route, /includeProvisional =\s*gameScope === "pokemon"/);
  assert.match(route, /game_scope: gameScope/);
  assert.match(lookup, /\.rpc\("search_game_card_prints_v4"/);
  assert.match(lookup, /game_code_in: gameScope/);
  assert.match(lookup, /language_scope_in:/);
  assert.match(lookup, /limit_in: SEARCH_LIMIT/);
  assert.match(lookup, /canUseBoundedGameRpc/);
  assert.match(lookup, /const directGvIdSearch = searchText\.toUpperCase\(\)\.startsWith\("GV-"\)/);
  assert.doesNotMatch(
    lookup.slice(
      lookup.indexOf("const canUseBoundedGameRpc"),
      lookup.indexOf("if (canUseBoundedGameRpc)"),
    ),
    /!directGvIdSearch/,
  );
  assert.match(lookup, /\.eq\("game_id", gameId\)/);
  assert.match(lookup, /\.eq\("code", gameScope\)/);
  assert.match(lookup, /\.ilike\("set_code", releaseSetChunk\)/);
  assert.match(lookup, /return nameMatches && collectorMatches && illustratorMatches && identityMatches/);
  assert.match(route, /exactReleaseYear,/);
  assert.match(route, /exactIllustrator,/);
  assert.match(route, /releaseYearMin: effectiveSmartSearchIntent\.releaseYearMin/);
  assert.match(route, /finishKeys: effectiveSmartSearchIntent\.finishKeys/);
  assert.match(lookup, /fetchSmartDiscoveryChildRows\(\{ \.\.\.options, sortMode \}, parentRows\)/);
  assert.match(lookup, /\.replace\(\/\^#\//);
  assert.match(lookup, /\.split\("\/", 1\)/);
  assert.match(migrationV1, /security definer/i);
  assert.match(migrationV1, /catalog_game_visible_to_request_v1\(game\.code\)/);
  assert.match(migrationV1, /least\(greatest\(coalesce\(limit_in, 50\), 1\), 64\)/);
  assert.match(
    migrationV1,
    /join public\.card_prints card on card\.game_id = scope\.game_id/,
  );
  assert.match(
    migrationV1,
    /grant execute[\s\S]*to anon, authenticated, service_role/i,
  );
  assert.match(migrationV2, /security definer/i);
  assert.match(migrationV2, /search_game_card_prints_v1\(/i);
  assert.match(migrationV2, /catalog_game_visible_to_request_v1\(game_code_in\)/i);
  assert.match(
    migrationV2,
    /data_quality_flags\s*#>>\s*'\{app_visibility_v1,status\}'/i,
  );
  assert.match(migrationV2, /<> 'suppressed'/i);
  assert.match(
    migrationV2,
    /revoke all on function public\.search_game_card_prints_v1[\s\S]*from public, anon, authenticated, service_role/i,
  );
  assert.match(
    migrationV2,
    /grant execute on function public\.search_game_card_prints_v2[\s\S]*to anon, authenticated, service_role/i,
  );
  assert.match(migrationV3, /security definer/i);
  assert.match(migrationV3, /catalog_game_visible_to_request_v1\(game\.code\)/i);
  assert.match(migrationV3, /scope\.language_scope = 'ja'/i);
  assert.match(migrationV3, /scope\.language_scope = 'en'/i);
  assert.match(
    migrationV3,
    /data_quality_flags\s*#>>\s*'\{app_visibility_v1,status\}'/i,
  );
  assert.match(
    migrationV3,
    /grant execute on function public\.search_game_card_prints_v3[\s\S]*to anon, authenticated, service_role/i,
  );
  assert.match(migrationV4, /security definer/i);
  assert.match(migrationV4, /search_game_card_prints_v3\(/i);
  assert.match(migrationV4, /lower\(card\.gv_id\) = lower\(v_query\)/i);
  assert.match(migrationV4, /catalog_game_visible_to_request_v1\(game\.code\)/i);
  assert.match(
    migrationV4,
    /grant execute on function public\.search_game_card_prints_v4[\s\S]*to anon, authenticated, service_role/i,
  );
  assert.doesNotMatch(
    `${migrationV1}\n${migrationV2}\n${migrationV3}\n${migrationV4}`,
    /insert\s+into|update\s+public|delete\s+from/i,
  );
});

test("Flutter exposes MTG and preserves exact collector-number identity", () => {
  const service = source("lib/services/public/public_sets_service.dart");
  const cardModel = source("lib/models/card_print.dart");
  const tests = source("test/mtg_client_search_readiness_test.dart");

  assert.match(service, /enum PublicCatalogGame \{ pokemon, onePiece, mtg \}/);
  assert.match(service, /PublicCatalogGame\.mtg => 'mtg'/);
  assert.match(cardModel, /normalizeMtgCollectorNumberToken/);
  assert.match(cardModel, /preferMtgCollectorNumberToken/);
  assert.match(cardModel, /exactSetCodeExists: exactSetRows\.isNotEmpty/);
  assert.ok(
    cardModel.includes("RegExp(r'^[a-z0-9★†]+(?:-[a-z0-9★†]+)*$')"),
  );
  for (const exactToken of ["78s", "BL6", "A-123", "#123a/281", "★", "†"]) {
    assert.match(tests, new RegExp(exactToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("hidden release controls remain the database authority", () => {
  const migration = source(
    "supabase/migrations/20260813200000_mtg_catalog_app_visibility_boundary_v1.sql",
  );

  assert.match(migration, /release_status = 'signed_in'/);
  assert.match(migration, /card_prints_catalog_release_visibility_v1/);
  assert.match(migration, /card_print_identity_catalog_release_visibility_v1/);
  assert.match(migration, /card_printings_catalog_release_visibility_v1/);
});

test("card detail exposes canonical MTG language, layout, and face names", () => {
  const loader = source("apps/web/src/lib/getPublicCardByGvId.ts");
  const cardTypes = source("apps/web/src/types/cards.ts");
  const cardPage = source("apps/web/src/app/card/[gv_id]/page.tsx");

  assert.match(loader, /identity_key_version,identity_payload/);
  assert.match(loader, /identityPayload\.language/);
  assert.match(loader, /identityPayload\.layout/);
  assert.match(loader, /split\(\/\\s\+\\\/\\\/\\s\+\//);
  assert.match(cardTypes, /language_code\?: string/);
  assert.match(cardTypes, /face_names\?: string\[\]/);
  assert.match(cardPage, /label: "Faces"/);
  assert.match(cardPage, /label: "Layout"/);
  assert.match(cardPage, /getCardLanguageLabel\(resolvedCard\)/);
});
