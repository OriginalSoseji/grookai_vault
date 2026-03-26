"use server";

import { revalidatePath } from "next/cache";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { createServerComponentClient } from "@/lib/supabase/server";
import {
  normalizeVaultInstanceImageDisplayMode,
  type VaultInstanceImageDisplayMode,
} from "@/lib/vaultInstanceImageDisplay";

export type SaveVaultItemInstanceImageDisplayModeInput = {
  instanceId: string;
  imageDisplayMode: VaultInstanceImageDisplayMode;
};

export type SaveVaultItemInstanceImageDisplayModeResult =
  | {
      ok: true;
      instanceId: string;
      imageDisplayMode: VaultInstanceImageDisplayMode;
      gvviId: string | null;
    }
  | {
      ok: false;
      instanceId: string;
      message: string;
    };

type InstanceRow = {
  id: string;
  user_id: string | null;
  archived_at: string | null;
  gv_vi_id: string | null;
  card_print_id: string | null;
};

type ProfileRow = {
  slug: string | null;
};

type CardPrintRow = {
  gv_id: string | null;
};

export async function saveVaultItemInstanceImageDisplayModeAction(
  input: SaveVaultItemInstanceImageDisplayModeInput,
): Promise<SaveVaultItemInstanceImageDisplayModeResult> {
  const client = createServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return {
      ok: false,
      instanceId: input.instanceId,
      message: "Sign in required.",
    };
  }

  const normalizedInstanceId = input.instanceId.trim();
  const imageDisplayMode = normalizeVaultInstanceImageDisplayMode(input.imageDisplayMode);

  if (!normalizedInstanceId || !imageDisplayMode) {
    return {
      ok: false,
      instanceId: input.instanceId,
      message: "Image display mode is invalid.",
    };
  }

  const admin = createServerAdminClient();
  const { data: instanceData, error: instanceError } = await admin
    .from("vault_item_instances")
    .select("id,user_id,archived_at,gv_vi_id,card_print_id")
    .eq("id", normalizedInstanceId)
    .maybeSingle();

  const instance = (instanceData ?? null) as InstanceRow | null;
  if (instanceError || !instance || instance.user_id !== user.id || instance.archived_at !== null) {
    return {
      ok: false,
      instanceId: normalizedInstanceId,
      message: "Image display mode could not be saved.",
    };
  }

  const { data, error } = await admin
    .from("vault_item_instances")
    .update({
      image_display_mode: imageDisplayMode,
    })
    .eq("id", normalizedInstanceId)
    .select("id,image_display_mode,gv_vi_id,card_print_id")
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      instanceId: normalizedInstanceId,
      message: "Image display mode could not be saved.",
    };
  }

  const gvviId = typeof data.gv_vi_id === "string" ? data.gv_vi_id.trim() : null;
  const cardPrintId = typeof data.card_print_id === "string" ? data.card_print_id.trim() : null;

  revalidatePath("/vault");
  if (gvviId) {
    revalidatePath(`/vault/gvvi/${gvviId}`);
    revalidatePath(`/gvvi/${gvviId}`);
  }

  const [{ data: profileData }, { data: cardPrintData }] = await Promise.all([
    admin.from("public_profiles").select("slug").eq("user_id", user.id).maybeSingle(),
    cardPrintId
      ? admin.from("card_prints").select("gv_id").eq("id", cardPrintId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const profile = (profileData ?? null) as ProfileRow | null;
  const slug = typeof profile?.slug === "string" ? profile.slug.trim() : null;
  if (slug) {
    revalidatePath(`/u/${slug}`);
    revalidatePath(`/u/${slug}/collection`);
  }

  const cardPrint = (cardPrintData ?? null) as CardPrintRow | null;
  const gvId = typeof cardPrint?.gv_id === "string" ? cardPrint.gv_id.trim() : null;
  if (gvId) {
    revalidatePath(`/card/${gvId}`);
  }

  return {
    ok: true,
    instanceId: data.id,
    imageDisplayMode: normalizeVaultInstanceImageDisplayMode(data.image_display_mode) ?? "canonical",
    gvviId,
  };
}
