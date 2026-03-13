"use server";

import { revalidatePath } from "next/cache";
import { createServerComponentClient } from "@/lib/supabase/server";

export type ToggleSharedCardInput = {
  itemId: string;
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

type PublicProfileRow = {
  slug: string | null;
  public_profile_enabled: boolean | null;
  vault_sharing_enabled: boolean | null;
};

const SHARE_GUARD_MESSAGE = "Enable your public profile and vault sharing in /account before sharing cards.";

export async function toggleSharedCardAction(input: ToggleSharedCardInput): Promise<ToggleSharedCardResult> {
  const client = createServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return {
      ok: false,
      itemId: input.itemId,
      message: "Sign in required.",
    };
  }

  const { data: vaultRow, error: vaultError } = await client
    .from("vault_items")
    .select("id,card_id,gv_id")
    .eq("id", input.itemId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (vaultError || !vaultRow) {
    return {
      ok: false,
      itemId: input.itemId,
      message: "Vault card could not be resolved.",
    };
  }

  const row = vaultRow as VaultRow;
  if (!row.card_id || !row.gv_id) {
    return {
      ok: false,
      itemId: input.itemId,
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
        itemId: input.itemId,
        message: "Couldn’t update shared state.",
      };
    }

    revalidatePath("/vault");
    return {
      ok: true,
      status: "unshared",
      itemId: input.itemId,
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
      itemId: input.itemId,
      message: SHARE_GUARD_MESSAGE,
    };
  }

  const profile = profileRow as PublicProfileRow;
  if (!profile.public_profile_enabled || !profile.vault_sharing_enabled) {
    return {
      ok: false,
      itemId: input.itemId,
      message: SHARE_GUARD_MESSAGE,
    };
  }

  const { error: upsertError } = await client
    .from("shared_cards")
    .upsert(
      {
        user_id: user.id,
        card_id: row.card_id,
        gv_id: row.gv_id,
        is_shared: true,
        share_intent: "shared",
      },
      {
        onConflict: "user_id,card_id",
      },
    );

  if (upsertError) {
    return {
      ok: false,
      itemId: input.itemId,
      message: "Couldn’t update shared state.",
    };
  }

  revalidatePath("/vault");
  if (profile.slug) {
    revalidatePath(`/u/${profile.slug}`);
    revalidatePath(`/u/${profile.slug}/collection`);
  }

  return {
    ok: true,
    status: "shared",
    itemId: input.itemId,
  };
}
