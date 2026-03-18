import "server-only";

import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { getBestPublicCardImageUrl } from "@/lib/publicCardImage";
import {
  normalizeWallCategory,
  type WallCategory,
} from "@/lib/sharedCards/wallCategories";
import { createServerAdminClient } from "@/lib/supabase/admin";

type SharedCardRow = {
  card_id: string | null;
  gv_id: string | null;
  wall_category: string | null;
  public_note: string | null;
  public_front_image_path: string | null;
  public_back_image_path: string | null;
  show_personal_front: boolean | null;
  show_personal_back: boolean | null;
};

type CardPrintRow = {
  id: string | null;
  gv_id: string | null;
  name: string | null;
  set_code: string | null;
  number: string | null;
  rarity: string | null;
  image_url: string | null;
  image_alt_url: string | null;
  sets?:
    | {
        name: string | null;
      }
    | {
        name: string | null;
      }[]
    | null;
};

export type SharedCard = {
  gv_id: string;
  name: string;
  set_code?: string;
  set_name?: string;
  number: string;
  rarity?: string;
  image_url?: string;
  back_image_url?: string;
  public_note?: string;
  wall_category?: WallCategory;
  owned_count?: number;
  raw_count?: number;
  slab_count?: number;
  is_slab?: boolean;
  grader?: string;
  grade?: string;
  cert_number?: string;
};

type PublicProfileLookup = {
  user_id: string | null;
  vault_sharing_enabled: boolean | null;
};

type ActiveRawInstanceRow = {
  card_print_id: string | null;
};

type SlabCertRow = {
  id: string;
  card_print_id: string | null;
  grader: string | null;
  cert_number: string | null;
  grade: number | string | null;
};

function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createClient(url, anon);
}

function normalizeSlug(value: string) {
  return value.trim().toLowerCase();
}

function normalizeOptionalText(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeGradeValue(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toString() : null;
  }

  return normalizeOptionalText(value);
}

function normalizePokemonMatchValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizePokemonSlug(value: string) {
  return normalizePokemonMatchValue(value);
}

export function formatPokemonSlugLabel(value: string) {
  const normalized = normalizePokemonSlug(value);
  if (!normalized) {
    return "Pokemon";
  }

  return normalized
    .split(" ")
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

export function filterSharedCardsByPokemonSlug(cards: SharedCard[], pokemonSlug: string) {
  const normalizedPokemon = normalizePokemonSlug(pokemonSlug);
  if (!normalizedPokemon) {
    return [];
  }

  return cards.filter((card) => normalizePokemonMatchValue(card.name).includes(normalizedPokemon));
}

type SharedWallCardState = {
  total_count: number;
  raw_count: number;
  slab_count: number;
  is_slab: boolean;
  grader?: string;
  grade?: string;
  cert_number?: string;
};

async function fetchSharedWallStateByCardId(userId: string, cardIds: string[]) {
  const normalizedCardIds = Array.from(new Set(cardIds.map((value) => value.trim()).filter(Boolean)));
  if (!userId || normalizedCardIds.length === 0) {
    return new Map<string, SharedWallCardState>();
  }

  const admin = createServerAdminClient();
  const [rawInstancesResponse, slabCertsResponse] = await Promise.all([
    admin
      .from("vault_item_instances")
      .select("card_print_id")
      .eq("user_id", userId)
      .is("archived_at", null)
      .is("slab_cert_id", null)
      .in("card_print_id", normalizedCardIds),
    admin
      .from("slab_certs")
      .select("id,card_print_id,grader,cert_number,grade")
      .in("card_print_id", normalizedCardIds),
  ]);

  if (rawInstancesResponse.error || slabCertsResponse.error) {
    console.error("[public:shared-cards] slab compatibility lookup failed", {
      userId,
      rawInstancesError: rawInstancesResponse.error,
      slabCertsError: slabCertsResponse.error,
    });
    return new Map<string, SharedWallCardState>();
  }

  const slabCertRows = (slabCertsResponse.data ?? []) as SlabCertRow[];
  const slabCertById = new Map(
    slabCertRows
      .map((row) => [normalizeOptionalText(row.id), row] as const)
      .filter((entry): entry is [string, SlabCertRow] => Boolean(entry[0])),
  );
  const slabCertIds = Array.from(slabCertById.keys());

  const slabInstancesResponse =
    slabCertIds.length > 0
      ? await admin
          .from("vault_item_instances")
          .select("card_print_id,slab_cert_id")
          .eq("user_id", userId)
          .is("archived_at", null)
          .in("slab_cert_id", slabCertIds)
      : { data: [], error: null };

  if (slabInstancesResponse.error) {
    console.error("[public:shared-cards] slab instance compatibility lookup failed", {
      userId,
      error: slabInstancesResponse.error,
    });
    return new Map<string, SharedWallCardState>();
  }

  const byCardId = new Map<string, { totalCount: number; rawCount: number; slabCount: number; slab: SlabCertRow | null }>();

  for (const row of (rawInstancesResponse.data ?? []) as ActiveRawInstanceRow[]) {
    const cardPrintId = normalizeOptionalText(row.card_print_id);
    if (!cardPrintId) {
      continue;
    }

    const current = byCardId.get(cardPrintId) ?? { totalCount: 0, rawCount: 0, slabCount: 0, slab: null };
    current.totalCount += 1;
    current.rawCount += 1;
    byCardId.set(cardPrintId, current);
  }

  for (const row of (slabInstancesResponse.data ?? []) as { slab_cert_id: string | null }[]) {
    const slabCertId = normalizeOptionalText(row.slab_cert_id);
    const slabCert = slabCertId ? slabCertById.get(slabCertId) ?? null : null;
    const cardPrintId = normalizeOptionalText(slabCert?.card_print_id);
    if (!cardPrintId || !slabCert) {
      continue;
    }

    const current = byCardId.get(cardPrintId) ?? { totalCount: 0, rawCount: 0, slabCount: 0, slab: null };
    current.totalCount += 1;
    current.slabCount += 1;
    current.slab = slabCert;
    byCardId.set(cardPrintId, current);
  }

  const out = new Map<string, SharedWallCardState>();

  for (const [cardId, entry] of byCardId.entries()) {
    out.set(cardId, {
      total_count: entry.totalCount,
      raw_count: entry.rawCount,
      slab_count: entry.slabCount,
      is_slab: entry.slabCount > 0,
      grader: normalizeOptionalText(entry.slab?.grader) ?? undefined,
      grade: normalizeGradeValue(entry.slab?.grade) ?? undefined,
      cert_number: entry.slabCount === 1 ? normalizeOptionalText(entry.slab?.cert_number) ?? undefined : undefined,
    });
  }

  return out;
}

export const getSharedCardsBySlug = cache(async (slug: string): Promise<SharedCard[]> => {
  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) {
    return [];
  }

  const supabase = createServerSupabase();
  const { data: profile, error: profileError } = await supabase
    .from("public_profiles")
    .select("user_id,vault_sharing_enabled")
    .eq("slug", normalizedSlug)
    .maybeSingle();

  if (profileError || !profile) {
    return [];
  }

  const profileRow = profile as PublicProfileLookup;
  if (!profileRow.user_id || !profileRow.vault_sharing_enabled) {
    return [];
  }

  const { data, error } = await supabase
    .from("shared_cards")
    .select(
      `
        card_id,
        gv_id,
        wall_category,
        public_note,
        public_front_image_path,
        public_back_image_path,
        show_personal_front,
        show_personal_back
      `,
    )
    .eq("user_id", profileRow.user_id)
    .eq("is_shared", true)
    .order("gv_id", { ascending: true });

  if (error || !data) {
    return [];
  }

  const sharedRows = (data as SharedCardRow[]).filter(
    (row): row is SharedCardRow & { card_id: string; gv_id: string } =>
      typeof row.card_id === "string" &&
      row.card_id.length > 0 &&
      typeof row.gv_id === "string" &&
      row.gv_id.length > 0,
  );

  if (sharedRows.length === 0) {
    return [];
  }

  const wallStateByCardId = await fetchSharedWallStateByCardId(
    profileRow.user_id,
    sharedRows.map((row) => row.card_id),
  );

  const { data: cardPrints, error: cardPrintsError } = await supabase
    .from("card_prints")
    .select("id,gv_id,name,set_code,number,rarity,image_url,image_alt_url,sets(name)")
    .in(
      "id",
      sharedRows.map((row) => row.card_id),
    );

  if (cardPrintsError || !cardPrints) {
    return [];
  }

  const cardPrintById = new Map(
    (cardPrints as CardPrintRow[])
      .filter((row): row is CardPrintRow & { id: string } => typeof row.id === "string" && row.id.length > 0)
      .map((row) => [row.id, row]),
  );

  return sharedRows
    .map((row) => {
      const cardPrint = cardPrintById.get(row.card_id);
      if (!cardPrint) {
        return null;
      }

      const setRecord = Array.isArray(cardPrint.sets) ? cardPrint.sets[0] : cardPrint.sets;
      const personalFrontImageUrl =
        row.show_personal_front === true ? getBestPublicCardImageUrl(row.public_front_image_path) ?? undefined : undefined;
      const personalBackImageUrl =
        row.show_personal_back === true ? getBestPublicCardImageUrl(row.public_back_image_path) ?? undefined : undefined;
      const wallState = wallStateByCardId.get(row.card_id);

      return {
        gv_id: row.gv_id,
        name: cardPrint.name?.trim() || "Unknown card",
        set_code: cardPrint.set_code?.trim() || undefined,
        set_name: setRecord?.name?.trim() || undefined,
        number: cardPrint.number?.trim() || "—",
        rarity: cardPrint.rarity?.trim() || undefined,
        image_url: personalFrontImageUrl ?? getBestPublicCardImageUrl(cardPrint.image_url, cardPrint.image_alt_url) ?? undefined,
        back_image_url: personalBackImageUrl,
        public_note: row.public_note?.trim() || undefined,
        wall_category: normalizeWallCategory(row.wall_category) ?? undefined,
        owned_count: wallState?.total_count,
        raw_count: wallState?.raw_count,
        slab_count: wallState?.slab_count,
        is_slab: wallState?.is_slab,
        grader: wallState?.grader,
        grade: wallState?.grade,
        cert_number: wallState?.cert_number,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
});
