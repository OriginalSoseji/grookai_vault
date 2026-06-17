import "server-only";

import { createServerAdminClient } from "@/lib/supabase/admin";
import {
  normalizeVaultInstanceMediaPath,
  VAULT_INSTANCE_MEDIA_BUCKET,
} from "@/lib/vaultInstanceMedia";

const SIGNED_URL_TTL_SECONDS = 60 * 60;
const SIGNED_URL_CACHE_MS = 55 * 60 * 1000;

type SignedUrlCacheEntry = {
  url: string | null;
  expiresAt: number;
};

const signedUrlCache = new Map<string, SignedUrlCacheEntry>();
const signedUrlInFlight = new Map<string, Promise<string | null>>();

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

async function createSignedVaultMediaUrl(normalizedPath: string) {
  const now = Date.now();
  const cached = signedUrlCache.get(normalizedPath);
  if (cached && cached.expiresAt > now) {
    return cached.url;
  }

  const inFlight = signedUrlInFlight.get(normalizedPath);
  if (inFlight) {
    return inFlight;
  }

  const promise = (async () => {
    const admin = createServerAdminClient();
    const { data, error } = await admin.storage
      .from(VAULT_INSTANCE_MEDIA_BUCKET)
      .createSignedUrl(normalizedPath, SIGNED_URL_TTL_SECONDS);

    if (error) {
      console.error("[vault:instance-media] signed url create failed", {
        path: normalizedPath,
        error,
      });
      signedUrlCache.delete(normalizedPath);
      return null;
    }

    const signedUrl = data.signedUrl ?? null;
    signedUrlCache.set(normalizedPath, {
      url: signedUrl,
      expiresAt: now + SIGNED_URL_CACHE_MS,
    });
    return signedUrl;
  })();

  signedUrlInFlight.set(normalizedPath, promise);
  try {
    return await promise;
  } finally {
    signedUrlInFlight.delete(normalizedPath);
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

  return createSignedVaultMediaUrl(normalizedPath);
}
