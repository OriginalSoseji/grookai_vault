import "server-only";

import { createServerAdminClient } from "@/lib/supabase/admin";

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

type OwnedInstanceRow = {
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

async function getOwnedInstances(userId: string | null, cardPrintIds: string[]) {
  if (!userId || cardPrintIds.length === 0) {
    return [];
  }

  const admin = createServerAdminClient();
  const rows: OwnedInstanceRow[] = [];
  for (const chunk of chunkArray(Array.from(new Set(cardPrintIds)), 500)) {
    const { data, error } = await admin
      .from("vault_item_instances")
      .select("card_print_id")
      .eq("user_id", userId)
      .is("archived_at", null)
      .in("card_print_id", chunk);

    if (error) {
      throw new Error(`[grookai-dex:owned-instances] ${error.message}`);
    }
    rows.push(...((data ?? []) as OwnedInstanceRow[]));
  }
  return rows;
}

export async function getGrookaiDexSpeciesPage(
  userId: string | null,
  options: GetGrookaiDexSpeciesPageOptions = {},
): Promise<GrookaiDexSpeciesPage> {
  const pageSize = Math.min(Math.max(options.pageSize ?? 100, 24), 120);
  const page = Math.max(options.page ?? 1, 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const admin = createServerAdminClient();
  const { data: speciesRows, error: speciesError, count } = await admin
    .from("v_grookai_dex_species_v1")
    .select("species_id,national_dex_number,display_name,slug,types,generation,total_print_count", { count: "exact" })
    .eq("active", true)
    .order("national_dex_number", { ascending: true })
    .range(from, to);

  if (speciesError) {
    throw new Error(`[grookai-dex:species] ${speciesError.message}`);
  }

  const species = ((speciesRows ?? []) as DexSpeciesViewRow[])
    .map((row) => ({
      speciesId: normalizeString(row.species_id),
      nationalDexNumber: row.national_dex_number ?? 0,
      displayName: normalizeString(row.display_name),
      slug: normalizeString(row.slug),
      types: Array.isArray(row.types) ? row.types.filter((type): type is string => typeof type === "string") : [],
      generation: row.generation ?? null,
      totalPrintCount: row.total_print_count ?? 0,
      ownedPrintCount: 0,
      ownedCopyCount: 0,
      completionPercent: 0,
    }))
    .filter((row) => row.speciesId && row.slug && row.nationalDexNumber > 0);

  if (!userId || species.length === 0) {
    return {
      species,
      totalSpeciesCount: count ?? species.length,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil((count ?? species.length) / pageSize)),
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

  const ownedInstances = await getOwnedInstances(userId, Array.from(speciesByCardPrintId.keys()));
  const ownedPrintsBySpecies = new Map<string, Set<string>>();
  const ownedCopiesBySpecies = new Map<string, number>();

  for (const row of ownedInstances) {
    const cardPrintId = normalizeString(row.card_print_id);
    if (!cardPrintId) {
      continue;
    }
    for (const speciesId of speciesByCardPrintId.get(cardPrintId) ?? []) {
      const ownedPrints = ownedPrintsBySpecies.get(speciesId) ?? new Set<string>();
      ownedPrints.add(cardPrintId);
      ownedPrintsBySpecies.set(speciesId, ownedPrints);
      ownedCopiesBySpecies.set(speciesId, (ownedCopiesBySpecies.get(speciesId) ?? 0) + 1);
    }
  }

  return {
    species: species.map((row) => {
      const ownedPrintCount = ownedPrintsBySpecies.get(row.speciesId)?.size ?? 0;
      const completionPercent = row.totalPrintCount > 0 ? Math.round((ownedPrintCount / row.totalPrintCount) * 100) : 0;
      return {
        ...row,
        ownedPrintCount,
        ownedCopyCount: ownedCopiesBySpecies.get(row.speciesId) ?? 0,
        completionPercent,
      };
    }),
    totalSpeciesCount: count ?? species.length,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil((count ?? species.length) / pageSize)),
  };
}

export async function getGrookaiDexSpecies(userId: string | null): Promise<GrookaiDexSpeciesRow[]> {
  const page = await getGrookaiDexSpeciesPage(userId, { page: 1, pageSize: 100 });
  return page.species;
}
