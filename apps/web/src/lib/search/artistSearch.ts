import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicLanguageScope } from "@/lib/publicLanguageScope";
import artistNames from "./pokemonArtistNames.json";

export function isKnownArtistQuery(value: string) {
  const name = value.trim().replace(/\s+/g, " ").toLowerCase();
  if (["art", "artist", "illustrator", "card", "cards", "pokemon"].includes(name)) return false;
  return name.length >= 3 && artistNames.artists.some((artist) => {
    const normalized = artist.trim().replace(/\s+/g, " ").toLowerCase();
    // Partial automatic recognition is limited to surnames. Interior words in
    // credits such as "2019 Pikachu Project" must remain ordinary card queries.
    return normalized === name || normalized.split(" ").at(-1) === name;
  });
}

export function resolveArtistNames(value: string, exact: boolean) {
  const name = value.trim().replace(/\s+/g, " ").toLowerCase();
  if (name.length < 2) return [];
  const matches = artistNames.artists.filter((artist) => {
    const normalized = artist.trim().replace(/\s+/g, " ").toLowerCase();
    return exact ? normalized === name : normalized.includes(name);
  });
  // A newly ingested artist remains searchable by their exact stored name
  // before the next snapshot refresh. Equality treats wildcard syntax literally.
  return matches.length > 0 ? matches : [value.trim()];
}

export async function fetchPokemonArtistRows(
  client: Pick<SupabaseClient, "from">,
  selectClause: string,
  artist: string,
  options: { exact?: boolean; languageScope?: PublicLanguageScope } = {},
) {
  const names = resolveArtistNames(artist, options.exact ?? false);
  if (names.length === 0) return [];

  let request = client
    .from("card_prints")
    .select(selectClause)
    .like("gv_id", "GV-PK-%")
    .in("artist", names);
  if (options.languageScope === "ja") {
    request = request.like("gv_id", "GV-PK-JPN-%");
  } else if (options.languageScope === "en") {
    request = request.not("gv_id", "like", "GV-PK-JPN-%");
  }
  // Equality can be applied before row visibility checks; ILIKE cannot and
  // times out on this catalog. Keep ranking in the existing search pipeline.
  const { data, error } = await request.limit(250);
  if (error) throw new Error(error.message);
  return data ?? [];
}
