import "server-only";

import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { getBestPublicCardImageUrl } from "@/lib/publicCardImage";

type SharedCardRow = {
  card_id: string | null;
  gv_id: string | null;
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
  set_name?: string;
  number: string;
  rarity?: string;
  image_url?: string;
  back_image_url?: string;
  public_note?: string;
};

type PublicProfileLookup = {
  user_id: string | null;
  vault_sharing_enabled: boolean | null;
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

  const { data: cardPrints, error: cardPrintsError } = await supabase
    .from("card_prints")
    .select("id,gv_id,name,number,rarity,image_url,image_alt_url,sets(name)")
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

      return {
        gv_id: row.gv_id,
        name: cardPrint.name?.trim() || "Unknown card",
        set_name: setRecord?.name?.trim() || undefined,
        number: cardPrint.number?.trim() || "—",
        rarity: cardPrint.rarity?.trim() || undefined,
        image_url: personalFrontImageUrl ?? getBestPublicCardImageUrl(cardPrint.image_url, cardPrint.image_alt_url) ?? undefined,
        back_image_url: personalBackImageUrl,
        public_note: row.public_note?.trim() || undefined,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
});
