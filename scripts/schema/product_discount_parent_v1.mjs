// Preserve the exact event433 seal and its prior deal432 recovery chain.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {discountRelease} from './product_discount_release_scope_v1.mjs';
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
export function readDiscountParent(){
 assert.equal(fs.realpathSync('.').replaceAll('\\','/').toLowerCase(),discountRelease.root.toLowerCase());
 const prior='C:/gv_product_event_closeout_20261008',commit='072705f76bc7c11cb49c6d1108c971aaf9042989';
 const git=(...args)=>execFileSync('git',args,{cwd:prior,encoding:'utf8',windowsHide:true}).trim();assert.equal(git('rev-parse','HEAD'),commit);assert.equal(git('status','--porcelain'),'');
 const manifest='docs/release/PRODUCT_EVENT_EVIDENCE_V1.json';assert.equal(sha(discountRelease.root+'/'+manifest),sha(prior+'/'+manifest));
 const code=`import assert from 'node:assert/strict';import {loadEventEvidence} from './scripts/schema/product_event_evidence_v1.mjs';import {readEventReleaseState} from './scripts/schema/product_event_release_state_v1.mjs';import {readEventParent} from './scripts/schema/product_event_parent_v1.mjs';
 const e=loadEventEvidence(),parent=readEventParent();assert.deepEqual(parent.states,e.parent.states);const actual={full:await readEventReleaseState('full',e.packageHashes),upgrade:await readEventReleaseState('upgrade',e.packageHashes)};assert.deepEqual(actual,e.states);console.log(JSON.stringify({manifestSha256:e.manifestSha256,artifacts:e.artifacts,states:actual,parent}));`;
 const result=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',code],{cwd:prior,encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:8*1024*1024}));
 assert.equal(Object.keys(result.artifacts).length,30);for(const state of Object.values(result.states)){assert.equal(state.migrations,433);assert.equal(Object.keys(state.retained).length,37);}
 return {preservedCommit:commit,manifestSha256:result.manifestSha256,states:result.states,priorDeal:result.parent,productionWrites:0,localWrites:0};
}
