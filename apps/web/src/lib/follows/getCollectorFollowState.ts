import "server-only";

import { createServerAdminClient } from "@/lib/supabase/admin";

function normalizeId(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export async function getCollectorFollowState(
  followerUserId: string | null | undefined,
  followedUserId: string | null | undefined,
) {
  const normalizedFollowerUserId = normalizeId(followerUserId);
  const normalizedFollowedUserId = normalizeId(followedUserId);

  if (!normalizedFollowerUserId || !normalizedFollowedUserId || normalizedFollowerUserId === normalizedFollowedUserId) {
    return false;
  }

  const admin = createServerAdminClient();
  const { count, error } = await admin
    .from("collector_follows")
    .select("id", { count: "exact", head: true })
    .eq("follower_user_id", normalizedFollowerUserId)
    .eq("followed_user_id", normalizedFollowedUserId);

  if (error) {
    console.error("[follows] collector follow state lookup failed", {
      followerUserId: normalizedFollowerUserId,
      followedUserId: normalizedFollowedUserId,
      error,
    });
    return false;
  }

  return (count ?? 0) > 0;
}
