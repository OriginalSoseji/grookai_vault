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
  assert.match(lookup, /search_game_card_prints_v4/);
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

test("cross-TCG exact GV-ID search remains inside the bounded release-authorized RPC", () => {
  const lookup = source("apps/web/src/lib/explore/getExploreRows.ts");
  const migration = source(
    "supabase/migrations/20260823074000_cross_tcg_direct_gvid_search_v4.sql",
  );

  assert.match(lookup, /\.rpc\("search_game_card_prints_v4"/);
  assert.doesNotMatch(
    lookup.slice(
      lookup.indexOf("const canUseBoundedGameRpc"),
      lookup.indexOf("if (canUseBoundedGameRpc)"),
    ),
    /!directGvIdSearch/,
  );
  assert.match(migration, /lower\(v_query\) not like 'gv-%'/i);
  assert.match(migration, /lower\(card\.gv_id\) = lower\(v_query\)/i);
  assert.match(migration, /catalog_game_visible_to_request_v1\(game\.code\)/i);
  assert.match(
    migration,
    /data_quality_flags\s*#>>\s*'\{app_visibility_v1,status\}'/i,
  );
  assert.match(
    migration,
    /grant execute on function public\.search_game_card_prints_v4[\s\S]*to anon, authenticated, service_role/i,
  );
  assert.doesNotMatch(migration, /insert\s+into|update\s+public|delete\s+from/i);
});

test("direct Pokemon identity, set aliases, and value sorts retain the complete evidence path", () => {
  const lookup = source("apps/web/src/lib/explore/getExploreRows.ts");
  const setFetcher = lookup.slice(
    lookup.indexOf("async function fetchCardRowsBySetCode"),
    lookup.indexOf("async function fetchCardRowsByStructuredTextQuery"),
  );

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
    /tokens\.length === 0 &&\s*!query\.directGvId &&\s*query\.expectedSetCodes\.length === 0/,
  );
  assert.match(
    lookup,
    /if \(query\.expectedSetCodes\.length > 0\)[\s\S]*?fetchCardRowsBySetCode\(setCode\)[\s\S]*?if \(tokens\.length === 0\) \{\s*return languageScopedSetRows/,
  );
  assert.match(
    setFetcher,
    /for \(let offset = 0; ; offset \+= SET_FETCH_PAGE_SIZE\)[\s\S]*?\.order\("id", \{ ascending: true \}\)[\s\S]*?\.range\(offset, offset \+ SET_FETCH_PAGE_SIZE - 1\)[\s\S]*?page\.length < SET_FETCH_PAGE_SIZE/,
  );
  assert.doesNotMatch(setFetcher, /\.limit\(250\)/);
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

test("mobile search sends its Supabase session and selected TCG to the governed resolver", () => {
  const model = source("lib/models/card_print.dart");
  const serverClient = source("apps/web/src/lib/supabase/server.ts");
  const main = source("lib/main.dart");
  const vault = source("lib/main_vault.dart");

  assert.match(model, /client\.auth\.currentSession\?\.accessToken/);
  assert.match(model, /'Authorization': 'Bearer \$accessToken'/);
  assert.match(model, /'game': gameScope/);
  assert.doesNotMatch(
    model,
    /if \(gameScope != 'pokemon'\) \{\s*return _searchCardPrintsResolvedFallback/,
  );

  assert.match(serverClient, /headers\(\)/);
  assert.match(serverClient, /\^Bearer\\s\+\\S\+\$/);
  assert.match(serverClient, /global: \{ headers: \{ Authorization: authorization \} \}/);

  for (const clientSurface of [main, vault]) {
    assert.match(clientSurface, /value: 'mtg'/);
    assert.match(clientSurface, /'mtg' => 'mtg'/);
  }
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
