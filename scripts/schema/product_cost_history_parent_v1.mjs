// Preserve the exact discount435 seal and its prior deal432 recovery chain.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {costHistoryRelease} from './product_cost_history_release_scope_v1.mjs';
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
export function readCostHistoryParent(){
 assert.equal(fs.realpathSync('.').replaceAll('\\','/').toLowerCase(),costHistoryRelease.root.toLowerCase());
 const prior='C:/gv_product_discount_20261008',commit='070e87baafccc7ad81a3a90c7ee07c0cb4ae549a';
 const git=(...args)=>execFileSync('git',args,{cwd:prior,encoding:'utf8',windowsHide:true}).trim();assert.equal(git('rev-parse','HEAD'),commit);assert.equal(git('status','--porcelain'),'');
 const manifest='docs/release/PRODUCT_DISCOUNT_EVIDENCE_V1.json';assert.equal(sha(costHistoryRelease.root+'/'+manifest),sha(prior+'/'+manifest));
 const code=`import assert from 'node:assert/strict';import {loadDiscountEvidence} from './scripts/schema/product_discount_evidence_v1.mjs';import {readDiscountReleaseState} from './scripts/schema/product_discount_release_state_v1.mjs';import {readDiscountParent} from './scripts/schema/product_discount_parent_v1.mjs';
 const e=loadDiscountEvidence(),parent=readDiscountParent();assert.deepEqual(parent.states,e.parent.states);const actual={full:await readDiscountReleaseState('full',e.packageHashes),upgrade:await readDiscountReleaseState('upgrade',e.packageHashes)};assert.deepEqual(actual,e.states);console.log(JSON.stringify({manifestSha256:e.manifestSha256,artifacts:e.artifacts,states:actual,parent}));`;
 const result=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',code],{cwd:prior,encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:8*1024*1024}));
 assert.equal(Object.keys(result.artifacts).length,31);for(const state of Object.values(result.states)){assert.equal(state.migrations,435);assert.equal(Object.keys(state.retained).length,38);}
 return {preservedCommit:commit,manifestSha256:result.manifestSha256,states:result.states,priorDeal:result.parent,productionWrites:0,localWrites:0};
}
