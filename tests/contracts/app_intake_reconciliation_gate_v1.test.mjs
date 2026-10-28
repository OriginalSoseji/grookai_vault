import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {validateInvocation,validateInventory} from '../../scripts/schema/verify_app_intake_reconciliation_v1.mjs';

const root=fileURLToPath(new URL('../..',import.meta.url));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'docs/audits/intake_recovery_20261027/qualification-manifest.json')));
const candidate=manifest.candidate;
const files=()=>Object.fromEntries(fs.readdirSync(path.join(root,'supabase/migrations')).filter(n=>n.endsWith('.sql')).map(n=>[n,fs.readFileSync(path.join(root,'supabase/migrations',n))]));
test('bounded invocation permits only the two phases and a new top-level private destination',()=>{
  assert.equal(validateInvocation(['AuditLinkedSchema','--out-dir=C:/gv_intake_recovery_private_20261027/strict-unit']).phase,'AuditLinkedSchema');
  assert.equal(validateInvocation(['PrePush','--out-dir=C:/gv_intake_recovery_private_20261027/strict-unit']).phase,'PrePush');
  for(const args of [[],['apply','--out-dir=C:/gv_intake_recovery_private_20261027/strict-unit'],['AuditLinkedSchema','--out-dir=C:/grookai_vault'],['AuditLinkedSchema','--out-dir=C:/gv_intake_recovery_private_20261027/strict-unit/nested'],['AuditLinkedSchema','--out-dir=C:/gv_intake_recovery_private_20261027/strict-unit','--allow-drift']])assert.throws(()=>validateInvocation(args));
});
test('exact inventory passes and keeps every original migration byte',()=>{
  const ids=validateInventory(files(),manifest.baselineSources);assert.equal(ids.length,477);assert.equal(ids.at(-1),'20261027230000');
});
test('changed historical or candidate SQL is rejected before any connection',()=>{
  for(const name of [Object.keys(manifest.baselineSources)[0],candidate]){
    const copy=files();copy[name]=Buffer.concat([copy[name],Buffer.from('\n-- changed\n')]);assert.throws(()=>validateInventory(copy,manifest.baselineSources));
  }
});
test('missing, extra and duplicate-version payloads are rejected',()=>{
  const missing=files();delete missing[candidate];assert.throws(()=>validateInventory(missing,manifest.baselineSources));
  for(const name of ['20261028000000_unrelated.sql','20261027230000_duplicate.sql']){const extra=files();extra[name]=Buffer.from('select 1;');assert.throws(()=>validateInventory(extra,manifest.baselineSources));}
});
test('PowerShell scope rejects mixed flags, wrong migration and target overrides before tools',()=>{
  if(process.platform!=='win32')return;
  const base=['-NoProfile','-File',path.join(root,'scripts/migration_preflight_strict.ps1'),'-Phase','AuditLinkedSchema','-AppIntakeReconciliationV1','-AuditOutDir','C:/gv_intake_recovery_private_20261027/strict-unit'];
  for(const tail of [['-ExpectedLocalOnlyIds','20261027230000','-OperationsAgentScheduleHealthV1'],['-ExpectedLocalOnlyIds','20261028000000'],['-ExpectedLocalOnlyIds','20261027230000','-AuditEnvFile','not-permitted']]){
    const result=spawnSync('pwsh',[...base,...tail],{cwd:root,encoding:'utf8',timeout:20000});assert.ifError(result.error);assert.notEqual(result.status,0);assert.match(result.stderr,/permits only exact migration/);
  }
});
