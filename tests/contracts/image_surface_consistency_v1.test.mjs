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

test("card detail suppresses external exact fallbacks when a primary image exists", () => {
  const cardPage = source("apps/web/src/app/card/[gv_id]/page.tsx");

  assert.match(cardPage, /function buildExactExternalImageFallback/);
  assert.match(cardPage, /if \(primaryImageUrl\?\.trim\(\)\) return null;/);
  assert.doesNotMatch(
    cardPage,
    /fallbackSrc=\{buildTcgDexImageUrl/,
    "card detail must not pass direct TCGdex fallbacks behind already-resolved image URLs",
  );
});

test("canon identity images prefer stable card image routes over raw signed URLs", () => {
  const proxy = source("apps/web/src/lib/canon/canonImageProxy.ts");
  const resolver = source("apps/web/src/lib/canon/resolveCanonImageV1.ts");
  const route = source("apps/web/src/app/api/canon/cards/[gv_id]/image/route.ts");
  const batchRoute = source("apps/web/src/app/api/canon/images/route.ts");

  assert.match(proxy, /buildCanonCardImageProxyUrl/);
  assert.match(proxy, /warehouse-derived\/self-hosted-images-v1\//);
  assert.match(proxy, /warehouse-derived\/image-truth-v1\//);
  assert.match(proxy, /WAREHOUSE_CANON_IMAGE_PREFIXES\.some/);
  assert.match(proxy, /\/api\/canon\/cards\/\$\{encodeURIComponent\(normalizedGvId\)\}\/image/);
  assert.match(resolver, /buildCanonCardImageProxyUrl\(cardPrint\?\.gv_id \?\? cardPrint\?\.printing_gv_id\) \?\? buildCanonImageProxyUrl\(imagePath\)/);
  assert.match(route, /\.from\("card_prints"\)/);
  assert.match(route, /\.select\("gv_id,image_source,image_path"\)/);
  assert.match(route, /\.from\("card_printings"\)/);
  assert.match(route, /\.select\("printing_gv_id,image_source,image_path"\)/);
  assert.match(route, /\.download\(imagePath\)/);
  assert.match(route, /"Cache-Control": "no-store, max-age=0"/);
  assert.match(batchRoute, /\.from\("card_prints"\)/);
  assert.match(batchRoute, /\.from\("card_printings"\)/);
  assert.match(batchRoute, /buildCanonCardImageProxyUrl\(row\.gv_id \?\? row\.printing_gv_id\)/);
  assert.doesNotMatch(
    batchRoute,
    /resolveVaultInstanceMediaUrl|createSignedUrl/,
    "canonical batch image resolution should return stable app routes instead of Supabase signed URLs",
  );
  assert.doesNotMatch(
    resolver,
    /resolveVaultInstanceMediaUrl|createSignedUrl/,
    "canonical web image URLs should fail closed instead of exposing Supabase signed URLs",
  );
});

test("founder control center exposes catalog image health from image-truth reports", () => {
  const founderPage = source("apps/web/src/app/founder/page.tsx");
  const founderSummary = source("apps/web/src/lib/founder/getCatalogImageOpsSummary.ts");
  const nextConfig = source("apps/web/next.config.mjs");

  assert.match(founderPage, /Catalog Image Health/);
  assert.match(founderPage, /getCatalogImageOpsSummary/);
  assert.match(founderPage, /Missing Objects/);
  assert.match(founderPage, /Bad Patterns/);
  assert.match(founderPage, /JPN Bad Patterns/);
  assert.match(founderPage, /Storage hygiene/);
  assert.match(founderSummary, /canon_image_full_db_playbook_scan_v1\.json/);
  assert.match(founderSummary, /canon_image_unreferenced_storage_cleanup_plan_v1\.json/);
  assert.match(founderSummary, /identity_paths_missing_storage_objects/);
  assert.match(founderSummary, /rows_with_selected_bad_image_patterns/);
  assert.match(founderSummary, /japanese_rows_with_selected_bad_image_patterns/);
  assert.match(founderSummary, /delete_candidates/);
  assert.match(nextConfig, /outputFileTracingIncludes/);
  assert.match(nextConfig, /canon_image_full_db_playbook_scan_v1\.json/);
  assert.match(nextConfig, /canon_image_unreferenced_storage_cleanup_plan_v1\.json/);
});
