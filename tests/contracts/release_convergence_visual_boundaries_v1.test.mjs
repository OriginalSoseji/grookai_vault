import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("Search results expose the existing exact-version Vault workflow", () => {
  const action = read("apps/web/src/components/explore/ExploreResultActions.tsx");
  const grid = read("apps/web/src/components/explore/ExploreCardGridItem.tsx");
  const list = read("apps/web/src/components/explore/ExploreCardListItem.tsx");
  const details = read("apps/web/src/components/explore/ExploreCardDetailsRow.tsx");
  const cardPage = read("apps/web/src/app/card/[gv_id]/page.tsx");

  assert.match(action, /#vault-actions/);
  assert.match(action, /Choose the exact version and add it to your Vault/);
  assert.doesNotMatch(action, /supabase|insert\(|update\(|fetch\(/i);
  assert.match(grid, /<ExploreResultActions/);
  assert.match(list, /<ExploreResultActions/);
  assert.match(details, /<ExploreResultActions/);
  assert.match(cardPage, /id="vault-actions"/);
  assert.match(cardPage, /<CardPageMarketVaultPanels/);
});

test("shared product states govern root and Binder failure surfaces", () => {
  const state = read("apps/web/src/components/layout/ProductState.tsx");
  const rootError = read("apps/web/src/app/error.tsx");
  const notFound = read("apps/web/src/app/not-found.tsx");
  const binderError = read("apps/web/src/app/binders/error.tsx");

  assert.match(state, /tone\?: "neutral" \| "error" \| "private"/);
  assert.match(state, /role=\{tone === "error" \? "alert" : "status"\}/);
  assert.match(rootError, /<ProductState/);
  assert.match(rootError, /Your collection was not changed/);
  assert.match(notFound, /<ProductState/);
  assert.match(notFound, /old, private, or no longer shared/);
  assert.match(binderError, /<ProductState/);
});

test("collector card-art surfaces use the canonical five-by-seven frame", () => {
  const files = [
    "apps/web/src/components/cards/PokemonCardGridTile.tsx",
    "apps/web/src/components/explore/ExploreDiscoverySections.tsx",
    "apps/web/src/components/compare/CompareWorkspace.tsx",
    "apps/web/src/components/network/NetworkStreamCard.tsx",
    "apps/web/src/components/public/FeaturedWallSection.tsx",
    "apps/web/src/components/vault/VaultMobileViews.tsx",
    "apps/web/src/app/card/[gv_id]/CardRouteLoading.tsx",
    "apps/web/src/app/card/[gv_id]/page.tsx",
    "apps/web/src/app/dex/[speciesSlug]/page.tsx",
  ];

  for (const file of files) {
    const source = read(file);
    assert.match(source, /aspect-\[5\/7\]/, `${file} must use the canonical frame`);
    assert.doesNotMatch(source, /aspect-\[3\/4\]/, `${file} retains legacy card geometry`);
  }
});

test("Flutter collector card-art surfaces use the canonical ratio", () => {
  const files = [
    "lib/card_detail_screen.dart",
    "lib/main.dart",
    "lib/screens/vault/vault_gvvi_screen.dart",
    "lib/screens/gvvi/public_gvvi_screen.dart",
    "lib/widgets/card_zoom_viewer.dart",
  ];

  for (const file of files) {
    const source = read(file);
    assert.match(source, /aspectRatio: 2\.5 \/ 3\.5/);
  }
});

test("public entry copy avoids internal implementation language", () => {
  const files = [
    "apps/web/src/app/layout.tsx",
    "apps/web/src/app/page.tsx",
    "apps/web/src/app/sets/page.tsx",
    "apps/web/src/app/vault/page.tsx",
    "apps/web/src/components/explore/ExplorePageClient.tsx",
    "apps/web/src/components/common/PricingDisclosure.tsx",
    "apps/web/src/components/pricing/CardPagePricingRail.tsx",
  ];
  const internalLanguage = /collector intelligence layer|canonical mapping|reconciled catalog|signed-in canary|image worklist/i;

  for (const file of files) {
    assert.doesNotMatch(read(file), internalLanguage, `${file} leaks internal language`);
  }
});
