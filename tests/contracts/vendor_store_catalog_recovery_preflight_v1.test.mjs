import {readHistoricalStorefrontMigration} from '../helpers/historical_storefront_migration_v1.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {recovered} from '../../scripts/schema/vendor_store_catalog_recovery_runtime_v1.mjs';

const pending='20260919050000,20260919080000,20260919120000,20260919130000,20260919150000,20260919170000,20260919180000,20260919200000,20260919210000,20260920080000,20260920090000';
for(const [name,phase,ids,extra] of [
  ['apply','PrePush',pending,[]],
  ['arbitrary migration','AuditLinkedSchema',pending+',20260920110000',[]],
  ['combined exception','AuditLinkedSchema',pending,['-VendorOrderNotificationsBaselineAudit']],
  ['missing prerequisite','AuditLinkedSchema','20260920090000',[]],
  ['alternate environment','AuditLinkedSchema',pending,['-AuditEnvFile','forbidden.env']],
]) test(`store catalog preflight rejects ${name} before remote access`,()=>{
  const r=spawnSync('pwsh',['-NoProfile','-File','scripts/migration_preflight_strict.ps1','-Phase',phase,'-VendorStoreCatalogBaselineAudit','-ExpectedLocalOnlyIds',ids,...extra],{encoding:'utf8',windowsHide:true});
  assert.equal(r.status,1);assert.match(r.stdout+r.stderr,/Store catalog baseline permits only/);
  assert.doesNotMatch(r.stdout+r.stderr,/Connecting to remote|Initialising login|supabase migration list/);
});
test('recovery preserves all 408 prior migrations and three exact ledger statements',()=>{
  const prior=JSON.parse(fs.readFileSync('docs/audits/vendor_order_refunds_v1/replay.json')).sourceHashes;
  assert.equal(Object.keys(prior).length,408);
  for(const [file,digest] of Object.entries(prior))assert.equal(createHash('sha256').update(readHistoricalStorefrontMigration(file)).digest('hex'),digest,file);
  const receipt=JSON.parse(fs.readFileSync('docs/audits/vendor_store_catalog_recovery_v1/source-recovery.json'));
  assert.equal(receipt.ledgerRows,400);assert.equal(receipt.recovered.length,3);
  for(const r of receipt.recovered){assert.equal(recovered[r.file],r.sha256);assert.equal(createHash('sha256').update(fs.readFileSync('supabase/migrations/'+r.file)).digest('hex'),r.sha256);}
});
