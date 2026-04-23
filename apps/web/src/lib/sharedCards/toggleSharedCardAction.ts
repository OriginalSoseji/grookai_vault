"use server";

import { revalidatePath } from "next/cache";
import { createServerComponentClient } from "@/lib/supabase/server";

export type ToggleSharedCardInput = {
  itemId?: string;
  gvViId?: string | null;
  nextShared: boolean;
};

export type ToggleSharedCardResult =
  | {
      ok: true;
      status: "shared" | "unshared";
      itemId: string;
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
  public_profile_enabled: boolean | null;
  vault_sharing_enabled: boolean | null;
};

const WALL_GUARD_MESSAGE =
  "Enable your public profile and vault sharing in /account before adding cards to your wall.";

export async function toggleSharedCardAction(
  input: ToggleSharedCardInput,
): Promise<ToggleSharedCardResult> {
  // LOCK: This legacy shared_cards action must not be wired into grouped curation UI.
  // LOCK: Wall and section curation are exact-copy only.
  const client = createServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return {
      ok: false,
      itemId: input.itemId ?? input.gvViId ?? "",
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
        itemId: input.itemId ?? input.gvViId,
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
          itemId: input.itemId ?? input.gvViId,
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
      itemId: input.itemId ?? input.gvViId ?? "",
      message: "Vault card is missing canonical card identity.",
    };
  }

  if (!input.nextShared) {
    const { error: deleteError } = await client
      .from("shared_cards")
      .delete()
      .eq("user_id", user.id)
      .eq("card_id", row.card_id);

    if (deleteError) {
      return {
        ok: false,
        itemId: input.itemId ?? input.gvViId ?? "",
        message: "Couldn’t update wall state.",
      };
    }

    revalidatePath("/vault");
    return {
      ok: true,
      status: "unshared",
      itemId: input.itemId ?? input.gvViId ?? "",
    };
  }

  const { data: profileRow, error: profileError } = await client
    .from("public_profiles")
    .select("slug,public_profile_enabled,vault_sharing_enabled")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError || !profileRow) {
    return {
      ok: false,
      itemId: input.itemId ?? input.gvViId ?? "",
      message: WALL_GUARD_MESSAGE,
    };
  }

  const profile = profileRow as PublicProfileRow;
  if (!profile.public_profile_enabled || !profile.vault_sharing_enabled) {
    return {
      ok: false,
      itemId: input.itemId ?? input.gvViId ?? "",
      message: WALL_GUARD_MESSAGE,
    };
  }

  const { error: upsertError } = await client.from("shared_cards").upsert(
    {
      user_id: user.id,
      card_id: row.card_id,
      gv_id: row.gv_id,
      is_shared: true,
      // LOCK: shared_cards.share_intent is wall compatibility only.
      // LOCK: Public intent authority is vault_item_instances.intent.
      share_intent: "shared",
    },
    {
      onConflict: "user_id,card_id",
    },
  );

  if (upsertError) {
    return {
      ok: false,
      itemId: input.itemId ?? input.gvViId ?? "",
      message: "Couldn’t update wall state.",
    };
  }

  revalidatePath("/vault");
  if (profile.slug) {
    revalidatePath(`/u/${profile.slug}`);
    revalidatePath(`/u/${profile.slug}/collection`);
    revalidatePath(`/u/${profile.slug}/pokemon`);
  }

  return {
    ok: true,
    status: "shared",
    itemId: input.itemId ?? input.gvViId ?? "",
  };
}
