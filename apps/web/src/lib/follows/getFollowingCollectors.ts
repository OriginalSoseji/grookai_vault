import "server-only";

import { resolveProfileMediaUrl } from "@/lib/profileMedia";
import { createServerAdminClient } from "@/lib/supabase/admin";

export type FollowedCollector = {
  userId: string;
  slug: string;
  displayName: string;
  avatarUrl: string | null;
  followedAt: string | null;
};

type FollowRow = {
  followed_user_id: string | null;
  created_at: string | null;
};

type PublicProfileRow = {
  user_id: string | null;
  slug: string | null;
  display_name: string | null;
  public_profile_enabled: boolean | null;
  avatar_path: string | null;
};

function normalizeId(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export async function getFollowingCollectors(userId: string) {
  const normalizedUserId = normalizeId(userId);
  if (!normalizedUserId) {
    return [] as FollowedCollector[];
  }

  const admin = createServerAdminClient();
  const { data: followData, error: followError } = await admin
    .from("collector_follows")
    .select("followed_user_id,created_at")
    .eq("follower_user_id", normalizedUserId)
    .order("created_at", { ascending: false });

  if (followError || !followData) {
    console.error("[follows] following list lookup failed", {
      userId: normalizedUserId,
      error: followError,
    });
    return [] as FollowedCollector[];
  }

  const followRows = (followData ?? []) as FollowRow[];
  const followedUserIds = Array.from(
    new Set(
      followRows
        .map((row) => normalizeId(row.followed_user_id))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  if (followedUserIds.length === 0) {
    return [] as FollowedCollector[];
  }

  const { data: profileData, error: profileError } = await admin
    .from("public_profiles")
    .select("user_id,slug,display_name,public_profile_enabled,avatar_path")
    .in("user_id", followedUserIds)
    .eq("public_profile_enabled", true);

  if (profileError || !profileData) {
    console.error("[follows] followed collector profile lookup failed", {
      userId: normalizedUserId,
      error: profileError,
    });
    return [] as FollowedCollector[];
  }

  const profileByUserId = new Map(
    ((profileData ?? []) as PublicProfileRow[])
      .filter(
        (row): row is PublicProfileRow & { user_id: string; slug: string; display_name: string } =>
          Boolean(row.user_id && row.slug && row.display_name && row.public_profile_enabled),
      )
      .map((row) => [
        row.user_id,
        {
          slug: row.slug,
          displayName: row.display_name,
          avatarUrl: resolveProfileMediaUrl(row.avatar_path),
        },
      ]),
  );

  return followRows
    .map((row) => {
      const followedUserId = normalizeId(row.followed_user_id);
      if (!followedUserId) {
        return null;
      }

      const profile = profileByUserId.get(followedUserId);
      if (!profile) {
        return null;
      }

      return {
        userId: followedUserId,
        slug: profile.slug,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        followedAt: row.created_at ?? null,
      } satisfies FollowedCollector;
    })
    .filter((row): row is FollowedCollector => row !== null);
}
