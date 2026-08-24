import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  deriveLoadEnvelopeV1,
  isRetryableTransportErrorV1,
  nearestRankPercentileV1,
  requestKindForIndexV1,
  shouldAbortLoadV1,
  summarizeLoadV1,
  virtualClientUserAgentV1
} from '../../scripts/audits/production_launch_read_load_v1.mjs';

const source = fs.readFileSync(path.resolve('scripts/audits/production_launch_read_load_v1.mjs'), 'utf8');

test('load envelope requires at least twice the observed peak', () => {
  assert.equal(deriveLoadEnvelopeV1({ peakEventsPerMinute: 963, targetRps: 33 }).satisfies_2x, true);
  assert.equal(deriveLoadEnvelopeV1({ peakEventsPerMinute: 963, targetRps: 32 }).satisfies_2x, false);
});

test('request mix is deterministic across every 20 requests', () => {
  const kinds = Array.from({ length: 20 }, (_, index) => requestKindForIndexV1(index));
  assert.equal(kinds.filter((kind) => kind === 'search').length, 8);
  assert.equal(kinds.filter((kind) => kind === 'pricing_detail').length, 5);
  assert.equal(kinds.filter((kind) => kind === 'pricing_grid').length, 3);
  assert.equal(kinds.filter((kind) => kind === 'image_head').length, 4);
});

test('image requests rotate across recorded virtual collectors', () => {
  const imageIndexes = Array.from({ length: 60 }, (_, index) => index)
    .filter((index) => requestKindForIndexV1(index) === 'image_head');
  const agents = imageIndexes.map((index) => virtualClientUserAgentV1(index, 'image_head', 10));
  assert.deepEqual(new Set(agents), new Set(Array.from(
    { length: 10 },
    (_, index) => `Grookai-Production-Load-Client/${index + 1}`
  )));
});

test('nearest-rank percentiles are stable', () => {
  assert.equal(nearestRankPercentileV1([3, 1, 2, 5, 4], 95), 5);
  assert.equal(nearestRankPercentileV1([], 95), null);
});

test('only bounded network connection failures are retryable', () => {
  assert.equal(isRetryableTransportErrorV1({ cause: { code: 'UND_ERR_CONNECT_TIMEOUT' } }), true);
  assert.equal(isRetryableTransportErrorV1({ cause: { code: 'UND_ERR_SOCKET' } }), true);
  assert.equal(isRetryableTransportErrorV1({ cause: { code: 'HTTP_500' } }), false);
  assert.equal(isRetryableTransportErrorV1({ name: 'TimeoutError' }), false);
});

test('abort policy ignores warmup noise and stops sustained failure', () => {
  assert.equal(shouldAbortLoadV1(Array.from({ length: 100 }, () => ({ ok: false, http_status: 500 }))), false);
  assert.equal(shouldAbortLoadV1(Array.from({ length: 200 }, (_, index) => ({ ok: index >= 20, http_status: index < 20 ? 500 : 200 }))), true);
});

test('clean reconciled load passes all gates', () => {
  const rows = Array.from({ length: 20 }, (_, index) => ({
    kind: requestKindForIndexV1(index),
    ok: true,
    http_status: 200,
    latency_ms: 100
  }));
  const envelope = deriveLoadEnvelopeV1({ peakEventsPerMinute: 600, targetRps: 20 });
  const summary = summarizeLoadV1({
    rows,
    dbSnapshots: [{ connection_utilization: 0.5, waiting_locks: 0 }],
    plannedRequests: 20,
    envelope,
    aborted: false
  });
  assert.equal(summary.status, 'passed');
  assert.deepEqual(summary.findings, []);
});

test('bounded recovered transport retries are visible and capped at one percent', () => {
  const rows = Array.from({ length: 100 }, (_, index) => ({
    kind: requestKindForIndexV1(index),
    ok: true,
    http_status: 200,
    latency_ms: 100,
    retry_count: index === 0 ? 1 : 0
  }));
  const envelope = deriveLoadEnvelopeV1({ peakEventsPerMinute: 600, targetRps: 20 });
  const clean = summarizeLoadV1({
    rows,
    dbSnapshots: [{ connection_utilization: 0.5, waiting_locks: 0 }],
    plannedRequests: 100,
    envelope,
    aborted: false
  });
  assert.equal(clean.status, 'passed');
  assert.equal(clean.transport_retry_count, 1);
  assert.equal(clean.recovered_transport_retry_count, 1);

  rows[1].retry_count = 1;
  const excessive = summarizeLoadV1({
    rows,
    dbSnapshots: [{ connection_utilization: 0.5, waiting_locks: 0 }],
    plannedRequests: 100,
    envelope,
    aborted: false
  });
  assert.ok(excessive.findings.includes('transport_retry_rate_above_1_percent'));
});

test('load tooling is bounded and contains no production write statements', () => {
  assert.match(source, /--allow-production is required/);
  assert.match(source, /planned request count .* exceeds --max-requests/);
  assert.match(source, /--virtual-clients/);
  assert.match(source, /--transport-retries/);
  assert.match(source, /transport_retry_rate_above_1_percent/);
  assert.match(source, /virtual_clients: args\.virtualClients/);
  assert.match(source, /database_writes:\s*false/);
  assert.match(source, /credentials_persisted:\s*false/);
  assert.doesNotMatch(source, /\b(insert|update|delete|truncate)\s+(?:into|from|table|public\.)/i);
});

test('load sample discovery avoids sorting the full current pricing view', () => {
  assert.match(source, /market_price_current_publication/);
  assert.match(source, /market_price_publication_snapshots/);
  assert.doesNotMatch(source, /select\s+distinct\s+current_price\.card_print_id/i);
});
