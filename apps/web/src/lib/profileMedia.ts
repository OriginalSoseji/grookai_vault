export type ProfileMediaKind = "avatar" | "banner";

export const PROFILE_MEDIA_BUCKET = "profile-media";
export const PROFILE_MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const PROFILE_MEDIA_ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function normalizeProfileMediaPath(value?: string | null) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/^\/+/, "");
  return normalized.length > 0 ? normalized : null;
}

export function buildProfileMediaStoragePath(userId: string, kind: ProfileMediaKind) {
  return `profiles/${userId}/${kind}/current`;
}

export function isOwnedProfileMediaPath(userId: string, kind: ProfileMediaKind, path?: string | null) {
  const normalized = normalizeProfileMediaPath(path);
  if (!normalized) {
    return false;
  }

  return normalized === buildProfileMediaStoragePath(userId, kind);
}

export function resolveProfileMediaUrl(path?: string | null) {
  const normalized = normalizeProfileMediaPath(path);
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");

  if (!normalized || !baseUrl) {
    return null;
  }

  const encodedPath = normalized
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${baseUrl}/storage/v1/object/public/${encodeURIComponent(PROFILE_MEDIA_BUCKET)}/${encodedPath}`;
}
