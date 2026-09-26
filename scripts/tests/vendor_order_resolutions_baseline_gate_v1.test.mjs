import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const expected='20260919050000,20260919080000,20260919120000,20260919130000,20260919150000,20260919170000,20260919180000,20260919200000,20260919210000,20260920080000,20260920090000,20260922140000';
for(const [label,args] of [
 ['production apply',['-Phase','PrePush','-ExpectedLocalOnlyIds',expected]],
 ['unknown migration',['-Phase','AuditLinkedSchema','-ExpectedLocalOnlyIds','20269999999999']],
 ['missing notification',['-Phase','AuditLinkedSchema','-ExpectedLocalOnlyIds',expected.replace(',20260922140000','')]],
 ['future migration',['-Phase','AuditLinkedSchema','-ExpectedLocalOnlyIds',expected+',20260922180000']],
 ...['ReconciledReplayAudit','CollectorCameoIsolatedReplay','StorefrontReleaseIsolatedReplay','VendorBillingBaselineAudit','StoreIndexBaselineAudit','CustomImportBaselineAudit','SellerBindingsBaselineAudit','VendorStockBaselineAudit','VendorOrdersBaselineAudit','VendorCheckoutBaselineAudit','VendorOrderCancellationBaselineAudit','VendorUnstartedOrderBaselineAudit','VendorOrderRetryBaselineAudit','VendorOrderFulfillmentBaselineAudit','VendorOrderRefundsBaselineAudit','VendorOrderNotificationsBaselineAudit','VendorOrderNotificationsV2BaselineAudit','VendorStoreCatalogBaselineAudit']
  .map(mode=>[mode,['-Phase','AuditLinkedSchema',`-${mode}`,'-ExpectedLocalOnlyIds',expected]]),
 ...['InspectionDeps','AuditEnvFile','AuditOutDir'].map(mode=>[mode,['-Phase','AuditLinkedSchema',`-${mode}`,'arbitrary','-ExpectedLocalOnlyIds',expected]]),
])test(`resolution baseline rejects ${label} before external access`,()=>{
 const r=spawnSync('pwsh',['-NoProfile','-File','scripts/migration_preflight_strict.ps1','-VendorOrderResolutionsBaselineAudit',...args],{cwd:root,encoding:'utf8',windowsHide:true,timeout:20000});
 assert.equal(r.status,1);assert.match(r.stderr,/Resolution baseline permits only/);
 assert.doesNotMatch(r.stdout,/Linked Migration Ledger|Initialising login role|Connecting to remote/);
});
