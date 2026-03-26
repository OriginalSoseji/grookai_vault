import "server-only";

import { createServerAdminClient } from "@/lib/supabase/admin";

export type CollectorFollowCounts = {
  followingCount: number;
  followerCount: number;
};

function normalizeId(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export async function getCollectorFollowCounts(userId: string | null | undefined): Promise<CollectorFollowCounts> {
  const normalizedUserId = normalizeId(userId);
  if (!normalizedUserId) {
    return {
      followingCount: 0,
      followerCount: 0,
    };
  }

  const admin = createServerAdminClient();
  const [{ count: followingCount, error: followingError }, { count: followerCount, error: followerError }] =
    await Promise.all([
      admin
        .from("collector_follows")
        .select("id", { count: "exact", head: true })
        .eq("follower_user_id", normalizedUserId),
      admin
        .from("collector_follows")
        .select("id", { count: "exact", head: true })
        .eq("followed_user_id", normalizedUserId),
    ]);

  if (followingError || followerError) {
    console.error("[follows] collector follow counts lookup failed", {
      userId: normalizedUserId,
      followingError,
      followerError,
    });
  }

  return {
    followingCount: followingCount ?? 0,
    followerCount: followerCount ?? 0,
  };
}
