import "server-only";

import { createServerAdminClient } from "@/lib/supabase/admin";

const MAPPING_PAGE_SIZE = 1_000;

type PokemonSpeciesRow = {
  id: string | null;
  slug: string | null;
  display_name: string | null;
};

type SpeciesMappingRow = {
  id: string | null;
  card_print_id: string | null;
};

export type GrookaiDexSpeciesVaultFilter = {
  slug: string;
  displayName: string;
  cardPrintIds: string[];
};

function normalize(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function getGrookaiDexSpeciesVaultFilter(
  speciesSlug: string,
): Promise<GrookaiDexSpeciesVaultFilter | null> {
  const normalizedSlug = speciesSlug.trim().toLowerCase();
  if (!normalizedSlug) {
    return null;
  }

  const admin = createServerAdminClient();
  const { data: speciesData, error: speciesError } = await admin
    .from("pokemon_species")
    .select("id,slug,display_name")
    .eq("slug", normalizedSlug)
    .eq("active", true)
    .maybeSingle();

  if (speciesError) {
    throw new Error(
      `[grookai-dex:vault-species] ${speciesError.message}`,
    );
  }

  const species = (speciesData ?? null) as PokemonSpeciesRow | null;
  const speciesId = normalize(species?.id);
  if (!species || !speciesId) {
    return null;
  }

  const cardPrintIds = new Set<string>();
  for (let from = 0; ; from += MAPPING_PAGE_SIZE) {
    const { data, error } = await admin
      .from("card_print_species")
      .select("id,card_print_id")
      .eq("species_id", speciesId)
      .eq("active", true)
      .order("id", { ascending: true })
      .range(from, from + MAPPING_PAGE_SIZE - 1);

    if (error) {
      throw new Error(
        `[grookai-dex:vault-species-mappings] ${error.message}`,
      );
    }

    const rows = (data ?? []) as SpeciesMappingRow[];
    for (const row of rows) {
      const cardPrintId = normalize(row.card_print_id);
      if (cardPrintId) {
        cardPrintIds.add(cardPrintId);
      }
    }
    if (rows.length < MAPPING_PAGE_SIZE) {
      break;
    }
  }

  return {
    slug: normalize(species.slug) || normalizedSlug,
    displayName: normalize(species.display_name) || normalizedSlug,
    cardPrintIds: Array.from(cardPrintIds),
  };
}
