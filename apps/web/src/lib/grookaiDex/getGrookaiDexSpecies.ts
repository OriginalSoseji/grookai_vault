import "server-only";

import { unstable_cache } from "next/cache";
import { createServerAdminClient } from "@/lib/supabase/admin";
import {
  buildGrookaiDexSpeciesSearchFilter,
  getEffectiveGrookaiDexPage,
  normalizeGrookaiDexSearchQuery,
} from "@/lib/grookaiDex/dexQuery";
import { getAllOwnedCountsForUser } from "@/lib/vault/getOwnedCountsByCardPrintIds";
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
  id?: string | null;
  species_id: string | null;
  card_print_id: string | null;
};

type DexSpeciesOverviewBaseRow = {
  speciesId: string;
  totalPrintCount: number;
};

const SUPABASE_MAPPING_PAGE_SIZE = 1_000;
const SUPABASE_MAPPING_CONCURRENCY = 4;
const SUPABASE_MAPPING_CARD_CHUNK_SIZE = 250;
const SUPABASE_SPECIES_OVERVIEW_PAGE_SIZE = 1_000;

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
  overview: GrookaiDexOverview;
};

export type GrookaiDexOverview = {
  totalSpeciesCount: number;
  totalPrintCount: number;
  ownedPrintCount: number;
  startedSpeciesCount: number;
  completeSpeciesCount: number;
  missingSpeciesCount: number;
  completionPercent: number;
};

type GrookaiDexPublicSpeciesPage = Omit<GrookaiDexSpeciesPage, "overview">;

type GetGrookaiDexSpeciesPageOptions = {
  page?: number;
  pageSize?: number;
  searchQuery?: string | null;
};

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

const getCachedGrookaiDexBaseSpeciesPage = unstable_cache(
  async (
    page: number,
    pageSize: number,
    searchQuery: string,
  ): Promise<GrookaiDexPublicSpeciesPage> => {
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
      speciesQuery = speciesQuery.or(
        buildGrookaiDexSpeciesSearchFilter(searchQuery),
      );
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

const getCachedGrookaiDexOverviewBase = unstable_cache(
  async (): Promise<DexSpeciesOverviewBaseRow[]> => {
    const admin = createServerAdminClient();
    const species: DexSpeciesOverviewBaseRow[] = [];
    for (let from = 0; ; from += SUPABASE_SPECIES_OVERVIEW_PAGE_SIZE) {
      const to = from + SUPABASE_SPECIES_OVERVIEW_PAGE_SIZE - 1;
      const { data, error } = await admin
        .from("v_grookai_dex_species_v1")
        .select("species_id,total_print_count")
        .eq("active", true)
        .order("national_dex_number", { ascending: true })
        .range(from, to);

      if (error) {
        throw new Error(`[grookai-dex:overview] ${error.message}`);
      }

      const page = ((data ?? []) as Array<{
        species_id: string | null;
        total_print_count: number | null;
      }>)
        .map((row) => ({
          speciesId: normalizeString(row.species_id),
          totalPrintCount: Math.max(0, row.total_print_count ?? 0),
        }))
        .filter((row) => row.speciesId.length > 0);
      species.push(...page);
      if ((data ?? []).length < SUPABASE_SPECIES_OVERVIEW_PAGE_SIZE) {
        break;
      }
    }
    return species;
  },
  ["grookai-dex-overview-base-v1"],
  {
    revalidate: 300,
    tags: ["grookai-dex-species"],
  },
);

async function getOwnedCompletionMappings(
  cardPrintIds: string[],
): Promise<SpeciesMappingRow[]> {
  const normalizedCardPrintIds = Array.from(
    new Set(
      cardPrintIds
        .map((cardPrintId) => cardPrintId.trim())
        .filter((cardPrintId) => cardPrintId.length > 0),
    ),
  ).sort();
  if (normalizedCardPrintIds.length === 0) {
    return [];
  }

  const admin = createServerAdminClient();
  const chunkRows = await mapWithBoundedConcurrency(
    chunkValues(normalizedCardPrintIds, SUPABASE_MAPPING_CARD_CHUNK_SIZE),
    SUPABASE_MAPPING_CONCURRENCY,
    async (chunk) => {
      const { data: firstData, error: firstError, count: mappingCount } =
        await admin
          .from("card_print_species")
          .select("id,species_id,card_print_id", { count: "exact" })
          .eq("active", true)
          .eq("counts_for_completion", true)
          .in("card_print_id", chunk)
          .order("id", { ascending: true })
          .range(0, SUPABASE_MAPPING_PAGE_SIZE - 1);

      if (firstError) {
        throw new Error(
          `[grookai-dex:owned-species-mappings] ${firstError.message}`,
        );
      }

      const mappings = (firstData ?? []) as SpeciesMappingRow[];
      const fetchMappingPage = async (pageIndex: number) => {
        const mappingFrom = pageIndex * SUPABASE_MAPPING_PAGE_SIZE;
        const mappingTo = mappingFrom + SUPABASE_MAPPING_PAGE_SIZE - 1;
        const { data, error } = await admin
          .from("card_print_species")
          .select("id,species_id,card_print_id")
          .eq("active", true)
          .eq("counts_for_completion", true)
          .in("card_print_id", chunk)
          .order("id", { ascending: true })
          .range(mappingFrom, mappingTo);

        if (error) {
          throw new Error(
            `[grookai-dex:owned-species-mappings] ${error.message}`,
          );
        }
        return (data ?? []) as SpeciesMappingRow[];
      };

      if (typeof mappingCount === "number") {
        const remainingPageIndexes = getRemainingPageIndexes(
          mappingCount,
          SUPABASE_MAPPING_PAGE_SIZE,
        );
        const remainingPages = await mapWithBoundedConcurrency(
          remainingPageIndexes,
          SUPABASE_MAPPING_CONCURRENCY,
          fetchMappingPage,
        );
        mappings.push(...remainingPages.flat());
        return mappings;
      }

      for (
        let pageIndex = 1;
        mappings.length >= pageIndex * SUPABASE_MAPPING_PAGE_SIZE;
        pageIndex += 1
      ) {
        const page = await fetchMappingPage(pageIndex);
        mappings.push(...page);
        if (page.length < SUPABASE_MAPPING_PAGE_SIZE) {
          break;
        }
      }
      return mappings;
    },
  );
  return chunkRows.flat();
}

function buildGrookaiDexOverview(
  baseSpecies: DexSpeciesOverviewBaseRow[],
  ownedPrintsBySpecies: Map<string, Set<string>>,
): GrookaiDexOverview {
  let totalPrintCount = 0;
  let ownedPrintCount = 0;
  let startedSpeciesCount = 0;
  let completeSpeciesCount = 0;
  let missingSpeciesCount = 0;

  for (const species of baseSpecies) {
    const speciesOwnedPrintCount =
      ownedPrintsBySpecies.get(species.speciesId)?.size ?? 0;
    totalPrintCount += species.totalPrintCount;
    ownedPrintCount += speciesOwnedPrintCount;
    if (speciesOwnedPrintCount > 0) {
      startedSpeciesCount += 1;
    }
    if (
      species.totalPrintCount > 0 &&
      speciesOwnedPrintCount >= species.totalPrintCount
    ) {
      completeSpeciesCount += 1;
    } else if (species.totalPrintCount > 0) {
      missingSpeciesCount += 1;
    }
  }

  return {
    totalSpeciesCount: baseSpecies.length,
    totalPrintCount,
    ownedPrintCount,
    startedSpeciesCount,
    completeSpeciesCount,
    missingSpeciesCount,
    completionPercent:
      totalPrintCount > 0
        ? Math.min(
            100,
            Math.max(0, Math.round((ownedPrintCount / totalPrintCount) * 100)),
          )
        : 0,
  };
}

export async function getGrookaiDexSpeciesPage(
  userId: string | null,
  options: GetGrookaiDexSpeciesPageOptions = {},
): Promise<GrookaiDexSpeciesPage> {
  const pageSize = Math.min(Math.max(options.pageSize ?? 100, 24), 120);
  const requestedPage = options.page ?? 1;
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;
  const searchQuery = normalizeGrookaiDexSearchQuery(options.searchQuery);
  const normalizedUserId = normalizeString(userId);
  // The Full Dex overview spans every species, so it must begin with every
  // owned parent identity rather than only the species on this page. There is
  // no server-side aggregate for this user-scoped mapping; pagination below
  // keeps the required complete read bounded per request.
  const [requestedPublicPage, overviewBase, ownedCountsByCardPrintId] =
    await Promise.all([
      getCachedGrookaiDexBaseSpeciesPage(page, pageSize, searchQuery),
      getCachedGrookaiDexOverviewBase(),
      normalizedUserId
        ? getAllOwnedCountsForUser(normalizedUserId)
        : Promise.resolve(new Map<string, number>()),
    ]);
  const effectivePage = getEffectiveGrookaiDexPage(
    page,
    requestedPublicPage.totalPages,
  );
  const publicPage =
    effectivePage === requestedPublicPage.page
      ? requestedPublicPage
      : await getCachedGrookaiDexBaseSpeciesPage(
          effectivePage,
          pageSize,
          searchQuery,
        );

  const mappings =
    ownedCountsByCardPrintId.size > 0
      ? await getOwnedCompletionMappings(
          Array.from(ownedCountsByCardPrintId.keys()),
        )
      : [];
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

  const ownedPrintsBySpecies = new Map<string, Set<string>>();
  const ownedCopiesBySpecies = new Map<string, number>();

  for (const [cardPrintId, ownedCount] of ownedCountsByCardPrintId.entries()) {
    if (ownedCount <= 0) {
      continue;
    }
    for (const speciesId of speciesByCardPrintId.get(cardPrintId) ?? []) {
      const ownedPrints =
        ownedPrintsBySpecies.get(speciesId) ?? new Set<string>();
      ownedPrints.add(cardPrintId);
      ownedPrintsBySpecies.set(speciesId, ownedPrints);
      ownedCopiesBySpecies.set(
        speciesId,
        (ownedCopiesBySpecies.get(speciesId) ?? 0) + ownedCount,
      );
    }
  }

  return {
    ...publicPage,
    overview: buildGrookaiDexOverview(overviewBase, ownedPrintsBySpecies),
    species: publicPage.species.map((row) => {
      const ownedPrintCount =
        ownedPrintsBySpecies.get(row.speciesId)?.size ?? 0;
      const completionPercent =
        row.totalPrintCount > 0
          ? Math.round((ownedPrintCount / row.totalPrintCount) * 100)
          : 0;
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
