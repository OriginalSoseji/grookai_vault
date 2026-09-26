import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
for(const [label,args] of [
 ['production prepush',['-Phase','PrePush','-ExpectedLocalOnlyIds','20260919050000']],
 ['arbitrary migration',['-Phase','AuditLinkedSchema','-ExpectedLocalOnlyIds','20269999999999']],
 ['combined release exception',['-Phase','AuditLinkedSchema','-StorefrontReleaseIsolatedReplay','-ExpectedLocalOnlyIds','20260919050000']],
 ['billing without storefront prerequisite',['-Phase','AuditLinkedSchema','-ExpectedLocalOnlyIds','20260919080000']],
]) test(`billing baseline cannot authorize ${label}`,()=>{
 const result=spawnSync('pwsh',['-NoProfile','-File','scripts/migration_preflight_strict.ps1','-VendorBillingBaselineAudit',...args],{cwd:root,encoding:'utf8',windowsHide:true,timeout:20000});
 assert.equal(result.status,1);
 assert.match(result.stderr,/Billing baseline audit permits only/);
 assert.doesNotMatch(result.stdout,/Linked Migration Ledger|Initialising login role|Connecting to remote/);
});
