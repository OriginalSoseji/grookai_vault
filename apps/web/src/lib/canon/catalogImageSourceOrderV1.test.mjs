import assert from "node:assert/strict";
import test from "node:test";

import { orderCatalogImageSourcesV1 } from "./catalogImageSourceOrderV1.ts";

test("canonical catalog art keeps Grookai hosted first and provider second", () => {
  assert.deepEqual(
    orderCatalogImageSourcesV1({
      imageDisplayMode: "canonical",
      hostedImageUrl: "/api/canon/cards/GV-PK-TEST-001/image",
      providerImageUrl: "https://provider.example/card.png",
    }),
    [
      "/api/canon/cards/GV-PK-TEST-001/image",
      "https://provider.example/card.png",
    ],
  );
});

test("uploaded copy photos remain first, then hosted art, then provider", () => {
  assert.deepEqual(
    orderCatalogImageSourcesV1({
      imageDisplayMode: "uploaded",
      uploadedImageUrl: "https://vault.example/uploaded-copy.jpg",
      hostedImageUrl: "/api/canon/cards/GV-PK-TEST-001/image",
      providerImageUrl: "https://provider.example/card.png",
    }),
    [
      "https://vault.example/uploaded-copy.jpg",
      "/api/canon/cards/GV-PK-TEST-001/image",
      "https://provider.example/card.png",
    ],
  );
});

test("missing uploads fall through to hosted art and duplicate URLs are removed", () => {
  assert.deepEqual(
    orderCatalogImageSourcesV1({
      imageDisplayMode: "uploaded",
      uploadedImageUrl: null,
      hostedImageUrl: "/api/canon/cards/GV-PK-TEST-001/image",
      providerImageUrl: "/api/canon/cards/GV-PK-TEST-001/image",
    }),
    ["/api/canon/cards/GV-PK-TEST-001/image"],
  );
});
