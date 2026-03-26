import "server-only";

import { resolveProfileMediaUrl } from "@/lib/profileMedia";
import { createServerAdminClient } from "@/lib/supabase/admin";

export type FollowerCollector = {
  userId: string;
  slug: string;
  displayName: string;
  avatarUrl: string | null;
  followedAt: string | null;
};

type FollowRow = {
  follower_user_id: string | null;
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

export async function getFollowerCollectors(userId: string) {
  const normalizedUserId = normalizeId(userId);
  if (!normalizedUserId) {
    return [] as FollowerCollector[];
  }

  const admin = createServerAdminClient();
  const { data: followData, error: followError } = await admin
    .from("collector_follows")
    .select("follower_user_id,created_at")
    .eq("followed_user_id", normalizedUserId)
    .order("created_at", { ascending: false });

  if (followError || !followData) {
    console.error("[follows] follower list lookup failed", {
      userId: normalizedUserId,
      error: followError,
    });
    return [] as FollowerCollector[];
  }

  const followRows = (followData ?? []) as FollowRow[];
  const followerUserIds = Array.from(
    new Set(
      followRows
        .map((row) => normalizeId(row.follower_user_id))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  if (followerUserIds.length === 0) {
    return [] as FollowerCollector[];
  }

  const { data: profileData, error: profileError } = await admin
    .from("public_profiles")
    .select("user_id,slug,display_name,public_profile_enabled,avatar_path")
    .in("user_id", followerUserIds)
    .eq("public_profile_enabled", true);

  if (profileError || !profileData) {
    console.error("[follows] follower profile lookup failed", {
      userId: normalizedUserId,
      error: profileError,
    });
    return [] as FollowerCollector[];
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
      const followerUserId = normalizeId(row.follower_user_id);
      if (!followerUserId) {
        return null;
      }

      const profile = profileByUserId.get(followerUserId);
      if (!profile) {
        return null;
      }

      return {
        userId: followerUserId,
        slug: profile.slug,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        followedAt: row.created_at ?? null,
      } satisfies FollowerCollector;
    })
    .filter((row): row is FollowerCollector => row !== null);
}
