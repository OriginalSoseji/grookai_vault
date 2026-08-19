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
  const searchForm = source("apps/web/src/components/PublicSearchForm.tsx");

  assert.match(gameScope, /"pokemon" \| "one_piece" \| "mtg"/);
  assert.match(gameScope, /value: "mtg", label: "Magic: The Gathering"/);
  assert.match(searchForm, /PUBLIC_GAME_SCOPE_OPTIONS/);
  assert.match(searchForm, /aria-label="Trading card game"/);
  assert.match(searchForm, /params\.set\("game", nextGameScope\)/);
  assert.doesNotMatch(explore, /aria-label="Game scope"/);
});

test("MTG search is signed-in, game-scoped, and bypasses Pokemon resolution", () => {
  const route = source("apps/web/src/app/api/resolver/search/route.ts");
  const lookup = source("apps/web/src/lib/explore/getExploreRows.ts");

  assert.match(route, /gameScope !== "pokemon" && !userId/);
  assert.match(route, /Sign in to search this catalog/);
  assert.match(route, /getExploreRowsForGameScopedTextSearch/);
  assert.match(route, /includeProvisional =\s*gameScope === "pokemon"/);
  assert.match(route, /game_scope: gameScope/);
  assert.match(lookup, /\.eq\("game_id", gameId\)/);
  assert.match(lookup, /\.eq\("code", gameScope\)/);
  assert.match(lookup, /\.ilike\("set_code", inferredSetCode\)/);
  assert.match(lookup, /return nameMatches && collectorMatches && illustratorMatches && identityMatches/);
  assert.match(route, /exactReleaseYear,/);
  assert.match(route, /exactIllustrator,/);
  assert.match(route, /releaseYearMin: effectiveSmartSearchIntent\.releaseYearMin/);
  assert.match(route, /finishKeys: effectiveSmartSearchIntent\.finishKeys/);
  assert.match(lookup, /fetchSmartDiscoveryChildRows\(\{ \.\.\.options, sortMode \}, parentRows\)/);
  assert.match(lookup, /\.replace\(\/\^#\//);
  assert.match(lookup, /\.split\("\/", 1\)/);
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
