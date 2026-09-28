import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
for(const [name,args] of [
  ['PrePush',['-Phase','PrePush']],
  ['extra migration',['-Phase','AuditLinkedSchema','-ExpectedLocalOnlyIds','20260927010000']],
  ['receipt without prerequisite',['-Phase','AuditLinkedSchema','-ExpectedLocalOnlyIds','20260928020000']],
  ['target override',['-Phase','AuditLinkedSchema','-AuditEnvFile','other.env']],
  ['output override',['-Phase','AuditLinkedSchema','-AuditOutDir','other']],
  ['inspection override',['-Phase','AuditLinkedSchema','-InspectionDeps','other']],
  ['combined apply',['-Phase','AuditLinkedSchema','-VendorStoreTeamWorkflowsV1']],
  ['combined baseline',['-Phase','AuditLinkedSchema','-VendorStoreTeamWorkflowsBaselineAudit']],
])test(`native import baseline rejects ${name} before access`,()=>{
  const r=spawnSync('pwsh',['-NoProfile','-File',root+'scripts/migration_preflight_strict.ps1','-NativeImportRecoveryBaselineAudit',...args],{encoding:'utf8',timeout:15000});
  assert.ifError(r.error);assert.notEqual(r.status,0);assert.match(r.stdout+r.stderr,/Native import baseline permits only fixed read-only/);
  assert.doesNotMatch(r.stdout+r.stderr,/step 1 start|Running: supabase|STRICT NATIVE IMPORT BASELINE PASS/);
});
