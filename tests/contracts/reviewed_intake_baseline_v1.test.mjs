import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {validateReviewedBaselineArgs} from '../../scripts/schema/verify_reviewed_intake_baseline_v1.mjs';

const root=fileURLToPath(new URL('../..',import.meta.url));
test('baseline uses the exact committed LF manifest representation',()=>{
  const bytes=fs.readFileSync(path.join(root,'docs/audits/intake_recovery_20261027/qualification-manifest.json'));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),'723fdcf4e8cb7219e8cefd072489116f249ab1fe34d08eb2ec8bc73e47664b64');
});
test('reviewed intake baseline output is bounded before any connection',()=>{
  assert.equal(validateReviewedBaselineArgs(['C:/gv_intake_recovery_private_20261027/baseline-intake-unit']),'C:/gv_intake_recovery_private_20261027/baseline-intake-unit');
  for(const args of [[],['C:/grookai_vault'],['C:/gv_intake_recovery_private_20261027/baseline-intake-unit/nested'],['C:/gv_intake_recovery_private_20261027/baseline-intake-unit','--apply']])assert.throws(()=>validateReviewedBaselineArgs(args));
});
test('baseline PowerShell scope rejects release, candidates and combined flags before tools',{skip:process.platform!=='win32'},()=>{
  const common=['-NoProfile','-File',path.join(root,'scripts/migration_preflight_strict.ps1'),'-AppReviewedIntakeBaselineV1','-AuditOutDir','C:/gv_intake_recovery_private_20261027/baseline-intake-unit'];
  for(const tail of [['-Phase','PrePush'],['-Phase','AuditLinkedSchema','-ExpectedLocalOnlyIds','20261028010000'],['-Phase','AuditLinkedSchema','-AppIntakeReconciliationV1']]){
    const r=spawnSync('pwsh',[...common,...tail],{cwd:root,encoding:'utf8',timeout:20000});assert.ifError(r.error);assert.notEqual(r.status,0);assert.match(r.stderr,/permits read-only AuditLinkedSchema/);
  }
});
