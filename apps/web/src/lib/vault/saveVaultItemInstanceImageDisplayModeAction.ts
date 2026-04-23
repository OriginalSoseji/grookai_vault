"use server";

import { revalidatePath } from "next/cache";
import { executeOwnerWriteV1 } from "@/lib/contracts/execute_owner_write_v1";
import { createVaultInstanceImageDisplayModeProofV1 } from "@/lib/contracts/owner_write_proofs_v1";
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
  const { data: instanceData, error: instanceError } = await client
    .from("vault_item_instances")
    .select("id,user_id,archived_at,gv_vi_id,card_print_id")
    .eq("id", normalizedInstanceId)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .maybeSingle();

  const instance = (instanceData ?? null) as InstanceRow | null;
  if (instanceError || !instance) {
    return {
      ok: false,
      instanceId: normalizedInstanceId,
      message: "Image display mode could not be saved.",
    };
  }

  let result: Extract<SaveVaultItemInstanceImageDisplayModeResult, { ok: true }>;
  let cardPrintId: string | null = null;

  try {
    result = await executeOwnerWriteV1<
      Extract<SaveVaultItemInstanceImageDisplayModeResult, { ok: true }>
    >({
      execution_name: "save_vault_item_instance_image_display_mode",
      actor_id: user.id,
      write: async (context) => {
        context.setMetadata("source", "saveVaultItemInstanceImageDisplayModeAction");

        const { data, error } = await context.adminClient
          .from("vault_item_instances")
          .update({
            image_display_mode: imageDisplayMode,
          })
          .eq("id", normalizedInstanceId)
          .eq("user_id", user.id)
          .is("archived_at", null)
          .select("id,image_display_mode,gv_vi_id,card_print_id")
          .maybeSingle();

        if (error || !data) {
          throw new Error("Image display mode could not be saved.");
        }

        cardPrintId =
          typeof data.card_print_id === "string" ? data.card_print_id.trim() : null;

        return {
          ok: true,
          instanceId: data.id,
          imageDisplayMode:
            normalizeVaultInstanceImageDisplayMode(data.image_display_mode) ?? "canonical",
          gvviId: typeof data.gv_vi_id === "string" ? data.gv_vi_id.trim() : null,
        };
      },
      proofs: [
        createVaultInstanceImageDisplayModeProofV1(({ result }) => ({
          instanceId: result.instanceId,
          expectedImageDisplayMode: result.imageDisplayMode,
        })),
      ],
    });
  } catch {
    return {
      ok: false,
      instanceId: normalizedInstanceId,
      message: "Image display mode could not be saved.",
    };
  }

  const gvviId = result.gvviId;

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
    ...result,
    gvviId,
  };
}
