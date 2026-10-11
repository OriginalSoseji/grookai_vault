import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
export const inventoryExportRoot='C:/gv_product_inventory_export_20261008';
export const inventoryExportEvidence='C:/grookai_vault_operator_artifacts/product_inventory_export_20261008';
export const inventoryExportParent='19adf542a89238969606dc5d900d7a92ee0b29ed';
const recoveryPath=inventoryExportEvidence+'/docker-recovery-1791523158396/result.json';
export function readInventoryExportParent(){
 assert.equal(fs.realpathSync('.').replaceAll('\\','/'),inventoryExportRoot);
 const cwd='C:/gv_product_portability_20261008';
 const exec=(name,args,at=cwd)=>execFileSync(name,args,{cwd:at,encoding:'utf8',windowsHide:true,timeout:300000,maxBuffer:32*1024*1024});
 assert.equal(exec('git',['rev-parse','HEAD']).trim(),inventoryExportParent);
 assert.equal(exec('git',['status','--porcelain']).trim(),'');
 const result=JSON.parse(exec(process.execPath,['--input-type=module','-e',"import {loadPortabilityEvidence} from './scripts/schema/product_portability_evidence_v1.mjs';const e=loadPortabilityEvidence();console.log(JSON.stringify({status:'passed',states:e.states,manifestSha256:e.manifestSha256,productionWrites:0,localWrites:0}));"]));
 const baseline=JSON.parse(fs.readFileSync(inventoryExportEvidence+'/BASELINE_429.json'));
 assert.equal(result.manifestSha256,baseline.parentProof.manifestSha256);
 assert.deepEqual(result.states,baseline.parentProof.states);
 const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 const recovery=read(recoveryPath);assert.equal(recovery.status,'passed_data_unchanged_addresses_attested');assert.equal(recovery.readOnlyData,true);assert.equal(recovery.resetOrDelete,false);assert.equal(recovery.productionWrites,0);assert.equal(recovery.proof.length,5);
 const modules=[['product_deal_release_state_v1.mjs','readDealReleaseState'],['product_event_release_state_v1.mjs','readEventReleaseState'],['product_discount_release_state_v1.mjs','readDiscountReleaseState'],['product_cost_history_release_state_v1.mjs','readCostHistoryReleaseState'],['product_portfolio_history_release_state_v1.mjs','readPortfolioHistoryReleaseState']];
 for(const[i,item]of recovery.proof.entries()){
  assert.equal(exec('git',['rev-parse','HEAD'],item.root).trim(),item.commit);assert.equal(exec('git',['status','--porcelain'],item.root).trim(),'');
  assert.equal(sha(item.manifestPath),item.manifestSha256);assert.equal(sha(item.priorSeal.path),item.priorSeal.sha256);assert.equal(item.originalSealUnmodified,true);
  const m=read(item.manifestPath),old=read(item.priorSeal.path);assert.deepEqual(m.artifacts.finalState,item.priorSeal);
  const[module,fn]=modules[i];const code=`import fs from 'node:fs';import {${fn}} from './scripts/schema/${module}';const m=JSON.parse(fs.readFileSync(${JSON.stringify(item.manifestPath)}));console.log(JSON.stringify({full:await ${fn}('full',m.packageHashes),upgrade:await ${fn}('upgrade',m.packageHashes)}));`;
  const actual=JSON.parse(exec(process.execPath,['--input-type=module','-e',code],item.root));assert.deepEqual(actual,item.actual);
  for(const mode of ['full','upgrade']){
   const {address:before,...prior}=old[mode],{address:after,...now}=actual[mode];assert.deepEqual(now,prior);assert.deepEqual(item.addressChanges[mode],{before,after,actualContainerAddressChecked:true});
  }
 }
 const states=recovery.proof[4].actual;
 for(const mode of ['full','upgrade']){const {address:before,...old}=result.states[mode],{address:after,...now}=states[mode];assert.deepEqual(now,old);assert.ok(before&&after);}
 return {...result,states,recoveryPath,recoverySha256:sha(recoveryPath)};
}
