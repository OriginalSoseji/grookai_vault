import "server-only";

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { executeOwnerWriteV1 } from "@/lib/contracts/execute_owner_write_v1";
import { createVaultInstanceActiveProofV1 } from "@/lib/contracts/owner_write_proofs_v1";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { assertAuthenticatedVaultUser } from "@/lib/vault/assertAuthenticatedVaultUser";
import { resolveActiveVaultAnchor, type ActiveVaultAnchor } from "@/lib/vault/resolveActiveVaultAnchor";

type AddCardToVaultParams = {
  client: SupabaseClient;
  userId: string;
  cardPrintId: string;
  gvId: string;
  name: string;
  setName?: string;
  imageUrl?: string;
};

type VaultInstanceCreateRow = {
  id: string;
  gv_vi_id: string | null;
};

export type AddCardToVaultResult = {
  success: true;
  gvvi_id: string | null;
};

function formatVaultWriteError(step: string, error: PostgrestError) {
  const parts = [
    `[${step}]`,
    error.message,
    error.code ? `code=${error.code}` : null,
    error.details ? `details=${error.details}` : null,
    error.hint ? `hint=${error.hint}` : null,
  ].filter((value): value is string => Boolean(value));

  return parts.join(" | ");
}

async function mirrorLegacyVaultBucket({
  client,
  gvId,
  anchor,
  insertedAnchorId,
}: {
  client: SupabaseClient;
  gvId: string;
  anchor: ActiveVaultAnchor;
  insertedAnchorId: string | null;
}) {
  if (insertedAnchorId === anchor.id) {
    console.info("[vault:add:mirror]", {
      user_id: anchor.user_id,
      gv_id: gvId,
      card_print_id: anchor.card_id,
      action: "insert",
    });
    return;
  }

  const { error: updateError } = await client
    .from("vault_items")
    .update({
      qty: (typeof anchor.qty === "number" ? anchor.qty : 0) + 1,
    })
    .eq("id", anchor.id)
    .eq("user_id", anchor.user_id)
    .is("archived_at", null);

  if (updateError) {
    throw new Error(formatVaultWriteError("vault_items.increment-existing-active", updateError));
  }

  console.info("[vault:add:mirror]", {
    user_id: anchor.user_id,
    gv_id: gvId,
    card_print_id: anchor.card_id,
    action: "update",
  });
}

export async function addCardToVault({
  client,
  userId,
  cardPrintId,
  gvId,
  name,
  setName,
  imageUrl,
}: AddCardToVaultParams): Promise<AddCardToVaultResult> {
  const normalizedUserId = userId.trim();
  await assertAuthenticatedVaultUser(client, normalizedUserId);

  const normalizedCardPrintId = cardPrintId.trim();
  if (!normalizedCardPrintId) {
    throw new Error("GVVI create failed: missing cardPrintId.");
  }

  return executeOwnerWriteV1({
    execution_name: "add_card_to_vault",
    actor_id: normalizedUserId,
    write: async (context) => {
      const normalizedName = name.trim() || "Unknown card";
      const normalizedSetName = setName?.trim() || "";
      const normalizedImageUrl = imageUrl ?? null;
      const adminClient = createServerAdminClient();
      const { anchor, insertedAnchorId } = await resolveActiveVaultAnchor({
        client,
        userId: normalizedUserId,
        cardId: normalizedCardPrintId,
        createData: {
          gvId,
          quantity: 1,
          conditionLabel: "NM",
          name: normalizedName,
          setName: normalizedSetName,
          photoUrl: normalizedImageUrl,
        },
      });
      const rpcArgs = {
        p_user_id: normalizedUserId,
        p_card_print_id: normalizedCardPrintId,
        p_legacy_vault_item_id: anchor.id,
        p_condition_label: "NM",
        p_name: normalizedName,
        p_set_name: normalizedSetName || null,
        p_photo_url: normalizedImageUrl,
      };

      console.info("vault.addCardToVault.begin", {
        userId: normalizedUserId,
        cardPrintId: normalizedCardPrintId,
        canonicalClient: "server_admin_client",
        mirrorClient: "authenticated_server_client",
        rpcArgs,
      });

      const { data: instance, error: instanceError } = await adminClient.rpc(
        "admin_vault_instance_create_v1",
        rpcArgs,
      );

      if (instanceError) {
        if (insertedAnchorId === anchor.id) {
          await client
            .from("vault_items")
            .update({ qty: 0, archived_at: new Date().toISOString() })
            .eq("id", anchor.id)
            .eq("user_id", normalizedUserId)
            .is("archived_at", null);
        }

        console.error("vault.addCardToVault.instance_rpc_failed", {
          userId: normalizedUserId,
          cardPrintId: normalizedCardPrintId,
          error: instanceError,
        });
        throw new Error(`GVVI create failed: ${instanceError.message}`);
      }

      const createdInstance = Array.isArray(instance) ? instance[0] : instance;
      const createdRow = (createdInstance ?? null) as VaultInstanceCreateRow | null;
      if (!createdRow?.id) {
        throw new Error("GVVI create failed: RPC returned no instance row.");
      }

      context.setMetadata("created_instance_id", createdRow.id);
      context.setMetadata("created_card_print_id", normalizedCardPrintId);

      console.info("[vault:add]", {
        user_id: normalizedUserId,
        gv_id: gvId,
        card_print_id: normalizedCardPrintId,
        gv_vi_id: createdRow.gv_vi_id,
        action: "instance_create",
      });

      try {
        // TEMP COMPATIBILITY MIRROR (to be removed after read cutover)
        await mirrorLegacyVaultBucket({
          client,
          gvId,
          anchor,
          insertedAnchorId,
        });
      } catch (mirrorError) {
        console.error("vault.addCardToVault.bucket_mirror_failed", {
          userId: normalizedUserId,
          cardPrintId: normalizedCardPrintId,
          gvvi_id: createdRow.gv_vi_id ?? null,
          error: mirrorError,
        });
      }

      return {
        success: true,
        gvvi_id: createdRow.gv_vi_id ?? null,
      };
    },
    proofs: [
      createVaultInstanceActiveProofV1(({ getMetadata }) => {
        const instanceId = getMetadata<string>("created_instance_id");
        if (!instanceId) {
          return null;
        }

        return {
          instanceId,
          cardPrintId: getMetadata<string>("created_card_print_id") ?? normalizedCardPrintId,
        };
      }),
    ],
  });
}
