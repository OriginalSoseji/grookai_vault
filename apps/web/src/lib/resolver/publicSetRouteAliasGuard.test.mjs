import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function readSource(...segments) {
  return readFileSync(join(sourceRoot, ...segments), "utf8");
}

function extractRouteAliasMap(source) {
  const match = source.match(/PUBLIC_SET_ROUTE_ALIAS_MAP:[\s\S]+?\n};/);
  assert.ok(match, "PUBLIC_SET_ROUTE_ALIAS_MAP must exist");
  return match[0];
}

test("public source-route aliases resolve only approved route aliases", () => {
  const shared = readSource("lib", "publicSets.shared.ts");
  const aliasMap = extractRouteAliasMap(shared);

  assert.match(aliasMap, /"shiny vault": "sma"/);
  assert.match(aliasMap, /"shiny-vault": "sma"/);
  assert.match(aliasMap, /rm: "ru1"/);
  assert.match(aliasMap, /sv3pt5: "sv03\.5"/);
  assert.match(aliasMap, /sm35: "sm3\.5"/);

  assert.doesNotMatch(aliasMap, /sv4pt5|sv8pt5|sv6pt5|pgo|swsh10\.5/);
});

test("public runtime paths consume the shared set route alias resolver", () => {
  const publicSets = readSource("lib", "publicSets.ts");
  const apiSearch = readSource("app", "api", "resolver", "search", "route.ts");
  const routing = readSource("lib", "publicSearchRouting.ts");

  assert.match(publicSets, /resolvePublicSetRouteCode\(setCode\)/);
  assert.match(apiSearch, /resolvePublicSetRouteCode\(normalizeSetCode/);
  assert.match(routing, /\.\.\.Object\.keys\(SET_INTENT_ALIAS_MAP\)/);
  assert.match(routing, /EXACT_SET_ALIASES\.has\(normalized\)/);
});
