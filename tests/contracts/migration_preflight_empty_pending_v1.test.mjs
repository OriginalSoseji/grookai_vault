import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const preflight = fs.readFileSync(
  "scripts/migration_preflight_strict.ps1",
  "utf8",
);

test("strict migration preflight accepts an empty expected and actual pending set", () => {
  const compareFunction = preflight.match(
    /function Compare-IdSets \{[\s\S]*?^\}/m,
  )?.[0];

  assert.ok(compareFunction, "Compare-IdSets must remain defined");
  assert.match(
    compareFunction,
    /\[AllowEmptyCollection\(\)\]\s*\[string\[\]\]\$Expected/,
  );
  assert.match(
    compareFunction,
    /\[AllowEmptyCollection\(\)\]\s*\[string\[\]\]\$Actual/,
  );
});

test("linked audit reports local-only migrations without claiming complete ledger parity", () => {
  assert.match(preflight, /Local-only IDs \(not applied\)/);
  assert.match(preflight, /not complete ledger parity/);
  assert.doesNotMatch(preflight, /Linked migration ledger is clean and linked schema diff is empty/);
  assert.match(preflight, /FAIL - Linked Schema Drift Detected/);
});
