import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function readSource(...segments) {
  return readFileSync(join(sourceRoot, ...segments), "utf8");
}

test("expanded vault cards remove exact copies without opening Manage copies", () => {
  const desktopTile = readSource("components", "vault", "VaultCardTile.tsx");
  const mobileViews = readSource("components", "vault", "VaultMobileViews.tsx");

  for (const source of [desktopTile, mobileViews]) {
    assert.match(source, /OwnedObjectRemoveAction/);
    assert.match(source, /instanceId=\{copy\.instance_id\}/);
    assert.match(source, /copy\.is_graded \? "Remove slab" : "Remove copy"/);
  }
});
