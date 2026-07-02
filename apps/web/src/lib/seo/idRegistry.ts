import "server-only";

import { cache } from "react";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { getPublicSets } from "@/lib/publicSets";

export const ID_REGISTRY_PAGE_SIZE = 1_000;

type CardIdRegistryRow = {
  gv_id: string | null;
  name: string | null;
  set_code: string | null;
  number: string | null;
  updated_at: string | null;
  sets?:
    | {
        name: string | null;
        release_date: string | null;
      }
    | {
        name: string | null;
        release_date: string | null;
      }[]
    | null;
};

export type CardIdRegistryEntry = {
  gvId: string;
  name: string;
  setCode: string | null;
  setName: string | null;
  number: string | null;
  updatedAt: string | null;
  language: "Japanese" | "English";
};

export type CardIdRegistrySummary = {
  totalCards: number;
  japaneseCards: number;
  englishCards: number;
  pageCount: number;
  setCount: number;
  featuredSets: Array<{
    code: string;
    name: string;
    cardCount: number;
  }>;
};

function getLanguageForGvId(gvId: string): "Japanese" | "English" {
  return /^GV-PK-JPN-/i.test(gvId) ? "Japanese" : "English";
}

function mapRegistryRow(row: CardIdRegistryRow): CardIdRegistryEntry | null {
  const gvId = row.gv_id?.trim();
  if (!gvId) return null;

  const setRecord = Array.isArray(row.sets) ? row.sets[0] : row.sets;

  return {
    gvId,
    name: row.name?.trim() || "Unknown card",
    setCode: row.set_code?.trim() || null,
    setName: setRecord?.name?.trim() || null,
    number: row.number?.trim() || null,
    updatedAt: row.updated_at ?? null,
    language: getLanguageForGvId(gvId),
  };
}

export const getCardIdRegistryPageCount = cache(async () => {
  const admin = createServerAdminClient();
  const { count, error } = await admin
    .from("card_prints")
    .select("id", { count: "exact", head: true })
    .not("gv_id", "is", null);

  if (error) {
    throw new Error(error.message);
  }

  return Math.max(1, Math.ceil((count ?? 0) / ID_REGISTRY_PAGE_SIZE));
});

export const getCardIdRegistrySummary = cache(async (): Promise<CardIdRegistrySummary> => {
  const admin = createServerAdminClient();
  const [{ count: totalCards, error: totalError }, { count: japaneseCards, error: japaneseError }, publicSets] =
    await Promise.all([
      admin.from("card_prints").select("id", { count: "exact", head: true }).not("gv_id", "is", null),
      admin
        .from("card_prints")
        .select("id", { count: "exact", head: true })
        .not("gv_id", "is", null)
        .ilike("gv_id", "GV-PK-JPN-%"),
      getPublicSets(),
    ]);

  if (totalError) {
    throw new Error(totalError.message);
  }
  if (japaneseError) {
    throw new Error(japaneseError.message);
  }

  const normalizedTotal = totalCards ?? 0;
  const normalizedJapanese = japaneseCards ?? 0;

  return {
    totalCards: normalizedTotal,
    japaneseCards: normalizedJapanese,
    englishCards: Math.max(0, normalizedTotal - normalizedJapanese),
    pageCount: Math.max(1, Math.ceil(normalizedTotal / ID_REGISTRY_PAGE_SIZE)),
    setCount: publicSets.length,
    featuredSets: publicSets.slice(0, 24).map((setInfo) => ({
      code: setInfo.code,
      name: setInfo.name,
      cardCount: setInfo.card_count,
    })),
  };
});

export const getCardIdRegistryEntries = cache(async (pageIndex: number): Promise<CardIdRegistryEntry[]> => {
  const safePageIndex = Number.isInteger(pageIndex) && pageIndex >= 0 ? pageIndex : 0;
  const from = safePageIndex * ID_REGISTRY_PAGE_SIZE;
  const to = from + ID_REGISTRY_PAGE_SIZE - 1;
  const admin = createServerAdminClient();
  const { data, error } = await admin
    .from("card_prints")
    .select("gv_id,name,set_code,number,updated_at,sets(name,release_date)")
    .not("gv_id", "is", null)
    .order("gv_id", { ascending: true })
    .range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as CardIdRegistryRow[])
    .map(mapRegistryRow)
    .filter((entry): entry is CardIdRegistryEntry => entry !== null);
});
