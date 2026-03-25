export type VaultInstanceMediaSide = "front" | "back";

export const VAULT_INSTANCE_MEDIA_BUCKET = "user-card-images";
export const VAULT_INSTANCE_MEDIA_ACCEPT = "image/*";
export const VAULT_INSTANCE_MEDIA_MAX_BYTES = 10 * 1024 * 1024;

export function normalizeVaultInstanceMediaPath(value?: string | null) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/^\/+/, "");
  return normalized.length > 0 ? normalized : null;
}

export function buildVaultInstanceMediaStoragePath(
  userId: string,
  instanceId: string,
  side: VaultInstanceMediaSide,
) {
  return `${userId.trim()}/vault-instances/${instanceId.trim()}/${side}/current`;
}

export function isOwnedVaultInstanceMediaPath(
  userId: string,
  instanceId: string,
  side: VaultInstanceMediaSide,
  path?: string | null,
) {
  const normalized = normalizeVaultInstanceMediaPath(path);
  if (!normalized) {
    return false;
  }

  return normalized === buildVaultInstanceMediaStoragePath(userId, instanceId, side);
}
