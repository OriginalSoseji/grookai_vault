import assert from "node:assert/strict";
import test from "node:test";
import { resolveSuggestionScope } from "./suggestionScope.ts";

test("Pokémon suggestions keep the selected language and do not query other games", () => {
  assert.deepEqual(resolveSuggestionScope("pokemon", "ja"), { games: ["pokemon"], language: "ja" });
  assert.deepEqual(resolveSuggestionScope(" POKEMON ", "en"), { games: ["pokemon"], language: "en" });
});

test("existing all-games requests remain supported and unsupported games fail closed", () => {
  assert.deepEqual(resolveSuggestionScope(null, null), { games: ["pokemon", "mtg", "one_piece"], language: "all" });
  assert.deepEqual(resolveSuggestionScope("all", "unknown"), { games: ["pokemon", "mtg", "one_piece"], language: "all" });
  assert.equal(resolveSuggestionScope("unknown", "ja"), null);
});
