import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "getExploreRows.ts"),
  "utf8",
);

test("collector fraction numbers are removed from card-name tokens", () => {
  const fractionTokensBlock = source.match(
    /const fractionNumberTokens = new Set\(([\s\S]*?)\n  \);/,
  );
  assert.ok(fractionTokensBlock, "fraction components must be collected");
  assert.match(fractionTokensBlock[1], /fraction\.split\("\/"\)/);

  const textTokensBlock = source.match(
    /const textTokens = uniqueValues\(([\s\S]*?)\n  \);/,
  );
  assert.ok(textTokensBlock, "name tokens must be filtered before matching");
  assert.match(textTokensBlock[1], /!fractionNumberTokens\.has\(token\)/);
});
