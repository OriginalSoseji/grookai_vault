"use server";

import { revalidatePath } from "next/cache";
import { createServerComponentClient } from "@/lib/supabase/server";

export type CardInteractionGroupStateAction = "read" | "closed" | "archived";

export type CardInteractionGroupStateActionResult =
  | {
      ok: true;
      action: CardInteractionGroupStateAction;
      updatedCount: number;
    }
  | {
      ok: false;
      action: CardInteractionGroupStateAction;
      message: string;
    };

type CardInteractionGroupStateTarget = {
  cardPrintId: string;
  counterpartUserId: string;
};

type LatestGroupInteractionRow = {
  created_at: string | null;
};

function normalizeOptionalText(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeTarget(target: CardInteractionGroupStateTarget | null | undefined) {
  const cardPrintId = normalizeOptionalText(target?.cardPrintId);
  const counterpartUserId = normalizeOptionalText(target?.counterpartUserId);
  if (!cardPrintId || !counterpartUserId) {
    return null;
  }

  return {
    cardPrintId,
    counterpartUserId,
  };
}

async function getLatestGroupInteractionCreatedAt(
  userId: string,
  target: CardInteractionGroupStateTarget,
) {
  const client = createServerComponentClient();
  const participantFilter = [
    `and(sender_user_id.eq.${userId},receiver_user_id.eq.${target.counterpartUserId})`,
    `and(sender_user_id.eq.${target.counterpartUserId},receiver_user_id.eq.${userId})`,
  ].join(",");

  const { data, error } = await client
    .from("card_interactions")
    .select("created_at")
    .eq("card_print_id", target.cardPrintId)
    .or(participantFilter)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`group lookup failed: ${error.message}`);
  }

  const row = (data ?? null) as LatestGroupInteractionRow | null;
  return normalizeOptionalText(row?.created_at);
}

async function upsertGroupState(
  userId: string,
  target: CardInteractionGroupStateTarget,
  action: CardInteractionGroupStateAction,
  latestMessageAt: string,
) {
  const client = createServerComponentClient();
  const now = new Date().toISOString();
  const nextState =
    action === "archived"
      ? { archived_at: now, closed_at: null }
      : action === "closed"
        ? { archived_at: null, closed_at: now }
        : { archived_at: null, closed_at: null };

  const { error } = await client.from("card_interaction_group_states").upsert(
    {
      user_id: userId,
      card_print_id: target.cardPrintId,
      counterpart_user_id: target.counterpartUserId,
      has_unread: false,
      last_read_at: latestMessageAt,
      latest_message_at: latestMessageAt,
      updated_at: now,
      ...nextState,
    },
    {
      onConflict: "user_id,card_print_id,counterpart_user_id",
    },
  );

  if (error) {
    throw new Error(`state upsert failed: ${error.message}`);
  }
}

async function applyGroupStateAction(
  action: CardInteractionGroupStateAction,
  targets: CardInteractionGroupStateTarget[],
  returnPath: string,
): Promise<CardInteractionGroupStateActionResult> {
  const client = createServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return {
      ok: false,
      action,
      message: "Sign in required.",
    };
  }

  let updatedCount = 0;

  for (const target of targets) {
    const latestMessageAt = await getLatestGroupInteractionCreatedAt(user.id, target);
    if (!latestMessageAt) {
      continue;
    }

    await upsertGroupState(user.id, target, action, latestMessageAt);
    updatedCount += 1;
  }

  revalidatePath(returnPath);
  revalidatePath("/network/inbox");
  revalidatePath("/", "layout");

  return {
    ok: true,
    action,
    updatedCount,
  };
}

export async function markCardInteractionGroupsReadAction(
  targets: CardInteractionGroupStateTarget[],
  returnPath = "/network/inbox",
) {
  const normalizedTargets = targets
    .map((target) => normalizeTarget(target))
    .filter((target): target is CardInteractionGroupStateTarget => Boolean(target));

  if (normalizedTargets.length === 0) {
    return {
      ok: true,
      action: "read" as const,
      updatedCount: 0,
    };
  }

  return applyGroupStateAction("read", normalizedTargets, returnPath);
}

export async function updateCardInteractionGroupStateAction(args: {
  action: CardInteractionGroupStateAction;
  cardPrintId: string;
  counterpartUserId: string;
  returnPath?: string;
}) {
  const action = args.action;
  const target = normalizeTarget({
    cardPrintId: args.cardPrintId,
    counterpartUserId: args.counterpartUserId,
  });
  const returnPath = normalizeOptionalText(args.returnPath) ?? "/network/inbox";

  if (!target) {
    return {
      ok: false,
      action,
      message: "Conversation could not be identified.",
    } satisfies CardInteractionGroupStateActionResult;
  }

  return applyGroupStateAction(action, [target], returnPath);
}
