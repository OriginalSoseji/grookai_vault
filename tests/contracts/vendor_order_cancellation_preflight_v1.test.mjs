import {readHistoricalStorefrontMigration} from '../helpers/historical_storefront_migration_v1.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';import {spawnSync} from 'node:child_process';
const pending='20260919050000,20260919080000,20260919120000,20260919130000,20260919150000,20260919170000,20260919180000';
for(const [name,phase,ids,extra] of [['apply','PrePush',pending,[]],['arbitrary migration','AuditLinkedSchema',pending+',20260919200000',[]],['combined exception','AuditLinkedSchema',pending,['-VendorCheckoutBaselineAudit']],['missing prerequisite','AuditLinkedSchema','20260919180000',[]]])test(`cancellation baseline rejects ${name} before remote access`,()=>{const r=spawnSync('pwsh',['-NoProfile','-File','scripts/migration_preflight_strict.ps1','-Phase',phase,'-VendorOrderCancellationBaselineAudit','-ExpectedLocalOnlyIds',ids,...extra],{encoding:'utf8',windowsHide:true});assert.equal(r.status,1);assert.match(r.stdout+r.stderr,/Order cancellation baseline permits only/);assert.doesNotMatch(r.stdout+r.stderr,/Connecting to remote|Initialising login|supabase migration list/);});
test('recovered SQL remains byte-exact to applied ledger; all prior migration files preserved',()=>{
 const hash=x=>createHash('sha256').update(x).digest('hex');
 const prior=JSON.parse(fs.readFileSync('docs/audits/vendor_checkout_v1/replay.json')).sourceHashes;
 for(const [file,digest] of Object.entries(prior))assert.equal(hash(readHistoricalStorefrontMigration(file)),digest,file);
 assert.equal(hash(fs.readFileSync('supabase/migrations/20260919193000_japanese_unnumbered_event_identity_v1.sql')),'80d659799f06bddd0f86e4339a214d470d378d2c2918da20ca25c0e6d6cf552e');
});
