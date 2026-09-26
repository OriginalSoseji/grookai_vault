import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
for(const [label,args] of [
 ['production prepush',['-Phase','PrePush','-ExpectedLocalOnlyIds','20260919050000,20260919080000']],
 ['arbitrary migration',['-Phase','AuditLinkedSchema','-ExpectedLocalOnlyIds','20269999999999']],
 ['missing billing',['-Phase','AuditLinkedSchema','-ExpectedLocalOnlyIds','20260919050000']],
 ['combined exception',['-Phase','AuditLinkedSchema','-VendorBillingBaselineAudit','-ExpectedLocalOnlyIds','20260919050000,20260919080000']],
]) test(`custom import baseline refuses ${label} before remote access`,()=>{
 const r=spawnSync('pwsh',['-NoProfile','-File','scripts/migration_preflight_strict.ps1','-CustomImportBaselineAudit',...args],{cwd:root,encoding:'utf8',windowsHide:true,timeout:20000});
 assert.equal(r.status,1);assert.match(r.stderr,/Custom import baseline permits only/);
 assert.doesNotMatch(r.stdout,/Linked Migration Ledger|Initialising login role|Connecting to remote/);
});
