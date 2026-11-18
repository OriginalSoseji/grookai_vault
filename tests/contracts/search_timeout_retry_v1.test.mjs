import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fetchResolverWithRetry } from '../../apps/web/src/lib/search/fetchResolverWithRetry.ts';

const message = 'Search timed out before the complete matching set could be checked. Please narrow your search or try again.';
const timeout = () => Response.json({ ok: false, error: message, sort_degraded_reason: 'resolver_timeout' }, { status: 503 });

test('the retry predicate matches the server incomplete-search response', () => {
  const route = readFileSync('apps/web/src/app/api/resolver/search/route.ts', 'utf8');
  assert.ok(route.includes(`error: "${message}"`));
  assert.match(route, /sort_degraded_reason: "resolver_timeout"/);
});

test('the explicit incomplete database timeout retries the identical request once', async () => {
  const signal = new AbortController().signal;
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url, signal: options.signal });
    return calls.length === 1 ? timeout() : Response.json({ ok: true, rows: [{ id: 'card' }] });
  };
  const result = await fetchResolverWithRetry('/api/resolver/search?q=Build-A-Bear&offset=0', signal, fetcher);
  assert.equal(result.payload.ok, true);
  assert.deepEqual(result.payload.rows, [{ id: 'card' }]);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls.map(x => x.url), [calls[0].url, calls[0].url]);
  assert.ok(calls.every(x => x.signal === signal));
});

test('a second timeout is returned and never triggers a third request', async () => {
  let calls = 0;
  const result = await fetchResolverWithRetry('/api/resolver/search?q=x', new AbortController().signal, async () => { calls++; return timeout(); });
  assert.equal(calls, 2);
  assert.equal(result.response.status, 503);
  assert.equal(result.payload.error, message);
});

test('success, rate limits, value-sort failures and soft timeouts are not retried', async () => {
  for (const response of [
    () => Response.json({ ok: true, rows: [] }),
    () => Response.json({ ok: false, error: message, sort_degraded_reason: 'resolver_timeout' }, { status: 429 }),
    () => Response.json({ ok: false, error: 'Value sorting timed out before a complete ordering could be produced. Narrow the search and try again.', sort_degraded_reason: 'resolver_timeout' }, { status: 503 }),
    () => Response.json({ ok: false, error: 'Search timed out before all matches could be checked. Narrow the search or try again.', sort_degraded_reason: 'resolver_timeout' }, { status: 503 }),
    () => Response.json({ ok: false, error: message, sort_degraded_reason: 'other' }, { status: 503 }),
  ]) {
    let calls = 0;
    await fetchResolverWithRetry('/api/resolver/search?q=x', new AbortController().signal, async () => { calls++; return response(); });
    assert.equal(calls, 1);
  }
});

test('cancellation between the response and retry prevents another request', async () => {
  const controller = new AbortController();
  let calls = 0;
  const result = await fetchResolverWithRetry('/api/resolver/search?q=x', controller.signal, async () => {
    calls++;
    controller.abort();
    return timeout();
  });
  assert.equal(calls, 1);
  assert.equal(result.response.status, 503);
});

test('a value-sorted request does not retry even with the generic database timeout', async () => {
  let calls = 0;
  const result = await fetchResolverWithRetry('/api/resolver/search?q=x&sort=value_high', new AbortController().signal, async () => { calls++; return timeout(); }, false);
  assert.equal(calls, 1);
  assert.equal(result.response.status, 503);
});

test('network and malformed JSON errors remain visible without retry', async () => {
  for (const fetcher of [async () => { throw new Error('network failed'); }, async () => new Response('invalid', { status: 503 })]) {
    let calls = 0;
    await assert.rejects(fetchResolverWithRetry('/api/resolver/search?q=x', new AbortController().signal, async (...args) => { calls++; return fetcher(...args); }));
    assert.equal(calls, 1);
  }
});
