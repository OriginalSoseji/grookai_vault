import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildCanonCardImageProxyUrl } from "../../apps/web/src/lib/canon/canonImageProxy.ts";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function indexAfter(contents, needle, startIndex = 0) {
  const index = contents.indexOf(needle, startIndex);
  assert.notEqual(index, -1, `Expected source to contain ${needle}`);
  return index;
}

test("selected child printings receive a stable Grookai-hosted image route", () => {
  assert.equal(
    buildCanonCardImageProxyUrl("gv-pk-cc-5-std"),
    "/api/canon/cards/GV-PK-CC-5-STD/image",
  );

  const route = source("apps/web/src/app/api/canon/cards/[gv_id]/image/route.ts");
  assert.match(route, /\.from\("card_printings"\)/);
  assert.match(route, /\.eq\("printing_gv_id", gvId\)/);
  assert.match(route, /\.eq\("id", cardPrinting\.card_print_id\)/);
  assert.match(route, /parentImagePath/);
});

test("set thumbnails try child and parent hosted art before provider URLs", () => {
  const grid = source("apps/web/src/components/PublicSetCardGrid.tsx");
  const sourcesStart = indexAfter(grid, "const imageSources = [");
  const childHosted = indexAfter(grid, "selectedHostedImageUrl,", sourcesStart);
  const parentHosted = indexAfter(grid, "cardFallbackImageUrl,", childHosted);
  const selectedProvider = indexAfter(grid, "selectedImageUrl,", parentHosted);
  const providerFallback = indexAfter(
    grid,
    "selectedPrinting?.external_image_fallback_url,",
    selectedProvider,
  );

  assert.ok(childHosted < parentHosted);
  assert.ok(parentHosted < selectedProvider);
  assert.ok(selectedProvider < providerFallback);
});

test("card detail tries selected, parent, and default hosted routes before providers", () => {
  const page = source("apps/web/src/app/card/[gv_id]/page.tsx");
  const sourcesStart = indexAfter(page, "orderCardImageSources(\n      selectedRoutePrintingHostedImageUrl");
  const selectedHosted = indexAfter(page, "selectedRoutePrintingHostedImageUrl,", sourcesStart);
  const parentHosted = indexAfter(page, "resolvedCardFallbackImageUrl,", selectedHosted);
  const defaultHosted = indexAfter(page, "defaultDisplayPrintingHostedImageUrl,", parentHosted);
  const selectedResolved = indexAfter(page, "selectedRoutePrintingImageUrl,", defaultHosted);
  const providerFallback = indexAfter(
    page,
    "selectedRoutePrinting?.external_image_fallback_url,",
    selectedResolved,
  );

  assert.ok(selectedHosted < parentHosted);
  assert.ok(parentHosted < defaultHosted);
  assert.ok(defaultHosted < selectedResolved);
  assert.ok(selectedResolved < providerFallback);
});
