import assert from "node:assert/strict";
import test from "node:test";
import {
  addCardReturnPath,
  addCollectionReturnPath,
  getCardReturnContext,
} from "./cardDetailNavigation.ts";

test("card return context keeps approved collection destinations", () => {
  assert.deepEqual(getCardReturnContext("/vault?view=duplicates&page=2"), {
    href: "/vault?view=duplicates&page=2",
    label: "Vault",
  });
  assert.deepEqual(getCardReturnContext("/dex/pikachu?view=missing&layout=grid"), {
    href: "/dex/pikachu?view=missing&layout=grid",
    label: "Dex",
  });
  assert.deepEqual(getCardReturnContext("/sets/MEW"), {
    href: "/sets/MEW",
    label: "Sets",
  });
});

test("card return context rejects external and unrelated destinations", () => {
  for (const value of [
    "https://example.com/vault",
    "//example.com/vault",
    "/account",
    "javascript:alert(1)",
  ]) {
    assert.deepEqual(getCardReturnContext(value), {
      href: "/explore",
      label: "Search",
    });
  }
});

test("card href preserves existing query and hash while adding return context", () => {
  assert.equal(
    addCardReturnPath(
      "/card/GV-PK-MEW-025?printing=reverse&cards=one%2Ctwo#vault-actions",
      "/vault?view=duplicates&page=2",
    ),
    "/card/GV-PK-MEW-025?printing=reverse&cards=one%2Ctwo&from=%2Fvault%3Fview%3Dduplicates%26page%3D2#vault-actions",
  );
});

test("return context is not added to unrelated routes", () => {
  assert.equal(
    addCardReturnPath("/gvvi/GVVI-123", "/vault"),
    "/gvvi/GVVI-123",
  );
});

test("vault management routes preserve the exact originating Vault state", () => {
  const returnPath = "/vault?view=duplicates&page=2";

  assert.equal(
    addCollectionReturnPath("/vault/card/card-print-123", returnPath),
    "/vault/card/card-print-123?from=%2Fvault%3Fview%3Dduplicates%26page%3D2",
  );
  assert.equal(
    addCollectionReturnPath("/vault/gvvi/GVVI-123", returnPath),
    "/vault/gvvi/GVVI-123?from=%2Fvault%3Fview%3Dduplicates%26page%3D2",
  );
});

test("collection return context is not added to unsafe targets", () => {
  assert.equal(
    addCollectionReturnPath("/account", "/vault?view=duplicates"),
    "/account",
  );
  assert.equal(
    addCollectionReturnPath("https://example.com/card/GV-123", "/vault"),
    "https://example.com/card/GV-123",
  );
});
