const HTTP_PROTOCOLS = new Set(['http:', 'https:']);

function normalizeHostname(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\.$/, '');
}

export function parseHttpUrl(value, baseUrl = undefined) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  try {
    const parsed = baseUrl === undefined ? new URL(raw) : new URL(raw, baseUrl);
    return HTTP_PROTOCOLS.has(parsed.protocol) ? parsed : null;
  } catch {
    return null;
  }
}

export function isHttpUrl(value) {
  return parseHttpUrl(value) !== null;
}

export function hostnameMatches(actualHostname, expectedHostname, options = {}) {
  const actual = normalizeHostname(actualHostname);
  const expected = normalizeHostname(expectedHostname);
  if (!actual || !expected) return false;
  if (actual === expected) return true;
  return options.allowSubdomains === true && actual.endsWith(`.${expected}`);
}

export function isUrlFromHostname(value, expectedHostname, options = {}) {
  const parsed = parseHttpUrl(value);
  if (!parsed) return false;
  if (options.httpsOnly === true && parsed.protocol !== 'https:') return false;
  if (!hostnameMatches(parsed.hostname, expectedHostname, options)) return false;
  if (options.pathPrefix !== undefined && !parsed.pathname.startsWith(options.pathPrefix)) return false;
  return true;
}

export function resolveSameOriginHttpUrl(href, baseUrl, currentPathname = '/') {
  const base = parseHttpUrl(baseUrl);
  if (!base) return null;

  const current = parseHttpUrl(currentPathname, base);
  if (!current || current.origin !== base.origin) return null;

  const resolved = parseHttpUrl(href, current);
  if (!resolved || resolved.origin !== base.origin) return null;
  return resolved;
}
