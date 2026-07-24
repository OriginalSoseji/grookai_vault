import "server-only";

import { unstable_cache } from "next/cache";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { getOwnedCountsByCardPrintIds } from "@/lib/vault/getOwnedCountsByCardPrintIds";
import {
  chunkValues,
  getRemainingPageIndexes,
  mapWithBoundedConcurrency,
} from "@/lib/pagination";

type DexSpeciesViewRow = {
  species_id: string | null;
  national_dex_number: number | null;
  display_name: string | null;
  slug: string | null;
  types: string[] | null;
  generation: number | null;
  total_print_count: number | null;
};

type SpeciesMappingRow = {
  species_id: string | null;
  card_print_id: string | null;
};

const SUPABASE_MAPPING_PAGE_SIZE = 1_000;
const SUPABASE_MAPPING_CONCURRENCY = 4;

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

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSearchQuery(value: string | null | undefined) {
  return normalizeString(value).replace(/[%_]/g, "").slice(0, 64);
}

const getCachedGrookaiDexBaseSpeciesPage = unstable_cache(
  async (
    page: number,
    pageSize: number,
    searchQuery: string,
  ): Promise<GrookaiDexSpeciesPage> => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const admin = createServerAdminClient();

    let speciesQuery = admin
      .from("v_grookai_dex_species_v1")
      .select(
        "species_id,national_dex_number,display_name,slug,types,generation,total_print_count",
        { count: "exact" },
      )
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
        speciesId: normalizeString(row.species_id),
        nationalDexNumber: row.national_dex_number ?? 0,
        displayName: normalizeString(row.display_name),
        slug: normalizeString(row.slug),
        types: Array.isArray(row.types)
          ? row.types.filter((type): type is string => typeof type === "string")
          : [],
        generation: row.generation ?? null,
        totalPrintCount: Math.max(0, row.total_print_count ?? 0),
        ownedPrintCount: 0,
        ownedCopyCount: 0,
        completionPercent: 0,
      }))
      .filter((row) => row.speciesId && row.slug && row.nationalDexNumber > 0);

    return {
      species,
      totalSpeciesCount: count ?? species.length,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil((count ?? species.length) / pageSize)),
    };
  },
  ["grookai-dex-base-species-v4"],
  {
    revalidate: 300,
    tags: ["grookai-dex-species"],
  },
);

const getCachedGrookaiDexMappings = unstable_cache(
  async (speciesIds: string[]): Promise<SpeciesMappingRow[]> => {
    const admin = createServerAdminClient();
    const mappings: SpeciesMappingRow[] = [];
    for (const chunk of chunkValues(speciesIds, 500)) {
      const { data: firstData, error: firstError, count: mappingCount } = await admin
        .from("card_print_species")
        .select("id,species_id,card_print_id", { count: "exact" })
        .eq("active", true)
        .eq("counts_for_completion", true)
        .in("species_id", chunk)
        .order("id", { ascending: true })
        .range(0, SUPABASE_MAPPING_PAGE_SIZE - 1);

      if (firstError) {
        throw new Error(`[grookai-dex:species-mappings] ${firstError.message}`);
      }

      const firstPage = (firstData ?? []) as SpeciesMappingRow[];
      mappings.push(...firstPage);
      if (firstPage.length < SUPABASE_MAPPING_PAGE_SIZE) {
        continue;
      }

      const fetchMappingPage = async (pageIndex: number) => {
        const mappingFrom = pageIndex * SUPABASE_MAPPING_PAGE_SIZE;
        const mappingTo = mappingFrom + SUPABASE_MAPPING_PAGE_SIZE - 1;
        const { data, error } = await admin
          .from("card_print_species")
          .select("id,species_id,card_print_id")
          .eq("active", true)
          .eq("counts_for_completion", true)
          .in("species_id", chunk)
          .order("id", { ascending: true })
          .range(mappingFrom, mappingTo);

        if (error) {
          throw new Error(`[grookai-dex:species-mappings] ${error.message}`);
        }
        return (data ?? []) as SpeciesMappingRow[];
      };

      if (typeof mappingCount === "number") {
        const remainingPageIndexes = getRemainingPageIndexes(
          mappingCount,
          SUPABASE_MAPPING_PAGE_SIZE,
        );
        const pageRows = await mapWithBoundedConcurrency(
          remainingPageIndexes,
          SUPABASE_MAPPING_CONCURRENCY,
          fetchMappingPage,
        );
        mappings.push(...pageRows.flat());
        continue;
      }

      for (let pageIndex = 1; ; pageIndex += 1) {
        const mappingPage = await fetchMappingPage(pageIndex);
        mappings.push(...mappingPage);
        if (mappingPage.length < SUPABASE_MAPPING_PAGE_SIZE) {
          break;
        }
      }
    }

    return mappings;
  },
  ["grookai-dex-species-mappings-v1"],
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
  const publicPage = await getCachedGrookaiDexBaseSpeciesPage(
    page,
    pageSize,
    searchQuery,
  );

  if (!userId || publicPage.species.length === 0) {
    return publicPage;
  }

  const mappings = await getCachedGrookaiDexMappings(
    publicPage.species.map((row) => row.speciesId),
  );
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
