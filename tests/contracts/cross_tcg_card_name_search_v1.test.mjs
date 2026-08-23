import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function source(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("ordinary Pokemon card-name search uses the bounded cross-TCG RPC", () => {
  const route = source("apps/web/src/app/api/resolver/search/route.ts");
  const lookup = source("apps/web/src/lib/explore/getExploreRows.ts");

  assert.match(route, /getExploreRowsForLanguageScopedTextSearch/);
  assert.match(
    lookup,
    /getExploreRowsForGameScopedTextSearch\(\s*boundedQuery,\s*"pokemon"/,
  );
  assert.match(lookup, /search_game_card_prints_v3/);
  assert.match(lookup, /gameScope: PublicGameScope/);
  assert.match(lookup, /gameScope === "pokemon" \? options\.languageScope \?\? "all" : "all"/);
  assert.match(lookup, /single alphanumeric token can be either a collector number or a card/);
  assert.match(lookup, /runBoundedSearch\(searchText, null\)/);
  assert.match(lookup, /const directGvIdSearch = searchText\.toUpperCase\(\)\.startsWith\("GV-"\)/);
  assert.match(lookup, /directGvIdSearch \|\|\s*!normalizedCollectorToken/);
  assert.match(lookup, /!valueSortRequested &&/);
  assert.match(
    lookup,
    /limit\(valueSortRequested \? VALUE_SORT_CANDIDATE_LIMIT \+ 1 : SEARCH_LIMIT\)/,
  );
  assert.match(
    lookup,
    /const parentRows = limitRowsBeforeEnrichment\(\s*scopedParentRows,\s*resolverQuery,\s*sortMode/,
  );
});

test("direct Pokemon identity, set aliases, and value sorts retain the complete evidence path", () => {
  const lookup = source("apps/web/src/lib/explore/getExploreRows.ts");

  assert.match(
    lookup,
    /const packet = normalizeQuery\(rawQuery\);\s*const query = await buildResolverQuery\(packet\)/,
  );
  assert.match(
    lookup,
    /const originalQueryTokens = new Set\([\s\S]*?packet\.normalizedTokens\.map/,
  );
  assert.match(
    lookup,
    /const canonicalNicknameTokens = query\.textTokens\.filter\([\s\S]*?!originalQueryTokens\.has/,
  );
  assert.match(
    lookup,
    /const canonicalNicknameSource =[\s\S]*?NAME_SHORTHANDS\[normalizeTextForMatch\(token\)\][\s\S]*?canonicalNicknameTokens\[0\]/,
  );
  assert.match(
    lookup,
    /const boundedTextTokens =\s*canonicalNicknameSource\s*\? query\.textTokens\.filter\(\(token\) => token !== canonicalNicknameSource\)\s*:\s*query\.textTokens/,
  );
  assert.match(
    lookup,
    /const canUseBoundedSetSearch =\s*query\.expectedSetCodes\.length === 1 &&\s*sortMode === "relevance" &&\s*boundedTextTokens\.length <= 1/,
  );
  assert.match(
    lookup,
    /const boundedNumberTokens = query\.numberTokens\.filter\(\s*\(token\) => !query\.setTokens\.includes\(normalizeTextForMatch\(token\)\)/,
  );
  assert.match(
    lookup,
    /const boundedQuery = boundedSetCode\s*\? \[\.\.\.boundedTextTokens, \.\.\.boundedNumberTokens\]\.join\(" "\)\.trim\(\)/,
  );
  assert.match(
    lookup,
    /query\.expectedSetCodes\.length > 0 && !canUseBoundedSetSearch/,
  );
  assert.match(
    lookup,
    /if \(useCompletePokemonPath\)[\s\S]*?fetchLanguageScopedTextRows\(query, languageScope\)/,
  );
  assert.match(
    lookup,
    /if \(useCompletePokemonPath\)[\s\S]*?limitRowsBeforeEnrichment\(exactRows, query, sortMode\)/,
  );
  assert.match(lookup, /exactSetCode: boundedSetCode \|\| undefined/);
});

test("global search preserves the selected TCG", () => {
  const form = source("apps/web/src/components/PublicSearchForm.tsx");

  assert.match(form, /normalizePublicGameScope/);
  assert.match(form, /const currentGameScope = normalizePublicGameScope\(searchParams\.get\("game"\)\)/);
  assert.match(form, /nextParams\.set\("game", currentGameScope\)/);
  assert.match(form, /name="game" value=\{currentGameScope\}/);
});

test("mobile search falls back instead of accepting a timeout as no-match", () => {
  const model = source("lib/models/card_print.dart");

  assert.match(model, /decoded\['sort_degraded_reason'\]/);
  assert.match(model, /resolverSource\.contains\('_degraded_'\)/);
  assert.match(model, /throw StateError\('Resolver degraded: \$reason'\)/);
  assert.match(model, /search:web_resolver_failed fallback=local/);

  const route = source("apps/web/src/app/api/resolver/search/route.ts");
  assert.match(
    route,
    /if \(isTimeoutLikeError\(error\)\)[\s\S]*?sort_degraded_reason: "resolver_timeout"[\s\S]*?rows: \[\]/,
  );
});

test("V3 applies authority, suppression, and language filters before limiting", () => {
  const migration = source(
    "supabase/migrations/20260822230000_cross_tcg_card_search_v3.sql",
  );
  const suppressionPosition = migration.indexOf("data_quality_flags #>>");
  const languagePosition = migration.indexOf("scope.language_scope = 'ja'");
  const limitPosition = migration.lastIndexOf("limit (select result_limit");

  assert.ok(suppressionPosition > 0);
  assert.ok(languagePosition > suppressionPosition);
  assert.ok(limitPosition > languagePosition);
  assert.doesNotMatch(migration, /insert\s+into|update\s+public|delete\s+from/i);
});
