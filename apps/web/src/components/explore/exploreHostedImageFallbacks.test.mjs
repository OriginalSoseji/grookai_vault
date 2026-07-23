import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function readSource(...segments) {
  return readFileSync(join(sourceRoot, ...segments), "utf8");
}

test("Explore loaders preserve the vetted provider URL behind hosted catalog art", () => {
  const exploreRows = readSource("lib", "explore", "getExploreRows.ts");
  const featuredCards = readSource("lib", "cards", "getFeaturedExploreCards.ts");
  const resultTypes = readSource("components", "explore", "exploreResultTypes.ts");

  assert.match(
    exploreRows,
    /external_image_fallback_url:\s*imageFields\.external_image_fallback_url \?\? undefined/,
  );
  assert.match(
    featuredCards,
    /external_image_fallback_url:\s*imageFields\.external_image_fallback_url \?\? undefined/,
  );
  assert.match(featuredCards, /external_image_fallback_url\?: string/);
  assert.match(resultTypes, /external_image_fallback_url\?: string/);
});

test("Explore renderers keep child art before the provider error fallback", () => {
  const gridItem = readSource("components", "explore", "ExploreCardGridItem.tsx");
  const listItem = readSource("components", "explore", "ExploreCardListItem.tsx");
  const detailsRow = readSource("components", "explore", "ExploreCardDetailsRow.tsx");
  const discovery = readSource("components", "explore", "ExploreDiscoverySections.tsx");

  assert.match(
    gridItem,
    /imageFallbackSrc=\{card\.display_image_fallback_url\}\s*imageFallbackSources=\{\[card\.external_image_fallback_url\]\}/,
  );
  for (const source of [listItem, detailsRow]) {
    assert.match(
      source,
      /fallbackSrc=\{card\.display_image_fallback_url\}\s*fallbackSources=\{\[card\.external_image_fallback_url\]\}/,
    );
  }

  assert.match(
    discovery,
    /fallbackSrc=\{spotlightCard\.display_image_fallback_url\}\s*fallbackSources=\{\[spotlightCard\.external_image_fallback_url\]\}/,
  );
  assert.ok(
    [...discovery.matchAll(/imageFallbackSrc=\{card\.display_image_fallback_url\}\s*imageFallbackSources=\{\[card\.external_image_fallback_url\]\}/g)].length >= 2,
  );
});
