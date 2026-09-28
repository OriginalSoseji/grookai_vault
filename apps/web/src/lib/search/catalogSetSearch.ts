import type { SupabaseClient } from "@supabase/supabase-js";
import { getCatalogSetPresentation } from "../catalogPresentation";
import { resolveGameScopedSetSearchIntent } from "../publicSets.shared";

type Game = "pokemon" | "one_piece" | "mtg";
export type SearchSet = { id: string; code: string; name: string; printed_set_abbrev?: string | null };
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

export function resolveCatalogSetSearchIntent(query: string, game: Game, sets: SearchSet[]) {
  const empty = { matchedAlias: null as string | null, setCodes: [] as string[], remainingQuery: query.trim(), requiresCardNameCheck: false };
  if (!query.trim() || /^GV-/i.test(query)) return empty;
  const candidates = new Map<string, { source: string; codes: Set<string>; size: number; requiresCardNameCheck: boolean }>();
  function add(alias: string, codes: string[], code = false, curated = false) {
    const match = phraseMatch(query, alias, code);
    if (!match) return;
    // Short set names may belong to an actual card name (Unidentified Fossil).
    // The route checks that name before turning such a word into a filter.
    const prefix = query.slice(0, match.index);
    const requiresCardNameCheck = !code && !curated && words(alias).length === 1 &&
      stripSetConnector(prefix) === prefix;
    const key = `${match.index}:${match[0].length}`;
    const candidate = candidates.get(key) ?? { source: match[0], codes: new Set<string>(), size: match[0].length, requiresCardNameCheck };
    codes.forEach((value) => candidate.codes.add(value));
    candidates.set(key, candidate);
  }
  const bundled = resolveGameScopedSetSearchIntent(query, game);
  if (bundled.matchedAlias) add(bundled.matchedAlias, bundled.setCodes, false, true);
  const anniversaryCodes: string[] = [];
  for (const set of sets) {
    const presentation = getCatalogSetPresentation({ ...set, game, printedCode: set.printed_set_abbrev });
    for (const name of new Set([set.name, presentation.name, presentation.name_ja].filter(Boolean))) add(name!, [set.code]);
    add(set.code, [set.code], words(set.code).join(" ") !== words(set.name).join(" "));
    // Printed codes are identifiers, not the generic presentation fallback.
    const printed = presentation.display_code;
    if (/^[a-z]+[0-9][a-z0-9.-]*$/i.test(printed)) add(printed, [set.code], true);
    if (game === "pokemon" && /\b30th\s+(?:celebration|anniversary)\b/i.test(`${set.name} ${presentation.name}`)) anniversaryCodes.push(set.code);
  }
  if (anniversaryCodes.length) add("30th anniversary", anniversaryCodes, false, true);
  const selected = [...candidates.values()].sort((a, b) => b.size - a.size)[0];
  return selected ? { matchedAlias: selected.source, setCodes: [...selected.codes].sort(), remainingQuery: removeSetPhrase(query, selected.source), requiresCardNameCheck: selected.requiresCardNameCheck } : empty;
}

export async function isExactCatalogCardName(client: Pick<SupabaseClient, "rpc">, query: string, game: Game) {
  const { data, error } = await client.rpc("search_game_card_prints_v4", {
    game_code_in: game, q: query, set_code_in: null, number_in: null,
    illustrator_in: null, language_scope_in: "all", limit_in: 1, offset_in: 0,
  });
  if (error) throw new Error(error.message);
  return Boolean(data?.[0]?.name && words(data[0].name).join(" ") === words(query).join(" "));
}

// Request-scoped, caller-visible metadata; never cache one caller's visibility
// globally or accept a truncated catalog as a complete set interpretation.
export async function readSearchSets(client: Pick<SupabaseClient, "from">, game: Game): Promise<SearchSet[]> {
  const rows: SearchSet[] = [];
  const seen = new Set<string>();
  for (let offset = 0; offset < 20000; offset += 500) {
    const { data, error } = await client.from("sets").select("id,code,name,printed_set_abbrev")
      .eq("game", game).order("id").range(offset, offset + 499);
    if (error) throw new Error(error.message);
    for (const row of (data ?? []) as SearchSet[]) {
      if (seen.has(row.id)) throw new Error("Set search catalog did not advance");
      seen.add(row.id);
      rows.push(row);
    }
    if ((data ?? []).length < 500) return rows;
  }
  throw new Error("Set search catalog could not be read completely");
}
