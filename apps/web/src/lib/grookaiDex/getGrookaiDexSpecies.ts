import "server-only";

import { unstable_cache } from "next/cache";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { getOwnedCountsByCardPrintIds } from "@/lib/vault/getOwnedCountsByCardPrintIds";

type DexSpeciesViewRow = {
  id: string | null;
  national_dex_number: number | null;
  display_name: string | null;
  slug: string | null;
  types: string[] | null;
  generation: number | null;
};

type SpeciesMappingRow = {
  species_id: string | null;
  card_print_id: string | null;
};

export type GrookaiDexSpeciesRow = {
  speciesId: string;
  nationalDexNumber: number;
  displayName: string;
  slug: string;
  types: string[];
  generation: number | null;
  totalPrintCount: number;
  ownedPrintCount: number;
  ownedCopyCount: number;
  completionPercent: number;
};

export type GrookaiDexSpeciesPage = {
  species: GrookaiDexSpeciesRow[];
  totalSpeciesCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type GetGrookaiDexSpeciesPageOptions = {
  page?: number;
  pageSize?: number;
  searchQuery?: string | null;
};

function chunkArray<T>(values: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSearchQuery(value: string | null | undefined) {
  return normalizeString(value).replace(/[%_]/g, "").slice(0, 64);
}

type CachedGrookaiDexSpeciesPage = GrookaiDexSpeciesPage & {
  mappings: SpeciesMappingRow[];
};

const getCachedGrookaiDexBaseSpeciesPage = unstable_cache(
  async (
    page: number,
    pageSize: number,
    searchQuery: string,
  ): Promise<CachedGrookaiDexSpeciesPage> => {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const admin = createServerAdminClient();

  let speciesQuery = admin
    .from("pokemon_species")
    .select("id,national_dex_number,display_name,slug,types,generation", { count: "exact" })
    .eq("active", true)
    .order("national_dex_number", { ascending: true });

  if (searchQuery) {
    const numericSearch = Number.parseInt(searchQuery.replace(/^#/, ""), 10);
    const clauses = [
      `display_name.ilike.%${searchQuery}%`,
      `slug.ilike.%${searchQuery.toLowerCase()}%`,
    ];
    if (Number.isInteger(numericSearch) && numericSearch > 0) {
      clauses.push(`national_dex_number.eq.${numericSearch}`);
    }
    speciesQuery = speciesQuery.or(clauses.join(","));
  }

  const { data: speciesRows, error: speciesError, count } = await speciesQuery.range(from, to);

  if (speciesError) {
    throw new Error(`[grookai-dex:species] ${speciesError.message}`);
  }

  const species = ((speciesRows ?? []) as DexSpeciesViewRow[])
    .map((row) => ({
      speciesId: normalizeString(row.id),
      nationalDexNumber: row.national_dex_number ?? 0,
      displayName: normalizeString(row.display_name),
      slug: normalizeString(row.slug),
      types: Array.isArray(row.types) ? row.types.filter((type): type is string => typeof type === "string") : [],
      generation: row.generation ?? null,
      totalPrintCount: 0,
      ownedPrintCount: 0,
      ownedCopyCount: 0,
      completionPercent: 0,
    }))
    .filter((row) => row.speciesId && row.slug && row.nationalDexNumber > 0);

  if (species.length === 0) {
    return {
      species,
      totalSpeciesCount: count ?? species.length,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil((count ?? species.length) / pageSize)),
      mappings: [],
    };
  }

  const speciesIds = species.map((row) => row.speciesId);
  const mappings: SpeciesMappingRow[] = [];
  for (const chunk of chunkArray(speciesIds, 500)) {
    const { data, error } = await admin
      .from("card_print_species")
      .select("species_id,card_print_id")
      .eq("active", true)
      .eq("counts_for_completion", true)
      .in("species_id", chunk);

    if (error) {
      throw new Error(`[grookai-dex:species-mappings] ${error.message}`);
    }
    mappings.push(...((data ?? []) as SpeciesMappingRow[]));
  }

  const printIdsBySpecies = new Map<string, Set<string>>();
  for (const row of mappings) {
    const speciesId = normalizeString(row.species_id);
    const cardPrintId = normalizeString(row.card_print_id);
    if (!speciesId || !cardPrintId) continue;
    const printIds = printIdsBySpecies.get(speciesId) ?? new Set<string>();
    printIds.add(cardPrintId);
    printIdsBySpecies.set(speciesId, printIds);
  }
  const speciesWithTotals = species.map((row) => ({
    ...row,
    totalPrintCount: printIdsBySpecies.get(row.speciesId)?.size ?? 0,
  }));

  return {
    species: speciesWithTotals,
    totalSpeciesCount: count ?? speciesWithTotals.length,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil((count ?? speciesWithTotals.length) / pageSize)),
    mappings,
  };
  },
  ["grookai-dex-base-species-v2"],
  {
    revalidate: 300,
    tags: ["grookai-dex-species"],
  },
);

export async function getGrookaiDexSpeciesPage(
  userId: string | null,
  options: GetGrookaiDexSpeciesPageOptions = {},
): Promise<GrookaiDexSpeciesPage> {
  const pageSize = Math.min(Math.max(options.pageSize ?? 100, 24), 120);
  const page = Math.max(options.page ?? 1, 1);
  const searchQuery = normalizeSearchQuery(options.searchQuery);
  const cachedPage = await getCachedGrookaiDexBaseSpeciesPage(
    page,
    pageSize,
    searchQuery,
  );
  const { mappings, ...publicPage } = cachedPage;

  if (!userId || publicPage.species.length === 0) {
    return publicPage;
  }

  const speciesByCardPrintId = new Map<string, Set<string>>();
  for (const row of mappings) {
    const speciesId = normalizeString(row.species_id);
    const cardPrintId = normalizeString(row.card_print_id);
    if (!speciesId || !cardPrintId) {
      continue;
    }
    const current = speciesByCardPrintId.get(cardPrintId) ?? new Set<string>();
    current.add(speciesId);
    speciesByCardPrintId.set(cardPrintId, current);
  }

  const ownedCountsByCardPrintId = await getOwnedCountsByCardPrintIds(userId, Array.from(speciesByCardPrintId.keys()));
  const ownedPrintsBySpecies = new Map<string, Set<string>>();
  const ownedCopiesBySpecies = new Map<string, number>();

  for (const [cardPrintId, ownedCount] of ownedCountsByCardPrintId.entries()) {
    if (ownedCount <= 0) {
      continue;
    }
    for (const speciesId of speciesByCardPrintId.get(cardPrintId) ?? []) {
      const ownedPrints = ownedPrintsBySpecies.get(speciesId) ?? new Set<string>();
      ownedPrints.add(cardPrintId);
      ownedPrintsBySpecies.set(speciesId, ownedPrints);
      ownedCopiesBySpecies.set(speciesId, (ownedCopiesBySpecies.get(speciesId) ?? 0) + ownedCount);
    }
  }

  return {
    ...publicPage,
    species: publicPage.species.map((row) => {
      const ownedPrintCount = ownedPrintsBySpecies.get(row.speciesId)?.size ?? 0;
      const completionPercent = row.totalPrintCount > 0 ? Math.round((ownedPrintCount / row.totalPrintCount) * 100) : 0;
      return {
        ...row,
        ownedPrintCount,
        ownedCopyCount: ownedCopiesBySpecies.get(row.speciesId) ?? 0,
        completionPercent,
      };
    }),
  };
}

export async function getGrookaiDexSpecies(userId: string | null): Promise<GrookaiDexSpeciesRow[]> {
  const page = await getGrookaiDexSpeciesPage(userId, { page: 1, pageSize: 100 });
  return page.species;
}
