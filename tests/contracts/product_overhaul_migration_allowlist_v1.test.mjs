import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const preflight = fs.readFileSync("scripts/migration_preflight_strict.ps1", "utf8");

test("product overhaul migration exception is bound to the exact 12 migration package", () => {
  assert.match(preflight, /\[switch\]\$ProductOverhaulReleaseV1/);
  assert.match(preflight, /\[string\]\$LocalDockerNetworkId/);
  assert.match(preflight, /20261007180000,20261008021000,20261008060000,20261008130000,20261008160000,20261008170000,20261008190000,20261008220000,20261009010000,20261009180000,20261009181000,20261009190000/);
  assert.match(preflight, /ProductOverhaulReleaseV1 permits only the exact 12-migration package/);
  assert.match(preflight, /LocalDockerNetworkId is supported only by ProductOverhaulReleaseV1/);
  assert.match(preflight, /LocalDockerNetworkId -notmatch '\^\[a-zA-Z0-9\]/);
});

test("only four named replacement groups from their fixed migration files can pass the duplicate scan", () => {
  const allowlist = preflight.match(
    /function Test-ProductOverhaulKnownFunctionReplacements \{[\s\S]*?\n\}/,
  )?.[0];
  assert.ok(allowlist);
  for (const name of [
    "price_targets_evaluate_v1",
    "vendor_receipt_book_validate_v1",
    "vendor_sale_cost_capture_v1",
    "vendor_sales_cart_read_v3",
  ]) {
    assert.match(allowlist, new RegExp(name));
  }
  assert.match(allowlist, /DuplicateGroups\.Count -ne \$expected\.Count/);
  assert.match(allowlist, /actualFiles -join ','\) -ne \(\$expectedFiles -join ','/);
  assert.match(allowlist, /create\\s\+or\\s\+replace\\s\+function/);
  assert.match(preflight, /DuplicateFunctions\.Count -gt 0 -and -not \(\$ProductOverhaulReleaseV1 -and \(Test-ProductOverhaulKnownFunctionReplacements/);
  assert.match(preflight, /@\("db", "reset", "--local", "--yes", "--network-id", \$LocalDockerNetworkId\)/);
});
