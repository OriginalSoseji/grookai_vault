import test from 'node:test';
import assert from 'node:assert/strict';
import { EbaySellerOauthWorkflow } from '../../backend/ebay/seller_oauth_workflow_v1.mjs';
import { EbaySellerApiError } from '../../backend/ebay/seller_client_v1.mjs';

const actor = 'eb000000-0000-4000-8000-000000000001';
const attempt = 'eb000000-0000-4000-8000-000000000002';
const account = 'eb000000-0000-4000-8000-000000000003';
const nonce = 'a'.repeat(43);
const token = 'secret-access-token-which-must-stay-server-only';
function harness(overrides = {}) {
  const calls = [];
  const db = { rpc: async (name, payload) => {
    calls.push({ name, payload });
    if (overrides.rpc) return overrides.rpc(name, payload);
    const responses = {
      ebay_seller_oauth_start_v1: { attemptId: attempt, expiresAt: '2026-10-28T12:10:00Z' },
      ebay_seller_oauth_launch_v1: { attemptId: attempt },
      ebay_seller_oauth_claim_v1: { attemptId: attempt, actorId: actor, environment: 'production', denied: false },
      ebay_seller_oauth_complete_v1: { linked: true, accountId: account },
      ebay_seller_oauth_fail_v1: true,
    };
    return { data: responses[name], error: null };
  } };
  const workflow = new EbaySellerOauthWorkflow({ db,
    oauthClient: { exchangeCode: async code => {
      calls.push({ name: 'provider_exchange', code });
      if (overrides.exchange) return overrides.exchange(code);
      return { accessToken: token, refreshToken: 'refresh-token-only-server',
        accessTokenExpiresAt: '2026-10-28T13:00:00Z', approvedScopes: [] };
    } },
    identityForToken: value => ({ getSellerIdentity: async () => {
      calls.push({ name: 'provider_identity', token: value });
      return { sellerId: 'immutable-seller-id', username: 'seller' };
    } }), clientId: 'fixture-public-client-id', ruName: 'fixture-registered-ru-name',
    webOrigin: 'https://grookai.test' });
  return { workflow, calls };
}
const callback = workflow => workflow.callback({ state: nonce, browserNonce: nonce, code: 'one-use-provider-code' });

test('start persists only a hash and returns an owner-launch capability instead of an eBay grant', async () => {
  const { workflow, calls } = harness();
  const result = await workflow.start(actor);
  const url = new URL(result.launchUrl);
  assert.equal(url.origin, 'https://grookai.test');
  assert.equal(url.pathname, '/api/ebay/seller/oauth/launch');
  assert.match(url.searchParams.get('capability'), /^[\w-]{43}$/);
  assert.equal(calls[0].payload.p_actor, actor);
  assert.match(calls[0].payload.p_launch_hash, /^[a-f0-9]{64}$/);
  assert.ok(!JSON.stringify(calls).includes(url.searchParams.get('capability')));
  assert.ok(!result.launchUrl.includes('api.ebay.com'));
});

test('browser launch persists independent state and browser hashes before returning a secure cookie', async () => {
  const { workflow, calls } = harness();
  const result = await workflow.launch(nonce);
  assert.equal(calls[0].name, 'ebay_seller_oauth_launch_v1');
  assert.notEqual(calls[0].payload.p_browser_hash, calls[0].payload.p_state_hash);
  assert.equal(result.cookie.name, '__Host-grookai-ebay-link');
  assert.deepEqual({ ...result.cookie, value: undefined }, { name: '__Host-grookai-ebay-link', value: undefined,
    secure: true, httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 });
  assert.equal(new URL(result.authorizationUrl).origin, 'https://auth.ebay.com');
  assert.ok(!JSON.stringify(calls).includes(result.cookie.value));
});

test('the durable callback claim commits before any provider grant and immutable identity binds the result', async () => {
  const { workflow, calls } = harness();
  const result = await callback(workflow);
  assert.deepEqual(calls.map(c => c.name), ['ebay_seller_oauth_claim_v1', 'provider_exchange',
    'provider_identity', 'ebay_seller_oauth_complete_v1']);
  assert.equal(calls[3].payload.p_provider_user_id, 'immutable-seller-id');
  assert.equal(calls[2].token, token);
  assert.equal(result.status, 'linked');
  assert.ok(!JSON.stringify(result).includes(token));
  assert.equal(result.clearCookie.maxAge, 0);
});

test('replayed or invalid browser claims cannot call the provider', async () => {
  const { workflow, calls } = harness({ rpc: async () => ({ error: { message: 'seller_callback_invalid' } }) });
  await assert.rejects(callback(workflow), e => e.code === 'seller_callback_invalid');
  assert.equal(calls.length, 1);
});

test('malformed state, missing cookie and mixed provider error/code are rejected before database access', async () => {
  for (const args of [{ state: 'wrong', browserNonce: nonce, code: 'x' },
    { state: nonce, code: 'x' }, { state: nonce, browserNonce: nonce, code: 'x', error: 'access_denied' },
    { state: nonce, browserNonce: nonce, error: 'private-provider-error' }]) {
    const { workflow, calls } = harness();
    await assert.rejects(workflow.callback(args), e => e.code === 'seller_callback_invalid');
    assert.equal(calls.length, 0);
  }
});

test('denial consumes the owner/browser claim and makes no token exchange', async () => {
  const { workflow, calls } = harness({ rpc: async () => ({ data: { attemptId: attempt,
    actorId: actor, environment: 'production', denied: true }, error: null }) });
  const result = await workflow.callback({ state: nonce, browserNonce: nonce, error: 'access_denied' });
  assert.equal(result.status, 'denied');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].payload.p_denied, true);
});

test('an uncertain exchange is never retried and records a safe durable failure on its exact claim', async () => {
  const { workflow, calls } = harness({ exchange: async () => {
    throw new EbaySellerApiError('seller_authorization_result_uncertain', { uncertain: true });
  } });
  await assert.rejects(callback(workflow), e => e.uncertain);
  assert.deepEqual(calls.map(c => c.name), ['ebay_seller_oauth_claim_v1', 'provider_exchange', 'ebay_seller_oauth_fail_v1']);
  assert.equal(calls[2].payload.p_uncertain, true);
  assert.equal(calls[2].payload.p_claim_nonce, calls[0].payload.p_claim_nonce);
  assert.ok(!JSON.stringify(calls[2]).includes('one-use-provider-code'));
});

test('unknown transport errors and raw SQL/provider text cannot leak through a public failure', async () => {
  const raw = 'request failed with ' + token;
  const a = harness({ exchange: async () => { throw Error(raw); } });
  await assert.rejects(callback(a.workflow), e => e.code === 'seller_authorization_result_uncertain'
    && !String(e).includes(token));
  const b = harness({ rpc: async () => ({ error: { message: raw } }) });
  await assert.rejects(callback(b.workflow), e => e.code === 'seller_state_unavailable' && !String(e).includes(token));
});
