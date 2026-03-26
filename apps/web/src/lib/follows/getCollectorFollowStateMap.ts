import "server-only";

import { createServerAdminClient } from "@/lib/supabase/admin";

function normalizeId(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export async function getCollectorFollowStateMap(
  followerUserId: string | null | undefined,
  followedUserIds: Array<string | null | undefined>,
) {
  const normalizedFollowerUserId = normalizeId(followerUserId);
  const normalizedFollowedUserIds = Array.from(
    new Set(
      followedUserIds
        .map((value) => normalizeId(value))
        .filter((value): value is string => Boolean(value && value !== normalizedFollowerUserId)),
    ),
  );

  if (!normalizedFollowerUserId || normalizedFollowedUserIds.length === 0) {
    return new Set<string>();
  }

  const admin = createServerAdminClient();
  const { data, error } = await admin
    .from("collector_follows")
    .select("followed_user_id")
    .eq("follower_user_id", normalizedFollowerUserId)
    .in("followed_user_id", normalizedFollowedUserIds);

  if (error || !data) {
    console.error("[follows] follow state map lookup failed", {
      followerUserId: normalizedFollowerUserId,
      error,
    });
    return new Set<string>();
  }

  return new Set(
    (data ?? [])
      .map((row) => normalizeId((row as { followed_user_id: string | null }).followed_user_id))
      .filter((value): value is string => Boolean(value)),
  );
}
