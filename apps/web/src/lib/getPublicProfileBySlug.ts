import "server-only";

import { cache } from "react";
import { createClient } from "@supabase/supabase-js";

export type PublicProfile = {
  slug: string;
  display_name: string;
  public_profile_enabled: boolean;
  vault_sharing_enabled: boolean;
};

type PublicProfileRow = {
  slug: string | null;
  display_name: string | null;
  public_profile_enabled: boolean | null;
  vault_sharing_enabled: boolean | null;
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
    .select("slug,display_name,public_profile_enabled,vault_sharing_enabled")
    .eq("slug", normalizedSlug)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as PublicProfileRow;
  if (!row.public_profile_enabled || !row.slug || !row.display_name) {
    return null;
  }

  return {
    slug: row.slug,
    display_name: row.display_name,
    public_profile_enabled: true,
    vault_sharing_enabled: Boolean(row.vault_sharing_enabled),
  };
});
