import { randomUUID } from 'node:crypto';
import { EbaySellerApiError } from './seller_client_v1.mjs';

const fail = code => { throw new EbaySellerApiError(code); };
const credential = value => typeof value === 'string' && value.length >= 20
  && value.length <= 32768 && !/[\x00-\x1f\x7f]/.test(value);
async function call(db, name, payload) {
  let result;
  try { result = await db.rpc(name, payload); }
  catch { fail('seller_state_unavailable'); }
  if (result.error) fail('seller_state_unavailable');
  return result.data;
}

// Server worker only. db is the shared backend client and actorId is taken
// from the verified account/session, never a listing request's owner field.
export async function getVerifiedSellerAccessToken({ db, actorId, accountId, oauthClient }) {
  const claimNonce = randomUUID();
  const claim = await call(db, 'ebay_seller_token_claim_v1', {
    p_actor: actorId, p_account_id: accountId, p_claim_nonce: claimNonce,
  });
  if (['ready', 'refresh_claimed'].includes(claim?.status)
      && claim.environment !== 'production') fail('seller_authorization_required');
  if (claim?.status === 'ready') {
    if (!credential(claim.accessToken)) fail('seller_state_unavailable');
    return claim.accessToken;
  }
  if (claim?.status === 'refresh_in_progress') fail('seller_token_refresh_in_progress');
  if (claim?.status !== 'refresh_claimed') fail('seller_authorization_required');
  if (!Number.isSafeInteger(claim.revision) || claim.revision < 1
      || !credential(claim.refreshToken)) fail('seller_state_unavailable');
  try {
    const tokens = await oauthClient.refresh(claim.refreshToken);
    const receipt = await call(db, 'ebay_seller_token_complete_v1', {
      p_actor: actorId, p_account_id: accountId, p_claim_nonce: claimNonce,
      p_expected_revision: claim.revision, p_access_token: tokens.accessToken,
      p_access_expires_at: tokens.accessTokenExpiresAt,
      p_refresh_token: tokens.refreshToken,
      p_refresh_expires_at: tokens.refreshTokenExpiresAt,
    });
    if (receipt?.status !== 'ready' || receipt.revision !== claim.revision + 1) fail('seller_state_unavailable');
    return tokens.accessToken;
  } catch (error) {
    const safe = error instanceof EbaySellerApiError ? error
      : new EbaySellerApiError('seller_authorization_result_uncertain', { uncertain: true });
    try {
      await call(db, 'ebay_seller_token_fail_v1', {
        p_actor: actorId, p_account_id: accountId, p_claim_nonce: claimNonce,
        p_expected_revision: claim.revision,
        p_uncertain: safe.uncertain || safe.code === 'seller_state_unavailable', p_error_code: safe.code,
      });
    } catch {
      // The persisted nonce/deadline prevents any worker from falling back to
      // stale credentials or silently retrying an unobserved refresh result.
    }
    throw safe;
  }
}
