import "server-only";

import { resolveProfileMediaUrl } from "@/lib/profileMedia";
import { createServerAdminClient } from "@/lib/supabase/admin";

export type CollectorDiscoverRow = {
  userId: string;
  slug: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string | null;
  vaultSharingEnabled: boolean;
};

type PublicProfileRow = {
  user_id: string | null;
  slug: string | null;
  display_name: string | null;
  public_profile_enabled: boolean | null;
  vault_sharing_enabled: boolean | null;
  created_at: string | null;
  avatar_path: string | null;
};

function normalizeText(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeSearchQuery(value: string | null | undefined) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  return normalized.startsWith("@") ? normalized.slice(1).trim() || null : normalized;
}

export async function getCollectorDiscoverRows({
  query,
  excludeUserId,
  limit = 30,
}: {
  query?: string | null;
  excludeUserId?: string | null;
  limit?: number;
}) {
  const admin = createServerAdminClient();
  const normalizedQuery = normalizeSearchQuery(query);
  const normalizedExcludeUserId = normalizeText(excludeUserId);
  const normalizedLimit = Number.isFinite(limit) ? Math.max(1, Math.min(limit, 100)) : 30;

  let request = admin
    .from("public_profiles")
    .select("user_id,slug,display_name,public_profile_enabled,vault_sharing_enabled,created_at,avatar_path")
    .eq("public_profile_enabled", true)
    .eq("vault_sharing_enabled", true)
    .order("created_at", { ascending: false })
    .limit(normalizedLimit);

  if (normalizedExcludeUserId) {
    request = request.neq("user_id", normalizedExcludeUserId);
  }

  if (normalizedQuery) {
    const escapedQuery = normalizedQuery.replace(/[%_]/g, "\\$&");
    request = request.or(`display_name.ilike.%${escapedQuery}%,slug.ilike.%${escapedQuery}%`);
  }

  const { data, error } = await request;

  if (error || !data) {
    console.error("[network] collector discover lookup failed", {
      query: normalizedQuery,
      excludeUserId: normalizedExcludeUserId,
      error,
    });
    return [] as CollectorDiscoverRow[];
  }

  return ((data ?? []) as PublicProfileRow[])
    .filter(
      (row): row is PublicProfileRow & { user_id: string; slug: string; display_name: string } =>
        Boolean(row.user_id && row.slug && row.display_name && row.public_profile_enabled && row.vault_sharing_enabled),
    )
    .map((row) => ({
      userId: row.user_id,
      slug: row.slug,
      displayName: row.display_name,
      avatarUrl: resolveProfileMediaUrl(row.avatar_path),
      createdAt: row.created_at ?? null,
      vaultSharingEnabled: Boolean(row.vault_sharing_enabled),
    }));
}
