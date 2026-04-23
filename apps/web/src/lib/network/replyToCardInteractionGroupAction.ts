"use server";

import { revalidatePath } from "next/cache";
import type { CreateCardInteractionActionResult } from "@/lib/network/createCardInteractionAction";
import { executeOwnerWriteV1 } from "@/lib/contracts/execute_owner_write_v1";
import {
  createInteractionExistsProofV1,
  createInteractionSignalProofV1,
} from "@/lib/contracts/owner_write_proofs_v1";
import { createServerComponentClient } from "@/lib/supabase/server";

type ExistingInteractionRow = {
  id: string;
};

function normalizeOptionalText(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function buildSuccessResult(
  submissionKey: number,
  interactionId: string,
  counterpartDisplayName: string | null,
): CreateCardInteractionActionResult {
  return {
    ok: true,
    status: "created",
    interactionId,
    submissionKey,
    message: `Reply sent to ${counterpartDisplayName ?? "collector"}.`,
  };
}

export async function replyToCardInteractionGroupAction(
  _previousState: CreateCardInteractionActionResult | null,
  formData: FormData,
): Promise<CreateCardInteractionActionResult> {
  const submissionKey = Date.now();
  const client = createServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return {
      ok: false,
      status: "login-required",
      submissionKey,
      message: "Sign in required.",
    };
  }

  const vaultItemId = normalizeOptionalText(formData.get("vault_item_id"));
  const cardPrintId = normalizeOptionalText(formData.get("card_print_id"));
  const counterpartUserId = normalizeOptionalText(formData.get("counterpart_user_id"));
  const counterpartDisplayName = normalizeOptionalText(formData.get("counterpart_display_name"));
  const message = normalizeOptionalText(formData.get("message"));
  const returnPath = normalizeOptionalText(formData.get("return_path")) ?? "/network/inbox";

  if (!vaultItemId || !cardPrintId || !counterpartUserId || !message) {
    return {
      ok: false,
      status: "validation-error",
      submissionKey,
      message: "A card, collector, and message are required.",
    };
  }

  if (counterpartUserId === user.id) {
    return {
      ok: false,
      status: "validation-error",
      submissionKey,
      message: "You cannot reply to yourself.",
    };
  }

  if (message.length > 2000) {
    return {
      ok: false,
      status: "validation-error",
      submissionKey,
      message: "Reply must be 2000 characters or fewer.",
    };
  }

  const participantFilter = [
    `and(sender_user_id.eq.${user.id},receiver_user_id.eq.${counterpartUserId})`,
    `and(sender_user_id.eq.${counterpartUserId},receiver_user_id.eq.${user.id})`,
  ].join(",");

  const { data: groupRow, error: groupError } = await client
    .from("card_interactions")
    .select("id")
    .eq("vault_item_id", vaultItemId)
    .eq("card_print_id", cardPrintId)
    .or(participantFilter)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (groupError) {
    return {
      ok: false,
      status: "error",
      submissionKey,
      message: "Message thread could not be verified.",
    };
  }

  const existingGroup = (groupRow ?? null) as ExistingInteractionRow | null;
  if (!existingGroup?.id) {
    return {
      ok: false,
      status: "unavailable",
      submissionKey,
      message: "That message thread is no longer available for reply.",
    };
  }

  const duplicateWindowStart = new Date(Date.now() - 15_000).toISOString();
  const { data: existingInteraction, error: existingInteractionError } = await client
    .from("card_interactions")
    .select("id")
    .eq("sender_user_id", user.id)
    .eq("receiver_user_id", counterpartUserId)
    .eq("vault_item_id", vaultItemId)
    .eq("card_print_id", cardPrintId)
    .eq("message", message)
    .gte("created_at", duplicateWindowStart)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingInteractionError) {
    return {
      ok: false,
      status: "error",
      submissionKey,
      message: "Message history could not be checked.",
    };
  }

  const duplicate = (existingInteraction ?? null) as ExistingInteractionRow | null;
  if (duplicate?.id) {
    revalidatePath(returnPath);
    revalidatePath("/network/inbox");
    revalidatePath("/", "layout");

    return buildSuccessResult(submissionKey, duplicate.id, counterpartDisplayName);
  }

  try {
    const ownerWriteResult = await executeOwnerWriteV1<CreateCardInteractionActionResult>({
      execution_name: "reply_card_interaction_group",
      actor_id: user.id,
      write: async (context) => {
        const { data: insertedRow, error: insertError } = await client
          .from("card_interactions")
          .insert({
            card_print_id: cardPrintId,
            vault_item_id: vaultItemId,
            sender_user_id: user.id,
            receiver_user_id: counterpartUserId,
            message,
          })
          .select("id")
          .single();

        if (insertError) {
          return {
            ok: false,
            status: "error",
            submissionKey,
            message: "Reply could not be created.",
          } satisfies CreateCardInteractionActionResult;
        }

        await client.from("card_signals").insert({
          user_id: user.id,
          card_print_id: cardPrintId,
          signal_type: "interaction",
        });

        const inserted = (insertedRow ?? null) as ExistingInteractionRow | null;
        context.setMetadata("interaction_id", inserted?.id ?? "");
        context.setMetadata("interaction_receiver_user_id", counterpartUserId);
        context.setMetadata("interaction_vault_item_id", vaultItemId);
        context.setMetadata("interaction_card_print_id", cardPrintId);
        context.setMetadata("interaction_message", message);

        return buildSuccessResult(
          submissionKey,
          inserted?.id ?? "",
          counterpartDisplayName,
        );
      },
      proofs: [
        createInteractionExistsProofV1<CreateCardInteractionActionResult>(({ result, getMetadata }) => {
          if (!result.ok) {
            return null;
          }

          const interactionId = getMetadata<string>("interaction_id");
          if (!interactionId) {
            return null;
          }

          return {
            interactionId,
            receiverUserId: getMetadata<string>("interaction_receiver_user_id"),
            vaultItemId: getMetadata<string>("interaction_vault_item_id"),
            cardPrintId: getMetadata<string>("interaction_card_print_id"),
            message: getMetadata<string>("interaction_message"),
          };
        }),
        createInteractionSignalProofV1<CreateCardInteractionActionResult>(({ result, getMetadata }) => {
          if (!result.ok) {
            return null;
          }

          const cardPrintIdFromWrite = getMetadata<string>("interaction_card_print_id");
          if (!cardPrintIdFromWrite) {
            return null;
          }

          return {
            cardPrintId: cardPrintIdFromWrite,
          };
        }),
      ],
    });

    revalidatePath(returnPath);
    revalidatePath("/network/inbox");
    revalidatePath("/", "layout");

    return ownerWriteResult;
  } catch {
    return {
      ok: false,
      status: "error",
      submissionKey,
      message: "Reply could not be created.",
    };
  }
}
