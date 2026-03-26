"use server";

import { revalidatePath } from "next/cache";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { createServerComponentClient } from "@/lib/supabase/server";

type PublicProfileRow = {
  user_id: string | null;
  slug: string | null;
  public_profile_enabled: boolean | null;
};

export type FollowCollectorInput = {
  followedUserId: string;
};

export type FollowCollectorResult =
  | {
      ok: true;
      isFollowing: true;
    }
  | {
      ok: false;
      message: string;
    };

function normalizeId(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export async function followCollectorAction(
  input: FollowCollectorInput,
): Promise<FollowCollectorResult> {
  const client = createServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return {
      ok: false,
      message: "Sign in required.",
    };
  }

  const followedUserId = normalizeId(input.followedUserId);
  if (!followedUserId) {
    return {
      ok: false,
      message: "Collector could not be followed.",
    };
  }

  if (followedUserId === user.id) {
    return {
      ok: false,
      message: "You can't follow yourself.",
    };
  }

  const admin = createServerAdminClient();
  const { data: profileData, error: profileError } = await admin
    .from("public_profiles")
    .select("user_id,slug,public_profile_enabled")
    .eq("user_id", followedUserId)
    .maybeSingle();

  const profile = (profileData ?? null) as PublicProfileRow | null;
  if (profileError || !profile || !profile.public_profile_enabled) {
    return {
      ok: false,
      message: "Collector could not be followed.",
    };
  }

  const { error: followError } = await admin
    .from("collector_follows")
    .upsert(
      {
        follower_user_id: user.id,
        followed_user_id: followedUserId,
      },
      {
        onConflict: "follower_user_id,followed_user_id",
        ignoreDuplicates: true,
      },
    );

  if (followError) {
    return {
      ok: false,
      message: "Collector could not be followed.",
    };
  }

  revalidatePath("/following");
  if (profile.slug) {
    revalidatePath(`/u/${profile.slug}`);
    revalidatePath(`/u/${profile.slug}/collection`);
  }

  return {
    ok: true,
    isFollowing: true,
  };
}
