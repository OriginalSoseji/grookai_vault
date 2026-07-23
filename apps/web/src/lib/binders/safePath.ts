const SECRET_BINDER_PREFIXES = ["/b/", "/binder-invites/"] as const;

export function isBinderSecretPath(pathname: string) {
  const normalizedPath = pathname.toLowerCase();
  return SECRET_BINDER_PREFIXES.some(
    (prefix) =>
      normalizedPath === prefix.slice(0, -1) ||
      normalizedPath.startsWith(prefix),
  );
}

/**
 * Auth telemetry may record a route family, but never an invitation or view
 * capability. The browser can still return to the original secret route.
 */
export function redactBinderSecretPath(pathname: string) {
  const normalizedPath = pathname.toLowerCase();
  if (normalizedPath.startsWith("/binder-invites/")) {
    return "/binder-invites/[redacted]";
  }

  if (normalizedPath.startsWith("/b/")) {
    return "/b/[redacted]";
  }

  return pathname;
}
