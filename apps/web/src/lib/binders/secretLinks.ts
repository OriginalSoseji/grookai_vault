export function resolveBinderSecretUrl(
  value: string | null,
  siteOrigin: string,
  canonicalOrigin: string,
): string | undefined {
  if (!value) return undefined;
  try {
    const candidate = new URL(value, siteOrigin);
    if (
      (candidate.origin !== siteOrigin && candidate.origin !== canonicalOrigin) ||
      candidate.username || candidate.password || candidate.search || candidate.hash ||
      !/^\/(?:b|binder-invites)\/[A-Za-z0-9_-]{20,256}$/.test(candidate.pathname)
    ) return undefined;
    // SQL can return a canonical-domain URL. The capability belongs to the
    // configured backend, so never send a staging invite to the production app.
    return new URL(candidate.pathname, siteOrigin).toString();
  } catch {
    return undefined;
  }
}
