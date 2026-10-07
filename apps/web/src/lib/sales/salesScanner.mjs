// Keyboard scanners supply text, never a URL to fetch or navigate to.
export function scannedCopyId(raw) {
  if (typeof raw !== 'string' || raw.length > 1024) return null;
  let value = raw.trim();
  if (/^[a-z]+:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password || url.port ||
          !['grookaivault.com', 'www.grookaivault.com'].includes(url.hostname)) return null;
      const match = /^\/(?:q|gvvi)\/([^/]+)\/?$/.exec(url.pathname);
      if (!match) return null;
      value = decodeURIComponent(match[1]);
    } catch { return null; }
  }
  value = value.toUpperCase();
  return /^GVVI-[A-Z0-9]+-[0-9]{6}$/.test(value) ? value : null;
}
