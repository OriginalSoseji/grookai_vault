import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { EbaySellerApiError } from './seller_client_v1.mjs';
import { buildEbayAuthorizationUrl } from './seller_oauth_v1.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');
const capability = value => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
const opaque = () => randomBytes(32).toString('base64url');
const fail = code => { throw new EbaySellerApiError(code); };
const cookieName = '__Host-grookai-ebay-link';
const cookieOptions = Object.freeze({ secure: true, httpOnly: true,
  sameSite: 'lax', path: '/', maxAge: 600 });

// The HTTP adapter verifies the real grookai session before passing actorId.
// The worker factory supplies db from createBackendClient(), never a public key
// or a caller-configurable database/provider client.
export class EbaySellerOauthWorkflow {
  #db; #oauth; #identity; #clientId; #ruName; #origin;

  constructor({ db, oauthClient, identityForToken, clientId, ruName, webOrigin }) {
    if (!db || typeof db.rpc !== 'function' || !oauthClient || typeof identityForToken !== 'function') fail('seller_configuration_unavailable');
    let url;
    try { url = new URL(webOrigin); } catch { fail('seller_configuration_unavailable'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/'
        || url.search || url.hash) fail('seller_configuration_unavailable');
    // Validate provider configuration before creating any durable attempt.
    buildEbayAuthorizationUrl({ environment: 'production', clientId, ruName, state: opaque() });
    this.#db = db; this.#oauth = oauthClient; this.#identity = identityForToken;
    this.#clientId = clientId; this.#ruName = ruName; this.#origin = url.origin;
  }

  async #call(name, payload) {
    let result;
    try { result = await this.#db.rpc(name, payload); }
    catch { fail('seller_state_unavailable'); }
    if (result.error) {
      // Provider bodies, SQL details, codes and credentials never become UI text.
      const code = /^seller_[a-z_]{1,72}$/.test(result.error.message ?? '')
        ? result.error.message : 'seller_state_unavailable';
      fail(code);
    }
    return result.data;
  }

  async start(actorId) {
    const launch = opaque();
    const attempt = await this.#call('ebay_seller_oauth_start_v1', {
      p_actor: actorId, p_launch_hash: digest(launch),
    });
    if (typeof attempt?.attemptId !== 'string' || typeof attempt?.expiresAt !== 'string') fail('seller_state_unavailable');
    const url = new URL('/api/ebay/seller/oauth/launch', this.#origin);
    url.searchParams.set('capability', launch);
    return { attemptId: attempt.attemptId, expiresAt: attempt.expiresAt, launchUrl: url.href };
  }

  async launch(launch) {
    if (!capability(launch)) fail('seller_link_expired');
    const state = opaque();
    const browserNonce = opaque();
    await this.#call('ebay_seller_oauth_launch_v1', {
      p_launch_hash: digest(launch), p_state_hash: digest(state), p_browser_hash: digest(browserNonce),
    });
    return {
      authorizationUrl: buildEbayAuthorizationUrl({ environment: 'production',
        clientId: this.#clientId, ruName: this.#ruName, state }),
      cookie: { name: cookieName, value: browserNonce, ...cookieOptions },
    };
  }

  async callback({ state, code, error, browserNonce }) {
    if (!capability(state) || !capability(browserNonce)
        || (error !== undefined && error !== 'access_denied')
        || (error !== undefined && code !== undefined)
        || (error === undefined && (typeof code !== 'string' || !code.length
            || code.length > 8192 || /[\r\n\0]/.test(code)))) fail('seller_callback_invalid');
    const claimNonce = randomUUID();
    const claim = await this.#call('ebay_seller_oauth_claim_v1', {
      p_state_hash: digest(state), p_browser_hash: digest(browserNonce),
      p_claim_nonce: claimNonce, p_denied: error === 'access_denied',
    });
    if (typeof claim?.attemptId !== 'string' || typeof claim?.actorId !== 'string'
        || claim.environment !== 'production' || typeof claim.denied !== 'boolean') fail('seller_state_unavailable');
    if (claim.denied) return { status: 'denied', clearCookie: this.clearCookie() };
    try {
      // The claim is committed before the provider receives this one-attempt
      // code. No retry loop, fallback grant or legacy callback is used.
      const tokens = await this.#oauth.exchangeCode(code);
      const identity = await this.#identity(tokens.accessToken).getSellerIdentity();
      const account = await this.#call('ebay_seller_oauth_complete_v1', {
        p_attempt_id: claim.attemptId, p_claim_nonce: claimNonce,
        p_provider_user_id: identity.sellerId, p_username: identity.username,
        p_access_token: tokens.accessToken, p_refresh_token: tokens.refreshToken,
        p_access_expires_at: tokens.accessTokenExpiresAt, p_scopes: tokens.approvedScopes,
        p_refresh_expires_at: tokens.refreshTokenExpiresAt ?? null,
      });
      if (account?.linked !== true || typeof account.accountId !== 'string') fail('seller_state_unavailable');
      return { status: 'linked', accountId: account.accountId, clearCookie: this.clearCookie() };
    } catch (error) {
      const safe = error instanceof EbaySellerApiError ? error : new EbaySellerApiError('seller_authorization_result_uncertain', { uncertain: true });
      // A lost completion acknowledgement might already have linked the seller.
      // Persist only while this exact attempt still owns the exchange claim.
      try {
        await this.#call('ebay_seller_oauth_fail_v1', {
          p_attempt_id: claim.attemptId, p_claim_nonce: claimNonce,
          p_uncertain: safe.uncertain || safe.code === 'seller_state_unavailable',
          p_error_code: safe.code,
        });
      } catch {
        // The committed exchange claim and deadline remain durable. A new start
        // can retire that expired claim; it cannot replay the old provider code.
      }
      throw safe;
    }
  }

  clearCookie() { return { name: cookieName, value: '', ...cookieOptions, maxAge: 0 }; }
}
