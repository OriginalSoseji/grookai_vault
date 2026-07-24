import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("./dexQuery.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const {
  buildGrookaiDexSpeciesSearchFilter,
  getEffectiveGrookaiDexPage,
  normalizeGrookaiDexSearchQuery,
  quotePostgrestFilterValue,
} = await import(moduleUrl);

test("Dex search safely quotes PostgREST-reserved punctuation", () => {
  const query = 'Mr. Mime, (regional) "promo"\\';
  const filter = buildGrookaiDexSpeciesSearchFilter(query);

  assert.equal(normalizeGrookaiDexSearchQuery(query), query);
  assert.match(
    filter,
    /^display_name\.ilike\."%Mr\. Mime, \(regional\) \\"promo\\"\\\\%"/,
  );
  assert.match(
    filter,
    /,slug\.ilike\."%mr\. mime, \(regional\) \\"promo\\"\\\\%"/,
  );
  assert.equal(
    quotePostgrestFilterValue('Pikachu),active.eq.false,"x"'),
    '"Pikachu),active.eq.false,\\"x\\""',
  );
  assert.equal(normalizeGrookaiDexSearchQuery("Pika%_chu"), "Pikachu");
});

test("Dex pages clamp invalid and out-of-range requests", () => {
  assert.equal(getEffectiveGrookaiDexPage(999, 7), 7);
  assert.equal(getEffectiveGrookaiDexPage(4, 7), 4);
  assert.equal(getEffectiveGrookaiDexPage(0, 7), 1);
  assert.equal(getEffectiveGrookaiDexPage(Number.MAX_VALUE, 7), 1);
});
