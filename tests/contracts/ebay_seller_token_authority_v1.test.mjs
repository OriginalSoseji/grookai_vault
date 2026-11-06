import test from 'node:test';
import assert from 'node:assert/strict';
import { getVerifiedSellerAccessToken } from '../../backend/ebay/seller_token_authority_v1.mjs';
import { EbaySellerApiError } from '../../backend/ebay/seller_client_v1.mjs';

const access = 'fixture-long-private-access-token';
const refresh = 'fixture-long-private-refresh-token';
function harness({ status = 'refresh_claimed', providerError, completionError } = {}) {
  const calls = [];
  return { calls, options: { actorId: 'verified-owner', accountId: 'verified-account',
    db: { rpc: async (name, payload) => {
      calls.push({ name, payload });
      if (name === 'ebay_seller_token_claim_v1') return { data: {
        status, environment: 'production', revision: 7, accessToken: access, refreshToken: refresh,
      }, error: null };
      if (name === 'ebay_seller_token_complete_v1') return completionError
        ? { data: null, error: { message: access } }
        : { data: { status: 'ready', revision: 8 }, error: null };
      return { data: true, error: null };
    } },
    oauthClient: { refresh: async token => {
      calls.push({ name: 'provider_refresh', token });
      if (providerError) throw providerError;
      return { accessToken: access, accessTokenExpiresAt: '2026-10-28T20:00:00Z',
        refreshToken: null, refreshTokenExpiresAt: null };
    } },
  } };
}

test('a current verified token is reused without a provider refresh', async () => {
  const { options, calls } = harness({ status: 'ready' });
  assert.equal(await getVerifiedSellerAccessToken(options), access);
  assert.deepEqual(calls.map(c => c.name), ['ebay_seller_token_claim_v1']);
});
test('an exclusive durable claim precedes refresh and acknowledgement precedes token use', async () => {
  const { options, calls } = harness();
  assert.equal(await getVerifiedSellerAccessToken(options), access);
  assert.deepEqual(calls.map(c => c.name), ['ebay_seller_token_claim_v1', 'provider_refresh', 'ebay_seller_token_complete_v1']);
  assert.equal(calls[1].token, refresh);
  assert.equal(calls[2].payload.p_expected_revision, 7);
  assert.equal(calls[2].payload.p_claim_nonce, calls[0].payload.p_claim_nonce);
});
test('another refresh or required reconnection cannot trigger a parallel refresh', async () => {
  for (const status of ['refresh_in_progress', 'reconnect_required', 'unknown']) {
    const { options, calls } = harness({ status });
    await assert.rejects(getVerifiedSellerAccessToken(options), e =>
      ['seller_token_refresh_in_progress', 'seller_authorization_required'].includes(e.code));
    assert.equal(calls.length, 1);
  }
});
test('a provider timeout persists uncertainty without retries or leaking credentials', async () => {
  const { options, calls } = harness({ providerError:
    new EbaySellerApiError('seller_authorization_result_uncertain', { uncertain: true }) });
  await assert.rejects(getVerifiedSellerAccessToken(options), e => e.uncertain && !e.message.includes(refresh));
  assert.equal(calls.filter(c => c.name === 'provider_refresh').length, 1);
  const failure = calls.at(-1);
  assert.equal(failure.name, 'ebay_seller_token_fail_v1');
  assert.equal(failure.payload.p_uncertain, true);
  assert.equal(failure.payload.p_claim_nonce, calls[0].payload.p_claim_nonce);
  assert.equal(JSON.stringify(failure).includes(refresh), false);
});
test('a lost database acknowledgement stops token use and never falls back to old credentials', async () => {
  const { options, calls } = harness({ completionError: true });
  await assert.rejects(getVerifiedSellerAccessToken(options), e =>
    e.code === 'seller_state_unavailable' && !e.message.includes(access));
  assert.equal(calls.filter(c => c.name === 'provider_refresh').length, 1);
  assert.equal(calls.at(-1).name, 'ebay_seller_token_fail_v1');
  assert.equal(calls.at(-1).payload.p_uncertain, true);
});

test('missing environment or malformed stored credentials cannot reach provider code or headers', async () => {
  for (const status of ['ready', 'refresh_claimed']) {
    for (const changes of [{ environment: undefined }, { environment: 'sandbox' },
      ...['short', 'x'.repeat(32769), 'x'.repeat(30) + '\n'].map(value =>
        ({ [status === 'ready' ? 'accessToken' : 'refreshToken']: value }))]) {
      const { options, calls } = harness({ status });
      const original = options.db.rpc;
      options.db.rpc = async (name, payload) => {
        const result = await original(name, payload);
        if (name === 'ebay_seller_token_claim_v1') Object.assign(result.data, changes);
        return result;
      };
      await assert.rejects(getVerifiedSellerAccessToken(options));
      assert.equal(calls.some(c => c.name === 'provider_refresh'), false);
    }
  }
});
