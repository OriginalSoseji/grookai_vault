import type { SupabaseClient } from "@supabase/supabase-js";
import { getCatalogSetPresentation } from "../catalogPresentation";
import { resolveGameScopedSetSearchIntent } from "../publicSets.shared";

type Game = "pokemon" | "one_piece" | "mtg";
export type SearchSet = { id: string; code: string; name: string; printed_set_abbrev?: string | null;
  printed_total?: number | null; release_date?: string | null; identity_model?: string | null };
const words = (value: string) => value.toLowerCase().replace(/&/g, " and ").match(/[\p{L}\p{N}]+/gu) ?? [];
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function stripSetConnector(prefix: string) {
  const tokens = [...prefix.matchAll(/[^\s,]+/gu)];
  let index = tokens.length - 1;
  if (tokens[index]?.[0].toLowerCase() === "the") index -= 1;
  const token = tokens[index];
  return token && ["from", "in"].includes(token[0].toLowerCase())
    ? prefix.slice(0, token.index)
    : prefix;
}

function cleanRemainingText(value: string) {
  // Avoid an unanchored trailing-whitespace regex: trying each starting
  // position can backtrack quadratically on hostile whitespace/comma input.
  const trimmed = value.replace(/\s+/g, " ").trim();
  let start = 0;
  let end = trimmed.length;
  while (start < end && (trimmed[start] === "," || trimmed[start] === " ")) start += 1;
  while (end > start && (trimmed[end - 1] === "," || trimmed[end - 1] === " ")) end -= 1;
  return trimmed.slice(start, end);
}

function phraseMatch(query: string, phrase: string, code = false) {
  const pattern = code ? escape(phrase) : words(phrase).map((word) => word === "and" ? "(?:and|&)" : escape(word)).join("[^\\p{L}\\p{N}]+");
  if (!pattern) return null;
  const matches = query.matchAll(new RegExp(`(?<![\\p{L}\\p{N}])${pattern}(?![\\p{L}\\p{N}])`, "giu"));
  return [...matches].find((match) => (query.slice(0, match.index).match(/"/g) ?? []).length % 2 === 0) ?? null;
}

// Only remove a connector attached to a recognized set. Unknown words remain
// constraints, including 'from' elsewhere in a card name.
export function removeSetPhrase(query: string, phrase: string) {
  const match = phraseMatch(query, phrase);
  if (!match) return query.trim();
  const before = stripSetConnector(query.slice(0, match.index));
  return cleanRemainingText(`${before} ${query.slice(match.index + match[0].length)}`);
}

export function resolveCatalogSetSearchIntent(query: string, game: Game, sets: SearchSet[], ignoredOpeningWords: string[] = []) {
  const empty = { matchedAlias: null as string | null, setCodes: [] as string[], remainingQuery: query.trim(), requiresCardNameCheck: false, openingWordMatch: false };
  if (!query.trim() || /^GV-/i.test(query)) return empty;
  // Reject impossible aliases before compiling thousands of Unicode phrase
  // expressions. Match tokens with the same /iu semantics as phraseMatch:
  // lowercase/includes alone would lose matches such as long-s and Greek sigma.
  // This is only a necessary-word check; phraseMatch still owns order,
  // punctuation, quotes, boundaries, and exact identifier matching.
  const queryWords: string[] = query.match(/[\p{L}\p{N}]+/giu) ?? [];
  if (query.includes("&")) queryWords.push("and");
  const queryWordPattern = new RegExp(`^(?:${queryWords.map(escape).join("|")})$`, "iu");
  const candidates = new Map<string, { source: string; codes: Set<string>; size: number; requiresCardNameCheck: boolean }>();
  function add(alias: string, codes: string[], code = false, curated = false) {
    const requiredWords = code ? alias.match(/[\p{L}\p{N}]+/giu) ?? [] : words(alias);
    if (requiredWords.some((word) => !queryWordPattern.test(word))) return;
    const match = phraseMatch(query, alias, code);
    if (!match) return;
    // Catalog set names can be part of an exact card name, including multiword
    // names such as Team Rocket's Handiwork. Check before creating a filter
    // unless an explicit set connector or identifier resolves the ambiguity.
    const prefix = query.slice(0, match.index);
    const requiresCardNameCheck = !code && !curated &&
      stripSetConnector(prefix) === prefix;
    const key = `${match.index}:${match[0].length}`;
    const candidate = candidates.get(key) ?? { source: match[0], codes: new Set<string>(), size: match[0].length, requiresCardNameCheck };
    codes.forEach((value) => candidate.codes.add(value));
    candidates.set(key, candidate);
  }
  const bundled = resolveGameScopedSetSearchIntent(query, game);
  if (bundled.matchedAlias) add(bundled.matchedAlias, bundled.setCodes, false, true);
  const anniversaryCodes: string[] = [];
  const openingWords = new Map<string, Set<string>>();
  for (const set of sets) {
    const presentation = getCatalogSetPresentation({ ...set, game, printedCode: set.printed_set_abbrev });
    for (const name of new Set([set.name, presentation.name, presentation.name_ja].filter(Boolean))) {
      add(name!, [set.code]);
      const tokens = words(name!);
      const first = tokens[0] ?? "";
      if (game === "pokemon" && tokens.length > 1 && first.length >= 2 && /\p{L}/u.test(first) &&
          !["the", "and", "pokemon", "pokémon"].includes(first)) {
        const codes = openingWords.get(first) ?? new Set<string>();
        codes.add(set.code);
        openingWords.set(first, codes);
      }
    }
    add(set.code, [set.code], words(set.code).join(" ") !== words(set.name).join(" "));
    // Printed codes are identifiers, not the generic presentation fallback.
    const printed = presentation.display_code;
    if (/^[a-z]+[0-9][a-z0-9.-]*$/i.test(printed)) add(printed, [set.code], true);
    if (game === "pokemon" && /\b30th\s+(?:celebration|anniversary)\b/i.test(`${set.name} ${presentation.name}`)) anniversaryCodes.push(set.code);
  }
  if (anniversaryCodes.length) add("30th anniversary", anniversaryCodes, false, true);
  // A complete name/code remains more specific than an opening-word shortcut.
  // Share all releases with the same opening word instead of arbitrarily
  // choosing one. Keep the normal exact-card-name disambiguation for shortcuts.
  let openingWordMatch = false;
  if (!candidates.size && game === "pokemon") {
    // Include translated/product releases whose localized title does not begin
    // with 30th, using the same catalog-backed family as the full alias.
    if (anniversaryCodes.length) add("30th", anniversaryCodes);
    if (!candidates.size) {
      openingWordMatch = true;
      for (const [alias, codes] of openingWords) {
        if (!ignoredOpeningWords.some((ignored) => words(ignored).join(" ") === alias)) add(alias, [...codes]);
      }
    }
  }
  const selected = [...candidates.values()].sort((a, b) => b.size - a.size)[0];
  return selected ? { matchedAlias: selected.source, setCodes: [...selected.codes].sort(), remainingQuery: removeSetPhrase(query, selected.source), requiresCardNameCheck: selected.requiresCardNameCheck, openingWordMatch } : empty;
}

async function readCatalogCardName(client: Pick<SupabaseClient, "rpc">, query: string, game: Game) {
  const { data, error } = await client.rpc("search_game_card_prints_v4", {
    game_code_in: game, q: query, set_code_in: null, number_in: null,
    illustrator_in: null, language_scope_in: "all", limit_in: 1, offset_in: 0,
  });
  if (error) throw new Error(error.message);
  return data?.[0]?.name as string | undefined;
}

export async function isExactCatalogCardName(client: Pick<SupabaseClient, "rpc">, query: string, game: Game) {
  const name = await readCatalogCardName(client, query, game);
  return Boolean(name && words(name).join(" ") === words(query).join(" "));
}

// A partial card name has priority over an implicit set shortcut too:
// Dark Chari must retain Dark Charizard instead of selecting Dark Explorers.
// Verify literal fragments against the returned name; a fuzzy RPC hit alone
// must not silently discard a real set constraint. Explicit connectors bypass
// this ambiguity check at the caller, so "Chari from Dark" still selects a set.
export async function isCatalogCardNameQuery(client: Pick<SupabaseClient, "rpc">, query: string, game: Game) {
  const name = await readCatalogCardName(client, query, game);
  const fragments = words(query);
  const nameWords = words(name ?? "");
  return fragments.length > 0 && fragments.every((fragment) => nameWords.some((word) => word.includes(fragment)));
}

// Request-scoped, caller-visible metadata; never cache one caller's visibility
// globally or accept a truncated catalog as a complete set interpretation.
export async function readSearchSets(client: Pick<SupabaseClient, "rpc">, game: Game): Promise<SearchSet[]> {
  const { data, error } = await client.rpc("get_search_set_catalog_v1", { game_code_in: game });
  if (error) throw new Error(error.message);
  if (data?.complete !== true || !Array.isArray(data.sets) || data.sets.length > 20000) {
    throw new Error("Set search catalog could not be read completely");
  }
  const rows = data.sets as SearchSet[];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row.id !== "string" || typeof row.code !== "string" || typeof row.name !== "string") {
      throw new Error("Set search catalog contains an invalid row");
    }
    if (seen.has(row.id)) throw new Error("Set search catalog did not advance");
    seen.add(row.id);
  }
  return rows;
}
