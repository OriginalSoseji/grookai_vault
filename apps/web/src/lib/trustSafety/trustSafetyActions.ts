"use server";

import { revalidatePath } from "next/cache";
import { createServerComponentClient } from "@/lib/supabase/server";

export type TrustSafetySurface = "profile" | "message" | "wall_card" | "listing" | "card" | "gvvi" | "other";
export type TrustSafetyReason = "spam" | "harassment" | "scam" | "inappropriate" | "other";

export type TrustSafetyActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

function normalizeOptionalText(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeSurface(value: string | null | undefined): TrustSafetySurface {
  switch (value) {
    case "profile":
    case "message":
    case "wall_card":
    case "listing":
    case "card":
    case "gvvi":
      return value;
    default:
      return "other";
  }
}

function normalizeReason(value: string | null | undefined): TrustSafetyReason {
  switch (value) {
    case "spam":
    case "harassment":
    case "scam":
    case "inappropriate":
      return value;
    default:
      return "other";
  }
}

function revalidateTrustSafetyPaths(returnPath: string | null) {
  if (returnPath) {
    revalidatePath(returnPath);
  }
  revalidatePath("/network");
  revalidatePath("/network/inbox");
  revalidatePath("/", "layout");
}

export async function reportTrustSafetySurfaceAction(args: {
  reportedUserId?: string | null;
  surface: TrustSafetySurface | string;
  surfaceId?: string | null;
  reason?: TrustSafetyReason | string | null;
  details?: string | null;
  returnPath?: string | null;
}): Promise<TrustSafetyActionResult> {
  const client = createServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return { ok: false, message: "Sign in required to report." };
  }

  const reportedUserId = normalizeOptionalText(args.reportedUserId);
  if (reportedUserId && reportedUserId === user.id) {
    return { ok: false, message: "You cannot report yourself." };
  }

  const surface = normalizeSurface(args.surface);
  const reason = normalizeReason(args.reason);
  const details = normalizeOptionalText(args.details);

  const { error } = await client.from("trust_reports").insert({
    reporter_user_id: user.id,
    reported_user_id: reportedUserId,
    surface,
    surface_id: normalizeOptionalText(args.surfaceId),
    reason,
    details: details ? details.slice(0, 2000) : null,
  });

  if (error) {
    return { ok: false, message: "Report could not be submitted." };
  }

  revalidateTrustSafetyPaths(normalizeOptionalText(args.returnPath));
  return { ok: true, message: "Report submitted." };
}

export async function blockTrustSafetyUserAction(args: {
  blockedUserId: string;
  cardPrintId?: string | null;
  returnPath?: string | null;
}): Promise<TrustSafetyActionResult> {
  const client = createServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return { ok: false, message: "Sign in required to block." };
  }

  const blockedUserId = normalizeOptionalText(args.blockedUserId);
  if (!blockedUserId) {
    return { ok: false, message: "Collector could not be identified." };
  }

  if (blockedUserId === user.id) {
    return { ok: false, message: "You cannot block yourself." };
  }

  const { error } = await client.from("trust_blocks").upsert(
    {
      user_id: user.id,
      blocked_user_id: blockedUserId,
    },
    { onConflict: "user_id,blocked_user_id" },
  );

  if (error) {
    return { ok: false, message: "Collector could not be blocked." };
  }

  const cardPrintId = normalizeOptionalText(args.cardPrintId);
  if (cardPrintId) {
    const now = new Date().toISOString();
    await client.from("card_interaction_group_states").upsert(
      {
        user_id: user.id,
        card_print_id: cardPrintId,
        counterpart_user_id: blockedUserId,
        has_unread: false,
        last_read_at: now,
        latest_message_at: now,
        archived_at: now,
        closed_at: null,
        updated_at: now,
      },
      { onConflict: "user_id,card_print_id,counterpart_user_id" },
    );
  }

  revalidateTrustSafetyPaths(normalizeOptionalText(args.returnPath));
  return { ok: true, message: "Collector blocked." };
}
