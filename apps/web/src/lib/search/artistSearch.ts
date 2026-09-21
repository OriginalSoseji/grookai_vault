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
  options: { exact?: boolean; languageScope?: PublicLanguageScope; complete?: boolean } = {},
) {
  const names = resolveArtistNames(artist, options.exact ?? false);
  if (names.length === 0) return [];

  const requestForPage = () => {
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
    return request;
  };
  // Preserve the bounded legacy helper for other callers. Artist browsing reads
  // every database page in unique-ID order, with the same RLS/language scope.
  if (options.complete) {
    const rows = [];
    let afterId: string | undefined;
    for (;;) {
      let request = requestForPage().order("id", { ascending: true }).limit(500);
      if (afterId) request = request.gt("id", afterId);
      const { data, error } = await request;
      if (error) throw new Error(error.message);
      const page = data ?? [];
      rows.push(...page);
      if (page.length < 500) return rows;
      const nextId = (page.at(-1) as unknown as { id?: string } | undefined)?.id;
      if (typeof nextId !== "string" || nextId === afterId) {
        throw new Error("Artist search could not advance to the next catalog page");
      }
      afterId = nextId;
    }
  }
  const request = requestForPage();
  const { data, error } = await request.limit(250);
  if (error) throw new Error(error.message);
  return data ?? [];
}
