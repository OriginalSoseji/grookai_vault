"use server";

import { revalidatePath } from "next/cache";
import { createServerComponentClient } from "@/lib/supabase/server";
import { resolveSharedCardPublicImageUrl } from "@/lib/sharedCards/resolveSharedCardPublicImageUrl";

export type ToggleSharedCardPublicImageInput = {
  cardId: string;
  side: "front" | "back";
  enabled: boolean;
};

export type ToggleSharedCardPublicImageResult =
  | {
      ok: true;
      side: "front" | "back";
      enabled: boolean;
      publicImageUrl: string | null;
    }
  | {
      ok: false;
      side: "front" | "back";
      message: string;
    };

type VaultRow = {
  id: string;
  gv_id: string | null;
};

type SharedCardRow = {
  id: string;
  public_front_image_path: string | null;
  public_back_image_path: string | null;
};

type UserCardImageRow = {
  storage_path: string | null;
};

type PublicProfileRow = {
  slug: string | null;
};

const IMAGE_MISSING_MESSAGE = "Upload a card photo in your vault to enable this.";

export async function toggleSharedCardPublicImageAction(
  input: ToggleSharedCardPublicImageInput,
): Promise<ToggleSharedCardPublicImageResult> {
  const client = createServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return {
      ok: false,
      side: input.side,
      message: "Sign in required.",
    };
  }

  const { data: vaultRow, error: vaultError } = await client
    .from("vault_items")
    .select("id,gv_id")
    .eq("card_id", input.cardId)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .maybeSingle();

  if (vaultError || !vaultRow) {
    return {
      ok: false,
      side: input.side,
      message: "Vault card could not be resolved.",
    };
  }

  const ownerVaultRow = vaultRow as VaultRow;
  const { data: sharedRow, error: sharedError } = await client
    .from("shared_cards")
    .select("id,public_front_image_path,public_back_image_path")
    .eq("user_id", user.id)
    .eq("card_id", input.cardId)
    .maybeSingle();

  if (sharedError || !sharedRow) {
    return {
      ok: false,
      side: input.side,
      message: "Add this card to your wall before enabling public images.",
    };
  }

  const existingSharedRow = sharedRow as SharedCardRow;
  const showColumn = input.side === "front" ? "show_personal_front" : "show_personal_back";
  const pathColumn = input.side === "front" ? "public_front_image_path" : "public_back_image_path";

  let nextPublicImageUrl =
    input.side === "front" ? existingSharedRow.public_front_image_path : existingSharedRow.public_back_image_path;

  if (input.enabled) {
    const { data: imageRow, error: imageError } = await client
      .from("user_card_images")
      .select("storage_path")
      .eq("user_id", user.id)
      .eq("vault_item_id", ownerVaultRow.id)
      .eq("side", input.side)
      .maybeSingle();

    if (imageError || !imageRow) {
      return {
        ok: false,
        side: input.side,
        message: IMAGE_MISSING_MESSAGE,
      };
    }

    const resolvedImageUrl = resolveSharedCardPublicImageUrl((imageRow as UserCardImageRow).storage_path);
    if (!resolvedImageUrl) {
      return {
        ok: false,
        side: input.side,
        message: "This card photo is not ready for your public wall yet.",
      };
    }

    nextPublicImageUrl = resolvedImageUrl;
  }

  const { error: updateError } = await client
    .from("shared_cards")
    .update({
      [showColumn]: input.enabled,
      [pathColumn]: nextPublicImageUrl,
    })
    .eq("id", existingSharedRow.id)
    .eq("user_id", user.id);

  if (updateError) {
    return {
      ok: false,
      side: input.side,
      message: "Couldn’t update public image settings.",
    };
  }

  const { data: profileRow } = await client.from("public_profiles").select("slug").eq("user_id", user.id).maybeSingle();
  const profile = (profileRow ?? null) as PublicProfileRow | null;

  revalidatePath("/vault");
  if (profile?.slug) {
    revalidatePath(`/u/${profile.slug}`);
    revalidatePath(`/u/${profile.slug}/collection`);
    if (ownerVaultRow.gv_id) {
      revalidatePath(`/card/${ownerVaultRow.gv_id}`);
    }
  }

  return {
    ok: true,
    side: input.side,
    enabled: input.enabled,
    publicImageUrl: input.enabled ? nextPublicImageUrl : null,
  };
}
