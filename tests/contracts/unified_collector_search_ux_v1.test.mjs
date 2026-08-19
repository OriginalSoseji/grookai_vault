import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function source(path) {
  return fs.readFileSync(path, "utf8");
}

test("web search exposes governed live exact-card suggestions", () => {
  const form = source("apps/web/src/components/PublicSearchForm.tsx");
  const suggestions = source(
    "apps/web/src/lib/search/searchSuggestions.ts",
  );
  const suggestionRoute = source(
    "apps/web/src/app/api/search/suggestions/route.ts",
  );

  assert.match(form, /SEARCH_SUGGESTION_MIN_QUERY_LENGTH/);
  assert.match(form, /\/api\/resolver\/search/);
  assert.match(form, /\/api\/search\/suggestions/);
  assert.match(form, /role="listbox"/);
  assert.match(form, /aria-autocomplete="list"/);
  assert.match(form, /PublicCardImage/);
  assert.match(form, /PUBLIC_GAME_SCOPE_OPTIONS/);
  assert.match(suggestions, /selected_printing_gv_id/);
  assert.match(suggestions, /getSearchSuggestionRequest/);
  assert.match(suggestions, /SEARCH_SUGGESTION_FAMILY_FETCH_LIMIT/);
  assert.match(suggestions, /exactNumber/);
  assert.match(form, /suggestionRequest\.resolverQuery/);
  assert.match(suggestionRoute, /\.from\("card_prints"\)/);
  assert.match(suggestionRoute, /\.ilike\("name"/);
  assert.match(suggestionRoute, /cardQuery\.in\("number", numberCandidates\)/);
  assert.match(suggestionRoute, /catalog_search_suggestions_v1/);
  assert.match(suggestions, /params\.set\("printing", printingGvId\)/);
  assert.match(suggestions, /card\.set_name/);
  assert.match(suggestions, /card\.number/);
  assert.match(suggestions, /card\.rarity/);
});

test("Flutter search exposes all currently governed TCG scopes", () => {
  const app = source("lib/main.dart");

  assert.match(app, /value: 'pokemon'[\s\S]*child: Text\('Pokemon'\)/);
  assert.match(app, /value: 'one_piece'[\s\S]*child: Text\('One Piece'\)/);
  assert.match(app, /value: 'mtg'[\s\S]*child: Text\('Magic: The Gathering'\)/);
  assert.match(app, /_normalizeSearchGameScope/);
});

test("search UX contract preserves product and exact-printing boundaries", () => {
  const contract = source(
    "docs/contracts/UNIFIED_COLLECTOR_SEARCH_UX_V1.md",
  );

  assert.match(contract, /Suggestions never mutate\s+the Vault/);
  assert.match(contract, /must never silently choose a finish or variant/);
  assert.match(contract, /Sealed products and slabs may enter/);
  assert.match(contract, /shared search-document contract/);
});
