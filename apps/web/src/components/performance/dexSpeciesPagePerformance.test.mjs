import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(
  path.join(here, "..", "..", "app", "dex", "[speciesSlug]", "page.tsx"),
  "utf8",
);

test("species pages bound rendered cards and defer off-screen images", () => {
  assert.match(source, /DEX_CARD_PAGE_SIZE\s*=\s*48/);
  assert.match(source, /visibleCards\.slice\(pageStart, pageStart \+ DEX_CARD_PAGE_SIZE\)/);
  assert.match(source, /pageCards\.map/);
  assert.match(source, /loading="lazy"/);
  assert.match(source, /decoding="async"/);
  assert.match(source, /aria-label="Card result pages"/);
});
