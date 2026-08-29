import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function source(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("set detail counts use game-scoped canonical set ids", () => {
  const loader = source("apps/web/src/lib/publicSets.ts");
  assert.match(loader, /getVisibleCardCountBySetIds/);
  assert.match(loader, /\.in\("set_id", exactSetIds\)/);
  assert.match(loader, /rows\.map\(\(row\) => row\.id \?\? ""\)/);
});

test("MTG product lanes prefer source set type and never infer from one-letter prefixes", () => {
  const config = source("apps/web/src/lib/publicSetBrowseConfig.ts");
  assert.match(config, /catalog_set_type/);
  assert.doesNotMatch(config, /code\.startsWith\("t"\)/);
  assert.doesNotMatch(config, /code\.startsWith\("p"\)/);
});

test("private representative images are copied into the public cover bucket", () => {
  const backfill = source("scripts/audits/cross_tcg_set_cover_backfill_v1.mjs");
  assert.match(backfill, /requires_public_cover_copy/);
  assert.match(backfill, /downloadRepresentativeImage/);
  assert.match(backfill, /set-covers\/\$\{row\.game\}/);
  assert.doesNotMatch(backfill, /\/api\/canon\/cards\/\$\{encodeURIComponent\(card\.gv_id\)\}\/image/);
});
