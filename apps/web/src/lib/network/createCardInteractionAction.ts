"use server";

import { revalidatePath } from "next/cache";
import { executeOwnerWriteV1 } from "@/lib/contracts/execute_owner_write_v1";
import {
  createInteractionExistsProofV1,
  createInteractionSignalProofV1,
} from "@/lib/contracts/owner_write_proofs_v1";
import { insertCardInteraction } from "@/lib/network/insertCardInteraction";
import { createServerComponentClient } from "@/lib/supabase/server";

type StreamTargetRow = {
  vault_item_id: string | null;
  owner_user_id: string | null;
  owner_slug: string | null;
  owner_display_name: string | null;
  card_print_id: string | null;
  intent: string | null;
  created_at: string | null;
};

type InsertedInteractionRow = {
  id: string;
};

type ExistingInteractionRow = {
  id: string;
};

const CONTACTABLE_INTENTS = new Set(["trade", "sell", "showcase"]);

export type CreateCardInteractionActionResult =
  | {
      ok: true;
      status: "created";
      interactionId: string;
      submissionKey: number;
      message: string;
    }
  | {
      ok: false;
      status: "login-required" | "validation-error" | "unavailable" | "error";
      submissionKey: number;
      message: string;
    };

function normalizeOptionalText(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeReturnPath(value: FormDataEntryValue | string | null | undefined) {
  const normalized = normalizeOptionalText(value);
  if (!normalized || !normalized.startsWith("/") || normalized.startsWith("//") || normalized.includes("\\")) {
    return "/network";
  }

  try {
    const parsed = new URL(normalized, "http://internal.local");
    return parsed.origin === "http://internal.local" && parsed.pathname.startsWith("/")
      ? parsed.pathname
      : "/network";
  } catch {
    return "/network";
  }
}

function revalidateInteractionPaths(returnPath: string) {
  revalidatePath(returnPath);
  revalidatePath("/network/inbox");
}

function buildSuccessResult(
  submissionKey: number,
  interactionId: string,
  ownerDisplayName: string | null,
): CreateCardInteractionActionResult {
  return {
    ok: true,
    status: "created",
    interactionId,
    submissionKey,
    message: `Message sent to ${ownerDisplayName ?? "collector"}.`,
  };
}

export async function createCardInteractionAction(
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
  const message = normalizeOptionalText(formData.get("message"));
  const returnPath = normalizeReturnPath(formData.get("return_path"));

  if (!vaultItemId || !cardPrintId || !message) {
    return {
      ok: false,
      status: "validation-error",
      submissionKey,
      message: "A card, owner, and message are required.",
    };
  }

  if (message.length > 2000) {
    return {
      ok: false,
      status: "validation-error",
      submissionKey,
      message: "Message must be 2000 characters or fewer.",
    };
  }

  const { data: streamTarget, error: streamError } = await client
    .from("v_card_contact_targets_v1")
    .select("vault_item_id,owner_user_id,owner_slug,owner_display_name,card_print_id,intent,created_at")
    .eq("vault_item_id", vaultItemId)
    .eq("card_print_id", cardPrintId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (streamError) {
    return {
      ok: false,
      status: "error",
      submissionKey,
      message: "Card availability could not be verified.",
    };
  }

  const target = (streamTarget ?? null) as StreamTargetRow | null;
  const receiverUserId = normalizeOptionalText(target?.owner_user_id);

  if (
    !target?.vault_item_id ||
    !target.card_print_id ||
    !receiverUserId ||
    !target.intent ||
    !CONTACTABLE_INTENTS.has(target.intent)
  ) {
    return {
      ok: false,
      status: "unavailable",
      submissionKey,
      message: "That card is no longer available for contact.",
    };
  }

  if (receiverUserId === user.id) {
    return {
      ok: false,
      status: "validation-error",
      submissionKey,
      message: "You cannot create an interaction with your own card.",
    };
  }

  const targetVaultItemId = target.vault_item_id;
  const targetCardPrintId = target.card_print_id;

  const duplicateWindowStart = new Date(Date.now() - 15_000).toISOString();
  const { data: existingInteraction, error: existingInteractionError } = await client
    .from("card_interactions")
    .select("id")
    .eq("sender_user_id", user.id)
    .eq("receiver_user_id", receiverUserId)
    .eq("vault_item_id", targetVaultItemId)
    .eq("card_print_id", targetCardPrintId)
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
    revalidateInteractionPaths(returnPath);

    return buildSuccessResult(submissionKey, duplicate.id, target.owner_display_name);
  }

  let committedInteractionId: string | null = null;

  try {
    const ownerWriteResult = await executeOwnerWriteV1<CreateCardInteractionActionResult>({
      execution_name: "create_card_interaction",
      actor_id: user.id,
      write: async (context) => {
        const { data: insertedRow, error: insertError, usedCanonicalFallback } =
          await insertCardInteraction({
            client,
            adminClient: context.adminClient,
            input: {
              cardPrintId: targetCardPrintId,
              vaultItemId: targetVaultItemId,
              senderUserId: user.id,
              receiverUserId,
              message,
            },
            authorization: { kind: "public-target" },
          });

        if (insertError) {
          return {
            ok: false,
            status: "error",
            submissionKey,
            message: "Message could not be created.",
          } satisfies CreateCardInteractionActionResult;
        }

        const inserted = (insertedRow ?? null) as InsertedInteractionRow | null;
        if (!inserted?.id) {
          return {
            ok: false,
            status: "error",
            submissionKey,
            message: "Message could not be confirmed.",
          } satisfies CreateCardInteractionActionResult;
        }

        committedInteractionId = inserted.id;
        const { error: signalError } = await client.from("card_signals").insert({
          user_id: user.id,
          card_print_id: targetCardPrintId,
          signal_type: "interaction",
        });

        if (signalError) {
          console.error("[network:interaction] secondary signal write failed", {
            interactionId: inserted.id,
            cardPrintId: targetCardPrintId,
            error: signalError.message,
          });
        }

        context.setMetadata("interaction_id", inserted.id);
        context.setMetadata("interaction_receiver_user_id", receiverUserId);
        context.setMetadata("interaction_vault_item_id", targetVaultItemId);
        context.setMetadata("interaction_card_print_id", targetCardPrintId);
        context.setMetadata("interaction_message", message);
        context.setMetadata("interaction_signal_written", !signalError);
        context.setMetadata("interaction_used_canonical_fallback", usedCanonicalFallback);

        return buildSuccessResult(
          submissionKey,
          inserted.id,
          target.owner_display_name,
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
          if (!result.ok || !getMetadata<boolean>("interaction_signal_written")) {
            return null;
          }

          const cardPrintId = getMetadata<string>("interaction_card_print_id");
          if (!cardPrintId) {
            return null;
          }

          return {
            cardPrintId,
          };
        }),
      ],
    });

    if (ownerWriteResult.ok) {
      revalidateInteractionPaths(returnPath);
    }

    return ownerWriteResult;
  } catch (error) {
    if (committedInteractionId) {
      const { data: committedInteraction, error: committedInteractionError } = await client
        .from("card_interactions")
        .select("id")
        .eq("id", committedInteractionId)
        .eq("sender_user_id", user.id)
        .maybeSingle();

      if (!committedInteractionError && committedInteraction?.id === committedInteractionId) {
        console.error("[network:interaction] post-write verification failed after commit", {
          interactionId: committedInteractionId,
          error: error instanceof Error ? error.message : String(error),
        });
        revalidateInteractionPaths(returnPath);
        return buildSuccessResult(submissionKey, committedInteractionId, target.owner_display_name);
      }
    }

    return {
      ok: false,
      status: "error",
      submissionKey,
      message: "Message could not be created.",
    };
  }
}
