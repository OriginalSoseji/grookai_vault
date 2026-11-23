import { normalizePublicLanguageScope } from "../publicLanguageScope.ts";

const SUPPORTED_GAMES = ["pokemon", "mtg", "one_piece"] as const;
type SuggestionGame = (typeof SUPPORTED_GAMES)[number];

export function resolveSuggestionScope(game: string | null, language: string | null) {
  const requestedGame = game?.trim().toLowerCase() || "all";
  if (requestedGame !== "all" && !SUPPORTED_GAMES.includes(requestedGame as SuggestionGame)) {
    return null;
  }

  return {
    games: requestedGame === "all" ? [...SUPPORTED_GAMES] : [requestedGame as SuggestionGame],
    language: normalizePublicLanguageScope(language),
  };
}
