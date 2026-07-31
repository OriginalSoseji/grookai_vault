import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeVisualSearchTextV1 } from "./card_visual_search_evaluation_bootstrap_v1.mjs";

export const CARD_VISUAL_SEARCH_POKEMON_IDENTITY_VERSION = "CARD_VISUAL_SEARCH_POKEMON_IDENTITY_V1";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, "../..");
const DEFAULT_IDENTITY_MAP_PATH = path.join(REPO_ROOT, "lib/services/identity/pokemon_japanese_name_map.dart");

export function buildPokemonVisualIdentityLexiconV1(source) {
  const names = new Set();
  const entryPattern = /^\s*'([^']+)'\s*:\s*'([^']+)'\s*,?\s*$/gmu;
  for (const match of String(source ?? "").matchAll(entryPattern)) {
    for (const value of [match[1], match[2]]) {
      const normalized = normalizeVisualSearchTextV1(value);
      if (normalized) names.add(normalized);
    }
  }
  if (names.size < 1000) throw new Error(`Pokemon identity map unexpectedly small: ${names.size}`);
  return {
    version: CARD_VISUAL_SEARCH_POKEMON_IDENTITY_VERSION,
    names: [...names].sort((left, right) => right.length - left.length || left.localeCompare(right)),
  };
}

export function loadPokemonVisualIdentityLexiconV1(identityMapPath = DEFAULT_IDENTITY_MAP_PATH) {
  return buildPokemonVisualIdentityLexiconV1(readFileSync(identityMapPath, "utf8"));
}

export function pokemonIdentityMatchesTextV1(value, lexicon) {
  const normalized = normalizeVisualSearchTextV1(value).replace(/(?<=\p{L})-(?=\p{L})/gu, " ");
  if (!normalized) return false;
  const padded = ` ${normalized} `;
  return lexicon.names.some((name) => padded.includes(` ${name} `));
}
