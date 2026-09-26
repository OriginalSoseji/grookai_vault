// Reconcile the completed UI proof's missing final DB readback without rerunning
// or rewriting its failed receipt. This performs only a pilot read-only query.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { verified, query } from './ops.mjs';
const dir = '.local/integration/vendor-scan-hosted-v31-features';
const file = dir + '/browser-1790321735910.json';
const report = JSON.parse(fs.readFileSync(file));
assert.equal((await verified()).id, 'hrtbjchobencariqclab');
assert.equal(report.status, 'failed'); assert.equal(report.boundaryReadbackFailed, true);
assert.ok(!report.error && !report.afterDigest && !report.cleanupError);
assert.ok(report.capabilitiesReadyAfterReload && report.comparisonImageLoadedAfterReload);
assert.equal(report.inventoryWrites, 0); assert.deepEqual(report.blockedWrites, []);
assert.ok(report.steps.some(s => s.includes('no document overflow')));
assert.ok(report.steps.some(s => s.includes('draft survives reload')));
const sql = `begin read only; select md5(jsonb_build_object('copies',(select jsonb_agg(to_jsonb(v) order by id) from vault_item_instances v),'profiles',(select jsonb_agg(to_jsonb(p) order by user_id) from public_profiles p),'stores',(select jsonb_agg(to_jsonb(s) order by id) from vendor_stores s),'grants',(select jsonb_agg(to_jsonb(e) order by id) from user_entitlements e),'orders',(select count(*) from vendor_orders),'telemetry',(select count(*) from web_events))::text) as digest; rollback;`;
const afterDigest = (await query(sql))[0].digest;
assert.equal(afterDigest, report.beforeDigest);
const result = { at: new Date().toISOString(), status: 'reconciled',
  browserReceipt: file, browserReceiptSha256: createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
  originalStatus: report.status, originalFailure: 'Final readback failed; original harness did not retain the cause',
  uiStepsCompleted: true, afterDigest, beforeDigest: report.beforeDigest, retainedDataUnchanged: true,
  limitation: 'Independent later readback, not a rerun of the browser journey; original failure retained unchanged' };
fs.writeFileSync(dir + '/browser-readback.private.json', JSON.stringify(result, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ status: result.status, retainedDataUnchanged: true }));
