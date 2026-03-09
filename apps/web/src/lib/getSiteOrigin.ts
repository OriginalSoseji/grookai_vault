export function getSiteOrigin(): string | null {
  const explicitOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL;
  if (!explicitOrigin) {
    return null;
  }

  return explicitOrigin.endsWith("/") ? explicitOrigin.slice(0, -1) : explicitOrigin;
}
