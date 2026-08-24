import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCanonCardImageProxyUrl,
  normalizeCanonCardImageProxyUrl,
  normalizeCanonImageGvId,
  resolveCanonCardImageStorageLocation,
} from "./canonImageProxy.ts";

test("canon image IDs retain the stable uppercase proxy contract", () => {
  assert.equal(normalizeCanonImageGvId("  gv-pk-obf-001  "), "GV-PK-OBF-001");
  assert.equal(
    normalizeCanonImageGvId("gv-pk-wcd-2005-bright_aura-06-ex_hidden_legend-89-island_cave"),
    "GV-PK-WCD-2005-BRIGHT_AURA-06-EX_HIDDEN_LEGEND-89-ISLAND_CAVE",
  );
  assert.equal(
    buildCanonCardImageProxyUrl("gv-pk-obf-001"),
    "/api/canon/cards/GV-PK-OBF-001/image",
  );
});

test("canonical card storage locations support only governed bucket families", () => {
  assert.deepEqual(
    resolveCanonCardImageStorageLocation(
      "warehouse-derived/self-hosted-images-v1/card_prints/base1/example.webp",
    ),
    {
      bucket: "user-card-images",
      path: "warehouse-derived/self-hosted-images-v1/card_prints/base1/example.webp",
    },
  );
  assert.deepEqual(
    resolveCanonCardImageStorageLocation(
      "one-piece/card-prints/official/288228/e9587b994cf7216bfd20513cc55f6024.png",
    ),
    {
      bucket: "external-card-images",
      path: "one-piece/card-prints/official/288228/e9587b994cf7216bfd20513cc55f6024.png",
    },
  );

  for (const rejected of [
    "one-piece/card-prints/official/not-a-product/image.png",
    "one-piece/card-prints/official/288228/image.png",
    "one-piece/card-prints/official/288228/../../secret.png",
    "other-game/card-prints/official/288228/e9587b994cf7216bfd20513cc55f6024.png",
  ]) {
    assert.equal(resolveCanonCardImageStorageLocation(rejected), null);
  }
});

test("existing proxy URLs normalize to stable uppercase identifiers", () => {
  assert.equal(
    normalizeCanonCardImageProxyUrl("/api/canon/cards/gv-pk-obf-001/image"),
    "/api/canon/cards/GV-PK-OBF-001/image",
  );
});

test("canon image IDs still reject unsafe route characters", () => {
  assert.equal(normalizeCanonImageGvId("GV-PK-../secret"), null);
  assert.equal(normalizeCanonImageGvId("GV-PK-CARD%2FIMAGE"), null);
  assert.equal(normalizeCanonImageGvId("not-a-gv-id"), null);
});
