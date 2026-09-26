import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { verified, query } from './ops.mjs';
const dir = '.local/integration/vendor-scan-hosted-v24-v25-cancel';
const read = p => JSON.parse(fs.readFileSync(p)), hash = b => createHash('sha256').update(b).digest('hex');
assert.equal((await verified()).id, 'hrtbjchobencariqclab');
const name = fs.readdirSync(dir).filter(n => /^browser-\d+\.json$/.test(n)).sort().at(-1), browser = read(dir + '/' + name);
assert.equal(browser.status, 'passed'); assert.equal(browser.inventoryWrites, 0);
assert.equal(browser.capabilitiesReadyAfterReload, true); assert.equal(browser.comparisonImageLoadedAfterReload, true);
const before = read(dir + '/hosted-proof.private.json');
const rows = await query("begin read only; select md5(jsonb_build_object('copies',(select jsonb_agg(to_jsonb(v) order by id) from vault_item_instances v),'profiles',(select jsonb_agg(to_jsonb(p) order by user_id) from public_profiles p),'stores',(select jsonb_agg(to_jsonb(s) order by id) from vendor_stores s),'grants',(select jsonb_agg(to_jsonb(e) order by id) from user_entitlements e),'orders',(select count(*) from vendor_orders),'telemetry',(select count(*) from web_events))::text) as digest; rollback;");
const unchanged = rows[0].digest === before.beforeDigest; assert.ok(unchanged, 'Retained pilot data changed; reconcile before claiming preservation');
const receipt = {
  at: new Date().toISOString(), deployment: before.deployment, browser: browser.status,
  precedingProofSha256: hash(fs.readFileSync('docs/audits/vendor_scan_runtime_v25/CANCELLATION_PROOF_20260924.json')),
  browserReceiptSha256: hash(fs.readFileSync(dir + '/' + name)),
  capabilitiesReadyAfterReload: browser.capabilitiesReadyAfterReload,
  comparisonImageLoadedAfterReload: browser.comparisonImageLoadedAfterReload,
  catalogImages: browser.catalogImages, steps: browser.steps,
  screenshots: ['desktop', 'mobile-layout'].map(kind => { const file = name.replace('.json', '-' + kind + '.png'); return { file, sha256: hash(fs.readFileSync(dir + '/' + file)) }; }),
  inventoryWrites: 0, retainedDataUnchanged: unchanged,
  digestScope: 'All copy/profile/store/entitlement rows, order count and telemetry count; excludes Auth session bookkeeping.',
  physicalPhoneTested: false, sharedAliasChanged: false,
};
fs.writeFileSync('docs/audits/vendor_scan_runtime_v25/BROWSER_FINAL_20260924.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ browser: 'passed', capabilitiesReadyAfterReload: true, comparisonImageLoadedAfterReload: true, retainedDataUnchanged: unchanged }));
