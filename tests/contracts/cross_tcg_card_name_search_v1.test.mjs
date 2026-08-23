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
  assert.match(lookup, /getExploreRowsForGameScopedTextSearch\(\s*rawQuery,\s*"pokemon"/);
  assert.match(lookup, /search_game_card_prints_v3/);
  assert.match(lookup, /gameScope: PublicGameScope/);
  assert.match(lookup, /gameScope === "pokemon" \? options\.languageScope \?\? "all" : "all"/);
  assert.match(lookup, /single alphanumeric token can be either a collector number or a card/);
  assert.match(lookup, /runBoundedSearch\(searchText, null\)/);
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
  assert.match(model, /throw StateError\('Resolver degraded: \$degradedReason'\)/);
  assert.match(model, /search:web_resolver_failed fallback=local/);
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
