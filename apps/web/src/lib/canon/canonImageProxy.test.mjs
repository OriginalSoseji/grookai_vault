import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCanonCardImageProxyUrl,
  normalizeCanonCardImageProxyUrl,
  normalizeCanonImageGvId,
} from "./canonImageProxy.ts";

test("canon image IDs retain the stable uppercase proxy contract", () => {
  assert.equal(normalizeCanonImageGvId("  gv-pk-obf-001  "), "GV-PK-OBF-001");
  assert.equal(
    buildCanonCardImageProxyUrl("gv-pk-obf-001"),
    "/api/canon/cards/GV-PK-OBF-001/image",
  );
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
