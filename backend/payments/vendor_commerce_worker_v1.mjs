import { pathToFileURL } from 'node:url';
import { readCommerceWorkerConfig } from './vendor_commerce_worker_config_v1.mjs';
import { createOrderQueueRepository, createVendorOrderQueue, projectOrderQueueStatus, projectOrderQueueTick, orderQueueAlerts } from '../../apps/web/src/lib/payments/vendorOrderQueue.ts';
import { createReconcileQueue, reconcileVendorBillingOnce } from '../../apps/web/src/lib/billing/vendorBillingReconciliation.ts';

const count = value => Number.isSafeInteger(value) && value >= 0;
const validTime = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
export function billingHealthAlerts(value, now = Date.now()) {
  if (!value || !Number.isSafeInteger(now)) throw new Error('Invalid billing health');
  for (const key of ['pendingEvents', 'failedAccounts', 'closingAccounts', 'recoveryAccounts', 'staleRuns'])
    if (!count(value[key])) throw new Error('Invalid billing health');
  if (value.oldestPendingAt !== null && !validTime(value.oldestPendingAt)) throw new Error('Invalid billing health');
  if ((value.pendingEvents === 0) !== (value.oldestPendingAt === null)) throw new Error('Invalid billing health');
  const alerts = [];
  if (value.pendingEvents && now - Date.parse(value.oldestPendingAt) > 15 * 60_000) alerts.push('events_overdue');
  if (value.failedAccounts) alerts.push('accounts_failed');
  if (value.recoveryAccounts) alerts.push('accounts_need_recovery');
  if (value.staleRuns) alerts.push('runs_abandoned');
  const run = value.lastRun;
  if (run === null) alerts.push('not_started');
  else {
    if (!run || !['running', 'completed', 'failed'].includes(run.state) || !validTime(run.startedAt) ||
        (run.finishedAt !== null && !validTime(run.finishedAt)) ||
        (run.state === 'running') !== (run.finishedAt === null) ||
        (run.finishedAt && Date.parse(run.finishedAt) < Date.parse(run.startedAt)) ||
        ![null, 'item_failure', 'worker_failed', 'worker_abandoned'].includes(run.errorCode)) throw new Error('Invalid billing health');
    if (Date.parse(run.startedAt) > now + 60_000 || (run.finishedAt && Date.parse(run.finishedAt) > now + 60_000)) throw new Error('Invalid billing health');
    if (now - Date.parse(run.startedAt) > 15 * 60_000) alerts.push('worker_stale');
    if (run.state === 'failed' || run.errorCode !== null) alerts.push('run_failed');
  }
  return alerts;
}

// A health failure in one lane must not suppress the other lane's observation.
// Never emit raw RPC objects, order/account IDs, provider errors or credentials.
export async function observeCommerceHealth({ orders, billing, now = Date.now }) {
  const results = await Promise.allSettled([Promise.resolve().then(orders), Promise.resolve().then(billing)]);
  const lanes = {};
  for (const [index, name] of ['orders', 'billing'].entries()) {
    try {
      const result = results[index];
      if (result.status !== 'fulfilled') throw new Error('Unavailable');
      if (name === 'orders') {
        const s = projectOrderQueueStatus(result.value), checked = Date.parse(s.checkedAt);
        if (Math.abs(now() - checked) > 60_000) throw new Error('Stale status');
        lanes[name] = { alerts: orderQueueAlerts(s), counts: { total: s.total, due: s.due, leased: s.leased, expiredLeases: s.expiredLeases, unresolved: s.unresolved } };
      } else {
        const s = result.value;
        lanes[name] = { alerts: billingHealthAlerts(s, now()), counts: { pendingEvents: s.pendingEvents, failedAccounts: s.failedAccounts, recoveryAccounts: s.recoveryAccounts, staleRuns: s.staleRuns } };
      }
    } catch { lanes[name] = { alerts: ['health_unavailable'] }; }
  }
  return { healthy: Object.values(lanes).every(lane => lane.alerts.length === 0), lanes };
}

export async function runCommerceWorker({ env, args, admin, orderService, billingService, now }) {
  const settings = readCommerceWorkerConfig(env, args);
  const orders = createOrderQueueRepository(admin, { scope: settings.scope }), billing = createReconcileQueue(admin, settings.scope);
  if (settings.lane === 'health') {
    const health = await observeCommerceHealth({ orders: () => orders.status(), billing: () => billing.health(), now });
    return { worker: 'vendor-commerce-v1', lane: 'health', ...health };
  }
  if (settings.lane === 'orders') {
    const result = projectOrderQueueTick(await (await orderService()).tick());
    return { worker: 'vendor-commerce-v1', lane: 'orders', healthy: result.processed === 0 || result.receipt.result === 'verified',
      processed: result.processed, scanned: result.scan.scanned, scanComplete: result.scan.complete,
      outcome: result.processed === 0 ? 'idle' : result.receipt.result };
  }
  const result = await reconcileVendorBillingOnce({ queue: billing, service: await billingService(), now });
  return { worker: 'vendor-commerce-v1', lane: 'billing', healthy: result.failures === 0,
    processed: result.processed, deferred: result.deferred, busy: result.busy, failures: result.failures };
}

async function main() {
  await import('../env.mjs');
  readCommerceWorkerConfig(process.env, process.argv.slice(2));
  const { createBackendClient } = await import('../supabase_backend_client.mjs');
  const admin = createBackendClient();
  const result = await runCommerceWorker({ env: process.env, args: process.argv.slice(2), admin,
    orderService: async () => {
      const { readOrderRuntimeConfig } = await import('../../apps/web/src/lib/payments/vendorOrderRuntimePolicy.ts');
      const { createSellerStripeClient } = await import('../../apps/web/src/lib/payments/vendorSellerStripeGateway.ts');
      const config = readOrderRuntimeConfig(process.env, 'queue', '');
      if (!config) throw new Error('Order queue disabled');
      return createVendorOrderQueue(admin, createSellerStripeClient(config), config, true);
    },
    billingService: async () => {
      const { readVendorBillingConfig, createVendorStripeClient } = await import('../../apps/web/src/lib/billing/vendorStripeGateway.ts');
      const { createVendorBillingRepository } = await import('../../apps/web/src/lib/billing/vendorBillingRepository.ts');
      const { createVendorBillingService } = await import('../../apps/web/src/lib/billing/vendorBillingService.ts');
      const config = readVendorBillingConfig(process.env);
      if (!config) throw new Error('Billing disabled');
      return createVendorBillingService({ repo: createVendorBillingRepository(admin), stripe: createVendorStripeClient(config), config, checkoutEnabled: false });
    } });
  console.log(JSON.stringify(result));
  if (!result.healthy) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch(() => { console.error('[vendor-commerce-v1] operation incomplete; inspect retained queue and health'); process.exitCode = 1; });
