import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {validatePlan,validateSourceHashes} from '../schema/storefront_release_guard_v1.mjs';
import {workdir,root,pending} from '../schema/storefront_release_schema_v1.mjs';

const plan=JSON.parse(fs.readFileSync(path.join(workdir,'preparation.json')));
const config=fs.readFileSync(path.join(workdir,'supabase/config.toml'));
test('only the dedicated resolved target, project, port and exact configuration qualify',()=>{
  validatePlan(plan,workdir,config);
  for(const target of ['C:/grookai_vault', 'C:/gv_store_desktop_20260918/.local/integration/release-replay'])assert.throws(()=>validatePlan(plan,target,config));
  for(const delta of [{project:'grookai-storefront-verification-20260918'},{databasePort:54330},{network:'bridge'}])assert.throws(()=>validatePlan({...plan,...delta},workdir,config));
  assert.throws(()=>validatePlan(plan,workdir,Buffer.concat([config,Buffer.from('\n# altered')])));
});
test('source changes, extra/missing files and a substituted release hash fail closed',()=>{
  validateSourceHashes(plan.sourceHashes,{...plan.sourceHashes});
  const changed={...plan.sourceHashes,[pending]:'altered'};
  assert.throws(()=>validateSourceHashes(plan.sourceHashes,changed));
  assert.throws(()=>validatePlan({...plan,sourceHashes:changed},workdir,config));
  assert.throws(()=>validateSourceHashes(plan.sourceHashes,{...plan.sourceHashes,'extra.sql':'extra'}));
  const missing={...plan.sourceHashes};delete missing[pending];assert.throws(()=>validateSourceHashes(plan.sourceHashes,missing));
});
test('strict gate rejects wrong pending sets and combined exceptions before any CLI access',()=>{
  for(const args of [
    ['-ExpectedLocalOnlyIds','20260918040000'],
    ['-ExpectedLocalOnlyIds','20260919050000','-CollectorCameoIsolatedReplay'],
    ['-ExpectedLocalOnlyIds','20260919050000','-ReconciledReplayAudit'],
  ]){
    const result=spawnSync('pwsh',['-NoProfile','-File',path.join(root,'scripts/migration_preflight_strict.ps1'),'-Phase','PrePush','-StorefrontReleaseIsolatedReplay',...args],{encoding:'utf8',windowsHide:true,timeout:10000});
    assert.notEqual(result.status,0);assert.match(result.stdout+result.stderr,/requires only 20260919050000/);assert.doesNotMatch(result.stdout+result.stderr,/Running: supabase/);
  }
});
