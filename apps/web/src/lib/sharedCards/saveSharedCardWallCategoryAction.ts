"use server";

import { revalidatePath } from "next/cache";
import { createServerComponentClient } from "@/lib/supabase/server";
import {
  normalizeWallCategory,
  type WallCategory,
} from "@/lib/sharedCards/wallCategories";

export type SaveSharedCardWallCategoryInput = {
  itemId?: string;
  gvViId?: string | null;
  wallCategory?: string | null;
};

export type SaveSharedCardWallCategoryResult =
  | {
      ok: true;
      itemId: string;
      wallCategory: WallCategory | null;
    }
  | {
      ok: false;
      itemId: string;
      message: string;
    };

type VaultRow = {
  id: string;
  card_id: string | null;
  gv_id: string | null;
};

type VaultInstanceRow = {
  gv_vi_id: string | null;
  card_print_id: string | null;
};

type CardPrintRow = {
  id: string;
  gv_id: string | null;
};

type PublicProfileRow = {
  slug: string | null;
};

export async function saveSharedCardWallCategoryAction(
  input: SaveSharedCardWallCategoryInput,
): Promise<SaveSharedCardWallCategoryResult> {
  const client = createServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return {
      ok: false,
      itemId: input.gvViId ?? input.itemId ?? "",
      message: "Sign in required.",
    };
  }

  let row: VaultRow | null = null;
  if (input.gvViId) {
    const { data: instanceRow, error: instanceError } = await client
      .from("vault_item_instances")
      .select("gv_vi_id,card_print_id")
      .eq("gv_vi_id", input.gvViId)
      .eq("user_id", user.id)
      .is("archived_at", null)
      .maybeSingle();

    if (instanceError) {
      return {
        ok: false,
        itemId: input.gvViId ?? input.itemId ?? "",
        message: "Vault card could not be resolved.",
      };
    }

    const instance = (instanceRow ?? null) as VaultInstanceRow | null;
    if (instance?.card_print_id) {
      const { data: cardPrintRow, error: cardPrintError } = await client
        .from("card_prints")
        .select("id,gv_id")
        .eq("id", instance.card_print_id)
        .maybeSingle();

      if (cardPrintError || !cardPrintRow) {
        return {
          ok: false,
          itemId: input.gvViId ?? input.itemId ?? "",
          message: "Vault card is missing canonical card identity.",
        };
      }

      row = {
        id: input.itemId ?? input.gvViId,
        card_id: (cardPrintRow as CardPrintRow).id,
        gv_id: (cardPrintRow as CardPrintRow).gv_id,
      };
    }
  }

  if (!row) {
    if (!input.itemId) {
      return {
        ok: false,
        itemId: input.gvViId ?? "",
        message: "Vault card could not be resolved.",
      };
    }

    const { data: vaultRow, error: vaultError } = await client
      .from("vault_items")
      .select("id,card_id,gv_id")
      .eq("id", input.itemId)
      .eq("user_id", user.id)
      .is("archived_at", null)
      .maybeSingle();

    if (vaultError || !vaultRow) {
      return {
        ok: false,
        itemId: input.itemId,
        message: "Vault card could not be resolved.",
      };
    }

    row = vaultRow as VaultRow;
  }

  if (!row.card_id || !row.gv_id) {
    return {
      ok: false,
      itemId: input.gvViId ?? input.itemId ?? "",
      message: "Vault card is missing canonical card identity.",
    };
  }

  const nextWallCategory = normalizeWallCategory(input.wallCategory);
  const rawWallCategory = (input.wallCategory ?? "").trim();
  if (rawWallCategory.length > 0 && !nextWallCategory) {
    return {
      ok: false,
      itemId: input.gvViId ?? input.itemId ?? "",
      message: "Invalid wall category.",
    };
  }

  // LOCK: Legacy grouped wall_category must not surface as the section system.
  // LOCK: Wall and section curation are exact-copy only.
  const { data: existingSharedRow, error: existingSharedError } = await client
    .from("shared_cards")
    .select("id")
    .eq("user_id", user.id)
    .eq("card_id", row.card_id)
    .maybeSingle();

  if (existingSharedError || !existingSharedRow) {
    return {
      ok: false,
      itemId: input.gvViId ?? input.itemId ?? "",
      message: "Add this card to your wall before assigning a category.",
    };
  }

  const { error: updateError } = await client
    .from("shared_cards")
    .update({
      wall_category: nextWallCategory,
    })
    .eq("user_id", user.id)
    .eq("card_id", row.card_id);

  if (updateError) {
    return {
      ok: false,
      itemId: input.gvViId ?? input.itemId ?? "",
      message: "Couldn’t save wall category.",
    };
  }

  const { data: profileRow } = await client.from("public_profiles").select("slug").eq("user_id", user.id).maybeSingle();
  const profile = (profileRow ?? null) as PublicProfileRow | null;

  revalidatePath("/vault");
  if (profile?.slug) {
    revalidatePath(`/u/${profile.slug}`);
    revalidatePath(`/u/${profile.slug}/collection`);
    revalidatePath(`/u/${profile.slug}/pokemon`);
  }

  return {
    ok: true,
    itemId: input.gvViId ?? input.itemId ?? "",
    wallCategory: nextWallCategory,
  };
}
