import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {validateReviewedReleaseInvocation,validateReviewedReleaseInventory} from '../../scripts/schema/verify_reviewed_intake_release_v1.mjs';
const root=fileURLToPath(new URL('../..',import.meta.url));
test('reviewed release rejects unbounded output, extra arguments and apply before connections',()=>{
  const out='C:/gv_intake_recovery_private_20261027/reviewed-intake-release-gate-unit';
  assert.equal(validateReviewedReleaseInvocation(['PrePush','--out-dir='+out]).out,out);
  for(const args of [[],['Apply','--out-dir='+out],['PrePush','--out-dir=C:/grookai_vault'],['PrePush','--out-dir='+out+'/nested'],['PrePush','--out-dir='+out,'--apply']])assert.throws(()=>validateReviewedReleaseInvocation(args));
});
test('reviewed release accepts only exact frozen history and rejects edits, omissions and extras',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'docs/audits/reviewed_intake_release_20261028/release-manifest.json')));
  const files=Object.fromEntries(Object.keys(manifest.migrationSources).map(n=>[n,fs.readFileSync(path.join(root,'supabase/migrations',n))]));
  assert.equal(validateReviewedReleaseInventory(files,manifest.migrationSources).length,478);
  const altered={...files,[manifest.candidate]:Buffer.from('select 1;')};assert.throws(()=>validateReviewedReleaseInventory(altered,manifest.migrationSources));
  const missing={...files};delete missing[Object.keys(files)[0]];assert.throws(()=>validateReviewedReleaseInventory(missing,manifest.migrationSources));
  assert.throws(()=>validateReviewedReleaseInventory({...files,'20261028030000_extra.sql':Buffer.from('select 1;')},manifest.migrationSources));
});
test('reviewed release PowerShell scope rejects wrong payloads and combined scopes',{skip:process.platform!=='win32'},()=>{
  const common=['-NoProfile','-File',path.join(root,'scripts/migration_preflight_strict.ps1'),'-Phase','PrePush','-CollectorReviewedIntakeReleaseV1','-AuditOutDir','C:/gv_intake_recovery_private_20261027/reviewed-intake-release-gate-unit'];
  for(const tail of [[],['-ExpectedLocalOnlyIds','20261027230000'],['-ExpectedLocalOnlyIds','20261028020000','-AppReviewedIntakeBaselineV1']]){
    const r=spawnSync('pwsh',[...common,...tail],{cwd:root,encoding:'utf8',timeout:20000});assert.ifError(r.error);assert.notEqual(r.status,0);assert.match(r.stderr,/permits only exact 20261028020000/);
  }
});
