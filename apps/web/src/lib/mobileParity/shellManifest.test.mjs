import assert from "node:assert/strict";
import test from "node:test";
import {
  getMobileRouteChromeMode,
  shouldSuppressMobileChrome,
} from "./shellManifest.ts";

test("Vault collection details use pushed mobile chrome", () => {
  for (const pathname of [
    "/vault/card/card-print-123",
    "/vault/gvvi/GVVI-123?from=%2Fvault%3Fpage%3D2",
  ]) {
    assert.equal(getMobileRouteChromeMode(pathname), "pushed");
    assert.equal(shouldSuppressMobileChrome(pathname), true);
  }
});

test("the Vault collection itself keeps root mobile chrome", () => {
  assert.equal(getMobileRouteChromeMode("/vault?view=duplicates"), "root");
  assert.equal(shouldSuppressMobileChrome("/vault?view=duplicates"), false);
});
