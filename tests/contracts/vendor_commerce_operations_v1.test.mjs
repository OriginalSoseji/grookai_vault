import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { readCommerceWorkerConfig } from '../../backend/payments/vendor_commerce_worker_config_v1.mjs';
import { billingHealthAlerts, observeCommerceHealth, runCommerceWorker } from '../../backend/payments/vendor_commerce_worker_v1.mjs';
import { readCommerceAlertConfig, deliverCommerceAlerts } from '../../backend/payments/vendor_commerce_alert_v1.mjs';

const now = Date.parse('2026-09-20T08:00:00Z'), iso = delta => new Date(now + delta).toISOString();
const env = () => ({ STRIPE_PAYMENTS_MODE: 'test', STRIPE_BILLING_MODE: 'test', STRIPE_ACCOUNT_ID: 'acct_fixture', SUPABASE_URL: 'http://127.0.0.1:22021', SUPABASE_SECRET_KEY: 'synthetic', GROOKAI_VENDOR_ORDER_QUEUE_ENABLED: 'true', GROOKAI_VENDOR_BILLING_ENABLED: 'true', GROOKAI_VENDOR_BILLING_RECONCILIATION_ENABLED: 'true' });
const billing = () => ({ pendingEvents: 0, oldestPendingAt: null, failedAccounts: 0, closingAccounts: 0, recoveryAccounts: 0, staleRuns: 0, lastRun: { id: 'private-run', state: 'completed', startedAt: iso(-60000), finishedAt: iso(-50000), errorCode: null } });
const orders = () => ({ enabled: true, checkedAt: iso(0), lastScanAt: iso(-1000), lastCompletedSweepAt: iso(-1000), lastClaimedAt: null, lastFinishedAt: null, completedSweeps: 1, total: 0, due: 0, leased: 0, expiredLeases: 0, unresolved: 0, abandonedClaims: 0, oldestDueAt: null, attention: [] });

test('health needs no Stripe credential or enabled acquisition/processing', () => {
  const e = env(); for (const key of Object.keys(e)) if (key.startsWith('GROOKAI')) delete e[key];
  assert.equal(readCommerceWorkerConfig(e, ['--health']).lane, 'health');
  assert.throws(() => readCommerceWorkerConfig(e, ['--orders']));
  assert.throws(() => readCommerceWorkerConfig(e, ['--billing']));
});
for (const [key, value] of [['SUPABASE_URL', 'https://ycdxbpibncqcchqiihfz.supabase.co'], ['SUPABASE_URL', 'http://127.0.0.1:22021/'], ['SUPABASE_URL', 'http://localhost:22021'], ['STRIPE_BILLING_MODE', 'live'], ['STRIPE_ACCOUNT_ID', 'wrong'], ['GV_USER_ACCESS_TOKEN', 'forged'], ['SUPABASE_SECRET_KEY', '']])
  test(`reject unsafe worker scope ${key}=${value}`, () => assert.throws(() => readCommerceWorkerConfig({ ...env(), [key]: value }, ['--health'])));
test('live scope is explicit and never maps to the synthetic database', () => {
  const e = { ...env(), STRIPE_PAYMENTS_MODE: 'live', STRIPE_BILLING_MODE: 'live' };
  assert.throws(() => readCommerceWorkerConfig(e, ['--orders']));
  assert.equal(readCommerceWorkerConfig({ ...e, SUPABASE_URL: 'https://ycdxbpibncqcchqiihfz.supabase.co' }, ['--health']).scope.livemode, true);
});
for (const args of [[], ['--once'], ['--health', '--orders'], ['--health', '--target=production']])
  test(`reject unexpected command ${args}`, () => assert.throws(() => readCommerceWorkerConfig(env(), args)));
test('billing health detects stalled workers, failed accounts, abandoned runs and overdue events', () => {
  assert.deepEqual(billingHealthAlerts(billing(), now), []);
  assert.deepEqual(billingHealthAlerts({ ...billing(), pendingEvents: 1, oldestPendingAt: iso(-16 * 60000), failedAccounts: 1, recoveryAccounts: 1, staleRuns: 1, lastRun: { ...billing().lastRun, startedAt: iso(-16 * 60000), state: 'failed', errorCode: 'worker_failed' } }, now), ['events_overdue', 'accounts_failed', 'accounts_need_recovery', 'runs_abandoned', 'worker_stale', 'run_failed']);
  assert.deepEqual(billingHealthAlerts({ ...billing(), lastRun: null }, now), ['not_started']);
  assert.throws(() => billingHealthAlerts({ ...billing(), failedAccounts: -1 }, now));
  assert.throws(() => billingHealthAlerts({ ...billing(), pendingEvents: 1 }, now));
});
test('health failures are isolated and output strips private data', async () => {
  let calls = 0;
  const result = await observeCommerceHealth({ orders: () => { throw Error('PRIVATE SECRET'); }, billing: () => { calls++; return { ...billing(), secret: 'PRIVATE SECRET' }; }, now: () => now });
  assert.equal(calls, 1); assert.equal(result.healthy, false);
  assert.deepEqual(result.lanes.orders.alerts, ['health_unavailable']); assert.deepEqual(result.lanes.billing.alerts, []);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE|private-run|SECRET/);
});
test('healthy orders and billing must both pass; stale returned health is rejected', async () => {
  assert.equal((await observeCommerceHealth({ orders, billing, now: () => now })).healthy, true);
  assert.deepEqual((await observeCommerceHealth({ orders: () => ({ ...orders(), checkedAt: iso(-120000) }), billing, now: () => now })).lanes.orders.alerts, ['health_unavailable']);
});
test('worker health invokes only both scoped read RPCs and never constructs provider services', async () => {
  const calls = [], result = await runCommerceWorker({ env: env(), args: ['--health'], now: () => now,
    admin: { rpc: async (name, args) => { calls.push([name, args]); return { data: name === 'vendor_order_reconcile_status_v1' ? orders() : billing(), error: null }; } },
    orderService: () => { throw Error('must not construct'); }, billingService: () => { throw Error('must not construct'); } });
  assert.equal(result.healthy, true); assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], ['vendor_order_reconcile_status_v1', { p_platform: 'acct_fixture', p_live: false }]);
  assert.deepEqual(calls[1], ['vendor_billing_reconcile_health_v1', { p_stripe_account_id: 'acct_fixture', p_livemode: false }]);
});
test('order worker executes one durable tick and exposes no order identity', async () => {
  let ticks = 0;
  const result = await runCommerceWorker({ env: env(), args: ['--orders'], admin: {}, orderService: async () => ({ tick: async () => { ticks++; return { processed: 1, scan: { scanned: 100, complete: false, completedSweeps: 4 }, receipt: { orderId: '11111111-1111-4111-8111-111111111111', fence: 5, result: 'needs_review', nextRunAt: iso(1000) } }; } }) });
  assert.equal(ticks, 1); assert.equal(result.healthy, false); assert.equal(result.outcome, 'needs_review'); assert.doesNotMatch(JSON.stringify(result), /11111111|fence|nextRunAt/);
});
test('billing worker uses durable run and returns a failure for unreconciled accounts', async () => {
  const calls = [];
  const result = await runCommerceWorker({ env: env(), args: ['--billing'], now: () => now, admin: { rpc: async (name, args) => { calls.push([name, args]); return { data: name === 'vendor_billing_due_v1' ? (args.p_lane === 'accounts' ? [{ owner_id: 'private-owner' }] : []) : null, error: null }; } }, billingService: async () => ({ reconcile: async () => { throw Error('PRIVATE'); } }) });
  assert.equal(result.healthy, false); assert.equal(result.failures, 1);
  assert.equal(calls.at(-1)[0], 'vendor_billing_finish_run_v1'); assert.equal(calls.at(-1)[1].p_error_code, 'item_failure');
  assert.doesNotMatch(JSON.stringify(result), /private|PRIVATE|runId/);
});

const alertEnv = stateDir => ({ GROOKAI_COMMERCE_ALERTS_ENABLED: 'true', GROOKAI_COMMERCE_ALERT_URL: 'https://alerts.example.invalid/commerce', GROOKAI_COMMERCE_ALERT_TOKEN: 'synthetic_alert_credential_123456789', GROOKAI_COMMERCE_ALERT_OWNER: 'commerce-oncall', GROOKAI_COMMERCE_ALERT_STATE_DIR: stateDir });
test('alert delivery requires explicit enablement, named owner, private spool and valid destination', () => {
  const e = alertEnv(os.tmpdir());
  assert.equal(readCommerceAlertConfig(e, ['--retry']).retry, true);
  for (const [key, value] of [['GROOKAI_COMMERCE_ALERTS_ENABLED', 'false'], ['GROOKAI_COMMERCE_ALERT_OWNER', ''], ['GROOKAI_COMMERCE_ALERT_STATE_DIR', 'relative'], ['GROOKAI_COMMERCE_ALERT_URL', 'http://public.example/'], ['GROOKAI_COMMERCE_ALERT_URL', 'https://user:pass@example.invalid/'], ['GROOKAI_COMMERCE_ALERT_TOKEN', 'short']]) assert.throws(() => readCommerceAlertConfig({ ...e, [key]: value }, ['--retry']));
  assert.throws(() => readCommerceAlertConfig(e, ['--unit=arbitrary.service']));
});
test('real loopback transport retains failed alerts, retries same ID, archives acknowledgement and sends no private state', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'commerce-alert-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  let fail = true; const received = [];
  const server = http.createServer(async (req, res) => { let body = ''; for await (const chunk of req) body += chunk; received.push({ headers: req.headers, body: JSON.parse(body) }); res.writeHead(fail ? 503 : 204); res.end(); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const e = { ...alertEnv(dir), GROOKAI_COMMERCE_ALERT_TEST: 'true', GROOKAI_COMMERCE_ALERT_URL: `http://127.0.0.1:${server.address().port}/alerts` };
  let result = await deliverCommerceAlerts(readCommerceAlertConfig(e, ['--unit=grookai-commerce-orders.service']));
  assert.equal(result.failed, 1); assert.equal((await fs.readdir(dir)).filter(n => n.endsWith('.json')).length, 1);
  fail = false;
  result = await deliverCommerceAlerts(readCommerceAlertConfig(e, ['--retry']));
  assert.equal(result.healthy, true); assert.equal(result.delivered, 1); assert.equal(received.length, 2);
  assert.equal(received[0].body.notificationId, received[1].body.notificationId);
  assert.equal(received[0].headers['idempotency-key'], received[1].body.notificationId);
  assert.doesNotMatch(JSON.stringify(received.map(r => r.body)), /credential|journal|orderId|customer|secret/);
  assert.equal((await fs.readdir(path.join(dir, 'delivered'))).length, 1);
  await deliverCommerceAlerts(readCommerceAlertConfig(e, ['--retry'])); assert.equal(received.length, 2);
});
test('redirects and transport exceptions retain pending alerts without leaking errors', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'commerce-alert-test-')); t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const result = await deliverCommerceAlerts(readCommerceAlertConfig(alertEnv(dir), ['--unit=grookai-commerce-health.service']), { fetcher: async (url, opts) => { assert.equal(opts.redirect, 'error'); assert.ok(opts.signal); throw Error('PRIVATE URL TOKEN'); } });
  assert.equal(result.failed, 1); assert.doesNotMatch(JSON.stringify(result), /PRIVATE|TOKEN/);
});
test('bounded alert retries resume beyond failing messages after process restart', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'commerce-alert-test-')); t.after(() => fs.rm(dir, { recursive: true, force: true }));
  for (let i = 0; i < 12; i++) { const id = randomUUID(); await fs.writeFile(path.join(dir, `${id}.json`), JSON.stringify({ version: 1, notificationId: id, event: 'commerce_unit_failed', unit: 'grookai-commerce-orders.service', owner: 'commerce-oncall', createdAt: iso(0) })); }
  const seen = [], config = readCommerceAlertConfig(alertEnv(dir), ['--retry']);
  const fetcher = async (url, options) => { seen.push(JSON.parse(options.body).notificationId); return new Response(null, { status: 503 }); };
  assert.equal((await deliverCommerceAlerts(config, { fetcher })).attempted, 10);
  assert.equal((await deliverCommerceAlerts(config, { fetcher })).attempted, 10);
  assert.equal(new Set(seen).size, 12);
});
test('candidate schedules keep monitoring independent and serialize alert spool dispatch', async () => {
  const read = name => fs.readFile(new URL(`../../deploy/systemd/${name}.candidate`, import.meta.url), 'utf8');
  for (const lane of ['orders', 'billing', 'health']) {
    const service = await read(`grookai-commerce-${lane}.service`), timer = await read(`grookai-commerce-${lane}.timer`);
    assert.match(service, new RegExp(`vendor_commerce_worker_v1.mjs --${lane}`));
    assert.match(service, /Type=oneshot/); assert.match(service, /OnFailure=grookai-commerce-alert@%n.service/);
    assert.doesNotMatch(service, /RemainAfterExit|ConditionEnvironment|Requires=grookai-commerce/);
    assert.match(timer, /OnUnitInactiveSec=/); assert.match(timer, /WantedBy=timers.target/);
  }
  for (const unit of ['grookai-commerce-alert@.service', 'grookai-commerce-alert-retry.service']) {
    const body = await read(unit); assert.match(body, /flock -w 180 \/var\/lib\/grookai-commerce-alerts\/dispatch.lock/);
    assert.match(body, /StateDirectory=grookai-commerce-alerts/); assert.match(body, /UMask=0077/);
  }
});
test('repeated failures coalesce while pending and limit delivered reminders to fifteen minutes', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'commerce-alert-test-')); t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const config = readCommerceAlertConfig(alertEnv(dir), ['--unit=grookai-commerce-orders.service']);
  const seen = []; let status = 503;
  const fetcher = async (url, options) => { seen.push(JSON.parse(options.body).notificationId); return new Response(null, { status }); };
  await deliverCommerceAlerts(config, { fetcher, now: () => iso(0) });
  await deliverCommerceAlerts(config, { fetcher, now: () => iso(60000) });
  assert.equal(new Set(seen).size, 1);
  status = 204;
  await deliverCommerceAlerts(config, { fetcher, now: () => iso(120000) });
  const delivered = seen.length;
  await deliverCommerceAlerts(config, { fetcher, now: () => iso(180000) });
  assert.equal(seen.length, delivered);
  await deliverCommerceAlerts(config, { fetcher, now: () => iso(16 * 60000) });
  assert.equal(new Set(seen).size, 2);
});
