import type { WallCategory } from "@/lib/sharedCards/wallCategories";
import type { DiscoverableVaultIntent } from "@/lib/network/intent";
import { getVaultInstanceHref } from "@/lib/vault/getVaultInstanceHref";
import type { VaultInstanceImageDisplayMode } from "@/lib/vaultInstanceImageDisplay";

export type PublicInPlayCopy = {
  instance_id: string;
  gv_vi_id?: string;
  vault_item_id: string;
  intent: DiscoverableVaultIntent;
  image_display_mode?: VaultInstanceImageDisplayMode;
  condition_label?: string;
  is_graded: boolean;
  grade_company?: string;
  grade_value?: string;
  grade_label?: string;
  cert_number?: string;
  created_at?: string;
};

export type PublicWallCard = {
  card_print_id: string;
  gv_id: string;
  gv_vi_id?: string;
  name: string;
  set_code?: string;
  set_name?: string;
  number: string;
  rarity?: string;
  image_url?: string;
  canonical_image_url?: string;
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
  vault_item_id?: string;
  intent?: DiscoverableVaultIntent;
  trade_count?: number;
  sell_count?: number;
  showcase_count?: number;
  in_play_quantity?: number;
  in_play_raw_count?: number;
  in_play_slab_count?: number;
  in_play_condition_label?: string;
  in_play_is_graded?: boolean;
  in_play_grade_company?: string;
  in_play_grade_value?: string;
  in_play_grade_label?: string;
  in_play_created_at?: string;
  in_play_copies?: PublicInPlayCopy[];
};

function normalizeOptionalText(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function getPublicWallCardPrimaryGvviId(card: Pick<PublicWallCard, "gv_vi_id" | "in_play_copies">) {
  const discoverableCopyGvviId = card.in_play_copies
    ?.map((copy) => normalizeOptionalText(copy.gv_vi_id))
    .find((value): value is string => Boolean(value));

  return discoverableCopyGvviId ?? normalizeOptionalText(card.gv_vi_id);
}

export function getPublicWallCardHref(
  card: Pick<PublicWallCard, "gv_vi_id" | "in_play_copies">,
  viewerUserId: string | null | undefined,
  ownerUserId: string | null | undefined,
) {
  return getVaultInstanceHref(getPublicWallCardPrimaryGvviId(card), viewerUserId, ownerUserId);
}
