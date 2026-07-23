import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type BinderSpeciesOption = {
  speciesId: string;
  displayName: string;
  nationalDexNumber: number;
  totalPrintCount: number;
};

export type BinderSetOption = {
  setId: string;
  name: string;
  code: string;
};

export async function getBinderSpeciesOptions(
  supabase: SupabaseClient,
  searchQuery: string,
): Promise<BinderSpeciesOption[]> {
  const normalizedQuery = searchQuery.trim().slice(0, 60);
  let query = supabase
    .from("v_grookai_dex_species_v1")
    .select("species_id,display_name,national_dex_number,total_print_count")
    .eq("active", true)
    .order("national_dex_number", { ascending: true })
    .limit(40);

  if (normalizedQuery) {
    query = query.ilike(
      "display_name",
      `%${normalizedQuery.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`,
    );
  }

  const { data, error } = await query;
  if (error) {
    return [];
  }

  return (data ?? [])
    .map((row) => ({
      speciesId: typeof row.species_id === "string" ? row.species_id : "",
      displayName:
        typeof row.display_name === "string" ? row.display_name : "Pokémon",
      nationalDexNumber:
        typeof row.national_dex_number === "number" ? row.national_dex_number : 0,
      totalPrintCount:
        typeof row.total_print_count === "number" ? row.total_print_count : 0,
    }))
    .filter((row) => row.speciesId && row.nationalDexNumber > 0);
}

export async function getBinderSetOptions(
  supabase: SupabaseClient,
  searchQuery: string,
): Promise<BinderSetOption[]> {
  const normalizedQuery = searchQuery.trim().slice(0, 60);
  let query = supabase
    .from("sets")
    .select("id,name,code")
    .order("release_date", { ascending: false, nullsFirst: false })
    .limit(40);
  if (normalizedQuery) {
    query = query.ilike(
      "name",
      `%${normalizedQuery.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`,
    );
  }
  const { data, error } = await query;
  if (error) {
    return [];
  }
  return (data ?? [])
    .map((row) => ({
      setId: typeof row.id === "string" ? row.id : "",
      name: typeof row.name === "string" ? row.name : "Pokémon set",
      code: typeof row.code === "string" ? row.code : "",
    }))
    .filter((row) => row.setId);
}
