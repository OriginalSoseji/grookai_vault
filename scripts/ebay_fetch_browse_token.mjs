// scripts/ebay_fetch_browse_token.mjs
//
// Fetches an application-level Browse API token using the eBay OAuth
// client-credentials flow. Requires:
//   EBAY_CLIENT_ID
//   EBAY_CLIENT_SECRET
// Optional:
//   EBAY_ENV = production | sandbox (default production)
//
// Usage:
//   node scripts/ebay_fetch_browse_token.mjs
//
// The script prints the token + expiry info and a convenient export line:
//   export EBAY_BROWSE_ACCESS_TOKEN=<token>

const SCOPES = [
  'https://api.ebay.com/oauth/api_scope',
  'https://api.ebay.com/oauth/api_scope/buy.browse.readonly',
];

function getTokenEndpoint() {
  const env = (process.env.EBAY_ENV || 'production').toLowerCase();
  return env === 'sandbox'
    ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
    : 'https://api.ebay.com/identity/v1/oauth2/token';
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[ebay-browse-token] ${name} is required`);
  }
  return value;
}

function secondsToHms(seconds) {
  if (!Number.isFinite(seconds)) return 'unknown';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours}h ${minutes}m ${secs}s`;
}

async function fetchBrowseToken() {
  const clientId = requiredEnv('EBAY_CLIENT_ID');
  const clientSecret = requiredEnv('EBAY_CLIENT_SECRET');
  const endpoint = getTokenEndpoint();

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: SCOPES.join(' '),
  });

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `[ebay-browse-token] Token request failed (${res.status} ${res.statusText}): ${text}`,
    );
  }

  let payload;
  try {
    payload = JSON.parse(text);
  } catch (err) {
    throw new Error(`[ebay-browse-token] Failed to parse response JSON: ${err.message ?? err}`);
  }

  return payload;
}

async function main() {
  const payload = await fetchBrowseToken();
  const expires = secondsToHms(payload.expires_in);

  console.log('[ebay-browse-token] Token fetched successfully.');
  console.log(`[ebay-browse-token] expires_in: ${payload.expires_in}s (~${expires})`);
  console.log(`[ebay-browse-token] scope: ${payload.scope}`);
  console.log('');
  console.log('Access token:');
  console.log(payload.access_token);
  console.log('');
  console.log('To use it locally, run:');
  console.log(`  setx EBAY_BROWSE_ACCESS_TOKEN "${payload.access_token}"`);
  console.log('or update your .env.local accordingly.');
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exitCode = 1;
});
