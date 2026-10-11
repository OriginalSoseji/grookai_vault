// Preserve the historical seal and verify the explicit Docker address recovery.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {eventRelease} from './product_event_release_scope_v1.mjs';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
export function validateEventParentRecovery(seal,recovery,actual){
 assert.equal(recovery.status,'passed_data_unchanged_address_remapped');assert.equal(recovery.readOnly,true);assert.equal(recovery.productionWrites,0);assert.equal(recovery.originalSealUnmodified,true);
 assert.deepEqual(Object.keys(actual).sort(),['full','upgrade']);
 for(const mode of ['full','upgrade']){
  const change=recovery.addressChanges[mode];assert.equal(change.actualContainerAddressChecked,true);assert.equal(change.before,seal[mode].address);assert.equal(change.after,recovery.actual[mode].address);
  const {address:oldAddress,...oldData}=seal[mode],{address:recoveredAddress,...recoveredData}=recovery.actual[mode];
  assert.notEqual(oldAddress,recoveredAddress);assert.deepEqual(recoveredData,oldData);
  assert.equal(Object.keys(oldData.retained).length,32);assert.deepEqual(actual[mode],recovery.actual[mode]);
 }
 return actual;
}
export function readEventParent(){
 assert.equal(fs.realpathSync('.').replaceAll('\\','/').toLowerCase(),eventRelease.root.toLowerCase());
 const prior='C:/gv_product_deal_release_20261008',commit='3e6928b574f072cd8cff2a13c5b5f164ea3ee191';
 const git=(...args)=>execFileSync('git',args,{cwd:prior,encoding:'utf8',windowsHide:true}).trim();assert.equal(git('rev-parse','HEAD'),commit);assert.equal(git('status','--porcelain'),'');
 const manifest='docs/release/PRODUCT_DEAL_RELEASE_EVIDENCE_V1.json';assert.equal(sha(eventRelease.root+'/'+manifest),sha(prior+'/'+manifest));
 const code=`import fs from 'node:fs';import {loadDealReleaseEvidence} from './scripts/schema/product_deal_release_evidence_v1.mjs';import {readDealReleaseState} from './scripts/schema/product_deal_release_state_v1.mjs';
 const m=JSON.parse(fs.readFileSync('docs/release/PRODUCT_DEAL_RELEASE_EVIDENCE_V1.json'));const e=loadDealReleaseEvidence(process.cwd().replaceAll(String.fromCharCode(92),'/'),m.packageHashes);
 const full=await readDealReleaseState('full',m.packageHashes),upgrade=await readDealReleaseState('upgrade',m.packageHashes);console.log(JSON.stringify({manifestSha256:e.manifestSha256,artifacts:e.artifacts,finalState:e.finalState,actual:{full,upgrade}}));`;
 const result=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',code],{cwd:prior,encoding:'utf8',windowsHide:true,timeout:120000,maxBuffer:8*1024*1024}));
 const recoveryPath=eventRelease.evidence+'/sealed-after-docker-recovery-1791471419916.json',recovery=read(recoveryPath);
 assert.equal(recovery.priorSeal,'C:/grookai_vault_operator_artifacts/product_deal_release_20261008/sealed-state-1791456751606.json');
 const seal=read(recovery.priorSeal);assert.deepEqual(result.finalState,seal);assert.equal(Object.keys(result.artifacts).length,29);
 validateEventParentRecovery(seal,recovery,result.actual);
 return {preservedCommit:commit,manifestSha256:result.manifestSha256,sealSha256:sha(recovery.priorSeal),recoverySha256:sha(recoveryPath),states:result.actual,productionWrites:0,localWrites:0};
}
