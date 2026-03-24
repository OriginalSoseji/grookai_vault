import "server-only";

import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { resolveProfileMediaUrl } from "@/lib/profileMedia";

export type PublicProfile = {
  user_id: string;
  slug: string;
  display_name: string;
  public_profile_enabled: boolean;
  vault_sharing_enabled: boolean;
  avatar_url: string | null;
  banner_url: string | null;
};

type PublicProfileRow = {
  user_id: string | null;
  slug: string | null;
  display_name: string | null;
  public_profile_enabled: boolean | null;
  vault_sharing_enabled: boolean | null;
  avatar_path: string | null;
  banner_path: string | null;
};

function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createClient(url, anon);
}

function normalizeSlug(value: string) {
  return value.trim().toLowerCase();
}

export const getPublicProfileBySlug = cache(async (slug: string): Promise<PublicProfile | null> => {
  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) {
    return null;
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("public_profiles")
    .select("user_id,slug,display_name,public_profile_enabled,vault_sharing_enabled,avatar_path,banner_path")
    .eq("slug", normalizedSlug)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as PublicProfileRow;
  if (!row.public_profile_enabled || !row.user_id || !row.slug || !row.display_name) {
    return null;
  }

  return {
    user_id: row.user_id,
    slug: row.slug,
    display_name: row.display_name,
    public_profile_enabled: true,
    vault_sharing_enabled: Boolean(row.vault_sharing_enabled),
    avatar_url: resolveProfileMediaUrl(row.avatar_path),
    banner_url: resolveProfileMediaUrl(row.banner_path),
  };
});
