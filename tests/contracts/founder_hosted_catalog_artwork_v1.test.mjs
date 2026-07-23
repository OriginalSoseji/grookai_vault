import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("Founder market signals use Grookai-hosted catalog art before provider fallbacks", () => {
  const loader = source(
    "apps/web/src/lib/founder/getFounderMarketSignals.ts",
  );
  const section = source(
    "apps/web/src/components/founder/FounderMarketSignalsSection.tsx",
  );

  assert.match(loader, /image_source,image_path,representative_image_url,image_status,image_note/);
  assert.match(loader, /getCatalogImageSourcesFromResolvedFieldsV1/);
  assert.match(loader, /resolveCardImageFieldsV1/);
  assert.match(loader, /orderCatalogImageSourcesV1/);
  assert.match(loader, /hostedImageUrl: catalogImageSources\.hostedImageUrl/);
  assert.match(loader, /providerImageUrl: catalogImageSources\.providerImageUrl/);
  assert.match(loader, /imageFallbackUrls: imageSources\.slice\(1\)/);
  assert.doesNotMatch(loader, /getBestPublicCardImageUrl/);

  assert.match(section, /src=\{row\.card\.imageUrl \?\? undefined\}/);
  assert.match(section, /fallbackSources=\{row\.card\.imageFallbackUrls\}/);
});

test("Founder telemetry and vault analytics preserve only explicit uploads ahead of hosted art", () => {
  const page = source("apps/web/src/app/founder/page.tsx");

  assert.match(page, /image_source,image_path,representative_image_url,image_status,image_note/);
  assert.match(page, /getCatalogImageSourcesFromResolvedFieldsV1/);
  assert.match(page, /resolveCardImageFieldsV1/);
  assert.match(page, /orderCatalogImageSourcesV1/);
  assert.match(page, /photo_url,image_url,image_display_mode/);
  assert.match(page, /imageDisplayMode === "uploaded"/);
  assert.match(page, /row\.photo_url\?\.trim\(\) \|\| row\.image_url\?\.trim\(\) \|\| null/);
  assert.match(page, /resolveVaultInstanceMediaUrl\(uploadedImageReference\)/);
  assert.match(page, /hostedImageUrl: catalogImageSources\?\.hostedImageUrl/);
  assert.match(page, /providerImageUrl: catalogImageSources\?\.providerImageUrl/);
  assert.match(page, /fallbackSources=\{item\.image_fallback_urls\}/);
  assert.doesNotMatch(page, /getBestPublicCardImageUrl/);
});
