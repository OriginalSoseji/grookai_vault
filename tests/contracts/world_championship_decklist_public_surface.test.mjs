import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readSource(relativePath) {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

test("World Championship decklists are public display metadata without source URL exposure", () => {
  const publicSets = readSource("apps/web/src/lib/publicSets.ts");
  const sharedTypes = readSource("apps/web/src/lib/publicSets.shared.ts");
  const setPage = readSource("apps/web/src/app/sets/[set_code]/page.tsx");
  const mobileService = readSource("lib/services/public/public_sets_service.dart");
  const mobileScreen = readSource("lib/screens/sets/public_set_detail_screen.dart");

  assert.match(publicSets, /getPublicWorldChampionshipDecklist/);
  assert.match(publicSets, /\.eq\("variant_key", "world_championship_deck_replica"\)/);
  assert.match(publicSets, /getNestedNumber\(grookai, "deck_quantity"\)/);
  assert.match(publicSets, /getNestedString\(grookai, "source_set_name"\)/);
  assert.match(publicSets, /getNestedString\(grookai, "source_card_number"\)/);
  assert.match(sharedTypes, /PublicWorldChampionshipDecklistEntry/);
  assert.match(sharedTypes, /quantity: number \| null/);

  assert.match(setPage, /60-card decklist/);
  assert.match(setPage, /buildWorldChampionshipDecklistBlurb/);
  assert.match(setPage, /Qty/);
  assert.match(setPage, /Original print/);
  assert.match(setPage, /source_set_name/);
  assert.match(setPage, /source_card_number/);

  assert.match(mobileService, /fetchWorldChampionshipDecklist/);
  assert.match(mobileService, /deck_quantity/);
  assert.match(mobileScreen, /60-card Decklist/);
  assert.match(mobileScreen, /_worldChampionshipDecklistBlurb/);

  const publicSurfaceSources = [
    publicSets,
    sharedTypes,
    setPage,
    mobileService,
    mobileScreen,
  ].join("\n");
  assert.doesNotMatch(publicSurfaceSources, /source_url|sourceUrl|source_urls|sourceUrls/);
});

