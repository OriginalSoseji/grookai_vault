import "server-only";

import { createServerAdminClient } from "@/lib/supabase/admin";
import {
  normalizeVaultInstanceMediaPath,
  VAULT_INSTANCE_MEDIA_BUCKET,
} from "@/lib/vaultInstanceMedia";

function isUsablePublicImageUrl(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function resolveVaultInstanceMediaUrl(pathOrUrl?: string | null) {
  if (!pathOrUrl) {
    return null;
  }

  const trimmed = pathOrUrl.trim();
  if (!trimmed) {
    return null;
  }

  if (isUsablePublicImageUrl(trimmed)) {
    return trimmed;
  }

  const normalizedPath = normalizeVaultInstanceMediaPath(trimmed);
  if (!normalizedPath) {
    return null;
  }

  const admin = createServerAdminClient();
  const { data, error } = await admin.storage
    .from(VAULT_INSTANCE_MEDIA_BUCKET)
    .createSignedUrl(normalizedPath, 60 * 60);

  if (error) {
    console.error("[vault:instance-media] signed url create failed", {
      path: normalizedPath,
      error,
    });
    return null;
  }

  return data.signedUrl ?? null;
}
