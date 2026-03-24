"use server";

import { revalidatePath } from "next/cache";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { createServerComponentClient } from "@/lib/supabase/server";

type StreamTargetRow = {
  vault_item_id: string | null;
  owner_user_id: string | null;
  owner_slug: string | null;
  owner_display_name: string | null;
  card_print_id: string | null;
  intent: string | null;
  gv_id: string | null;
  name: string | null;
};

type InsertedInteractionRow = {
  id: string;
};

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
  const returnPath = normalizeOptionalText(formData.get("return_path")) ?? "/network";

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

  const admin = createServerAdminClient();
  const { data: streamTarget, error: streamError } = await admin
    .from("v_card_stream_v1")
    .select("vault_item_id,owner_user_id,owner_slug,owner_display_name,card_print_id,intent,gv_id,name")
    .eq("vault_item_id", vaultItemId)
    .eq("card_print_id", cardPrintId)
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

  if (!target?.vault_item_id || !target.card_print_id || !receiverUserId) {
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

  const { data: insertedRow, error: insertError } = await admin
    .from("card_interactions")
    .insert({
      card_print_id: target.card_print_id,
      vault_item_id: target.vault_item_id,
      sender_user_id: user.id,
      receiver_user_id: receiverUserId,
      message,
    })
    .select("id")
    .single();

  if (insertError) {
    return {
      ok: false,
      status: "error",
      submissionKey,
      message: "Interaction could not be created.",
    };
  }

  await admin.from("card_signals").insert({
    user_id: user.id,
    card_print_id: target.card_print_id,
    signal_type: "interaction",
  });

  revalidatePath(returnPath);
  revalidatePath("/network");
  revalidatePath("/network/inbox");

  const inserted = (insertedRow ?? null) as InsertedInteractionRow | null;

  return {
    ok: true,
    status: "created",
    interactionId: inserted?.id ?? "",
    submissionKey,
    message: `Message sent to ${target.owner_display_name ?? "collector"}.`,
  };
}
