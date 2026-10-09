// Retain original qualified evidence; attest Docker address changes separately.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
export const notificationsRoot='C:/gv_product_notifications_20261008';
export const notificationsEvidence='C:/grookai_vault_operator_artifacts/product_notifications_20261008';
export const notificationsParent='5bafd6f3f34e959bafea0afe562face0543580e6';
const recoveryPath=notificationsEvidence+'/docker-recovery-1791513795133/result.json';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const exec=(name,args,cwd)=>execFileSync(name,args,{cwd,encoding:'utf8',windowsHide:true,timeout:300000,maxBuffer:32*1024*1024});
export function readNotificationsParent(){
 assert.equal(fs.realpathSync('.').replaceAll('\\','/'),notificationsRoot);
 const cwd='C:/gv_product_collector_usability_20261008';
 assert.equal(exec('git',['rev-parse','HEAD'],cwd).trim(),notificationsParent);assert.equal(exec('git',['status','--porcelain'],cwd).trim(),'');
 const original=JSON.parse(exec(process.execPath,['--input-type=module','-e',"import {loadCollectorUsabilityEvidence} from './scripts/schema/product_collector_usability_evidence_v1.mjs';console.log(JSON.stringify(loadCollectorUsabilityEvidence()));"],cwd));
 const baseline=read(notificationsEvidence+'/BASELINE_429.json');assert.equal(baseline.status,'passed');assert.equal(baseline.qualifiedParent,notificationsParent);assert.equal(original.manifestSha256,baseline.parentProof.manifestSha256);assert.deepEqual(original.states,baseline.parentProof.states);
 const recovery=read(recoveryPath);assert.equal(recovery.status,'passed_data_unchanged_addresses_attested');assert.equal(recovery.readOnlyData,true);assert.equal(recovery.resetOrDelete,false);assert.equal(recovery.productionWrites,0);assert.equal(recovery.proof.length,5);
 const modules=[['product_deal_release_state_v1.mjs','readDealReleaseState'],['product_event_release_state_v1.mjs','readEventReleaseState'],['product_discount_release_state_v1.mjs','readDiscountReleaseState'],['product_cost_history_release_state_v1.mjs','readCostHistoryReleaseState'],['product_portfolio_history_release_state_v1.mjs','readPortfolioHistoryReleaseState']];
 const preserved=[];
 for(const [i,item]of recovery.proof.entries()){
  assert.equal(exec('git',['rev-parse','HEAD'],item.root).trim(),item.commit);assert.equal(exec('git',['status','--porcelain'],item.root).trim(),'');
  assert.equal(sha(item.manifestPath),item.manifestSha256);assert.equal(sha(item.priorSeal.path),item.priorSeal.sha256);assert.equal(item.originalSealUnmodified,true);
  const old=read(item.priorSeal.path),m=read(item.manifestPath);assert.deepEqual(m.artifacts.finalState,item.priorSeal);
  const [module,fn]=modules[i];const code=`import fs from 'node:fs';import {${fn}} from './scripts/schema/${module}';const m=JSON.parse(fs.readFileSync(${JSON.stringify(item.manifestPath)}));console.log(JSON.stringify({full:await ${fn}('full',m.packageHashes),upgrade:await ${fn}('upgrade',m.packageHashes)}));`;
  const actual=JSON.parse(exec(process.execPath,['--input-type=module','-e',code],item.root));assert.deepEqual(actual,item.actual);
  for(const mode of ['full','upgrade']){
   const {address:before,...priorData}=old[mode],{address:after,...newData}=actual[mode];assert.deepEqual(newData,priorData);assert.deepEqual(item.addressChanges[mode],{before,after,actualContainerAddressChecked:true});
  }
  preserved.push({root:item.root,commit:item.commit,manifestSha256:item.manifestSha256,states:actual});
 }
 const states=preserved[4].states;
 for(const mode of ['full','upgrade']){
  const {address:before,...oldData}=original.states[mode],{address:after,...newData}=states[mode];assert.deepEqual(newData,oldData);assert.equal(before,recovery.proof[4].addressChanges[mode].before);assert.equal(after,recovery.proof[4].addressChanges[mode].after);
 }
 return {preservedCommit:notificationsParent,manifestSha256:original.manifestSha256,recoveryPath,recoverySha256:sha(recoveryPath),preserved,states,productionWrites:0,localWrites:0};
}
