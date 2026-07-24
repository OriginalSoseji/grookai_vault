import assert from "node:assert/strict";
import test from "node:test";

import { selectCatalogProviderFallbackV1 } from "./catalogProviderFallbackV1.ts";

test("exact hosted art uses the exact provider field only as its fallback", () => {
  assert.equal(
    selectCatalogProviderFallbackV1({
      imageStatus: "exact",
      externalImageUrl: "https://provider.example/exact.jpg",
      representativeImageUrl: "https://provider.example/representative.jpg",
    }),
    "https://provider.example/exact.jpg",
  );
});

test("representative hosted art uses representative_image_url as its fallback", () => {
  assert.equal(
    selectCatalogProviderFallbackV1({
      imageStatus: "representative_shared_stamp",
      externalImageUrl: "https://provider.example/wrongly-exact.jpg",
      representativeImageUrl: "https://provider.example/base-art.jpg",
    }),
    "https://provider.example/base-art.jpg",
  );
});

test("representative rows retain a legacy external fallback when no representative URL exists", () => {
  assert.equal(
    selectCatalogProviderFallbackV1({
      imageStatus: "representative_shared",
      externalImageUrl: "https://provider.example/legacy.jpg",
      representativeImageUrl: null,
    }),
    "https://provider.example/legacy.jpg",
  );
});
