"use server";

import { revalidatePath } from "next/cache";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { createServerComponentClient } from "@/lib/supabase/server";

type PublicProfileRow = {
  slug: string | null;
};

export type UnfollowCollectorInput = {
  followedUserId: string;
};

export type UnfollowCollectorResult =
  | {
      ok: true;
      isFollowing: false;
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

export async function unfollowCollectorAction(
  input: UnfollowCollectorInput,
): Promise<UnfollowCollectorResult> {
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
  if (!followedUserId || followedUserId === user.id) {
    return {
      ok: false,
      message: "Collector could not be unfollowed.",
    };
  }

  const admin = createServerAdminClient();
  const { data: profileData } = await admin
    .from("public_profiles")
    .select("slug")
    .eq("user_id", followedUserId)
    .maybeSingle();

  const { error: unfollowError } = await admin
    .from("collector_follows")
    .delete()
    .eq("follower_user_id", user.id)
    .eq("followed_user_id", followedUserId);

  if (unfollowError) {
    return {
      ok: false,
      message: "Collector could not be unfollowed.",
    };
  }

  const profile = (profileData ?? null) as PublicProfileRow | null;

  revalidatePath("/following");
  if (profile?.slug) {
    revalidatePath(`/u/${profile.slug}`);
    revalidatePath(`/u/${profile.slug}/collection`);
  }

  return {
    ok: true,
    isFollowing: false,
  };
}
