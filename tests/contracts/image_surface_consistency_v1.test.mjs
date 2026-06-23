import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("card summary surfaces use the shared child image fallback resolver", () => {
  const helper = source("apps/web/src/lib/cards/childDisplayImageFallbacks.ts");
  assert.match(helper, /getChildDisplayImageFallbacks/);
  assert.match(helper, /card_printings/);
  assert.match(helper, /representative_missing_variant_visual/);

  for (const file of [
    "apps/web/src/app/page.tsx",
    "apps/web/src/app/vault/page.tsx",
    "apps/web/src/app/wall/page.tsx",
    "apps/web/src/lib/getPublicCardByGvId.ts",
    "apps/web/src/lib/getAdjacentPublicCardsByGvId.ts",
    "apps/web/src/lib/getSharedCardsBySlug.ts",
    "apps/web/src/lib/cards/getPublicCardsByGvIds.ts",
    "apps/web/src/lib/explore/getExploreRows.ts",
    "apps/web/src/lib/cards/getFeaturedExploreCards.ts",
    "apps/web/src/lib/network/getCardStreamRows.ts",
    "apps/web/src/lib/network/getUserCardInteractions.ts",
    "apps/web/src/lib/vault/getCanonicalVaultCollectorRows.ts",
  ]) {
    assert.match(
      source(file),
      /getChildDisplayImageFallbacks/,
      `${file} must not regress to parent-only image resolution`,
    );
  }
});

test("web image components pass fallback display URLs through product surfaces", () => {
  for (const file of [
    "apps/web/src/app/card/[gv_id]/page.tsx",
    "apps/web/src/components/compare/CompareWorkspace.tsx",
    "apps/web/src/components/explore/ExploreDiscoverySections.tsx",
    "apps/web/src/components/explore/ExploreCardGridItem.tsx",
    "apps/web/src/components/explore/ExploreCardListItem.tsx",
    "apps/web/src/components/explore/ExploreCardDetailsRow.tsx",
  ]) {
    assert.match(
      source(file),
      /display_image_fallback_url/,
      `${file} must preserve child-image fallback rendering`,
    );
  }
});
