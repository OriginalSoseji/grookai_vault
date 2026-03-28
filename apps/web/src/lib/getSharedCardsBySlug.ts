import "server-only";

import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { normalizeDiscoverableVaultIntent } from "@/lib/network/intent";
import { getBestPublicCardImageUrl } from "@/lib/publicCardImage";
import type { PublicWallCard } from "@/lib/sharedCards/publicWall.shared";
import {
  normalizeWallCategory,
  type WallCategory,
} from "@/lib/sharedCards/wallCategories";
import { createServerAdminClient } from "@/lib/supabase/admin";
import {
  normalizeVaultInstanceImageDisplayMode,
  type VaultInstanceImageDisplayMode,
} from "@/lib/vaultInstanceImageDisplay";

type SharedCardRow = {
  card_id: string | null;
  gv_id: string | null;
  wall_category: string | null;
  public_note: string | null;
};

type InPlayStreamRow = {
  vault_item_id: string | null;
  card_print_id: string | null;
  intent: string | null;
  quantity: number | null;
  in_play_count: number | null;
  trade_count: number | null;
  sell_count: number | null;
  showcase_count: number | null;
  raw_count: number | null;
  slab_count: number | null;
  condition_label: string | null;
  is_graded: boolean | null;
  grade_company: string | null;
  grade_value: string | null;
  grade_label: string | null;
  created_at: string | null;
};

type CollectorInPlayStreamRow = {
  vault_item_id: string | null;
  card_print_id: string | null;
  intent: string | null;
  quantity: number | null;
  in_play_count: number | null;
  trade_count: number | null;
  sell_count: number | null;
  showcase_count: number | null;
  raw_count: number | null;
  slab_count: number | null;
  condition_label: string | null;
  is_graded: boolean | null;
  grade_company: string | null;
  grade_value: string | null;
  grade_label: string | null;
  created_at: string | null;
  gv_id: string | null;
  name: string | null;
  set_code: string | null;
  set_name: string | null;
  number: string | null;
  image_url: string | null;
};

type InPlayCardState = {
  vault_item_id: string;
  intent?: NonNullable<PublicWallCard["intent"]>;
  quantity: number;
  trade_count: number;
  sell_count: number;
  showcase_count: number;
  raw_count: number;
  slab_count: number;
  condition_label?: string;
  is_graded: boolean;
  grade_company?: string;
  grade_value?: string;
  grade_label?: string;
  created_at: string | null;
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

export type SharedCard = PublicWallCard;

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

type DiscoverableInstanceRow = {
  id: string;
  gv_vi_id: string | null;
  card_print_id: string | null;
  slab_cert_id: string | null;
  legacy_vault_item_id: string | null;
  intent: string | null;
  condition_label: string | null;
  is_graded: boolean | null;
  grade_company: string | null;
  grade_value: string | null;
  grade_label: string | null;
  created_at: string | null;
  image_display_mode: string | null;
};

type SharedInstanceRow = {
  id: string;
  gv_vi_id: string | null;
  card_print_id: string | null;
  slab_cert_id: string | null;
  created_at: string | null;
  image_display_mode: string | null;
};

type RepresentativeSharedInstance = {
  gvviId: string;
  imageDisplayMode: VaultInstanceImageDisplayMode;
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

async function fetchInPlayStateByCardId(ownerSlug: string, cardIds: string[]) {
  const normalizedOwnerSlug = normalizeSlug(ownerSlug);
  const normalizedCardIds = Array.from(new Set(cardIds.map((value) => value.trim()).filter(Boolean)));
  if (!normalizedOwnerSlug || normalizedCardIds.length === 0) {
    return new Map<string, InPlayCardState>();
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("v_card_stream_v1")
    .select(
      "vault_item_id,card_print_id,intent,quantity,in_play_count,trade_count,sell_count,showcase_count,raw_count,slab_count,condition_label,is_graded,grade_company,grade_value,grade_label,created_at",
    )
    .eq("owner_slug", normalizedOwnerSlug)
    .in("card_print_id", normalizedCardIds)
    .order("created_at", { ascending: false })
    .order("vault_item_id", { ascending: false });

  if (error) {
    console.error("[public:shared-cards] in-play lookup failed", {
      ownerSlug: normalizedOwnerSlug,
      cardIds: normalizedCardIds,
      error,
    });
    return new Map<string, InPlayCardState>();
  }

  const byCardId = new Map<string, InPlayCardState>();

  for (const row of (data ?? []) as InPlayStreamRow[]) {
    const cardPrintId = normalizeOptionalText(row.card_print_id);
    const vaultItemId = normalizeOptionalText(row.vault_item_id);
    const intent = normalizeDiscoverableVaultIntent(row.intent);
    if (!cardPrintId || !vaultItemId || byCardId.has(cardPrintId)) {
      continue;
    }

    byCardId.set(cardPrintId, {
      vault_item_id: vaultItemId,
      intent: intent ?? undefined,
      quantity: Math.max(1, row.in_play_count ?? row.quantity ?? 1),
      trade_count: Math.max(0, row.trade_count ?? 0),
      sell_count: Math.max(0, row.sell_count ?? 0),
      showcase_count: Math.max(0, row.showcase_count ?? 0),
      raw_count: Math.max(0, row.raw_count ?? 0),
      slab_count: Math.max(0, row.slab_count ?? 0),
      condition_label: normalizeOptionalText(row.condition_label) ?? undefined,
      is_graded: row.is_graded === true,
      grade_company: normalizeOptionalText(row.grade_company) ?? undefined,
      grade_value: normalizeOptionalText(row.grade_value) ?? undefined,
      grade_label: normalizeOptionalText(row.grade_label) ?? undefined,
      created_at: row.created_at ?? null,
    });
  }

  return byCardId;
}

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

async function fetchDiscoverableCopiesByCardId(userId: string, cardIds: string[]) {
  const normalizedCardIds = Array.from(new Set(cardIds.map((value) => value.trim()).filter(Boolean)));
  const requestedCardIds = new Set(normalizedCardIds);
  if (!userId || normalizedCardIds.length === 0) {
    return new Map<string, NonNullable<PublicWallCard["in_play_copies"]>>();
  }

  const admin = createServerAdminClient();
  const { data: instances, error: instancesError } = await admin
    .from("vault_item_instances")
    .select(
      "id,gv_vi_id,card_print_id,slab_cert_id,legacy_vault_item_id,intent,condition_label,is_graded,grade_company,grade_value,grade_label,created_at,image_display_mode",
    )
    .eq("user_id", userId)
    .is("archived_at", null)
    .in("intent", ["trade", "sell", "showcase"])
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (instancesError) {
    console.error("[public:shared-cards] discoverable copy lookup failed", {
      userId,
      error: instancesError,
    });
    return new Map<string, NonNullable<PublicWallCard["in_play_copies"]>>();
  }

  const slabCertIds = Array.from(
    new Set(
      ((instances ?? []) as DiscoverableInstanceRow[])
        .map((row) => normalizeOptionalText(row.slab_cert_id))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const slabCertById = new Map<string, SlabCertRow>();
  if (slabCertIds.length > 0) {
    const { data: slabCerts, error: slabCertsError } = await admin
      .from("slab_certs")
      .select("id,card_print_id,grader,cert_number,grade")
      .in("id", slabCertIds);

    if (slabCertsError) {
      console.error("[public:shared-cards] discoverable slab cert lookup failed", {
        userId,
        error: slabCertsError,
      });
      return new Map<string, NonNullable<PublicWallCard["in_play_copies"]>>();
    }

    for (const row of (slabCerts ?? []) as SlabCertRow[]) {
      const slabCertId = normalizeOptionalText(row.id);
      if (slabCertId) {
        slabCertById.set(slabCertId, row);
      }
    }
  }

  const byCardId = new Map<string, NonNullable<PublicWallCard["in_play_copies"]>>();

  for (const row of (instances ?? []) as DiscoverableInstanceRow[]) {
    const slabCert = normalizeOptionalText(row.slab_cert_id)
      ? slabCertById.get(normalizeOptionalText(row.slab_cert_id)!)
      : null;
    const cardPrintId =
      normalizeOptionalText(row.card_print_id) ?? normalizeOptionalText(slabCert?.card_print_id);
    const instanceId = normalizeOptionalText(row.id);
    const vaultItemId = normalizeOptionalText(row.legacy_vault_item_id);
    const intent = normalizeDiscoverableVaultIntent(row.intent);
    if (!cardPrintId || !requestedCardIds.has(cardPrintId) || !instanceId || !vaultItemId || !intent) {
      continue;
    }

    const copies = byCardId.get(cardPrintId) ?? [];
    copies.push({
      instance_id: instanceId,
      gv_vi_id: normalizeOptionalText(row.gv_vi_id) ?? undefined,
      vault_item_id: vaultItemId,
      intent,
      image_display_mode: normalizeVaultInstanceImageDisplayMode(row.image_display_mode) ?? "canonical",
      condition_label: normalizeOptionalText(row.condition_label) ?? undefined,
      is_graded: row.is_graded === true,
      grade_company: normalizeOptionalText(slabCert?.grader) ?? normalizeOptionalText(row.grade_company) ?? undefined,
      grade_value: normalizeGradeValue(slabCert?.grade) ?? normalizeOptionalText(row.grade_value) ?? undefined,
      grade_label: normalizeOptionalText(row.grade_label) ?? undefined,
      cert_number: normalizeOptionalText(slabCert?.cert_number) ?? undefined,
      created_at: row.created_at ?? undefined,
    });
    byCardId.set(cardPrintId, copies);
  }

  return byCardId;
}

async function fetchRepresentativeSharedInstanceByCardId(userId: string, cardIds: string[]) {
  const normalizedCardIds = Array.from(new Set(cardIds.map((value) => value.trim()).filter(Boolean)));
  const requestedCardIds = new Set(normalizedCardIds);
  if (!userId || normalizedCardIds.length === 0) {
    return new Map<string, RepresentativeSharedInstance>();
  }

  const admin = createServerAdminClient();
  const { data: instances, error: instancesError } = await admin
    .from("vault_item_instances")
    .select("id,gv_vi_id,card_print_id,slab_cert_id,created_at,image_display_mode")
    .eq("user_id", userId)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (instancesError) {
    console.error("[public:shared-cards] representative GVVI lookup failed", {
      userId,
      error: instancesError,
    });
    return new Map<string, RepresentativeSharedInstance>();
  }

  const slabCertIds = Array.from(
    new Set(
      ((instances ?? []) as SharedInstanceRow[])
        .map((row) => normalizeOptionalText(row.slab_cert_id))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const slabCertById = new Map<string, SlabCertRow>();
  if (slabCertIds.length > 0) {
    const { data: slabCerts, error: slabCertsError } = await admin
      .from("slab_certs")
      .select("id,card_print_id,grader,cert_number,grade")
      .in("id", slabCertIds);

    if (slabCertsError) {
      console.error("[public:shared-cards] representative GVVI slab lookup failed", {
        userId,
        error: slabCertsError,
      });
      return new Map<string, RepresentativeSharedInstance>();
    }

    for (const row of (slabCerts ?? []) as SlabCertRow[]) {
      const slabCertId = normalizeOptionalText(row.id);
      if (slabCertId) {
        slabCertById.set(slabCertId, row);
      }
    }
  }

  const representativeByCardId = new Map<string, RepresentativeSharedInstance>();

  for (const row of (instances ?? []) as SharedInstanceRow[]) {
    const gvviId = normalizeOptionalText(row.gv_vi_id);
    const slabCert = normalizeOptionalText(row.slab_cert_id)
      ? slabCertById.get(normalizeOptionalText(row.slab_cert_id)!)
      : null;
    const cardPrintId =
      normalizeOptionalText(row.card_print_id) ?? normalizeOptionalText(slabCert?.card_print_id);

    if (!cardPrintId || !gvviId || !requestedCardIds.has(cardPrintId) || representativeByCardId.has(cardPrintId)) {
      continue;
    }

    representativeByCardId.set(cardPrintId, {
      gvviId,
      imageDisplayMode: normalizeVaultInstanceImageDisplayMode(row.image_display_mode) ?? "canonical",
    });
  }

  return representativeByCardId;
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
  const ownerUserId = normalizeOptionalText(profileRow.user_id);
  if (!ownerUserId || !profileRow.vault_sharing_enabled) {
    return [];
  }

  const { data, error } = await supabase
    .from("shared_cards")
    .select(
      `
        card_id,
        gv_id,
        wall_category,
        public_note
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

  const [wallStateByCardId, representativeSharedInstanceByCardId, inPlayStateByCardId] = await Promise.all([
    fetchSharedWallStateByCardId(
      ownerUserId,
      sharedRows.map((row) => row.card_id),
    ),
    fetchRepresentativeSharedInstanceByCardId(
      ownerUserId,
      sharedRows.map((row) => row.card_id),
    ),
    fetchInPlayStateByCardId(
      normalizedSlug,
      sharedRows.map((row) => row.card_id),
    ),
  ]);

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
      const representativeSharedInstance = representativeSharedInstanceByCardId.get(row.card_id) ?? null;
      const wallState = wallStateByCardId.get(row.card_id);
      const inPlayState = inPlayStateByCardId.get(row.card_id);

      return {
        card_print_id: row.card_id,
        gv_id: row.gv_id,
        gv_vi_id: representativeSharedInstance?.gvviId ?? undefined,
        name: cardPrint.name?.trim() || "Unknown card",
        set_code: cardPrint.set_code?.trim() || undefined,
        set_name: setRecord?.name?.trim() || undefined,
        number: cardPrint.number?.trim() || "—",
        rarity: cardPrint.rarity?.trim() || undefined,
        image_url: getBestPublicCardImageUrl(cardPrint.image_url, cardPrint.image_alt_url) ?? undefined,
        canonical_image_url: getBestPublicCardImageUrl(cardPrint.image_url, cardPrint.image_alt_url) ?? undefined,
        back_image_url: undefined,
        public_note: row.public_note?.trim() || undefined,
        wall_category: normalizeWallCategory(row.wall_category) ?? undefined,
        owned_count: wallState?.total_count,
        raw_count: wallState?.raw_count,
        slab_count: wallState?.slab_count,
        is_slab: wallState?.is_slab,
        grader: wallState?.grader,
        grade: wallState?.grade,
        cert_number: wallState?.cert_number,
        vault_item_id: inPlayState?.vault_item_id,
        intent: inPlayState?.intent,
        trade_count: inPlayState?.trade_count,
        sell_count: inPlayState?.sell_count,
        showcase_count: inPlayState?.showcase_count,
        in_play_quantity: inPlayState?.quantity,
        in_play_raw_count: inPlayState?.raw_count,
        in_play_slab_count: inPlayState?.slab_count,
        in_play_condition_label: inPlayState?.condition_label,
        in_play_is_graded: inPlayState?.is_graded,
        in_play_grade_company: inPlayState?.grade_company,
        in_play_grade_value: inPlayState?.grade_value,
        in_play_grade_label: inPlayState?.grade_label,
        in_play_created_at: inPlayState?.created_at ?? undefined,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
});

export const getInPlayCardsBySlug = cache(async (slug: string): Promise<SharedCard[]> => {
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
  const ownerUserId = normalizeOptionalText(profileRow.user_id);
  if (!ownerUserId || !profileRow.vault_sharing_enabled) {
    return [];
  }

  const { data: streamRows, error: streamError } = await supabase
    .from("v_card_stream_v1")
    .select(
      "vault_item_id,card_print_id,intent,quantity,in_play_count,trade_count,sell_count,showcase_count,raw_count,slab_count,condition_label,is_graded,grade_company,grade_value,grade_label,created_at,gv_id,name,set_code,set_name,number,image_url",
    )
    .eq("owner_slug", normalizedSlug)
    .order("created_at", { ascending: false })
    .order("vault_item_id", { ascending: false });

  if (streamError || !streamRows) {
    return [];
  }

  const rows = (streamRows as CollectorInPlayStreamRow[])
    .map((row) => ({
      vaultItemId: normalizeOptionalText(row.vault_item_id),
      cardPrintId: normalizeOptionalText(row.card_print_id),
      intent: normalizeDiscoverableVaultIntent(row.intent),
      quantity: Math.max(1, row.in_play_count ?? row.quantity ?? 1),
      tradeCount: Math.max(0, row.trade_count ?? 0),
      sellCount: Math.max(0, row.sell_count ?? 0),
      showcaseCount: Math.max(0, row.showcase_count ?? 0),
      rawCount: Math.max(0, row.raw_count ?? 0),
      slabCount: Math.max(0, row.slab_count ?? 0),
      conditionLabel: normalizeOptionalText(row.condition_label),
      isGraded: row.is_graded === true,
      gradeCompany: normalizeOptionalText(row.grade_company),
      gradeValue: normalizeOptionalText(row.grade_value),
      gradeLabel: normalizeOptionalText(row.grade_label),
      createdAt: row.created_at ?? null,
      gvId: normalizeOptionalText(row.gv_id),
      name: normalizeOptionalText(row.name),
      setCode: normalizeOptionalText(row.set_code),
      setName: normalizeOptionalText(row.set_name),
      number: normalizeOptionalText(row.number),
      imageUrl: normalizeOptionalText(row.image_url),
    }))
    .filter(
      (
        row,
      ): row is {
        vaultItemId: string;
        cardPrintId: string;
        intent: NonNullable<SharedCard["intent"]> | null;
        quantity: number;
        tradeCount: number;
        sellCount: number;
        showcaseCount: number;
        rawCount: number;
        slabCount: number;
        conditionLabel: string | null;
        isGraded: boolean;
        gradeCompany: string | null;
        gradeValue: string | null;
        gradeLabel: string | null;
        createdAt: string | null;
        gvId: string;
        name: string | null;
        setCode: string | null;
        setName: string | null;
        number: string | null;
        imageUrl: string | null;
      } => Boolean(row.vaultItemId && row.cardPrintId && row.gvId),
    );

  if (rows.length === 0) {
    return [];
  }

  const cardPrintIds = Array.from(new Set(rows.map((row) => row.cardPrintId)));
  const [cardPrintsResponse, sharedResponse, discoverableCopiesByCardId] = await Promise.all([
    supabase
      .from("card_prints")
      .select("id,gv_id,name,set_code,number,rarity,image_url,image_alt_url,sets(name)")
      .in("id", cardPrintIds),
    supabase
      .from("shared_cards")
      .select(
        `
          card_id,
          gv_id,
          public_note
        `,
      )
      .eq("user_id", ownerUserId)
      .eq("is_shared", true)
      .in("card_id", cardPrintIds),
    fetchDiscoverableCopiesByCardId(ownerUserId, cardPrintIds),
  ]);

  if (cardPrintsResponse.error || !cardPrintsResponse.data) {
    return [];
  }

  const cardPrintById = new Map(
    (cardPrintsResponse.data as CardPrintRow[])
      .filter((row): row is CardPrintRow & { id: string } => typeof row.id === "string" && row.id.length > 0)
      .map((row) => [row.id, row]),
  );
  const sharedByCardId = new Map(
    ((sharedResponse.data ?? []) as Pick<
      SharedCardRow,
      "card_id" | "gv_id" | "public_note"
    >[])
      .map((row) => [normalizeOptionalText(row.card_id), row] as const)
      .filter(
        (
          entry,
        ): entry is [
          string,
          Pick<SharedCardRow, "card_id" | "gv_id" | "public_note">,
        ] => Boolean(entry[0]),
      ),
  );

  return rows.map((row) => {
    const cardPrint = cardPrintById.get(row.cardPrintId) ?? null;
    const shared = sharedByCardId.get(row.cardPrintId) ?? null;
    const setRecord = Array.isArray(cardPrint?.sets) ? cardPrint?.sets[0] : cardPrint?.sets;

    return {
      card_print_id: row.cardPrintId,
      gv_id: row.gvId,
      name: row.name ?? normalizeOptionalText(cardPrint?.name) ?? "Unknown card",
      set_code: row.setCode ?? normalizeOptionalText(cardPrint?.set_code) ?? undefined,
      set_name:
        row.setName ??
        normalizeOptionalText(setRecord?.name) ??
        row.setCode ??
        normalizeOptionalText(cardPrint?.set_code) ??
        undefined,
      number: row.number ?? normalizeOptionalText(cardPrint?.number) ?? "—",
      rarity: normalizeOptionalText(cardPrint?.rarity) ?? undefined,
      image_url: getBestPublicCardImageUrl(row.imageUrl, normalizeOptionalText(cardPrint?.image_alt_url)) ?? undefined,
      canonical_image_url:
        getBestPublicCardImageUrl(row.imageUrl, normalizeOptionalText(cardPrint?.image_alt_url)) ?? undefined,
      public_note: normalizeOptionalText(shared?.public_note) ?? undefined,
      vault_item_id: row.vaultItemId,
      intent: row.intent ?? undefined,
      trade_count: row.tradeCount,
      sell_count: row.sellCount,
      showcase_count: row.showcaseCount,
      in_play_quantity: row.quantity,
      in_play_raw_count: row.rawCount,
      in_play_slab_count: row.slabCount,
      in_play_condition_label: row.conditionLabel ?? undefined,
      in_play_is_graded: row.isGraded,
      in_play_grade_company: row.gradeCompany ?? undefined,
      in_play_grade_value: row.gradeValue ?? undefined,
      in_play_grade_label: row.gradeLabel ?? undefined,
      in_play_created_at: row.createdAt ?? undefined,
      in_play_copies: discoverableCopiesByCardId.get(row.cardPrintId) ?? undefined,
    } satisfies SharedCard;
  });
});
