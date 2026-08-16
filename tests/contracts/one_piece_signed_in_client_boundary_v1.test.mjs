import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function source(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("card and set loaders preserve request-role catalog visibility", () => {
  const cardLoader = source("apps/web/src/lib/getPublicCardByGvId.ts");
  const setLoader = source("apps/web/src/lib/publicSets.ts");
  const setStatsLoader = source("apps/web/src/lib/publicSetMasterSetStats.ts");
  const setPage = source("apps/web/src/app/sets/[set_code]/page.tsx");

  for (const loader of [cardLoader, setLoader]) {
    assert.match(loader, /createServerComponentClient/);
    assert.doesNotMatch(loader, /SUPABASE_SECRET_KEY/);
    assert.doesNotMatch(loader, /createPublicServerClient/);
  }
  assert.match(cardLoader, /await createServerSupabase\(\)/);
  assert.match(setLoader, /await createServerSupabase\(\)/);
  assert.match(setLoader, /game,/);
  assert.doesNotMatch(setLoader, /card_prints\(count\)/);
  assert.match(setLoader, /get_public_set_card_counts_v1/);
  assert.match(setLoader, /getAllVisibleSetRows/);
  assert.match(setLoader, /\.range\(offset, offset \+ PUBLIC_SET_ROW_PAGE_SIZE - 1\)/);
  assert.doesNotMatch(setLoader, /\.ilike\("set_code"/);
  assert.match(setLoader, /candidate\.game_code/);
  assert.match(setStatsLoader, /createPublicServerClient/);
  assert.match(
    setStatsLoader,
    /getPublicSetMasterSetStats\(\s*setCode:\s*string,\s*userId:[\s\S]*requestScopedCatalogClient\?: SupabaseClient/,
  );
  assert.match(setStatsLoader, /requestScopedCatalogClient \?\? createPublicServerClient\(\)/);
  assert.match(setStatsLoader, /fetchSetCardPrintIds\(supabase, setCode\)/);
  assert.match(setStatsLoader, /fetchCardPrintings\(supabase, cardPrintIds\)/);
  assert.match(setPage, /user\?\.id && setDetail\.game_code !== "pokemon" \? supabase : undefined/);
  assert.match(
    setPage,
    /getPublicSetMasterSetStats\(\s*setDetail\.code,\s*user\?\.id \?\? null,\s*requestScopedCatalogClient,/,
  );
});

test("web set browse is dynamic and exposes an explicit game scope", () => {
  const setsPage = source("apps/web/src/app/sets/page.tsx");
  const toolbar = source("apps/web/src/components/sets/PublicSetsToolbar.tsx");
  const results = source("apps/web/src/components/sets/PublicSetsResults.tsx");
  const gameScope = source("apps/web/src/lib/publicGameScope.ts");

  assert.match(setsPage, /dynamic = "force-dynamic"/);
  assert.match(setsPage, /revalidate = 0/);
  assert.match(setsPage, /matchesPublicGameScope/);
  assert.match(toolbar, /PUBLIC_GAME_SCOPE_OPTIONS/);
  assert.match(toolbar, /aria-label="Filter sets by game"/);
  assert.match(results, /matchesPublicGameScope/);
  assert.match(gameScope, /"pokemon" \| "one_piece"/);
  assert.match(gameScope, /value: "one_piece", label: "One Piece"/);
});

test("Flutter set browse defaults to Pokemon and isolates One Piece explicitly", () => {
  const service = source("lib/services/public/public_sets_service.dart");
  const screen = source("lib/screens/sets/public_sets_screen.dart");

  assert.match(service, /enum PublicCatalogGame \{ pokemon, onePiece \}/);
  assert.match(service, /PublicCatalogGame game = PublicCatalogGame\.pokemon/);
  assert.match(service, /\.where\(\(setInfo\) => setInfo\.game == game\)/);
  assert.match(service, /'game,code,name,/);
  assert.match(service, /get_public_set_card_counts_v1/);
  assert.match(service, /_fetchAllVisibleSetRows/);
  assert.match(service, /\.range\(offset, offset \+ _setRowPageSize - 1\)/);
  assert.match(service, /\.inFilter\('set_code', exactSetCodes\)/);
  assert.match(screen, /_activeGame = PublicCatalogGame\.pokemon/);
  assert.match(screen, /SegmentedButton<PublicCatalogGame>/);
  assert.match(screen, /_activeGame == PublicCatalogGame\.pokemon/);
});

test("card metadata identifies the game instead of hardcoding Pokemon", () => {
  const cardPage = source("apps/web/src/app/card/[gv_id]/page.tsx");
  const cardLoader = source("apps/web/src/lib/getPublicCardByGvId.ts");

  assert.match(cardLoader, /games\(code,name\)/);
  assert.match(cardPage, /getCardGameLabel/);
  assert.match(cardPage, /One Piece Card Game/);
  assert.match(cardPage, /category: `\$\{gameLabel\} card`/);
  assert.doesNotMatch(cardPage, /category: "Pokemon trading card"/);
});

test("related print discovery remains inside the selected game", () => {
  const cardLoader = source("apps/web/src/lib/getPublicCardByGvId.ts");

  assert.match(cardLoader, /\.eq\("game_id", normalizedGameId\)/);
  assert.match(cardLoader, /getRelatedPrintsByName\(supabase, row\.name, row\.id, row\.game_id\)/);
  assert.match(cardLoader, /\.select\("id,gv_id,name,game_id"\)/);
});

test("database release boundary still gates direct tables and search", () => {
  const migration = source("supabase/migrations/20260813200000_mtg_catalog_app_visibility_boundary_v1.sql");
  assert.match(migration, /release_status = 'signed_in'/);
  assert.match(migration, /auth\.role\(\)/);
  assert.match(migration, /card_prints_catalog_release_visibility_v1/);
  assert.match(migration, /card_print_identity_catalog_release_visibility_v1/);
  assert.match(migration, /card_printings_catalog_release_visibility_v1/);
  assert.match(migration, /search_print_identity_v1/);
});
