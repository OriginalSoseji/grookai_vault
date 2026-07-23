import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("shared web image policy preserves a vetted provider only behind hosted identity art", () => {
  const resolver = source("apps/web/src/lib/canon/resolveCardImageFieldsV1.ts");
  const catalogSources = source("apps/web/src/lib/canon/catalogImageSourcesV1.ts");
  const publicCardImage = source("apps/web/src/components/PublicCardImage.tsx");

  assert.match(resolver, /external_image_fallback_url/);
  assert.match(resolver, /exactImage\.source === "identity"/);
  assert.match(resolver, /!hasKnownBrokenTcgdexImageReference\(cardPrint\)/);
  assert.match(catalogSources, /getCatalogImageSourcesFromResolvedFieldsV1/);
  assert.match(catalogSources, /imageFields\.exact_image_source === "identity" && imageFields\.image_path/);
  assert.match(publicCardImage, /fallbackSources\?: Array<string \| null \| undefined>/);
  assert.match(publicCardImage, /const sourceChain = \[/);
  assert.match(publicCardImage, /sourceChain\[activeIndex \+ 1\]/);
});

test("Wall and Sections preserve uploaded photos but use hosted catalog art before providers", () => {
  const wallLoader = source("apps/web/src/lib/wallSections/getPublicWallCardsBySlug.ts");
  const sectionLoader = source("apps/web/src/lib/wallSections/getPublicSectionCardsBySlug.ts");
  const mapping = source("apps/web/src/lib/wallSections/publicWallSectionCardMapping.ts");
  const grid = source("apps/web/src/components/public/PublicCollectionGrid.tsx");
  const featured = source("apps/web/src/components/public/FeaturedWallSection.tsx");

  for (const loader of [wallLoader, sectionLoader]) {
    assert.match(loader, /image_display_mode/);
    assert.match(loader, /getCatalogImageSourcesByCardPrintIdsV1/);
  }
  assert.match(mapping, /imageDisplayMode === "uploaded" \? viewDisplayImageUrl : null/);
  assert.match(mapping, /hostedImageUrl: catalogImageSources\?\.hostedImageUrl/);
  assert.match(mapping, /providerImageUrl:/);
  assert.match(mapping, /image_fallback_urls: imageSources\.slice\(1\)/);
  assert.match(grid, /imageFallbackSources=\{card\.image_fallback_urls\?\.slice\(1\)\}/);
  assert.match(featured, /fallbackSources=\{card\.image_fallback_urls\?\.slice\(1\)\}/);
});

test("Network and Nearby use hosted-first ordered sources and retain uploaded copy intent", () => {
  const stream = source("apps/web/src/lib/network/getCardStreamRows.ts");
  const streamCard = source("apps/web/src/components/network/NetworkStreamCard.tsx");
  const nearby = source("apps/web/src/lib/network/getLocalCommunityFeedRows.ts");
  const nearbyCard = source("apps/web/src/components/network/LocalCommunityFeedCard.tsx");

  assert.match(stream, /photo_url,image_url,image_display_mode/);
  assert.match(stream, /presentationCopy\?\.imageDisplayMode/);
  assert.match(stream, /hostedImageUrl: row\.hostedImageUrl/);
  assert.match(stream, /providerImageUrl: row\.providerImageUrl/);
  assert.match(streamCard, /fallbackSources=\{row\.imageFallbackUrls\.slice\(1\)\}/);

  assert.match(nearby, /getCatalogImageSourcesByGvIdsV1/);
  assert.match(nearby, /getNearbyUploadedImageMap/);
  assert.match(nearby, /imageDisplayMode: uploadedImageUrl \? "uploaded" : "canonical"/);
  assert.match(nearbyCard, /fallbackSources=\{row\.imageFallbackUrls\.slice\(1\)\}/);
});

test("card detail and set grids keep hosted art first with provider error fallbacks", () => {
  const cardTypes = source("apps/web/src/types/cards.ts");
  const cardLoader = source("apps/web/src/lib/getPublicCardByGvId.ts");
  const cardPage = source("apps/web/src/app/card/[gv_id]/page.tsx");
  const zoomModal = source("apps/web/src/components/compare/CardZoomModal.tsx");
  const setTypes = source("apps/web/src/lib/publicSets.shared.ts");
  const setLoader = source("apps/web/src/lib/publicSets.ts");
  const setGrid = source("apps/web/src/components/PublicSetCardGrid.tsx");

  assert.match(cardTypes, /external_image_fallback_url\?: string/);
  assert.match(cardLoader, /imageFields\.external_image_fallback_url \?\? undefined/);
  assert.match(cardPage, /orderCardImageSources/);
  assert.match(cardPage, /resolvedCard\.external_image_fallback_url/);
  assert.match(cardPage, /fallbackSources=\{resolvedCardImageFallbacks\.slice\(1\)\}/);
  assert.match(zoomModal, /fallbackSources\?: Array<string \| null \| undefined>/);

  assert.match(setTypes, /external_image_fallback_url\?: string/);
  assert.match(setLoader, /imageFields\.external_image_fallback_url \?\? undefined/);
  assert.match(setGrid, /selectedPrinting\?\.external_image_fallback_url/);
  assert.match(setGrid, /card\.external_image_fallback_url/);
  assert.match(setGrid, /imageFallbackSources=\{imageSources\.slice\(2\)\}/);
});

test("Dex card detail rows use child art before a vetted provider fallback", () => {
  const dexLoader = source("apps/web/src/lib/grookaiDex/getGrookaiDexSpeciesDetail.ts");
  const dexPage = source("apps/web/src/app/dex/[speciesSlug]/page.tsx");

  assert.match(dexLoader, /imageFallbackUrls: string\[\]/);
  assert.match(
    dexLoader,
    /const imageSources = \[[\s\S]*primaryImageUrl,[\s\S]*childDisplayImageFallback\?\.display_image_url[\s\S]*imageFields\.external_image_fallback_url/,
  );
  assert.match(dexLoader, /const \[imageUrl = null, \.\.\.imageFallbackUrls\] = imageSources/);
  assert.match(dexPage, /<PublicCardImage/);
  assert.match(dexPage, /fallbackSrc=\{card\.imageFallbackUrls\[0\]\}/);
  assert.match(dexPage, /fallbackSources=\{card\.imageFallbackUrls\.slice\(1\)\}/);
  assert.match(dexPage, /object-contain/);
});

test("public and private GVVI heroes preserve uploaded-first mode and provider fallback", () => {
  const displayPolicy = source("apps/web/src/lib/vaultInstanceImageDisplay.ts");
  const publicLoader = source("apps/web/src/lib/vault/getPublicVaultInstanceByGvvi.ts");
  const privateLoader = source("apps/web/src/lib/vault/getVaultInstanceByGvvi.ts");
  const publicPage = source("apps/web/src/app/gvvi/[gvvi_id]/page.tsx");
  const privatePage = source("apps/web/src/app/vault/gvvi/[gvvi_id]/page.tsx");

  assert.match(displayPolicy, /orderCatalogImageSourcesV1/);
  assert.match(displayPolicy, /uploadedImageUrl/);
  assert.match(displayPolicy, /hostedImageUrl: canonicalImageUrl/);
  assert.match(displayPolicy, /providerImageUrl/);
  assert.match(displayPolicy, /fallbackImageUrls/);
  for (const loader of [publicLoader, privateLoader]) {
    assert.match(loader, /providerImageUrl: cardImageFields\.external_image_fallback_url/);
  }
  for (const page of [publicPage, privatePage]) {
    assert.match(page, /providerImageUrl: detail\.providerImageUrl/);
    assert.match(page, /fallbackSources=\{heroImage\.fallbackImageUrls\.slice\(1\)\}/);
    assert.match(page, /object-contain/);
  }
});

test("catalog thumbnails on the repaired surfaces remain uncropped", () => {
  for (const file of [
    "apps/web/src/components/cards/PokemonCardGridTile.tsx",
    "apps/web/src/components/public/FeaturedWallSection.tsx",
    "apps/web/src/components/network/NetworkStreamCard.tsx",
    "apps/web/src/components/network/LocalCommunityFeedCard.tsx",
    "apps/web/src/app/dex/[speciesSlug]/page.tsx",
    "apps/web/src/app/gvvi/[gvvi_id]/page.tsx",
    "apps/web/src/app/vault/gvvi/[gvvi_id]/page.tsx",
  ]) {
    const contents = source(file);
    assert.match(contents, /object-contain/, file);
    assert.doesNotMatch(contents, /object-cover|object-fill/, file);
  }
});
