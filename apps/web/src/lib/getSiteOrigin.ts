export const GROOKAI_VAULT_ORIGIN = "https://grookaivault.com";

const PRODUCTION_HOSTNAMES = new Set(["grookaivault.com", "www.grookaivault.com"]);
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Return the one public origin Grookai publishes in links and metadata.
 *
 * NEXT_PUBLIC_SITE_URL historically pointed at www.grookaivault.com even though
 * that hostname has no DNS record. Treat environment configuration as an
 * optional local-development override, not as authority over the public host.
 */
export function getSiteOrigin(): string {
  const explicitOrigin = (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL)?.trim();
  if (process.env.NEXT_PUBLIC_COLLECTOR_STAGING === "true") {
    const local = explicitOrigin ? new URL(explicitOrigin) : null;
    const hosted = process.env.NEXT_PUBLIC_COLLECTOR_HOSTED_STAGING === "true";
    const validOrigin = local && (hosted
      ? local.origin === "https://grookai-collector-staging.vercel.app"
      : local.protocol === "http:" && local.hostname === "127.0.0.1");
    if (!local || !validOrigin ||
        local.username || local.password || local.search || local.hash || local.pathname !== "/") {
      throw new Error("Collector staging requires its explicit verified site origin.");
    }
    return local.origin;
  }
  if (!explicitOrigin) {
    return GROOKAI_VAULT_ORIGIN;
  }

  try {
    const parsed = new URL(explicitOrigin);
    const hostname = parsed.hostname.toLowerCase();

    if (PRODUCTION_HOSTNAMES.has(hostname)) {
      return GROOKAI_VAULT_ORIGIN;
    }

    if (
      LOCAL_HOSTNAMES.has(hostname) &&
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      !parsed.username &&
      !parsed.password
    ) {
      return parsed.origin;
    }
  } catch {
    // Invalid or partial values must never leak into public URLs.
  }

  return GROOKAI_VAULT_ORIGIN;
}
