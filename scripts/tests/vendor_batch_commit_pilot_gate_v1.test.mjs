import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
for(const [label,args] of [
 ['audit mode',['-Phase','AuditLinkedSchema','-ExpectedLocalOnlyIds','20260923040000,20260923050000']],
 ['arbitrary migration',['-Phase','PrePush','-ExpectedLocalOnlyIds','20260922180000']],
 ['extra migration',['-Phase','PrePush','-ExpectedLocalOnlyIds','20260923040000,20260923050000,20260922180000']],
 ['arbitrary target',['-Phase','PrePush','-ExpectedLocalOnlyIds','20260923040000,20260923050000','-AuditEnvFile','other']],
 ['combined exception',['-Phase','PrePush','-ExpectedLocalOnlyIds','20260923040000,20260923050000','-VendorPreordersBaselineAudit']],
])test(`isolated batch apply gate rejects ${label} before access`,()=>{
 const r=spawnSync('pwsh',['-NoProfile','-File','scripts/migration_preflight_strict.ps1','-VendorBatchCommitPilotApply',...args],{cwd:root,encoding:'utf8',windowsHide:true,timeout:20000});
 assert.equal(r.status,1);assert.match(r.stderr,/Batch pilot gate permits only/);assert.doesNotMatch(r.stdout,/step 1 start|Linked Migration Ledger|Connecting to remote/);
});
