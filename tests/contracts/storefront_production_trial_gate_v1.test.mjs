import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
for(const [label,ids,extra] of [
  ['missing ID','',[]],['wrong package','20260926190000',[]],
  ['extra migration','20260926200000,20260926190000',[]],
  ['combined release','20260926200000',['-StorefrontProductionReleaseV1']],
  ['override','20260926200000',['-AuditEnvFile','C:/unexpected']]
])test(`production trial rejects ${label} before access`,()=>{
  const r=spawnSync('pwsh',['-NoProfile','-File','scripts/migration_preflight_strict.ps1','-Phase','PrePush','-StorefrontProductionTrialsV1',...(ids?['-ExpectedLocalOnlyIds',ids]:[]),...extra],{encoding:'utf8',windowsHide:true});
  assert.equal(r.status,1);assert.match(r.stdout+r.stderr,/exact invitation migration/);assert.doesNotMatch(r.stdout+r.stderr,/step 1 start|Connecting to remote|Initialising login/);
});
