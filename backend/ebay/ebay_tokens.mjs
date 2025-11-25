// Helper utilities for seller-specific eBay OAuth tokens.
// Handles token lookup + refresh when a refresh_token is present.

function getTokenEndpoint() {
  const env = (process.env.EBAY_ENV || 'production').toLowerCase();
  return env === 'sandbox'
    ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
    : 'https://api.ebay.com/identity/v1/oauth2/token';
}

function computeExpiry(expiresInSeconds) {
  if (!Number.isFinite(expiresInSeconds)) return null;
  return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
}

async function refreshAccessToken(refreshToken) {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  const redirectUri = process.env.EBAY_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('[ebay-tokens] Missing EBAY client env vars');
  }
  const tokenEndpoint = getTokenEndpoint();
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    redirect_uri: redirectUri,
  });
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `[ebay-tokens] Refresh failed (${res.status} ${res.statusText}): ${text}`,
    );
  }
  return res.json();
}

export async function getSellerEbayAuth(supabase, { ebayAccountId }) {
  if (!ebayAccountId) {
    throw new Error('[ebay-tokens] ebayAccountId is required');
  }
  const { data, error } = await supabase
    .from('ebay_accounts')
    .select('*')
    .eq('id', ebayAccountId)
    .eq('is_active', true)
    .maybeSingle();
  if (error) {
    throw new Error(`[ebay-tokens] Failed to load seller account: ${error.message ?? error}`);
  }
  if (!data) {
    throw new Error('[ebay-tokens] Seller account not found or inactive');
  }

  let accessToken = data.access_token;
  const refreshToken = data.refresh_token;
  const marketplaceId = data.marketplace_id || process.env.EBAY_MARKETPLACE_ID || 'EBAY_US';
  const ebayUsername = data.ebay_username || null;
  const expiresAt = data.access_token_expires_at ? Date.parse(data.access_token_expires_at) : null;
  const needsRefresh =
    refreshToken &&
    expiresAt &&
    Number.isFinite(expiresAt) &&
    expiresAt - Date.now() < 5 * 60 * 1000;

  if (needsRefresh) {
    try {
      console.log(`[ebay-tokens] Refreshing access token for seller ${ebayAccountId}`);
      const tokenPayload = await refreshAccessToken(refreshToken);
      accessToken = tokenPayload.access_token;
      const nextExpiry = computeExpiry(tokenPayload.expires_in);
      const updatePayload = {
        access_token: accessToken,
        access_token_expires_at: nextExpiry,
        updated_at: new Date().toISOString(),
      };
      const { error: updateError } = await supabase
        .from('ebay_accounts')
        .update(updatePayload)
        .eq('id', ebayAccountId);
      if (updateError) {
        console.warn('[ebay-tokens] Failed to persist refreshed token', updateError);
      }
    } catch (err) {
      console.error('[ebay-tokens] Token refresh failed; seller may need to re-auth', err);
      // TODO: Consider deactivating the account or alerting the user.
    }
  } else if (!refreshToken && expiresAt && expiresAt < Date.now()) {
    console.warn(
      `[ebay-tokens] Access token expired for seller ${ebayAccountId} and no refresh token is available.`,
    );
  }

  return {
    accessToken,
    marketplaceId,
    ebayUsername,
  };
}
