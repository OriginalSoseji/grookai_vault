import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const read = (...segments) =>
  readFileSync(path.join(ROOT, ...segments), "utf8");

const DEFINITION = read(
  "docs",
  "contracts",
  "MEE_PRICING_PLATFORM_PRODUCTION_V1_DEFINITION_OF_DONE.md",
);
const FEATURE_FREEZE = read(
  "docs",
  "release",
  "MEE_PRICING_PLATFORM_PRODUCTION_V1_FEATURE_FREEZE.md",
);
const PARKING_LOT = read(
  "docs",
  "release",
  "MEE_PRICING_PLATFORM_V1_1_PARKING_LOT.md",
);
const CONTRACT_INDEX = read(
  "docs",
  "contracts",
  "PRICING_CONTRACT_INDEX.md",
);

test("Production V1 Definition of Done preserves its three frozen sections", () => {
  assert.match(DEFINITION, /\*\*Status: FROZEN\*\*/);
  assert.match(DEFINITION, /^## 1\. Product Contract$/m);
  assert.match(DEFINITION, /^## 2\. Operational Release Gates$/m);
  assert.match(DEFINITION, /^## 3\. Post-V1 Backlog$/m);
  assert.match(
    DEFINITION,
    /Production completion requires proven operation over time, not merely\s+working code\./,
  );
  assert.match(
    DEFINITION,
    /Any such change creates Production V1\.1 or Production V2\./,
  );
});

test("Production V1 authority and exact-printing boundaries cannot drift", () => {
  assert.match(
    DEFINITION,
    /TCGPlayer `marketPrice` is the sole Production V1 market close\./,
  );
  assert.match(
    DEFINITION,
    /Production V1 has no Grookai Value, blended value, inferred value/,
  );
  assert.match(
    DEFINITION,
    /Exact holdings and selected printings never inherit parent or sibling\s+pricing\./,
  );
  assert.match(DEFINITION, /English Pokémon raw single cards/);
  assert.match(DEFINITION, /at least 95 percent/);
  assert.match(DEFINITION, /All 17 required web and Flutter pricing surfaces/);
  assert.match(DEFINITION, /Seven consecutive unattended daily production cycles/);
});

test("feature freeze permits release work and rejects scope expansion", () => {
  assert.match(FEATURE_FREEZE, /\*\*Status: ACTIVE\*\*/);
  for (const allowed of [
    "bug fixes",
    "rollout gates",
    "deployment work",
    "verification",
    "operational reliability",
  ]) {
    assert.match(FEATURE_FREEZE, new RegExp(allowed, "i"));
  }
  for (const forbidden of [
    "new features",
    "architectural redesign",
    "opportunistic refactors",
    "unrelated UX improvements",
  ]) {
    assert.match(FEATURE_FREEZE, new RegExp(forbidden, "i"));
  }
});

test("future pricing scope is parked outside Production V1", () => {
  for (const parked of [
    "Japanese pricing",
    "slabs and graded-card pricing",
    "sealed products",
    "Grookai Value",
    "sold-history weighting",
    "other TCGs",
  ]) {
    assert.match(PARKING_LOT, new RegExp(parked, "i"));
  }
  assert.match(
    PARKING_LOT,
    /No parked item may be implemented, migrated, deployed, or used to delay\s+Production V1\./,
  );
});

test("pricing contract index points to the frozen release definition", () => {
  assert.match(
    CONTRACT_INDEX,
    /MEE_PRICING_PLATFORM_PRODUCTION_V1_DEFINITION_OF_DONE\.md/,
  );
  assert.match(CONTRACT_INDEX, /frozen\s+Production V1 release definition/);
});
