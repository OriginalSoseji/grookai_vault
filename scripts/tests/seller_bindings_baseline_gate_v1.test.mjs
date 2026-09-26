import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const expected='20260919050000,20260919080000,20260919120000';
for(const [label,args] of [
 ['production prepush',['-Phase','PrePush','-ExpectedLocalOnlyIds',expected]],
 ['arbitrary migration',['-Phase','AuditLinkedSchema','-ExpectedLocalOnlyIds','20269999999999']],
 ['missing import',['-Phase','AuditLinkedSchema','-ExpectedLocalOnlyIds','20260919050000,20260919080000']],
 ...['ReconciledReplayAudit','CollectorCameoIsolatedReplay','StorefrontReleaseIsolatedReplay','VendorBillingBaselineAudit','StoreIndexBaselineAudit','CustomImportBaselineAudit']
   .map(mode=>[mode,['-Phase','AuditLinkedSchema',`-${mode}`,'-ExpectedLocalOnlyIds',expected]]),
]) test(`seller binding baseline refuses ${label} before remote access`,()=>{
 const r=spawnSync('pwsh',['-NoProfile','-File','scripts/migration_preflight_strict.ps1','-SellerBindingsBaselineAudit',...args],{cwd:root,encoding:'utf8',windowsHide:true,timeout:20000});
 assert.equal(r.status,1);assert.match(r.stderr,/Seller baseline permits only/);
 assert.doesNotMatch(r.stdout,/Linked Migration Ledger|Initialising login role|Connecting to remote/);
});
