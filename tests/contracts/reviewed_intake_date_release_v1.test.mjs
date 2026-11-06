import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {validateReviewedDateReleaseInvocation,validateReviewedDateReleaseInventory} from '../../scripts/schema/verify_reviewed_intake_date_release_v1.mjs';
const root=fileURLToPath(new URL('../..',import.meta.url));
const out='C:/gv_intake_recovery_private_20261027/reviewed-intake-date-release-gate-unit';

test('date release rejects apply, extra arguments and unbounded destinations before connections',()=>{
  assert.equal(validateReviewedDateReleaseInvocation(['PrePush','--out-dir='+out]).out,out);
  for(const args of [[],['Apply','--out-dir='+out],['PrePush','--out-dir=C:/grookai_vault'],['PrePush','--out-dir='+out+'/nested'],['PrePush','--out-dir='+out,'--apply'],['PrePush','--out-dir=C:/gv_intake_recovery_private_20261027/reviewed-intake-release-gate-unit']])assert.throws(()=>validateReviewedDateReleaseInvocation(args));
});

test('date release binds all 479 raw files including both frozen candidates',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'docs/audits/reviewed_intake_date_release_20261028/release-manifest.json')));
  const files=Object.fromEntries(Object.keys(manifest.migrationSources).map(n=>[n,fs.readFileSync(path.join(root,'supabase/migrations',n))]));
  assert.deepEqual(validateReviewedDateReleaseInventory(files,manifest.migrationSources).slice(-2),['20261028020000','20261028050700']);
  for(const name of [Object.keys(files)[0],'20261028020000_collector_reviewed_intake_v1.sql',manifest.candidate]){
    assert.throws(()=>validateReviewedDateReleaseInventory({...files,[name]:Buffer.from('select 1;')},manifest.migrationSources));
    const missing={...files};delete missing[name];assert.throws(()=>validateReviewedDateReleaseInventory(missing,manifest.migrationSources));
  }
  assert.throws(()=>validateReviewedDateReleaseInventory({...files,'20261028060000_extra.sql':Buffer.from('select 1;')},manifest.migrationSources));
});

test('date release PowerShell rejects partial, extra and combined scopes',{skip:process.platform!=='win32'},()=>{
  const common=['-NoProfile','-File',path.join(root,'scripts/migration_preflight_strict.ps1'),'-Phase','PrePush','-CollectorReviewedIntakeDateReleaseV1','-AuditOutDir',out];
  for(const tail of [[],['-ExpectedLocalOnlyIds','20261028020000'],['-ExpectedLocalOnlyIds','20261028020000,20261028050700,20261028060000'],['-ExpectedLocalOnlyIds','20261028020000,20261028050700','-CollectorReviewedIntakeReleaseV1']]){
    const result=spawnSync('pwsh',[...common,...tail],{cwd:root,encoding:'utf8',timeout:20000});assert.ifError(result.error);assert.notEqual(result.status,0);assert.match(result.stderr,/permits only exact 20261028020000 and 20261028050700/);
  }
});
