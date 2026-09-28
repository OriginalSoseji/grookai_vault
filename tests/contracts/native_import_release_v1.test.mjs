import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
for(const [name,ids,extra]of [
  ['missing IDs','',[]],
  ['atomic only','20260926230000',[]],
  ['receipt only','20260928020000',[]],
  ['extra migration','20260926230000,20260928020000,20260929000000',[]],
  ['target override','20260926230000,20260928020000',['-AuditEnvFile','other.env']],
  ['output override','20260926230000,20260928020000',['-AuditOutDir','other']],
  ['inspection override','20260926230000,20260928020000',['-InspectionDeps','other']],
  ['combined baseline','20260926230000,20260928020000',['-NativeImportRecoveryBaselineAudit']],
  ['combined apply','20260926230000,20260928020000',['-VendorStoreTeamWorkflowsV1']],
])for(const phase of ['AuditLinkedSchema','PrePush'])test(`native import release rejects ${name} in ${phase} before access`,()=>{
  const args=['-NoProfile','-File',root+'scripts/migration_preflight_strict.ps1','-NativeImportRecoveryReleaseV1','-Phase',phase];
  if(ids)args.push('-ExpectedLocalOnlyIds',ids);
  const r=spawnSync('pwsh',[...args,...extra],{encoding:'utf8',timeout:15000});
  assert.ifError(r.error);assert.notEqual(r.status,0);assert.match(r.stdout+r.stderr,/Native import release permits only its two exact migrations/);
  assert.doesNotMatch(r.stdout+r.stderr,/step 1 start|Running: supabase|STRICT NATIVE IMPORT RELEASE PASS/);
});
for(const mode of ['apply','reset','deploy'])test(`native import inspection CLI refuses ${mode} before credentials`,()=>{
  const r=spawnSync(process.execPath,[root+'scripts/release/prepare_native_import_v1.mjs',mode],{encoding:'utf8',timeout:15000});
  assert.ifError(r.error);assert.notEqual(r.status,0);assert.match(r.stdout+r.stderr,/No apply operation/);
});
