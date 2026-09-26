import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const expected='20260919050000,20260919080000,20260919120000,20260919130000,20260919150000,20260919170000,20260919180000,20260919200000,20260919210000,20260920080000,20260920090000,20260922140000,20260922180000,20260923020000,20260923030000';
for(const [label,args] of [
 ['apply',['-Phase','PrePush','-ExpectedLocalOnlyIds',expected]],
 ['arbitrary migration',['-Phase','AuditLinkedSchema','-ExpectedLocalOnlyIds','20269999999999']],
 ['missing prerequisite',['-Phase','AuditLinkedSchema','-ExpectedLocalOnlyIds',expected.replace(',20260923030000','')]],
 ['combined exception',['-Phase','AuditLinkedSchema','-ExpectedLocalOnlyIds',expected,'-VendorPreorderConflictBaselineAudit']],
 ['target override',['-Phase','AuditLinkedSchema','-ExpectedLocalOnlyIds',expected,'-AuditEnvFile','not-allowed']],
])test('batch baseline rejects '+label+' before external access',()=>{
 const r=spawnSync('pwsh',['-NoProfile','-File','scripts/migration_preflight_strict.ps1','-VendorBatchCommitBaselineAudit',...args],{encoding:'utf8',windowsHide:true,timeout:20000});
 assert.equal(r.status,1);assert.match(r.stderr,/Batch intake baseline permits only/);assert.doesNotMatch(r.stdout,/Linked Migration Ledger|Connecting to remote/);
});
for(const [label,args] of [
 ['apply',['-Phase','PrePush','-ExpectedLocalOnlyIds',expected+',20260923040000']],
 ['arbitrary migration',['-Phase','AuditLinkedSchema','-ExpectedLocalOnlyIds','20269999999999']],
 ['missing prerequisite',['-Phase','AuditLinkedSchema','-ExpectedLocalOnlyIds',expected]],
 ['combined exception',['-Phase','AuditLinkedSchema','-ExpectedLocalOnlyIds',expected+',20260923040000','-VendorBatchCommitBaselineAudit']],
 ['target override',['-Phase','AuditLinkedSchema','-ExpectedLocalOnlyIds',expected+',20260923040000','-AuditEnvFile','not-allowed']],
])test('private-copy baseline rejects '+label+' before external access',()=>{
 const r=spawnSync('pwsh',['-NoProfile','-File','scripts/migration_preflight_strict.ps1','-VendorBatchPrivateCopyBaselineAudit',...args],{encoding:'utf8',windowsHide:true,timeout:20000});
 assert.equal(r.status,1);assert.match(r.stderr,/Batch private-copy baseline permits only/);assert.doesNotMatch(r.stdout,/Linked Migration Ledger|Connecting to remote/);
});
